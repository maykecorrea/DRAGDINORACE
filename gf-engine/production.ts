import type { Content } from "./content.ts";
import { serviceOf } from "./content.ts";
import { GameError } from "./errors.ts";
import { bookReceipt, makeDebt, type GfEvent } from "./finance.ts";
import { addMorale } from "./morale.ts";
import { addRep } from "./reputation.ts";
import { chance } from "./rng.ts";
import { consumeMaterials, hasMaterials, receiveBatch, removeSupplierStock } from "./stock.ts";
import { assertShelf } from "./fittings.ts";
import { runHands } from "./hands.ts";
import type { Day, EmployeeId, GameState, HiredEmployee, Job, MaterialId, ServiceId, SupplierId } from "./state.ts";
import { assertOpen, DAY, WEEK } from "./clock.ts";
import { addPantry, foodById, type FoodId } from "./body.ts";

const SUPPLIERS: SupplierId[] = ["ferro_velho", "casco_tech", "megaosso", "rato"];

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
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

function spendWorkAp(state: GameState, content: Content, amount: number, events: GfEvent[]): void {
  if (amount <= 0) return;
  if (state.calendar.apLeft < amount) throw new GameError("sem_pa", "Sem ponto de ação.");
  state.calendar.apLeft -= amount;
  const rule = content.balance;
  for (let i = 0; i < amount; i += 1) {
    state.calendar.apWorkedThisWeek += 1;
    if (state.calendar.apWorkedThisWeek > rule.overworkThreshold) {
      const hit = addMorale(state, content, rule.overworkMorale);
      if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
    }
  }
}

function bumpRep(state: GameState, content: Content, delta: number, reason: string): void {
  addRep(state, content, delta, reason);
}

