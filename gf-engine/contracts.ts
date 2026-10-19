import type { Content } from "./content.ts";
import { serviceOf, supplierPrice } from "./content.ts";
import { beginDay } from "./cards.ts";
import { GameError } from "./errors.ts";
import { bookReceipt } from "./finance.ts";
import { bps } from "./format.ts";
import { addMorale } from "./morale.ts";
import { addRep, noteDelivery } from "./reputation.ts";
import { weeklyAp } from "./staff.ts";
import { promoteJobs, receiveInbound } from "./production.ts";
import { chance, int, pickWeighted } from "./rng.ts";
import type { ClientType, Day, FleetContract, GameState, Job, Lead, MaterialId, Receivable, ServiceId } from "./state.ts";
import type { GfEvent } from "./finance.ts";

type ClientDef = Content["clients"][number];
type ServiceDef = Content["services"][number];
const DEPOSITS = [0, 30, 50, 100] as const;
type Deposit = (typeof DEPOSITS)[number];

export type QuotePreview = {
  materialCost: number;
  timeCost: number;
  margin: number;
  marginPct: number;
  acceptChance: number;
  breakEvenPrice: number;
};

function clientOf(content: Content, id: string | undefined): ClientDef | undefined {
  return content.clients.find((item) => item.id === id);
}

