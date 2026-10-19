import type { Content, DebtTemplate } from "./content.ts";
import { GameError } from "./errors.ts";
import { bps } from "./format.ts";
import { addMorale } from "./morale.ts";
import { addRep } from "./reputation.ts";
import { int } from "./rng.ts";
import { consumeMaterials } from "./stock.ts";
import type { Debt, GameState, MaterialId, WeekSummary } from "./state.ts";
import { savingsBps, serviceOf } from "./content.ts";

export type GfEvent = {
  type: string;
  summary?: WeekSummary;
  week?: number;
  day?: number;
  amount?: number;
  text?: string;
  debtId?: string;
  leadId?: string;
  jobId?: string;
  receivableId?: string;
  cardId?: string;
};

export type CloseTally = {
  tax: number;
  received: number;
  fixed: number;
  interest: number;
  debtPaid: number;
  charged: Map<string, number>;
  missedNow: Set<string>;
};

type Action = Record<string, unknown>;

export function templateOf(content: Content, id: string): DebtTemplate {
  const tpl = content.debtTemplates[id];
  if (!tpl) throw new GameError("divida_desconhecida", "Essa dívida não existe.");
  return tpl;
}

export function priceInstallment(pv: number, weeklyBps: number, weeks: number): number {
  if (weeks <= 0 || pv <= 0) throw new GameError("prazo_invalido", "O prazo do empréstimo não fecha.");
  const r = weeklyBps / 10000;
  if (r === 0) return Math.ceil(pv / weeks);
  return Math.ceil((pv * r) / (1 - (1 + r) ** -weeks));
}

export function makeDebt(
  content: Content,
  templateId: string,
  balance: number,
  week: number,
  extra: { dueWeek?: number; weeks?: number } = {},
): Debt {
  const tpl = templateOf(content, templateId);
  const weeks = extra.weeks ?? tpl.weeks;
  const price = tpl.min === "price" && weeks ? priceInstallment(balance, tpl.bps, weeks) : undefined;
  return {
    id: templateId,
    template: templateId,
    creditor: tpl.creditor,
    principal: balance,
    balance,
    weeklyBps: tpl.bps,
    minPayment: tpl.min === "interest" ? "interest" : tpl.min === "pct15" ? "pct15" : (tpl.minValue ?? price ?? 0),
    installmentsLeft: weeks,
    missed: 0,
    secured: Boolean(tpl.secured),
    createdWeek: week,
    totalPaid: 0,
    statement: tpl.min === "pct15" ? balance : undefined,
    revolving: tpl.min === "pct15" ? 0 : undefined,
    dueWeek: extra.dueWeek ?? tpl.dueWeek,
    penaltyApplied: false,
    pricePayment: price,
    earlyPenaltyBps: tpl.earlyPenaltyBps,
    annuity: tpl.annuity,
  };
}

export function openingDebts(content: Content): Debt[] {
  return content.balance.inherited.map((row) =>
    makeDebt(content, row.template, row.balance, 0, { dueWeek: row.dueWeek }),
  );
}

/** Juros compostos sem pagamento. Usado na prova do agiota. */
export function compoundUnchecked(principal: number, weeklyBps: number, weeks: number): number {
  let balance = principal;
  for (let i = 0; i < weeks; i += 1) balance += bps(balance, weeklyBps);
  return balance;
}

/** Parcela fixa sempre paga. Prova do banco do pai. */
export function projectMinimum(principal: number, weeklyBps: number, payment: number): { weeks: number; totalPaid: number } {
  let balance = principal;
  let totalPaid = 0;
  let weeks = 0;
  while (balance > 0 && weeks < 600) {
    balance += bps(balance, weeklyBps);
    const pay = Math.min(payment, balance);
    if (pay <= 0) break;
    balance -= pay;
    totalPaid += pay;
    weeks += 1;
  }
  return { weeks, totalPaid };
}

export function amortizationSchedule(debt: Debt): { week: number; payment: number; interest: number; principal: number; balance: number }[] {
  const rows: { week: number; payment: number; interest: number; principal: number; balance: number }[] = [];
  let balance = debt.balance;
  const installment = debt.pricePayment ?? 0;
  const left = debt.installmentsLeft ?? 0;
  for (let week = 1; week <= left && balance > 0; week += 1) {
    const interest = bps(balance, debt.weeklyBps);
    balance += interest;
    const payment = Math.min(installment > 0 ? installment : balance, balance);
    const principal = payment - interest;
    balance = Math.max(0, balance - payment);
    rows.push({ week, payment, interest, principal, balance });
  }
  return rows;
}