function nextWorkDay(week: number, day: number): { week: number; day: Day } {
  const index = week * 6 + (Math.max(1, day) - 1) + 1;
  return { week: Math.floor(index / 6), day: ((index % 6) + 1) as Day };
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

function asSupplier(id: string): SupplierId {
  if (!SUPPLIERS.includes(id as SupplierId)) throw new GameError("compra_invalida", "Esse fornecedor não está na rua.");
  return id as SupplierId;
}

function supplierRow(content: Content, id: SupplierId) {
  const row = content.suppliers.find((item) => item.id === id);
  if (!row) throw new GameError("compra_invalida", "Esse fornecedor não está na rua.");
  return row;
}

export function successChance(content: Content, skill: number, difficulty: number, modMaterial: number, morale: number): number {
  const rule = content.balance.quality;
  const penalty = morale < rule.lowMorale ? rule.lowMoralePenalty : 0;
  const raw = rule.base + rule.perSkill * (skill - difficulty) + modMaterial - penalty;
  return Math.min(rule.max, Math.max(rule.min, raw));
}

export function workerSkill(state: GameState, content: Content, job: Job): number {
  const rule = content.balance.quality;
  if (job.assignedTo !== "teo") {
    const employee = state.employees.find((item) => item.id === job.assignedTo);
    if (employee) {
      const bonus = content.employees.find((item) => item.id === employee.id)?.skillBonus?.[job.service] ?? 0;
      return employee.skill + bonus;
    }
  }
  return flagNum(state, "jobsDone") >= rule.skillJobs ? rule.skillAfter : rule.teoSkill;
}

export function missingMaterials(state: GameState, content: Content, job: Job): { material: MaterialId; need: number; have: number }[] {
  const service = serviceOf(content, job.service);
  const needs = job.pendingMaterials ?? service?.materials ?? {};
  const missing: { material: MaterialId; need: number; have: number }[] = [];
  for (const [id, need] of Object.entries(needs)) {
    if (!need) continue;
    const have = state.inventory[id as MaterialId]?.qty ?? 0;
    if (have < need) missing.push({ material: id as MaterialId, need, have });
  }
  return missing;
}

export function cheapestSupplierFor(material: MaterialId, qty: number, _state: GameState, content: Content): SupplierId | null {
  let best: { id: SupplierId; price: number } | null = null;
  for (const supplier of content.suppliers) {
    if (!SUPPLIERS.includes(supplier.id as SupplierId)) continue;
    const price = supplier.prices[material];
    if (price == null) continue;
    const min = supplier.minOrder?.[material];
    if (min != null && qty < min) continue;
    const id = supplier.id as SupplierId;
    if (!best || price < best.price) best = { id, price };
  }
  return best?.id ?? null;
}

function requirementsMet(state: GameState, content: Content, serviceId: ServiceId): boolean {
  const service = serviceOf(content, serviceId);
  if (!service) return false;
  if (service.requires.compressor && !state.garage.hasCompressor) return false;
  if ((service.requires.level ?? 0) > state.garage.level) return false;
  return true;
}

function fleetActive(state: GameState): boolean {
  return (state.contracts ?? []).some((item) => item.active);
}

function bayFree(state: GameState, job: Job): boolean {
  const running = state.jobs.filter((item) => item.status === "in_progress");
  if (job.contractId) {
    if (running.some((item) => item.contractId)) return false;
    return running.length < state.garage.bays;
  }
  const reserved = fleetActive(state) ? 1 : 0;
  const nonFleet = running.filter((item) => !item.contractId).length;
  return nonFleet < state.garage.bays - reserved;
}

export function canStart(state: GameState, content: Content, job: Job): boolean {
  if (job.status !== "waiting_materials" && job.status !== "queued") return false;
  if (!requirementsMet(state, content, job.service)) return false;
  if (missingMaterials(state, content, job).length > 0) return false;
  return bayFree(state, job);
}

function needRows(needs: Partial<Record<MaterialId, number>>): [MaterialId, number][] {
  return (Object.entries(needs) as [MaterialId, number | undefined][]).filter((entry): entry is [MaterialId, number] => (entry[1] ?? 0) > 0);
}

function applyConsumption(state: GameState, content: Content, job: Job, needs: Partial<Record<MaterialId, number>>): number {
  let cost = 0;
  let worst = job.qualityMod ?? Number.POSITIVE_INFINITY;
  let supplier = job.materialSource;
  let used = false;
  for (const [id, qty] of needRows(needs)) {
    const taken = consumeMaterials(state, content, id, qty);
    cost += taken.cost;
    used = true;
    if (taken.qualityMod < worst) {
      worst = taken.qualityMod;
      supplier = taken.supplier;
    }
    if (taken.usedRato) job.usedRato = true;
  }
  if (used && Number.isFinite(worst)) {
    job.qualityMod = worst;
    job.materialSource = supplier;
  }
  job.materialCost = (job.materialCost ?? 0) + cost;
  return cost;
}

export function promoteJobs(state: GameState, content: Content): void {
  for (const job of state.jobs) {
    if (job.status !== "waiting_materials" && job.status !== "queued") continue;
    const service = serviceOf(content, job.service);
    if (!service || !requirementsMet(state, content, job.service)) {
      job.status = "waiting_materials";
      continue;
    }
    const needs = job.pendingMaterials ?? service.materials;
    if (!hasMaterials(state, needs)) {
      job.status = "waiting_materials";
      continue;
    }
    if (!bayFree(state, job)) {
      job.status = "queued";
      continue;
    }
    const cost = applyConsumption(state, content, job, needs);
    job.pendingMaterials = undefined;
    job.status = "in_progress";
    if (cost > 0) bookReceipt(state, 0, 0, cost);
  }
}

export function receiveInbound(state: GameState, _content: Content, events: GfEvent[]): void {
  const orders = state.inbound ?? [];
  if (orders.length === 0) return;
  const due = orders.filter((order) => inboundDue(order, state));
  const home = state.flags.district == null || state.flags.district === "oficina";
  const week6 = state.calendar.week === 5;
  const drop = due.filter((order) => !(week6 && !home));
  if (drop.length === 0) return;
  state.inbound = orders.filter((order) => !drop.includes(order));
  for (const order of drop) {
    if (order.lost) {
      events.push({ type: "MATERIALS_ARRIVED", text: "perdido", amount: 0 });
      continue;
    }
    let qty = 0;
    for (const item of order.items) {
      receiveBatch(state, item.material, {
        supplier: order.supplier,
        qty: item.qty,
        unitCost: item.unitCost,
        baseCost: item.unitCost,
        ageWeeks: 0,
        boughtWeek: state.calendar.week,
      });
      qty += item.qty;
    }
    for (const food of order.foods ?? []) {
      if (!foodById(food.id)) continue;
      addPantry(state, food.id as FoodId, food.qty);
      qty += food.qty;
    }
    events.push({ type: "MATERIALS_ARRIVED", text: order.carrier ?? order.supplier, amount: qty });
  }
}

function inboundDue(order: NonNullable<GameState["inbound"]>[number], state: GameState): boolean {
  if (typeof order.arriveT === "number") return (state.clock?.t ?? 0) >= order.arriveT;
  return order.atWeek < state.calendar.week || (order.atWeek === state.calendar.week && order.atDay <= state.calendar.day);
}

function failJob(state: GameState, content: Content, job: Job, events: GfEvent[]): void {
  const service = serviceOf(content, job.service);
  job.reworks += 1;
  job.apNeeded += Math.ceil(job.apNeeded / 2);
  const pending: Partial<Record<MaterialId, number>> = {};
  if (service) {
    for (const [id, qty] of Object.entries(service.materials)) {
      if (!qty) continue;
      pending[id as MaterialId] = Math.ceil(qty / 2);
    }
  }
  job.pendingMaterials = pending;
  if (hasMaterials(state, pending)) {
    const cost = applyConsumption(state, content, job, pending);
    job.pendingMaterials = undefined;
    job.status = "in_progress";
    if (cost > 0) bookReceipt(state, 0, 0, cost);
  } else job.status = "waiting_materials";
  events.push({ type: "JOB_FAILED", jobId: job.id, amount: job.reworks });
}

function ratoDefect(content: Content): number {
  return content.suppliers.find((item) => item.id === "rato")?.defect ?? 0;
}

function resolveQuality(state: GameState, content: Content, job: Job, events: GfEvent[]): void {
  job.apDone = job.apNeeded;
  const service = serviceOf(content, job.service);
  const difficulty = service?.difficulty ?? 1;
  if (job.usedRato && chance(state, ratoDefect(content))) {
    failJob(state, content, job, events);
    promoteJobs(state, content);
    return;
  }
  const hired = content.employees.find((item) => item.id === job.assignedTo);
  if (hired?.error && chance(state, hired.error)) {
    failJob(state, content, job, events);
    promoteJobs(state, content);
    return;
  }
  const odds = successChance(content, workerSkill(state, content, job), difficulty, job.qualityMod ?? 0, state.morale);
  if (!chance(state, odds)) {
    failJob(state, content, job, events);
    promoteJobs(state, content);
    return;
  }
  job.status = "ready";
  state.flags.jobsDone = flagNum(state, "jobsDone") + 1;
  events.push({ type: "JOB_READY", jobId: job.id });
  promoteJobs(state, content);
}

export function workOnJob(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  if (awayFromGarage(state)) throw new GameError("fora_da_oficina", "Você está na cidade. A volta também gasta ponto de ação.");
  const job = state.jobs.find((item) => item.id === action.jobId);
  if (!job) throw new GameError("servico_invalido", "Esse serviço não está na baia.");
  if (job.status === "waiting_materials" || job.status === "queued") throw new GameError("sem_peca", "Falta peça na prateleira.");
  if (job.status !== "in_progress") throw new GameError("servico_invalido", "Esse serviço não está na baia.");
  if (job.handId) throw new GameError("com_funcionario", "Esse serviço está com um funcionário da baía.");
  const want = Math.max(1, whole(action.ap) ?? 1);
  const left = job.apNeeded - job.apDone;
  if (left <= 0) return;
  const steps = Math.min(want, left);
  spendWorkAp(state, content, steps, events);
  job.apDone += steps;
  if (job.apDone < job.apNeeded) {
    events.push({ type: "JOB_WORKED", jobId: job.id, amount: job.apDone });
    return;
  }
  resolveQuality(state, content, job, events);
}

function fitsSkill(content: Content, employee: HiredEmployee, job: Job): boolean {
  const bonus = content.employees.find((item) => item.id === employee.id)?.skillBonus?.[job.service] ?? 0;
  const difficulty = serviceOf(content, job.service)?.difficulty ?? 1;
  return difficulty <= employee.skill + bonus;
}

function claimJob(state: GameState, content: Content, employee: HiredEmployee): Job | undefined {
  const owned = state.jobs.find((job) => job.assignedTo === employee.id && job.status === "in_progress");
  if (owned) return owned;
  const open = state.jobs.find((job) => job.status === "in_progress" && job.assignedTo === "teo" && !job.handId && fitsSkill(content, employee, job));
  if (!open) return undefined;
  open.assignedTo = employee.id as EmployeeId;
  return open;
}

/** No fim do dia a equipe gasta o PA dela. Téo não entra nessa conta. */
export function runStaffDay(state: GameState, content: Content, events: GfEvent[]): void {
  for (const employee of state.employees) {
    if (employee.apPerDay <= 0) continue;
    if (employee.sickUntilWeek != null && state.calendar.week < employee.sickUntilWeek) continue;
    let ap = employee.apPerDay;
    if (employee.owedWeeks >= 1) ap = Math.max(0, ap - 1);
    while (ap > 0) {
      const job = claimJob(state, content, employee);
      if (!job) break;
      const room = job.apNeeded - job.apDone;
      if (room <= 0) break;
      const steps = Math.min(ap, room);
      job.apDone += steps;
      ap -= steps;
      if (job.apDone < job.apNeeded) {
        events.push({ type: "STAFF_WORKED", jobId: job.id, text: employee.id, amount: steps });
        break;
      }
      resolveQuality(state, content, job, events);
    }
  }
  runHands(state, events);
}

type BuyItem = { material: MaterialId; qty: number };

function parseBuy(action: Record<string, unknown>, content: Content): { supplier: SupplierId; items: BuyItem[]; terms: "cash" | "prazo14" | "3x" } {
  const ids = new Set(content.materials.map((item) => item.id));
  const terms = action.terms == null ? "cash" : action.terms;
  if (terms !== "cash" && terms !== "prazo14" && terms !== "3x") throw new GameError("compra_invalida", "Essa condição não existe.");
  const items: BuyItem[] = [];
  if (Array.isArray(action.items)) {
    for (const row of action.items) {
      if (!row || typeof row !== "object") throw new GameError("compra_invalida", "Esse material não está na lista.");
      const material = (row as { material?: unknown }).material;
      const qty = whole((row as { qty?: unknown }).qty);
      if (typeof material !== "string" || !ids.has(material as MaterialId) || qty == null || qty <= 0) {
        throw new GameError("compra_invalida", "Esse material não está na lista.");
      }
      items.push({ material: material as MaterialId, qty });
    }
    if (items.length === 0) throw new GameError("compra_invalida", "O pedido veio vazio.");
    return { supplier: asSupplier(String(action.supplier ?? "")), items, terms };
  }
  const material = action.material;
  const qty = whole(action.qty);
  if (typeof material !== "string" || !ids.has(material as MaterialId) || qty == null || qty <= 0) {
    throw new GameError("compra_invalida", "Esse material não está na lista.");
  }
  const supplier = typeof action.supplier === "string" ? asSupplier(action.supplier) : "ferro_velho";
  return { supplier, items: [{ material: material as MaterialId, qty }], terms };
}

function awayFromGarage(state: GameState): boolean {
  const district = state.flags.district;
  return typeof district === "string" && district !== "oficina";
}

function buy(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const order = parseBuy(action, content);
  const district = state.flags.district;
  if (typeof district === "string" && district !== order.supplier) {
    throw new GameError("longe_da_loja", "Você não está nesse balcão.");
  }
  if (typeof district === "string") assertOpen(content, order.supplier, state.clock.t);
  const supplier = supplierRow(content, order.supplier);
  let cost = 0;
  const priced = order.items.map((item) => {
    const price = supplier.prices[item.material];
    if (price == null) throw new GameError("compra_invalida", "Esse fornecedor não vende isso.");
    const min = supplier.minOrder?.[item.material];
    if (min != null && item.qty < min) throw new GameError("pedido_minimo", "A Megaosso só solta a partir do pedido mínimo.");
    cost += price * item.qty;
    return { ...item, unitCost: price };
  });
  assertShelf(state, order.items.reduce((sum, item) => sum + item.qty, 0));
  if (order.terms === "prazo14") {
    if (supplier.creditDays == null) throw new GameError("prazo_recusado", "Esse fornecedor não vende a prazo.");
    if (state.rep < (supplier.creditRep ?? 0)) throw new GameError("prazo_recusado", "A reputação ainda não abre o prazo.");
    if (state.flags.negativado === true) throw new GameError("prazo_recusado", "O nome está sujo. A Casco-Tech recusou.");
    const open = state.debts.filter((debt) => debt.template === "fornecedor_casco" && debt.balance > 0).reduce((sum, debt) => sum + debt.balance, 0);
    if (open + cost > (supplier.creditLimit ?? 0)) throw new GameError("prazo_recusado", "O limite da Casco-Tech não cobre esse pedido.");
    const due = addCalendarDays(state.calendar.week, state.calendar.day, supplier.creditDays);
    const debt = makeDebt(content, "fornecedor_casco", cost, state.calendar.week, { dueWeek: due.week });
    debt.id = `casco-${seq(state)}`;
    state.debts.push(debt);
  } else if (order.terms === "3x") {
    if (supplier.installments == null) throw new GameError("prazo_recusado", "Esse fornecedor não parcela.");
    const total = Math.round(cost * (1 + (supplier.installmentMarkup ?? 0)));
    const parts = supplier.installments;
    const debt = makeDebt(content, "parcelado", total, state.calendar.week, { weeks: parts });
    debt.id = `parcelado-${seq(state)}`;
    debt.weeklyBps = 0;
    debt.installmentsLeft = parts;
    debt.pricePayment = Math.ceil(total / parts);
    debt.minPayment = debt.pricePayment;
    debt.principal = total;
    debt.balance = total;
    state.debts.push(debt);
  } else if (state.cash - cost < -state.overdraftLimit) {
    throw new GameError("sem_caixa", "O cheque especial não cobre essa compra.");
  } else state.cash -= cost;

  const ap = supplier.ap ?? 0;
  if (ap > 0) spendWorkAp(state, content, ap, events);
  if (ap > 0) {
    for (const item of priced) {
      receiveBatch(state, item.material, {
        supplier: order.supplier,
        qty: item.qty,
        unitCost: item.unitCost,
        baseCost: item.unitCost,
        ageWeeks: 0,
        boughtWeek: state.calendar.week,
      });
    }
    events.push({ type: "BOUGHT", text: supplier.nome, amount: cost });
  } else {
    const when = nextWorkDay(state.calendar.week, state.calendar.day);
    const inbound = state.inbound ?? [];
    inbound.push({
      id: `in-${seq(state)}`,
      supplier: order.supplier,
      items: priced.map((item) => ({ material: item.material, qty: item.qty, unitCost: item.unitCost })),
      atWeek: when.week,
      atDay: when.day,
    });
    state.inbound = inbound;
    events.push({ type: "BOUGHT", text: "amanha", amount: cost });
  }

  if (supplier.raidChance != null) {
    const count = flagNum(state, "ratoPurchases") + 1;
    state.flags.ratoPurchases = count;
    if (count >= (supplier.raidFromPurchase ?? 3) && chance(state, supplier.raidChance)) {
      removeSupplierStock(state, order.supplier);
      state.cash -= supplier.raidFine ?? 0;
      bumpRep(state, content, supplier.raidRep ?? 0, "batida policial");
      state.flags.irregular_rato = true;
      events.push({ type: "RAID", amount: supplier.raidFine ?? 0, text: supplier.nome });
    }
  }
  promoteJobs(state, content);
}

function sellScrap(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const material = action.material;
  const qty = whole(action.qty);
  const ids = content.materials.map((item) => item.id);
  if (typeof material !== "string" || !ids.includes(material as MaterialId) || qty == null || qty <= 0) {
    throw new GameError("venda_invalida", "Essa sucata não está na prateleira.");
  }
  const taken = consumeMaterials(state, content, material as MaterialId, qty);
  const scrap = content.suppliers.find((item) => item.id === "ferro_velho")?.scrapBuy ?? 0;
  const margin = content.garageLevels[state.garage.level]?.resaleMargin ?? 0;
  const pay = Math.round(taken.cost * scrap * (1 + margin));
  bookReceipt(state, pay, pay, 0);
  events.push({ type: "SOLD_SCRAP", text: material, amount: pay });
}

function assign(state: GameState, action: Record<string, unknown>, events: GfEvent[]): void {
  const job = state.jobs.find((item) => item.id === action.jobId);
  if (!job) throw new GameError("servico_invalido", "Esse serviço não está na baia.");
  if (action.worker === "teo") job.assignedTo = "teo";
  else {
    const employee = state.employees.find((item) => item.id === action.worker);
    if (!employee) throw new GameError("sem_funcionario", "Esse braço não está na oficina.");
    job.assignedTo = employee.id;
  }
  events.push({ type: "ASSIGNED", jobId: job.id, text: String(job.assignedTo) });
}

export const TIOZAO_PRICES: Partial<Record<MaterialId, number>> = {
  kit: 15,
  oleo: 25,
  chapa: 35,
  cabo: 70,
  osso: 50,
};

export const CARRIERS = {
  dinoturbo: { nome: "DinoTurbo", frase: "Mais barato e mais devagar.", freightBase: 8, freightEach: 4, minutesBase: 80, minutesEach: 15, loss: 0.01 },
  dinodrone: { nome: "DinoDrone", frase: "Mais caro e mais rápido.", freightBase: 20, freightEach: 9, minutesBase: 30, minutesEach: 5, loss: 0.005 },
} as const;

export type CarrierId = keyof typeof CARRIERS;

export function deliveryQuote(units: number, carrier: CarrierId): { freight: number; minutes: number; loss: number } {
  const row = CARRIERS[carrier];
  const n = Math.max(0, Math.floor(units));
  return { freight: row.freightBase + row.freightEach * n, minutes: row.minutesBase + row.minutesEach * n, loss: row.loss };
}

function orderParts(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const carrier = action.carrier === "dinodrone" ? "dinodrone" : action.carrier === "dinoturbo" ? "dinoturbo" : null;
  if (!carrier) throw new GameError("compra_invalida", "Escolhe o DinoTurbo ou o DinoDrone.");
  const ids = new Set(content.materials.map((item) => item.id));
  const items: { material: MaterialId; qty: number }[] = [];
  for (const row of Array.isArray(action.items) ? action.items : []) {
    if (!row || typeof row !== "object") throw new GameError("compra_invalida", "Esse material não está na lista.");
    const material = (row as { material?: unknown }).material;
    const qty = whole((row as { qty?: unknown }).qty);
    if (typeof material !== "string" || !ids.has(material as MaterialId) || qty == null || qty <= 0) {
      throw new GameError("compra_invalida", "Esse material não está na lista.");
    }
    if (TIOZAO_PRICES[material as MaterialId] == null) throw new GameError("compra_invalida", "O Tiozão não tem essa peça.");
    items.push({ material: material as MaterialId, qty });
  }
  const foods: { id: FoodId; qty: number; unitCost: number }[] = [];
  for (const row of Array.isArray(action.foods) ? action.foods : []) {
    if (!row || typeof row !== "object") throw new GameError("compra_invalida", "Essa comida não está na lista.");
    const food = foodById(String((row as { food?: unknown }).food ?? ""));
    const qty = whole((row as { qty?: unknown }).qty);
    if (!food || !food.stall || food.price <= 0 || qty == null || qty <= 0) {
      throw new GameError("compra_invalida", "O Tiozão não entrega essa comida.");
    }
    foods.push({ id: food.id, qty, unitCost: food.price });
  }
  if (items.length === 0 && foods.length === 0) throw new GameError("compra_invalida", "O pedido veio vazio.");
  assertShelf(state, items.reduce((sum, item) => sum + item.qty, 0));
  const units = items.reduce((sum, item) => sum + item.qty, 0) + foods.reduce((sum, item) => sum + item.qty, 0);
  const quote = deliveryQuote(units, carrier);
  const priced = items.map((item) => ({ ...item, unitCost: TIOZAO_PRICES[item.material] ?? 0 }));
  const goods = priced.reduce((sum, item) => sum + item.unitCost * item.qty, 0) + foods.reduce((sum, item) => sum + item.unitCost * item.qty, 0);
  const cost = goods + quote.freight;
  if (state.cash - cost < -state.overdraftLimit) throw new GameError("sem_caixa", "O limite do banco não cobre essa entrega.");
  state.cash -= cost;
  const now = state.clock?.t ?? state.calendar.week * WEEK + (state.calendar.day - 1) * DAY;
  const arrive = now + quote.minutes;
  const week = Math.floor(arrive / WEEK);
  const day = (Math.floor((arrive % WEEK) / DAY) + 1) as Day;
  const inbound = state.inbound ?? [];
  inbound.push({
    id: `in-${seq(state)}`,
    supplier: "ferro_velho",
    items: priced,
    foods,
    atWeek: week,
    atDay: day,
    fromT: now,
    arriveT: arrive,
    carrier,
    lost: chance(state, quote.loss),
    freight: quote.freight,
  });
  state.inbound = inbound;
  events.push({ type: "BOUGHT", text: carrier, amount: cost });
}

export function applyProduction(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "BUY") {
    buy(state, content, action, events);
    return true;
  }
  if (kind === "ORDER_PARTS") {
    orderParts(state, content, action, events);
    return true;
  }
  if (kind === "SELL_SCRAP") {
    sellScrap(state, content, action, events);
    return true;
  }
  if (kind === "ASSIGN") {
    assign(state, action, events);
    return true;
  }
  if (kind === "WORK_JOB") {
    workOnJob(state, content, action, events);
    return true;
  }
  if (kind === "WORK") {
    const job = state.jobs.find((item) => item.id === action.jobId);
    if (!job) return false;
    workOnJob(state, content, action, events);
    return true;
  }
  return false;
}