function flagNum(state: GameState, key: string): number {
  const value = state.flags[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function seq(state: GameState): number {
  const next = flagNum(state, "seq") + 1;
  state.flags.seq = next;
  return next;
}

export function workIndex(week: number, day: number): number {
  return week * 6 + (Math.max(1, day) - 1);
}

export function fromWork(index: number): { week: number; day: Day } {
  const week = Math.floor(Math.max(0, index) / 6);
  const day = ((Math.max(0, index) % 6) + 1) as Day;
  return { week, day };
}

export function addWorkDays(week: number, day: number, days: number): { week: number; day: Day } {
  return fromWork(workIndex(week, day) + Math.max(0, days));
}

function addCalendarDays(week: number, day: number, days: number): { week: number; day: Day } {
  const abs = week * 7 + (Math.max(1, day) - 1) + Math.max(0, days);
  let nextWeek = Math.floor(abs / 7);
  let nextDay = (abs % 7) + 1;
  if (nextDay > 6) {
    nextWeek += 1;
    nextDay = 1;
  }
  return { week: nextWeek, day: nextDay as Day };
}

function actOfWeek(content: Content, week: number): 0 | 1 | 2 | 3 | 4 {
  const row = content.balance.acts.find((item) => week >= item.from && week <= item.to);
  return row?.act ?? 4;
}

function spendAp(state: GameState, content: Content, amount: number, work: boolean): void {
  if (state.calendar.apLeft < amount) throw new GameError("sem_pa", "Sem ponto de ação.");
  state.calendar.apLeft -= amount;
  if (!work) return;
  const rule = content.balance;
  for (let i = 0; i < amount; i += 1) {
    state.calendar.apWorkedThisWeek += 1;
    if (state.calendar.apWorkedThisWeek > rule.overworkThreshold) addMorale(state, content, rule.overworkMorale);
  }
}

function manual(state: GameState, nextCash: number): void {
  if (nextCash < -state.overdraftLimit) throw new GameError("sem_caixa", "O cheque especial não cobre isso.");
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function bumpRep(state: GameState, content: Content, delta: number, reason: string): void {
  addRep(state, content, delta, reason);
}

function realType(lead: Lead): ClientType {
  return lead.hiddenType ?? lead.apparentType;
}

export function leadCount(rep: number, level: number, prospects: number, content: Content, leadMult = 1): number {
  const rule = content.balance.leads;
  const raw = rule.base + Math.floor(rep / rule.repDiv) + level * rule.perLevel + prospects * rule.prospect;
  return Math.max(0, Math.floor(raw * leadMult));
}

function serviceReady(state: GameState, service: ServiceDef): boolean {
  if (service.requires.compressor && !state.garage.hasCompressor) return false;
  if ((service.requires.level ?? 0) > state.garage.level) return false;
  return true;
}

function offeredServices(content: Content, state: GameState, client: ClientDef): ServiceDef[] {
  const rows: ServiceDef[] = [];
  for (const row of client.servicos) {
    const service = serviceOf(content, row.id);
    if (!service || !serviceReady(state, service)) continue;
    rows.push(service);
  }
  return rows;
}

function eligibleClients(content: Content, state: GameState, act: number): ClientDef[] {
  return content.clients.filter((client) => {
    if (client.enabled === false) return false;
    if (act < client.actMin) return false;
    if ((client.pesoPorAto[act] ?? 0) <= 0) return false;
    if (client.requires?.level != null && state.garage.level < client.requires.level) return false;
    if (client.requires?.rep != null && state.rep < client.requires.rep) return false;
    if (client.requires?.clean === true && state.flags.negativado === true) return false;
    return offeredServices(content, state, client).length > 0;
  });
}

function refPrice(content: Content, state: GameState, client: ClientDef, service: ServiceDef): number {
  if (client.id === "frota") return content.balance.contracts.fleetWeekly;
  if (client.id === "prefeitura") return 12000;
  const mod = content.garageLevels[state.garage.level]?.priceMod ?? 1;
  let price = Math.round(service.ref * mod);
  if (client.urgencia) price = Math.round(price * (1 + client.urgencia.preco));
  return price;
}

function pushLead(
  state: GameState,
  content: Content,
  client: ClientDef,
  service: ServiceDef,
  week: number,
  appearDay: number,
  apparent: ClientType,
  hidden?: ClientType,
): Lead {
  const rule = content.balance.contracts;
  const deadline = client.urgencia ? client.urgencia.dias : int(state, rule.deadlineMin, rule.deadlineMax);
  const born = workIndex(week, appearDay);
  const lead: Lead = {
    id: `lead-${seq(state)}`,
    apparentType: apparent,
    hiddenType: hidden,
    service: service.id as ServiceId,
    refPrice: refPrice(content, state, client, service),
    deadlineDays: deadline,
    quotes: [pickWeighted(state, client.falas.map((fala) => ({ item: fala, weight: 1 })))],
    expiresDay: born + rule.expireDays,
    appearWeek: week,
    appearDay,
    status: "open",
    contractTemplate: client.id === "frota" ? "frota_raptor" : undefined,
  };
  state.leads.push(lead);
  return lead;
}

function appearDays(state: GameState, count: number): number[] {
  const monday = Math.ceil(count / 2);
  const days: number[] = [];
  for (let i = 0; i < monday; i += 1) days.push(1);
  for (let i = monday; i < count; i += 1) days.push(int(state, 2, 6));
  return days;
}

export function spawnTutorial(state: GameState, content: Content): void {
  const client = clientOf(content, "vizinho");
  const service = serviceOf(content, "oleo");
  if (!client || !service) return;
  const count = content.balance.contracts.tutorialLeads;
  const days = appearDays(state, count);
  for (let i = 0; i < count; i += 1) pushLead(state, content, client, service, 0, days[i] ?? 1, "vizinho");
}

export function generateWeekLeads(state: GameState, content: Content, week: number): Lead[] {
  const rawMult = state.flags.leadMult;
  const mult = typeof rawMult === "number" ? rawMult : 1;
  const prospects = flagNum(state, "prospectsQueued");
  let count = leadCount(state.rep, state.garage.level, prospects, content, mult);
  if (state.employees.some((employee) => employee.id === "labia")) count += 3;
  state.flags.prospectsQueued = 0;
  state.flags.prospectsUsed = 0;
  const act = actOfWeek(content, week);
  const pool = eligibleClients(content, state, act);
  if (count === 0 || pool.length === 0) return [];
  const days = appearDays(state, count);
  const born: Lead[] = [];
  for (let i = 0; i < count; i += 1) {
    const picked = pickWeighted(state, pool.map((client) => ({ item: client, weight: client.pesoPorAto[act] ?? 0 })));
    const services = offeredServices(content, state, picked).map((service) => {
      const weight = picked.servicos.find((row) => row.id === service.id)?.peso ?? 1;
      return { item: service, weight };
    });
    const service = pickWeighted(state, services);
    let apparent: ClientType = picked.id as ClientType;
    let hidden: ClientType | undefined;
    if (picked.hidden && picked.disfarce && picked.disfarce.length > 0) {
      hidden = picked.id as ClientType;
      apparent = pickWeighted(state, picked.disfarce.map((id) => ({ item: id as ClientType, weight: 1 })));
    }
    born.push(pushLead(state, content, picked, service, week, days[i] ?? 1, apparent, hidden));
  }
  return born;
}

export function depositPenalty(content: Content, depositPct: number): number {
  const table = content.balance.acceptance.depositPenalty;
  if (depositPct >= 100) return table["100"];
  if (depositPct >= 50) return table["50"];
  if (depositPct >= 30) return table["30"];
  return table["0"];
}

export function acceptanceChance(
  content: Content,
  elasticity: number,
  rep: number,
  price: number,
  ref: number,
  depositPct: number,
): number {
  const rule = content.balance.acceptance;
  const rel = ref === 0 ? 1 : price / ref;
  const raw = rule.base - elasticity * rule.k * (rel - 1) + (rep - rule.repCenter) / rule.repDiv - depositPenalty(content, depositPct);
  return Math.min(rule.max, Math.max(rule.min, raw));
}

function fixedNow(state: GameState, content: Content): number {
  const fixed = content.balance.fixed;
  const level = state.garage.level;
  const base =
    fixed.districtBase +
    fixed.districtPerLevel * level +
    fixed.energyBase +
    fixed.energyPerLevel * level +
    fixed.maintenancePerLevel * level +
    fixed.living;
  const extra = state.fixedRecurring.reduce((sum, item) => {
    if (item.untilWeek != null && state.calendar.week > item.untilWeek) return sum;
    return sum + item.value;
  }, 0);
  return base + extra;
}

function minimumInstallments(state: GameState, content: Content): number {
  let sum = 0;
  for (const debt of state.debts) {
    if (debt.balance <= 0) continue;
    const tpl = content.debtTemplates[debt.template];
    if (!tpl || tpl.min === "auto") continue;
    if (tpl.min === "full") {
      const due = debt.dueWeek ?? tpl.dueWeek ?? 0;
      if (state.calendar.week >= due) sum += debt.balance;
      continue;
    }
    if (tpl.min === "interest") {
      sum += Math.min(debt.balance, bps(debt.balance, debt.weeklyBps));
      continue;
    }
    if (tpl.min === "pct15") {
      const fatura = (debt.statement ?? 0) + (debt.revolving ?? 0);
      sum += Math.min(debt.balance, Math.round((fatura * (tpl.pct ?? 15)) / 100));
      continue;
    }
    if (tpl.min === "price") {
      sum += Math.min(debt.balance, debt.pricePayment ?? 0);
      continue;
    }
    sum += Math.min(debt.balance, tpl.minValue ?? 0);
  }
  return sum;
}

export function hourlyCost(state: GameState, content: Content): number {
  const salaries = state.employees.reduce((sum, employee) => sum + employee.salary, 0);
  const ap = weeklyAp(state, content);
  if (ap <= 0) return 0;
  return (fixedNow(state, content) + salaries + minimumInstallments(state, content)) / ap;
}

function unitCost(state: GameState, content: Content, material: MaterialId): number {
  const lot = state.inventory[material];
  if (lot && lot.qty > 0) return lot.avgCost;
  return supplierPrice(content, "ferro_velho", material) ?? supplierPrice(content, "casco_tech", material) ?? 0;
}

export function materialCostOf(state: GameState, content: Content, service: ServiceDef): number {
  let cost = 0;
  for (const [id, qty] of Object.entries(service.materials)) cost += unitCost(state, content, id as MaterialId) * qty;
  return Math.round(cost);
}

export function quotePreview(state: GameState, content: Content, leadId: string, price: number, depositPct: number): QuotePreview {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) throw new GameError("lead_sumiu", "Esse cliente já foi embora.");
  const service = serviceOf(content, lead.service);
  const materialCost = service ? materialCostOf(state, content, service) : 0;
  const timeCost = service ? Math.round(service.ap * hourlyCost(state, content)) : 0;
  const margin = price - materialCost - timeCost;
  const apparent = clientOf(content, lead.apparentType);
  const elasticity = apparent?.elasticidade ?? 1;
  return {
    materialCost,
    timeCost,
    margin,
    marginPct: price > 0 ? margin / price : 0,
    acceptChance: acceptanceChance(content, elasticity, state.rep, price, lead.refPrice, depositPct),
    breakEvenPrice: materialCost + timeCost,
  };
}

function leadOpen(lead: Lead): boolean {
  return !lead.status || lead.status === "open";
}

export function leadVisible(state: GameState, lead: Lead): boolean {
  const status = lead.status ?? "open";
  if (status !== "open" && status !== "counter") return false;
  const week = lead.appearWeek ?? 0;
  const day = lead.appearDay ?? 1;
  if (state.calendar.week < week) return false;
  if (state.calendar.week === week && state.calendar.day < day) return false;
  return workIndex(state.calendar.week, state.calendar.day) < lead.expiresDay;
}

function findLead(state: GameState, id: unknown): Lead {
  if (typeof id !== "string") throw new GameError("lead_sumiu", "Esse cliente já foi embora.");
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) throw new GameError("lead_sumiu", "Esse cliente já foi embora.");
  return lead;
}

function openFleet(state: GameState, content: Content, price: number, deposit: number, events: GfEvent[]): void {
  const rule = content.balance.contracts;
  const live = (state.contracts ?? []).some((item) => item.active);
  if (live) throw new GameError("baia_ocupada", "A frota já ocupa uma baia.");
  const weeks = int(state, rule.fleetMinWeeks, rule.fleetMaxWeeks);
  const contract: FleetContract = {
    id: `frota-${seq(state)}`,
    template: "frota_raptor",
    startWeek: state.calendar.week,
    endWeek: state.calendar.week + weeks - 1,
    weekly: price,
    perWeek: rule.fleetJobs,
    delivered: 0,
    active: true,
  };
  state.contracts = [...(state.contracts ?? []), contract];
  if (deposit > 0) bookReceipt(state, deposit, deposit, 0);
  spawnFleetJobs(state, content, contract);
  promoteJobs(state, content);
  events.push({ type: "FLEET_SIGNED", amount: price, text: `${weeks} semanas`, leadId: contract.id });
}

function spawnFleetJobs(state: GameState, content: Content, contract: FleetContract): void {
  const service = serviceOf(content, "reparo");
  if (!service) return;
  const born = state.jobs.filter((job) => job.contractId === contract.id && job.bornWeek === state.calendar.week).length;
  for (let i = born; i < contract.perWeek; i += 1) {
    const due = addWorkDays(state.calendar.week, 6, 0);
    const job: Job = {
      id: `job-${seq(state)}`,
      leadId: contract.id,
      service: "reparo",
      price: 0,
      depositPaid: 0,
      apNeeded: service.ap,
      apDone: 0,
      assignedTo: "teo",
      dueWeek: due.week,
      dueDay: due.day,
      status: "waiting_materials",
      reworks: 0,
      materialSource: "ferro_velho",
      clientType: "frota",
      payment: "prazo",
      paymentDays: content.balance.contracts.fleetPayWeeks * 7,
      contractId: contract.id,
      bornWeek: state.calendar.week,
    };
    state.jobs.push(job);
  }
}

function openJob(state: GameState, content: Content, lead: Lead, price: number, deposit: number, deadline: number, events: GfEvent[]): Job {
  const service = serviceOf(content, lead.service);
  if (!service) throw new GameError("servico_invalido", "Não tem esse serviço na baia.");
  const client = clientOf(content, realType(lead));
  const due = addWorkDays(state.calendar.week, state.calendar.day, deadline);
  const job: Job = {
    id: `job-${seq(state)}`,
    leadId: lead.id,
    service: service.id as ServiceId,
    price,
    depositPaid: deposit,
    apNeeded: service.ap,
    apDone: 0,
    assignedTo: "teo",
    dueWeek: due.week,
    dueDay: due.day,
    status: "waiting_materials",
    reworks: 0,
    materialSource: "ferro_velho",
    clientType: realType(lead),
    payment: client?.pagamento.tipo ?? "entrega",
    paymentDays: client?.pagamento.dias,
    bornWeek: state.calendar.week,
  };
  state.jobs.push(job);
  bookReceipt(state, deposit, deposit, 0);
  promoteJobs(state, content);
  events.push({ type: "JOB_OPENED", jobId: job.id, leadId: lead.id, amount: price, text: job.status });
  return job;
}

function acceptTerms(state: GameState, content: Content, lead: Lead, price: number, depositPct: Deposit, deadline: number, events: GfEvent[]): void {
  const deposit = Math.round((price * depositPct) / 100);
  lead.status = "accepted";
  if (lead.proposal) lead.proposal.accepted = true;
  if (lead.contractTemplate === "frota_raptor" || realType(lead) === "frota") {
    openFleet(state, content, price, deposit, events);
    state.flags.fleet = true;
    events.push({ type: "PROPOSAL_ACCEPTED", leadId: lead.id, amount: price, text: "frota" });
    return;
  }
  openJob(state, content, lead, price, deposit, deadline, events);
  events.push({ type: "PROPOSAL_ACCEPTED", leadId: lead.id, amount: price });
}

function resolveLead(state: GameState, content: Content, lead: Lead, events: GfEvent[]): void {
  const proposal = lead.proposal;
  if (!proposal || proposal.accepted != null || lead.status !== "pending") return;
  const rule = content.balance.contracts;
  const real = clientOf(content, realType(lead));
  const depositPct = proposal.depositPct;
  if (real?.id === "caloteiro" && depositPct / 100 >= (real.recusaSinal?.min ?? rule.caloteRefuseDeposit)) {
    if (chance(state, real.recusaSinal?.chance ?? rule.caloteRefuse)) {
      lead.status = "refused";
      proposal.accepted = false;
      proposal.respondedAt = workIndex(state.calendar.week, state.calendar.day);
      events.push({ type: "PROPOSAL_REFUSED", leadId: lead.id, text: "Não gostei do sinal." });
      return;
    }
  }
  if (real?.id === "pechincheiro") {
    const rel = lead.refPrice === 0 ? 1 : proposal.price / lead.refPrice;
    if (rel <= rule.pechincheMax + 1e-9 || (rel <= rule.pechincheStretch + 1e-9 && chance(state, rule.pechincheStretchChance))) {
      acceptTerms(state, content, lead, proposal.price, depositPct, proposal.deadline, events);
      return;
    }
    lead.status = "counter";
    lead.counterPrice = Math.round(lead.refPrice * rule.pechincheMax);
    lead.expiresDay = workIndex(state.calendar.week, state.calendar.day) + rule.expireDays;
    events.push({ type: "COUNTER_OFFER", leadId: lead.id, amount: lead.counterPrice, text: "Tira trinta por cento." });
    return;
  }
  const elasticity = real?.elasticidade ?? 1;
  const p = acceptanceChance(content, elasticity, state.rep, proposal.price, lead.refPrice, depositPct);
  proposal.respondedAt = workIndex(state.calendar.week, state.calendar.day);
  if (chance(state, p)) {
    acceptTerms(state, content, lead, proposal.price, depositPct, proposal.deadline, events);
    return;
  }
  lead.status = "refused";
  proposal.accepted = false;
  events.push({ type: "PROPOSAL_REFUSED", leadId: lead.id, text: "Ficou caro." });
}

function makeReceivable(state: GameState, job: Job, value: number, dueWeek: number, dueDay: number, sure = false): Receivable {
  return {
    id: `rec-${seq(state)}`,
    jobId: job.id,
    value,
    dueWeek,
    dueDay,
    caloteRolled: false,
    status: "open",
    clientType: job.clientType,
    sure,
  };
}

export function settleReceivable(state: GameState, content: Content, rec: Receivable, events: GfEvent[], force?: "pay" | "default"): void {
  if (rec.status === "paid" || rec.status === "defaulted" || rec.caloteRolled) return;
  const client = clientOf(content, rec.clientType);
  const roll = force ?? (rec.sure ? "pay" : chance(state, client?.caloteBase ?? 0) ? "default" : "pay");
  rec.caloteRolled = true;
  if (roll === "default") {
    rec.status = "defaulted";
    events.push({ type: "DEFAULT", receivableId: rec.id, amount: rec.value, text: rec.clientType });
    return;
  }
  rec.status = "paid";
  bookReceipt(state, rec.value, rec.value, 0);
  events.push({ type: "PAID", receivableId: rec.id, amount: rec.value });
}

function receivableDue(state: GameState, rec: Receivable): boolean {
  if (rec.status === "paid" || rec.status === "defaulted" || rec.caloteRolled) return false;
  if (state.calendar.week > rec.dueWeek) return true;
  return state.calendar.week === rec.dueWeek && state.calendar.day >= rec.dueDay;
}

export function settleDueReceivables(state: GameState, content: Content, events: GfEvent[]): void {
  for (const rec of state.receivables) {
    if (!receivableDue(state, rec)) continue;
    settleReceivable(state, content, rec, events);
  }
}

export function closeFleetWeek(state: GameState, content: Content, events: GfEvent[]): void {
  const rule = content.balance.contracts;
  for (const contract of state.contracts ?? []) {
    if (!contract.active || state.calendar.week < contract.startWeek) continue;
    let pay = contract.weekly;
    if (contract.delivered < contract.perWeek) {
      pay = Math.round(contract.weekly * (1 - rule.fleetMissFine));
      bumpRep(state, content, rule.repLate, "atraso da frota");
      noteDelivery(state, true);
      events.push({ type: "FLEET_MISS", amount: pay, text: contract.id });
    } else {
      events.push({ type: "FLEET_WEEK", amount: pay, text: contract.id });
      noteDelivery(state, false);
    }
    state.flags.revenueWeek = flagNum(state, "revenueWeek") + pay;
    state.receivables.push({
      id: `rec-${seq(state)}`,
      jobId: `${contract.id}-${state.calendar.week}`,
      value: pay,
      dueWeek: state.calendar.week + rule.fleetPayWeeks,
      dueDay: 6,
      caloteRolled: false,
      status: "open",
      clientType: "frota",
      sure: true,
    });
    contract.delivered = 0;
    if (state.calendar.week >= contract.endWeek) contract.active = false;
  }
}

function deliverJob(state: GameState, content: Content, job: Job, events: GfEvent[]): void {
  if (job.status !== "ready") throw new GameError("nao_pronto", "O serviço ainda não está pronto.");
  const rule = content.balance.contracts;
  const late = Math.max(0, workIndex(state.calendar.week, state.calendar.day) - workIndex(job.dueWeek, job.dueDay));
  if (job.contractId) {
    const contract = (state.contracts ?? []).find((item) => item.id === job.contractId);
    if (contract && late === 0) contract.delivered += 1;
    job.status = "delivered";
    noteDelivery(state, late > 0);
    events.push({ type: "DELIVERED", jobId: job.id, amount: 0, text: "frota" });
    return;
  }
  const finePct = Math.min(rule.lateMax, late * rule.latePct);
  const net = Math.max(0, job.price - Math.round(job.price * finePct));
  const remaining = Math.max(0, net - job.depositPaid);
  if (job.reworks > 0) bumpRep(state, content, content.balance.quality.reworkRep * job.reworks, "retrabalho");
  if (late > 0) bumpRep(state, content, rule.repLate, "atraso");
  else if (job.reworks === 0) bumpRep(state, content, rule.repOnTime, "entrega no prazo");
  noteDelivery(state, late > 0);
  if (late === 0 && job.reworks === 0 && job.clientType === "motoboy" && chance(state, rule.motoboyReturnChance)) {
    const when = addCalendarDays(state.calendar.week, state.calendar.day, rule.motoboyReturnDays);
    state.scheduled.push({ atWeek: when.week, atDay: when.day, source: "motoboy", effects: [{ type: "SPAWN_LEAD", client: "motoboy" }] });
  }
  job.status = "delivered";
  if (remaining <= 0) {
    events.push({ type: "DELIVERED", jobId: job.id, amount: net, text: late > 0 ? "atrasado" : "no prazo" });
    return;
  }
  if (job.payment === "split50_7d") {
    const now = Math.round(remaining / 2);
    const later = remaining - now;
    if (now > 0) bookReceipt(state, now, now, 0);
    if (later > 0) {
      const due = addWorkDays(state.calendar.week, state.calendar.day, job.paymentDays ?? 7);
      state.receivables.push(makeReceivable(state, job, later, due.week, due.day));
    }
  } else if (job.payment === "prazo") {
    const due = addWorkDays(state.calendar.week, state.calendar.day, job.paymentDays ?? 14);
    state.receivables.push(makeReceivable(state, job, remaining, due.week, due.day));
  } else {
    const rec = makeReceivable(state, job, remaining, state.calendar.week, state.calendar.day);
    state.receivables.push(rec);
    settleReceivable(state, content, rec, events);
    if (rec.status === "defaulted") job.status = "defaulted";
  }
  events.push({ type: "DELIVERED", jobId: job.id, amount: net, text: late > 0 ? "atrasado" : "no prazo" });
}

export function spawnScheduledLead(state: GameState, content: Content, clientId: string, events: GfEvent[]): void {
  const client = clientOf(content, clientId);
  if (!client) return;
  const services = offeredServices(content, state, client);
  const service = services[0] ?? serviceOf(content, client.servicos[0]?.id ?? "");
  if (!service) return;
  const lead = pushLead(state, content, client, service, state.calendar.week, state.calendar.day, client.id as ClientType);
  events.push({ type: "LEAD_RETURN", leadId: lead.id, text: client.nome });
}

export function addScriptedLead(
  state: GameState,
  content: Content,
  clientType: string,
  hiddenType: string | undefined,
  contractTemplate: string | undefined,
  events: GfEvent[],
): void {
  const real = clientOf(content, hiddenType || clientType);
  if (!real) throw new GameError("lead_sumiu", "Esse cliente não existe.");
  const service = serviceOf(content, real.servicos[0]?.id ?? "");
  if (!service) throw new GameError("servico_invalido", "Esse cliente não tem serviço.");
  const hidden = hiddenType && hiddenType !== clientType ? (hiddenType as ClientType) : undefined;
  const lead = pushLead(state, content, real, service, state.calendar.week, state.calendar.day, clientType as ClientType, hidden);
  if (contractTemplate === "frota_raptor") lead.contractTemplate = "frota_raptor";
  events.push({ type: "LEAD", leadId: lead.id, text: real.nome });
}

export function openMorning(state: GameState, content: Content, events: GfEvent[]): void {
  receiveInbound(state, content, events);
  for (const lead of state.leads) {
    if (lead.status === "pending") resolveLead(state, content, lead, events);
    else if (leadOpen(lead) && workIndex(state.calendar.week, state.calendar.day) >= lead.expiresDay) lead.status = "expired";
  }
  settleDueReceivables(state, content, events);
  beginDay(state, content, events);
  for (const contract of state.contracts ?? []) {
    if (contract.active && state.calendar.week >= contract.startWeek && state.calendar.week <= contract.endWeek) {
      spawnFleetJobs(state, content, contract);
    }
  }
  promoteJobs(state, content);
}

function sendProposal(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const lead = findLead(state, action.leadId);
  if (!leadVisible(state, lead) || !leadOpen(lead)) throw new GameError("lead_sumiu", "Esse cliente não está na porta.");
  const price = whole(action.price);
  const depositPct = whole(action.depositPct);
  const deadline = whole(action.deadline) ?? lead.deadlineDays;
  const rule = content.balance.contracts;
  if (price == null || depositPct == null || !DEPOSITS.includes(depositPct as Deposit)) {
    throw new GameError("proposta_invalida", "Preço, sinal e prazo precisam fechar.");
  }
  if (deadline < 1) throw new GameError("proposta_invalida", "O prazo não fecha.");
  const min = Math.round(lead.refPrice * rule.priceMin);
  const max = Math.round(lead.refPrice * rule.priceMax);
  if (price < min || price > max) throw new GameError("proposta_invalida", "O preço fica entre 60% e 160% da referência.");
  const real = realType(lead);
  const client = clientOf(content, real);
  const need = client?.requires?.deposit;
  if (real === "corredor" && need != null && depositPct / 100 < need) {
    throw new GameError("sinal_obrigatorio", "O corredor só deixa o carro com sinal de metade.");
  }
  lead.proposal = { price, depositPct: depositPct as Deposit, deadline };
  lead.status = "pending";
  events.push({ type: "PROPOSAL_SENT", leadId: lead.id, amount: price });
}

function answerCounter(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const lead = findLead(state, action.leadId);
  if (lead.status !== "counter" || lead.counterPrice == null) throw new GameError("sem_contra", "Não há contraproposta nessa mesa.");
  if (action.accept === true) {
    const depositPct = lead.proposal?.depositPct ?? 0;
    const deadline = lead.proposal?.deadline ?? lead.deadlineDays;
    acceptTerms(state, content, lead, lead.counterPrice, depositPct, deadline, events);
    return;
  }
  lead.status = "refused";
  events.push({ type: "COUNTER_REFUSED", leadId: lead.id });
}

function checkRecord(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const rule = content.balance.contracts;
  const lead = findLead(state, action.targetId);
  if (lead.revealed) throw new GameError("ja_consultou", "A ficha desse cliente já foi aberta.");
  spendAp(state, content, rule.checkAp, true);
  manual(state, state.cash - rule.checkCost);
  state.cash -= rule.checkCost;
  const real = realType(lead);
  const text = real === "caloteiro" ? `${rule.recordCalotes} calotes registrados` : "nada consta";
  lead.record = text;
  lead.revealed = true;
  lead.ficha = real;
  events.push({ type: "RECORD", leadId: lead.id, text });
}

function collect(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const rec = state.receivables.find((item) => item.id === action.receivableId);
  if (!rec || rec.status !== "defaulted") throw new GameError("nada_a_cobrar", "Não há calote para cobrar.");
  if (rec.collected) throw new GameError("ja_cobrou", "Essa cobrança já foi feita.");
  const rule = content.balance.contracts;
  spendAp(state, content, 1, true);
  rec.collected = true;
  if (!chance(state, rule.collectChance)) {
    events.push({ type: "COLLECT_MISS", receivableId: rec.id });
    return;
  }
  const gain = Math.round(rec.value * rule.collectShare);
  bookReceipt(state, gain, gain, 0);
  rec.value = Math.max(0, rec.value - gain);
  events.push({ type: "COLLECTED", receivableId: rec.id, amount: gain });
}

function protest(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const rec = state.receivables.find((item) => item.id === action.receivableId);
  if (!rec || rec.status !== "defaulted") throw new GameError("nada_a_cobrar", "Não há calote para protestar.");
  if (rec.protested) throw new GameError("ja_protestou", "Esse título já foi protestado.");
  const rule = content.balance.contracts;
  manual(state, state.cash - rule.protestFee);
  state.cash -= rule.protestFee;
  rec.protested = true;
  if (!chance(state, rule.protestChance)) {
    events.push({ type: "PROTEST_MISS", receivableId: rec.id, amount: rule.protestFee });
    return;
  }
  bumpRep(state, content, rule.protestRep, "protesto");
  const due = addWorkDays(state.calendar.week, state.calendar.day, rule.protestWeeks * 6);
  rec.status = "open";
  rec.caloteRolled = false;
  rec.sure = true;
  rec.dueWeek = due.week;
  rec.dueDay = due.day;
  events.push({ type: "PROTEST_FILED", receivableId: rec.id, amount: rec.value, week: due.week });
}

export function applyContracts(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  const known = ["PROSPECT", "SEND_PROPOSAL", "ANSWER_COUNTER", "CHECK_RECORD", "DELIVER", "COLLECT", "PROTEST"];
  if (!known.includes(kind)) return false;
  if (kind === "PROSPECT") {
    const rule = content.balance;
    if (flagNum(state, "prospectsUsed") >= rule.leads.prospectMaxWeek) {
      throw new GameError("prospeccao_esgotada", "A rua desta semana já foi batida duas vezes.");
    }
    spendAp(state, content, content.balance.contracts.prospectAp, true);
    manual(state, state.cash - rule.leads.prospectCost);
    state.cash -= rule.leads.prospectCost;
    state.flags.prospectsUsed = flagNum(state, "prospectsUsed") + 1;
    state.flags.prospectsQueued = flagNum(state, "prospectsQueued") + 1;
    events.push({ type: "PROSPECTED", amount: rule.leads.prospectCost });
    return true;
  }
  if (kind === "SEND_PROPOSAL") {
    sendProposal(state, content, action, events);
    return true;
  }
  if (kind === "ANSWER_COUNTER") {
    answerCounter(state, content, action, events);
    return true;
  }
  if (kind === "CHECK_RECORD") {
    checkRecord(state, content, action, events);
    return true;
  }
  if (kind === "DELIVER") {
    const job = state.jobs.find((item) => item.id === action.jobId);
    if (!job) throw new GameError("servico_invalido", "Esse serviço não está na baia.");
    deliverJob(state, content, job, events);
    return true;
  }
  if (kind === "COLLECT") {
    collect(state, content, action, events);
    return true;
  }
  protest(state, content, action, events);
  return true;
}

const HIDDEN_KEYS = new Set(["hiddenType", "ficha", "clientType", "nota_servidor"]);
const CLIENT_IDS = new Set(["vizinho", "motoboy", "comerciante", "pechincheiro", "frota", "corredor", "caloteiro", "prefeitura"]);

export function redactState<T>(value: T): T {
  return stripHidden(structuredClone(value)) as T;
}

function stripHidden(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stripHidden(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "scheduled" && Array.isArray(item)) {
      out[key] = item
        .filter((entry) => !entry || typeof entry !== "object" || (entry as { hidden?: boolean }).hidden !== true)
        .map((entry) => stripHidden(entry));
      continue;
    }
    if (HIDDEN_KEYS.has(key)) continue;
    if (key === "text" && typeof item === "string" && CLIENT_IDS.has(item)) continue;
    out[key] = stripHidden(item);
  }
  return out;
}