export function netWorth(state: GameState, content: Content): number {
  const stock = Object.values(state.inventory).reduce((sum, lot) => sum + (lot ? lot.qty * lot.avgCost : 0), 0);
  const assets = state.assets.reduce((sum, asset) => sum + asset.value, 0);
  const savings = state.savings.cofrinho + state.savings.tesouro + state.savings.fundo;
  const receivables = state.receivables.reduce((sum, item) => sum + item.value, 0);
  const carcasses = state.carcasses.reduce((sum, item) => sum + item.boughtFor, 0);
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  return Math.round(
    state.cash + savings + stock * content.balance.inventoryNetFactor + assets + receivables * content.balance.receivableNetFactor + carcasses - debt,
  );
}

function groupOf(content: Content, debt: Debt): string {
  return content.debtTemplates[debt.template]?.group ?? "outras";
}

function amountDue(state: GameState, content: Content, debt: Debt, charged: Map<string, number>): number {
  if (debt.balance <= 0) return 0;
  const tpl = content.debtTemplates[debt.template];
  if (!tpl || tpl.min === "auto") return 0;
  if (tpl.min === "full") {
    const due = debt.dueWeek ?? tpl.dueWeek ?? 0;
    return state.calendar.week >= due ? debt.balance : 0;
  }
  if (tpl.min === "interest") return Math.min(debt.balance, charged.get(debt.id) ?? 0);
  if (tpl.min === "pct15") {
    const fatura = (debt.statement ?? 0) + (debt.revolving ?? 0);
    return Math.min(debt.balance, Math.round((fatura * (tpl.pct ?? 15)) / 100));
  }
  if (tpl.min === "price") {
    if (debt.dueWeek != null && state.calendar.week < debt.dueWeek) return 0;
    return Math.min(debt.balance, debt.pricePayment ?? 0);
  }
  return Math.min(debt.balance, tpl.minValue ?? 0);
}

function applyPay(debt: Debt, amount: number): void {
  let left = amount;
  if (debt.statement != null) {
    const cut = Math.min(debt.statement, left);
    debt.statement -= cut;
    left -= cut;
  }
  if (debt.revolving != null && left > 0) debt.revolving = Math.max(0, debt.revolving - left);
  debt.balance = Math.max(0, debt.balance - amount);
  debt.totalPaid += amount;
  if (debt.installmentsLeft != null && debt.installmentsLeft > 0) debt.installmentsLeft -= 1;
}

export function stepInterest(state: GameState, content: Content, tally: CloseTally): void {
  for (const debt of state.debts) {
    if (debt.balance <= 0) continue;
    const tpl = content.debtTemplates[debt.template];
    if (!tpl) continue;
    if (tpl.min === "pct15") {
      const interest = bps(debt.revolving ?? 0, tpl.bps);
      debt.revolving = (debt.revolving ?? 0) + interest;
      debt.balance += interest;
      tally.interest += interest;
      tally.charged.set(debt.id, interest);
      continue;
    }
    if (tpl.min === "full") {
      const due = debt.dueWeek ?? tpl.dueWeek ?? 0;
      if (state.calendar.week <= due) continue;
      if (!debt.penaltyApplied) {
        debt.balance += bps(debt.balance, tpl.penaltyBps ?? 0);
        debt.penaltyApplied = true;
        debt.weeklyBps = tpl.lateBps ?? debt.weeklyBps;
      }
    }
    const interest = bps(debt.balance, debt.weeklyBps);
    debt.balance += interest;
    tally.interest += interest;
    tally.charged.set(debt.id, interest);
  }
}

export function stepMinimums(state: GameState, content: Content, tally: CloseTally): void {
  const order = state.paymentPriority;
  const debts = [...state.debts].sort((a, b) => {
    const ia = order.indexOf(groupOf(content, a));
    const ib = order.indexOf(groupOf(content, b));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const floor = -state.overdraftLimit;
  for (const debt of debts) {
    const due = amountDue(state, content, debt, tally.charged);
    if (due <= 0) continue;
    if (state.cash - due < floor) {
      debt.missed += 1;
      tally.missedNow.add(debt.id);
      continue;
    }
    state.cash -= due;
    applyPay(debt, due);
    tally.debtPaid += due;
  }
}

export function stepCard(state: GameState, content: Content): void {
  for (const debt of state.debts) {
    const tpl = content.debtTemplates[debt.template];
    if (!tpl || tpl.min !== "pct15") continue;
    debt.revolving = (debt.revolving ?? 0) + (debt.statement ?? 0);
    debt.statement = 0;
    debt.balance = debt.revolving;
    if (debt.annuity && debt.balance > 0) state.cash -= debt.annuity;
  }
}

export function stepOverdraft(state: GameState, content: Content): void {
  if (state.cash >= 0) return;
  const tpl = content.debtTemplates.cheque_especial;
  const limit = tpl?.limit ?? state.overdraftLimit;
  let debt = state.debts.find((item) => item.template === "cheque_especial");
  const room = Math.max(0, limit - (debt?.balance ?? 0));
  const cover = Math.min(-state.cash, room);
  if (cover <= 0) return;
  if (!debt) {
    debt = makeDebt(content, "cheque_especial", 0, state.calendar.week);
    debt.balance = 0;
    debt.principal = 0;
    state.debts.push(debt);
  }
  debt.balance += cover;
  debt.principal += cover;
  state.cash += cover;
}

export function stepYields(state: GameState, content: Content): void {
  const cofrinho = bps(state.savings.cofrinho, savingsBps(content, "cofrinho"));
  const tesouro = bps(state.savings.tesouro, savingsBps(content, "tesouro"));
  state.savings.cofrinho += cofrinho;
  state.savings.tesouro += tesouro;
  let fund = 0;
  if (state.savings.fundo > 0) {
    fund = bps(state.savings.fundo, int(state, -150, 200));
    state.savings.fundo = Math.max(0, state.savings.fundo + fund);
  }
  state.flags.yieldCofrinho = cofrinho;
  state.flags.yieldTesouro = tesouro;
  state.flags.yieldFundo = fund;
  for (const pending of state.savings.pendingWithdraw) state.cash += pending.value;
  state.savings.pendingWithdraw = [];
}

export function stepProtection(state: GameState, content: Content): void {
  const value = state.flags.protection;
  if (typeof value !== "number" || value <= 0) return;
  state.cash -= value;
  addMorale(state, content, content.balance.gang.morale);
  const every = content.balance.gang.every;
  if (every > 0 && (state.calendar.week + 1) % every === 0) {
    state.flags.protection = value + bps(value, content.balance.gang.bumpBps);
  }
}

function sweep(state: GameState): void {
  state.debts = state.debts.filter((debt) => debt.balance > 0);
}

export function stepBooks(state: GameState, content: Content, tally: CloseTally, events: GfEvent[]): void {
  const rules = content.balance.failures;
  if (state.debts.some((debt) => debt.missed >= rules.dirtyMissed)) state.flags.negativado = true;
  if (state.flags.negativado === true) {
    const clean = tally.missedNow.size === 0 ? Number(state.flags.cleanWeeks ?? 0) + 1 : 0;
    state.flags.cleanWeeks = clean;
    if (clean >= rules.cleanWeeks) {
      state.flags.negativado = false;
      state.flags.cleanWeeks = 0;
    }
  }
  state.flags.weeksClean = tally.missedNow.size === 0 ? Number(state.flags.weeksClean ?? 0) + 1 : 0;

  const bank = state.debts.find((debt) => debt.template === "banco_pai");
  if (bank && tally.missedNow.has(bank.id) && (bank.missed === 1 || bank.missed === 2)) {
    events.push({ type: "BANK_WARNING", amount: bank.missed, week: state.calendar.week });
  }
  const agiota = state.debts.find((debt) => debt.template === "agiota_juca");
  if (agiota && tally.missedNow.has(agiota.id) && agiota.missed === rules.agiotaCharge) {
    const richest = [...state.assets].sort((a, b) => b.value - a.value)[0];
    if (richest) state.assets = state.assets.filter((asset) => asset.id !== richest.id);
    if (richest?.id === "compressor") state.garage.hasCompressor = false;
    const hit = addMorale(state, content, rules.cobrancaMorale);
    events.push({ type: "COBRANCA", text: richest ? richest.name : "nada para levar", week: state.calendar.week });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
  }

  if (!state.ending && bank && bank.missed >= rules.bankMissed) state.ending = "F2_banco";
  if (!state.ending && agiota && agiota.missed >= rules.agiotaMissed) state.ending = "F4_agiota";
  if (state.cash < rules.overdraft) {
    state.failure.redAlertWeeks += 1;
    if (state.failure.redAlertWeeks === 1) events.push({ type: "RED_ALERT", week: state.calendar.week });
    if (!state.ending && state.failure.redAlertWeeks >= 2) state.ending = "F1_caixa";
  } else state.failure.redAlertWeeks = 0;
  const worth = netWorth(state, content);
  if (worth < rules.insolvencyWarn && worth >= rules.insolvency) events.push({ type: "INSOLVENCE_WARN", amount: worth });
  if (!state.ending && worth < rules.insolvency) state.ending = "F3_insolvencia";
  const recent = state.collapses.filter((week) => state.calendar.week - week < rules.collapseWindow && state.calendar.week - week >= 0);
  if (!state.ending && recent.length >= rules.collapseCount) state.ending = "F5_desistencia";
  if (!state.ending && state.calendar.week >= rules.campaignWeeks) {
    const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
    const reserve = state.savings.cofrinho + state.savings.tesouro;
    const reserveNeed = content.balance.freedom.reserveWeeks * (content.balance.fixed.districtBase + content.balance.fixed.energyBase + content.balance.fixed.living);
    state.ending = state.garage.level >= 4 && debt === 0 && reserve >= reserveNeed ? "prosperidade" : "sobrevivencia";
  }
  sweep(state);
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function requireOpen(state: GameState): void {
  if (state.ending) throw new GameError("encerrada", "Campanha encerrada.");
}

function manual(state: GameState, nextCash: number): void {
  if (nextCash < -state.overdraftLimit) throw new GameError("sem_caixa", "O cheque especial não cobre essa compra.");
}

export function bookReceipt(state: GameState, amount: number, revenue: number, materials: number): void {
  const received = Number(state.flags.receivedWeek ?? 0) + amount;
  const sold = Number(state.flags.revenueWeek ?? 0) + revenue;
  const spent = Number(state.flags.materialsWeek ?? 0) + materials;
  state.flags.receivedWeek = received;
  state.flags.revenueWeek = sold;
  state.flags.materialsWeek = spent;
  const pct = state.savings.autoDepositPct;
  const saved = pct > 0 ? Math.round((amount * pct) / 100) : 0;
  state.savings.cofrinho += saved;
  state.cash += amount - saved;
}

export function applyFinance(state: GameState, action: Action, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type);
  const known = ["PAY_DEBT", "SET_PRIORITY", "SAVE", "WITHDRAW", "SET_AUTODEPOSIT", "TAKE_LOAN", "SELL_ASSET", "WORK", "STUDY", "GANG", "UPGRADE", "ACK"];
  if (!known.includes(kind)) return false;
  requireOpen(state);

  if (kind === "ACK") {
    const key = action.key;
    const allowed = ["sawPrologue", "heardJuca", "heardCard", "heardEasy"];
    if (typeof key !== "string" || !allowed.includes(key)) throw new GameError("acao_invalida", "Ação não reconhecida.");
    state.flags[key] = true;
    events.push({ type: "ACK" });
    return true;
  }

  if (kind === "PAY_DEBT") {
    const debt = state.debts.find((item) => item.id === action.debtId);
    const value = whole(action.value);
    if (!debt || value == null || value <= 0 || value > debt.balance) throw new GameError("pagamento_invalido", "Esse pagamento não cabe na dívida.");
    const penalty = debt.earlyPenaltyBps ? bps(value, debt.earlyPenaltyBps) : 0;
    manual(state, state.cash - value - penalty);
    state.cash -= value + penalty;
    applyPay(debt, value);
    events.push({ type: "DEBT_PAID", debtId: debt.id, amount: value });
    sweep(state);
    return true;
  }

  if (kind === "SET_PRIORITY") {
    const order = action.order;
    const groups = ["agiota", "cartao", "banco", "fornecedor", "outras"];
    if (!Array.isArray(order) || order.length !== groups.length || groups.some((group) => !order.includes(group))) {
      throw new GameError("prioridade_invalida", "A ordem precisa ter os cinco grupos.");
    }
    state.paymentPriority = order.map(String);
    events.push({ type: "PRIORITY" });
    return true;
  }

  if (kind === "SAVE" || kind === "WITHDRAW") {
    const product = action.product;
    const value = whole(action.value);
    if ((product !== "cofrinho" && product !== "tesouro" && product !== "fundo") || value == null || value <= 0) {
      throw new GameError("reserva_invalida", "Diz quanto e em qual reserva.");
    }
    if (product === "fundo" && (state.garage.level < 3 || state.calendar.act < 3)) {
      throw new GameError("reserva_invalida", "O Fundo Faixa abre no ato 3, com a oficina de verdade.");
    }
    if (kind === "SAVE") {
      if (state.cash < value) throw new GameError("sem_caixa", "Não guarda dinheiro que você não tem.");
      state.cash -= value;
      state.savings[product] += value;
      events.push({ type: "SAVED", amount: value, text: product });
      return true;
    }
    if (state.savings[product] < value) throw new GameError("sem_reserva", "A reserva não tem esse valor.");
    state.savings[product] -= value;
    if (product === "cofrinho") state.cash += value;
    else state.savings.pendingWithdraw.push({ product, value });
    events.push({ type: product === "cofrinho" ? "WITHDREW" : "WITHDRAW_PENDING", amount: value, text: product });
    return true;
  }

  if (kind === "SET_AUTODEPOSIT") {
    const pct = whole(action.pct);
    if (pct == null || pct < 0 || pct > content.balance.savingsAutoMax) throw new GameError("percentual_invalido", "O automático fica entre 0 e 50.");
    state.savings.autoDepositPct = pct;
    events.push({ type: "AUTODEPOSIT", amount: pct });
    return true;
  }

  if (kind === "TAKE_LOAN") {
    const id = String(action.template ?? "");
    const blocked = ["banco_pai", "fornecedor_casco", "cheque_especial"];
    if (blocked.includes(id) || !content.debtTemplates[id]) throw new GameError("credito_recusado", "Esse crédito não está na mesa.");
    if (state.debts.some((debt) => debt.template === id && debt.balance > 0)) throw new GameError("credito_recusado", "Você já deve para esse credor.");
    const tpl = templateOf(content, id);
    const value = whole(action.value);
    if (value == null || value <= 0 || (tpl.limit != null && value > tpl.limit)) throw new GameError("credito_recusado", "O valor não passa no limite.");
    const weeks = whole(action.weeks) ?? tpl.weeks ?? tpl.minWeeks;
    if (tpl.min === "price") {
      if (weeks == null) throw new GameError("prazo_invalido", "Falta o prazo.");
      if (tpl.minWeeks != null && weeks < tpl.minWeeks) throw new GameError("prazo_invalido", "O prazo é curto demais.");
      if (tpl.maxWeeks != null && weeks > tpl.maxWeeks) throw new GameError("prazo_invalido", "O prazo é longo demais.");
      if (tpl.weeks != null && weeks !== tpl.weeks) throw new GameError("prazo_invalido", "Esse crédito só tem um prazo.");
    }
    const needs = tpl.requires;
    if (needs?.rep != null && state.rep < needs.rep) throw new GameError("credito_recusado", "A reputação ainda não alcança.");
    if (needs?.clean && state.flags.negativado === true) throw new GameError("credito_recusado", "O nome está sujo.");
    if (needs?.weeksClean != null && Number(state.flags.weeksClean ?? 0) < needs.weeksClean) {
      throw new GameError("credito_recusado", "Ainda há atraso recente.");
    }
    if (needs?.lessons?.some((lesson) => !state.lessonsTriggered.includes(lesson))) {
      throw new GameError("credito_recusado", "Falta estudo para esse crédito.");
    }
    const debt = makeDebt(content, id, value, state.calendar.week, { weeks: weeks ?? undefined });
    state.debts.push(debt);
    state.cash += value;
    events.push({ type: "LOAN", debtId: debt.id, amount: value });
    return true;
  }

  if (kind === "SELL_ASSET") {
    const asset = state.assets.find((item) => item.id === action.assetId);
    if (!asset) throw new GameError("bem_sumiu", "Esse bem já não está na oficina.");
    state.cash += asset.value;
    if (asset.id === "compressor") state.garage.hasCompressor = false;
    state.assets = state.assets.filter((item) => item.id !== asset.id);
    state.decisionsLog.push({ week: state.calendar.week, label: `Vendeu ${asset.name}`, impact: asset.value });
    events.push({ type: "SOLD", text: asset.name, amount: asset.value });
    return true;
  }

  if (kind === "WORK") {
    const job = serviceOf(content, String(action.jobId ?? ""));
    if (!job) throw new GameError("servico_invalido", "Não tem esse serviço na baia.");
    if (job.requires.compressor && !state.garage.hasCompressor) throw new GameError("sem_compressor", "Sem compressor não tem funilaria.");
    if ((job.requires.level ?? 0) > state.garage.level) throw new GameError("servico_invalido", "A oficina ainda não sobe a esse serviço.");
    if (state.calendar.apLeft < job.ap) throw new GameError("sem_pa", "Sem ponto de ação.");
    for (const [id, need] of Object.entries(job.materials)) {
      const lot = state.inventory[id as MaterialId];
      if (!lot || lot.qty < need) throw new GameError("sem_peca", "Falta peça na prateleira.");
    }
    state.calendar.apLeft -= job.ap;
    const rule = content.balance;
    for (let i = 0; i < job.ap; i += 1) {
      state.calendar.apWorkedThisWeek += 1;
      if (state.calendar.apWorkedThisWeek > rule.overworkThreshold) addMorale(state, content, rule.overworkMorale);
    }
    let materials = 0;
    for (const [id, need] of Object.entries(job.materials)) {
      materials += consumeMaterials(state, content, id as MaterialId, need).cost;
    }
    bookReceipt(state, job.ref, job.ref, materials);
    addRep(state, content, rule.serviceRep, "serviço de rua");
    events.push({ type: "WORKED", text: job.nome, amount: job.ref });
    return true;
  }

  if (kind === "STUDY") {
    if (state.calendar.apLeft < content.balance.studyAp) throw new GameError("sem_pa", "Sem ponto de ação.");
    const next = content.lessons.find((lesson) => !state.lessonsTriggered.includes(lesson.id));
    if (!next) throw new GameError("sem_licao", "O caderno desta semana já foi lido.");
    state.calendar.apLeft -= content.balance.studyAp;
    state.lessonsTriggered.push(next.id);
    state.flags.lessonPop = next.id;
    const hit = addMorale(state, content, content.balance.studyMorale);
    events.push({ type: "STUDIED", text: next.title });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
    return true;
  }

  if (kind === "GANG") {
    if (state.flags.protection || state.flags.refusedGang) throw new GameError("ja_resolvido", "A gangue já teve a resposta.");
    if (action.accept === true) {
      state.flags.protection = content.balance.gang.base;
      state.decisionsLog.push({ week: state.calendar.week, label: "Pagou proteção", impact: -content.balance.gang.base });
      events.push({ type: "GANG_PAID" });
    } else {
      state.flags.refusedGang = true;
      state.decisionsLog.push({ week: state.calendar.week, label: "Recusou a gangue", impact: 0 });
      events.push({ type: "GANG_REFUSED" });
    }
    return true;
  }

  if (kind === "UPGRADE") {
    const level = state.garage.level;
    if (state.garage.upgradingTo != null) throw new GameError("obra_em_curso", "A obra ainda está de pé.");
    const next = content.garageLevels[level + 1];
    if (!next || next.cost <= 0 || level >= 5) throw new GameError("nivel_maximo", "A oficina não sobe mais.");
    const needRep = [0, 0, 30, 45, 60, 75][next.level] ?? 0;
    if (state.rep < needRep) throw new GameError("sem_fama", "A fama ainda não segura essa obra.");
    const mode = action.mode === "coop" || action.mode === "parcelado" ? action.mode : "vista";
    if (mode === "vista") {
      manual(state, state.cash - next.cost);
      state.cash -= next.cost;
    } else if (mode === "coop") {
      const tpl = content.debtTemplates.coop_ossada;
      if (!tpl) throw new GameError("credito_recusado", "A cooperativa não está na mesa.");
      if (state.rep < (tpl.requires?.rep ?? 35) || state.flags.negativado === true) {
        throw new GameError("credito_recusado", "A cooperativa recusou a obra.");
      }
      state.debts.push(makeDebt(content, "coop_ossada", next.cost, state.calendar.week, { weeks: tpl.weeks ?? tpl.maxWeeks }));
    } else {
      const principal = Math.round(next.cost * 1.17);
      state.debts.push(makeDebt(content, "parcelado", principal, state.calendar.week, { weeks: 12 }));
    }
    state.garage.upgradingTo = next.level;
    state.garage.bays = Math.max(1, state.garage.bays - 1);
    events.push({ type: "OBRA", amount: next.cost, text: next.nome });
    return true;
  }

  return false;
}
