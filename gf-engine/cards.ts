import type { CardCond, CardDef, CardEffect, CardOption } from "./cardSchema.ts";
import type { Content } from "./content.ts";
import { addScriptedLead, addWorkDays, spawnScheduledLead, workIndex } from "./contracts.ts";
import { GameError } from "./errors.ts";
import { ExprError, evalExpr } from "./expr.ts";
import { makeDebt, netWorth, type GfEvent } from "./finance.ts";
import { formatF } from "./format.ts";
import { addMorale } from "./morale.ts";
import { addRep } from "./reputation.ts";
import { chance, pickWeighted } from "./rng.ts";
import { produces } from "./staff.ts";
import { consumeMaterials, receiveBatch } from "./stock.ts";
import type { Day, EmployeeId, EndingId, FailureId, GameState, MaterialId, QueuedCard } from "./state.ts";

const ENDINGS = new Set<EndingId | FailureId>([
  "falencia",
  "peao",
  "sobrevivencia",
  "prosperidade",
  "liberdade",
  "abandoned",
  "F1_caixa",
  "F2_banco",
  "F3_insolvencia",
  "F4_agiota",
  "F5_desistencia",
]);
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PRODUCTS = new Set(["cofrinho", "tesouro", "fundo"]);

type Slots = { offer: boolean; other: boolean };

export function allCards(content: Content): CardDef[] {
  return [...content.cards.offers, ...content.cards.events, ...content.cards.story];
}

export function cardById(content: Content, id: string): CardDef | undefined {
  return allCards(content).find((card) => card.id === id);
}

export function hasBlockingCard(state: GameState, content: Content): boolean {
  return normalizeQueue(state).some((item) => cardById(content, item.cardId)?.blocking === true);
}

export function fillCardText(state: GameState, text: string): string {
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  return text
    .replaceAll("{nome}", state.player.name)
    .replaceAll("{caixa}", formatF(state.cash))
    .replaceAll("{divida}", formatF(debt))
    .replaceAll("{rep}", String(state.rep))
    .replaceAll("{animo}", String(state.morale))
    .replaceAll("{semana}", String(state.calendar.week));
}

export function shouldMarkFlags(flags: GameState["flags"]): boolean {
  return flags.accountant === true;
}

export function flagRanges(text: string, flags: string[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const sorted = [...flags].filter((flag) => flag.length > 0).sort((a, b) => b.length - a.length);
  for (const flag of sorted) {
    let from = 0;
    while (from < text.length) {
      const at = text.indexOf(flag, from);
      if (at < 0) break;
      const end = at + flag.length;
      if (!ranges.some((range) => at < range.end && end > range.start)) ranges.push({ start: at, end });
      from = end;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

const STAT_LABEL: Record<string, string> = {
  cash: "caixa",
  rep: "fama",
  morale: "Ânimo",
  level: "Nível",
  week: "semana",
  act: "ato",
  net_worth: "patrimônio",
  total_debt: "Dívida",
  bays: "baias",
};

export function requirementText(cond: CardCond): string {
  if ("stat" in cond) {
    const label = STAT_LABEL[cond.stat] ?? cond.stat;
    const cmp =
      cond.gte != null ? `≥ ${cond.gte}` : cond.gt != null ? `> ${cond.gt}` : cond.lte != null ? `≤ ${cond.lte}` : cond.lt != null ? `< ${cond.lt}` : `= ${cond.eq}`;
    return `Precisa de ${label} ${cmp}`;
  }
  if ("has_employee" in cond) return `Precisa de ${cond.has_employee} na oficina`;
  if ("has_debt" in cond) return `Precisa dever em ${cond.has_debt}`;
  if ("lesson_seen" in cond) return `Precisa da lição ${cond.lesson_seen}`;
  if ("hired_weeks" in cond) return `Precisa de ${cond.hired_weeks} há ${cond.gte} semanas`;
  if ("flag" in cond) return "Ainda não é a hora";
  if ("all" in cond) return cond.all.map((item) => requirementText(item)).join(" · ");
  if ("any" in cond) return cond.any.map((item) => requirementText(item)).join(" ou ");
  return `Não pode: ${requirementText(cond.not)}`;
}

export function optionBlock(state: GameState, content: Content, option: CardOption): string | null {
  for (const cond of option.requires) {
    if (!evalCond(state, content, cond)) return requirementText(cond);
  }
  return null;
}

function statOf(state: GameState, content: Content, stat: string): number {
  if (stat === "cash") return state.cash;
  if (stat === "rep") return state.rep;
  if (stat === "morale") return state.morale;
  if (stat === "level") return state.garage.level;
  if (stat === "week") return state.calendar.week;
  if (stat === "act") return state.calendar.act;
  if (stat === "bays") return state.garage.bays;
  if (stat === "total_debt") return state.debts.reduce((sum, debt) => sum + debt.balance, 0);
  return netWorth(state, content);
}

export function evalCond(state: GameState, content: Content, cond: CardCond): boolean {
  if ("stat" in cond) {
    const value = statOf(state, content, cond.stat);
    if (cond.lt != null && !(value < cond.lt)) return false;
    if (cond.lte != null && !(value <= cond.lte)) return false;
    if (cond.gt != null && !(value > cond.gt)) return false;
    if (cond.gte != null && !(value >= cond.gte)) return false;
    if (cond.eq != null && value !== cond.eq) return false;
    return true;
  }
  if ("flag" in cond) return state.flags[cond.flag] === cond.eq;
  if ("has_employee" in cond) return state.employees.some((employee) => employee.id === cond.has_employee);
  if ("has_debt" in cond) return state.debts.some((debt) => debt.balance > 0 && (debt.template === cond.has_debt || debt.id === cond.has_debt));
  if ("lesson_seen" in cond) return state.lessonsTriggered.includes(cond.lesson_seen);
  if ("hired_weeks" in cond) {
    const hired = state.employees.find((employee) => employee.id === cond.hired_weeks);
    return hired != null && state.calendar.week - hired.hiredWeek >= cond.gte;
  }
  if ("any" in cond) return cond.any.some((item) => evalCond(state, content, item));
  if ("all" in cond) return cond.all.every((item) => evalCond(state, content, item));
  if ("not" in cond) return !evalCond(state, content, cond.not);
  return false;
}

function debtBalance(state: GameState, template: string): number {
  return state.debts.filter((debt) => debt.template === template || debt.id === template).reduce((sum, debt) => sum + debt.balance, 0);
}

function amount(state: GameState, raw: number | string | boolean | undefined, label: string): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw !== "string") throw new GameError("expressao", `${label} não é um número.`);
  try {
    return Math.round(
      evalExpr(raw, {
        cash: state.cash,
        rep: state.rep,
        week: state.calendar.week,
        debt: (template) => debtBalance(state, template),
      }),
    );
  } catch (err) {
    if (err instanceof ExprError) throw new GameError("expressao", "Essa conta não fecha.");
    throw err;
  }
}

export function revealLesson(state: GameState, events: GfEvent[], id: string): void {
  if (state.lessonsTriggered.includes(id)) return;
  state.lessonsTriggered.push(id);
  state.flags.lessonPop = id;
  events.push({ type: "LESSON", text: id });
}

function bump(state: GameState, key: "scams_taken" | "scams_dodged"): void {
  const current = state.flags[key];
  state.flags[key] = (typeof current === "number" ? current : 0) + 1;
}

function keyOf(value: string | undefined, label: string): string {
  if (!value || !KEY.test(value)) throw new GameError("efeito_invalido", `${label} inválido.`);
  return value;
}

export function applyEffect(state: GameState, effect: CardEffect, ctx: { content: Content; events: GfEvent[]; source: string }): void {
  const { content, events, source } = ctx;
  if (effect.op === "cash") {
    const value = amount(state, effect.value, "caixa");
    state.cash += value;
    events.push({ type: "CASH", amount: value, text: source });
    return;
  }
  if (effect.op === "rep") {
    addRep(state, content, amount(state, effect.value, "fama"), source);
    return;
  }
  if (effect.op === "morale") {
    const hit = addMorale(state, content, amount(state, effect.value, "Ânimo"));
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
    return;
  }
  if (effect.op === "debt_add") {
    const template = effect.template ?? "";
    if (!content.debtTemplates[template]) throw new GameError("divida_desconhecida", "Essa dívida não existe.");
    const principal = amount(state, effect.principal, "principal");
    if (principal <= 0) throw new GameError("efeito_invalido", "O valor principal não fecha.");
    const debt = makeDebt(content, template, principal, state.calendar.week, { weeks: effect.weeks });
    if (state.debts.some((item) => item.id === debt.id)) debt.id = `${template}-${state.debts.length + 1}`;
    state.debts.push(debt);
    events.push({ type: "LOAN", debtId: debt.id, amount: principal, text: source });
    return;
  }
  if (effect.op === "debt_pay") {
    const value = amount(state, effect.value, "pagamento");
    const debt = state.debts.find((item) => item.id === effect.debt_id || item.template === (effect.debt_id ?? effect.template));
    if (!debt || debt.balance <= 0) throw new GameError("divida_desconhecida", "Essa dívida não está aberta.");
    const pay = Math.min(debt.balance, Math.max(0, value));
    if (state.cash - pay < -state.overdraftLimit) throw new GameError("sem_caixa", "O limite do banco não cobre esse pagamento.");
    state.cash -= pay;
    debt.balance -= pay;
    debt.totalPaid += pay;
    if (debt.statement != null) debt.statement = Math.max(0, debt.statement - pay);
    events.push({ type: "DEBT_PAID", debtId: debt.id, amount: pay });
    return;
  }
  if (effect.op === "asset_remove") {
    const asset = state.assets.find((item) => item.id === effect.asset_id);
    if (!asset) throw new GameError("bem_sumiu", "Esse bem já não está na oficina.");
    if (asset.id === "compressor") state.garage.hasCompressor = false;
    state.assets = state.assets.filter((item) => item.id !== asset.id);
    events.push({ type: "ASSET_LOST", text: asset.name, amount: asset.value });
    return;
  }
  if (effect.op === "stock") {
    const material = effect.material as MaterialId;
    const qty = amount(state, effect.qty, "estoque");
    if (qty > 0) {
      receiveBatch(state, material, {
        supplier: "ferro_velho",
        qty,
        unitCost: 0,
        baseCost: 0,
        ageWeeks: 0,
        boughtWeek: state.calendar.week,
      });
    } else if (qty < 0) {
      consumeMaterials(state, content, material, -qty);
    }
    events.push({ type: "STOCK", text: material, amount: qty });
    return;
  }
  if (effect.op === "flag") {
    const key = keyOf(effect.key, "marca");
    const value = effect.value;
    if (typeof value !== "boolean" && typeof value !== "number" && typeof value !== "string") {
      throw new GameError("efeito_invalido", "A meta não fecha.");
    }
    state.flags[key] = value;
    return;
  }
  if (effect.op === "schedule") {
    const shifted = addWorkDays(state.calendar.week + (effect.in_weeks ?? 0), state.calendar.day, effect.in_days ?? 0);
    state.scheduled.push({
      atWeek: shifted.week,
      atDay: shifted.day,
      ...(effect.card_id ? { cardId: effect.card_id } : {}),
      ...(effect.effects ? { effects: effect.effects.map((item) => ({ ...item })) } : {}),
      source,
      hidden: effect.hidden !== false,
    });
    return;
  }
  if (effect.op === "investment_add") {
    const value = amount(state, effect.value, "depósito");
    if (value <= 0) throw new GameError("efeito_invalido", "O depósito não fecha.");
    if (effect.scam_id) {
      state.scamInvestments.push({
        id: `scam-${state.scamInvestments.length + 1}`,
        scamId: effect.scam_id,
        principal: value,
        shownValue: value,
        week: state.calendar.week,
        status: "active",
      });
      events.push({ type: "SCAM_IN", text: effect.scam_id, amount: value });
      return;
    }
    if (!effect.product || !PRODUCTS.has(effect.product)) throw new GameError("efeito_invalido", "Esse produto não existe.");
    const product = effect.product as "cofrinho" | "tesouro" | "fundo";
    state.savings[product] += value;
    events.push({ type: "SAVED", amount: value, text: product });
    return;
  }
  if (effect.op === "employee_hire") {
    const id = keyOf(effect.id, "ajudante") as EmployeeId;
    const def = content.employees.find((item) => item.id === id);
    if (!def) throw new GameError("sem_funcionario", "Essa pessoa não existe.");
    if (state.employees.some((item) => item.id === id)) throw new GameError("sem_funcionario", "Essa pessoa já está na oficina.");
    const producers = state.employees.filter((item) => item.apPerDay > 0).length;
    if (produces(def) && producers >= state.garage.bays) throw new GameError("sem_baia", "Não tem baia para mais um ajudante.");
    state.employees.push({
      id,
      hiredWeek: state.calendar.week,
      salary: def.salary,
      skill: def.skill ?? 0,
      apPerDay: def.apPerDay ?? 0,
      owedWeeks: 0,
    });
    if (id === "ambar") state.flags.accountant = true;
    if (id === "zeca") state.flags.irregular_zeca = true;
    events.push({ type: "HIRED", text: id });
    return;
  }
  if (effect.op === "employee_fire") {
    const id = keyOf(effect.id, "ajudante") as EmployeeId;
    if (!state.employees.some((item) => item.id === id)) throw new GameError("sem_funcionario", "Essa pessoa não está na oficina.");
    state.employees = state.employees.filter((item) => item.id !== id);
    for (const job of state.jobs) {
      if (job.assignedTo === id) job.assignedTo = "teo";
    }
    if (id === "ambar") state.flags.accountant = false;
    events.push({ type: "FIRED", text: id, amount: 0 });
    return;
  }
  if (effect.op === "lead_add") {
    addScriptedLead(state, content, effect.client_type ?? "", effect.hidden_type, effect.contract_template, events);
    return;
  }
  if (effect.op === "lesson") {
    revealLesson(state, events, keyOf(effect.id, "lição"));
    return;
  }
  if (effect.op === "chance") {
    const rolled = chance(state, typeof effect.p === "number" ? effect.p : 0);
    for (const child of (rolled ? effect.effects : effect.otherwise) ?? []) {
      applyEffect(state, child, ctx);
    }
    return;
  }
  if (effect.op === "debt_merge") {
    const template = effect.template ?? "";
    if (!content.debtTemplates[template]) throw new GameError("divida_desconhecida", "Essa dívida não existe.");
    const total = state.debts.reduce((sum, debt) => sum + debt.balance, 0);
    if (total <= 0) throw new GameError("efeito_invalido", "Não tem dívida para juntar.");
    state.debts = [];
    const debt = makeDebt(content, template, total, state.calendar.week, { weeks: effect.weeks });
    state.debts.push(debt);
    events.push({ type: "LOAN", debtId: debt.id, amount: total, text: source });
    return;
  }
  if (effect.op === "unlock") {
    state.flags[keyOf(effect.key, "trava")] = true;
    return;
  }
  if (effect.op === "fixed_cost_add") {
    const id = keyOf(effect.id, "custo");
    const value = amount(state, typeof effect.value === "boolean" ? undefined : effect.value, "custo");
    const row = {
      id,
      value,
      ...(effect.until_week != null ? { untilWeek: effect.until_week } : {}),
      ...(effect.growth_every_weeks != null ? { growthEveryWeeks: effect.growth_every_weeks } : {}),
      ...(effect.growth_pct != null ? { growthPct: effect.growth_pct } : {}),
      bornWeek: state.calendar.week,
    };
    state.fixedRecurring = state.fixedRecurring.filter((item) => item.id !== id);
    state.fixedRecurring.push(row);
    return;
  }
  if (effect.op === "fixed_cost_remove") {
    const id = keyOf(effect.id, "custo");
    state.fixedRecurring = state.fixedRecurring.filter((item) => item.id !== id);
    return;
  }
  if (effect.op === "ending") {
    const id = effect.id as EndingId | FailureId;
    if (!ENDINGS.has(id)) throw new GameError("efeito_invalido", "Esse final não existe.");
    state.ending = id;
    events.push({ type: "ENDING", text: id });
  }
}

function normalizeQueue(state: GameState): QueuedCard[] {
  const raw = state.cardQueue as unknown;
  if (!Array.isArray(raw)) {
    state.cardQueue = [];
    return state.cardQueue;
  }
  state.cardQueue = raw.map((item) => {
    if (typeof item === "string") {
      return { cardId: item, week: state.calendar.week, day: state.calendar.day, opened: false };
    }
    return item as QueuedCard;
  });
  return state.cardQueue;
}

function remember(state: GameState, card: CardDef, optionId: string): void {
  state.cardHistory.push({ cardId: card.id, option: optionId, week: state.calendar.week });
  if (card.cooldown_weeks > 0) state.cooldowns[card.id] = state.calendar.week + card.cooldown_weeks;
  state.cardQueue = state.cardQueue.filter((item) => item.cardId !== card.id);
}

function declineOption(card: CardDef): CardOption {
  return card.options.find((option) => option.dodged_scam) ?? card.options.find((option) => option.id === "recusar") ?? card.options[card.options.length - 1]!;
}

function grantDodge(state: GameState, content: Content, option: CardOption, events: GfEvent[]): void {
  if (!option.dodged_scam) return;
  bump(state, "scams_dodged");
  if (!option.lesson_unlock) return;
  if (!state.lessonsTriggered.includes(option.lesson_unlock)) state.lessonsTriggered.push(option.lesson_unlock);
  state.flags.lessonPop = option.lesson_unlock;
  const hit = addMorale(state, content, 2);
  events.push({ type: "SCAM_DODGED", text: "Você descobriu o golpe!" });
  if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
}

function choose(state: GameState, content: Content, card: CardDef, option: CardOption, events: GfEvent[], dodge: boolean): void {
  for (const effect of option.effects) applyEffect(state, effect, { content, events, source: card.id });
  if (option.scam) bump(state, "scams_taken");
  if (dodge) grantDodge(state, content, option, events);
  state.decisionsLog.push({
    week: state.calendar.week,
    label: `${card.title}: ${option.label}`,
    impact: option.decision_impact,
  });
  remember(state, card, option.id);
  events.push({ type: "CARD_RESOLVED", cardId: card.id, text: option.label });
}

function eligible(state: GameState, content: Content, card: CardDef, queued: Set<string>): boolean {
  if (card.act_min > state.calendar.act || card.act_max < state.calendar.act) return false;
  if (card.week_min > state.calendar.week || card.week_max < state.calendar.week) return false;
  if (queued.has(card.id)) return false;
  if (card.once && state.cardHistory.some((item) => item.cardId === card.id)) return false;
  const ready = state.cooldowns[card.id];
  if (typeof ready === "number" && state.calendar.week < ready) return false;
  return card.conditions.every((cond) => evalCond(state, content, cond));
}

function enqueue(state: GameState, content: Content, card: CardDef, events: GfEvent[]): void {
  const item: QueuedCard = {
    cardId: card.id,
    week: state.calendar.week,
    day: state.calendar.day,
    opened: false,
  };
  if (card.kind === "offer") {
    const due = addWorkDays(state.calendar.week, state.calendar.day, 2);
    item.expiresWeek = due.week;
    item.expiresDay = due.day;
  }
  state.cardQueue.push(item);
  events.push({ type: "CARD", cardId: card.id, text: card.title });
}

function takeSlot(slots: Slots, card: CardDef): boolean {
  if (card.kind === "offer") {
    if (slots.offer) return false;
    slots.offer = true;
    return true;
  }
  if (slots.other) return false;
  slots.other = true;
  return true;
}

function postpone(item: GameState["scheduled"][number], week: number, day: number): void {
  const next = addWorkDays(week, Math.min(day, 6), 1);
  item.atWeek = next.week;
  item.atDay = next.day;
  item.effects = undefined;
}

export function releaseScheduled(state: GameState, content: Content, events: GfEvent[], throughDay: number, slots: Slots): void {
  const week = state.calendar.week;
  const due = state.scheduled.filter((item) => item.atWeek < week || (item.atWeek === week && item.atDay <= throughDay));
  for (const item of due) {
    for (const effect of item.effects ?? []) {
      if ((effect.type === "SPAWN_LEAD" || effect.op === "SPAWN_LEAD") && effect.client) {
        spawnScheduledLead(state, content, effect.client, events);
      } else if (effect.op) {
        applyEffect(state, effect as CardEffect, { content, events, source: item.source });
      }
    }
    if (item.cardId) {
      const card = cardById(content, item.cardId);
      const queued = new Set(state.cardQueue.map((row) => row.cardId));
      if (card && eligible(state, content, card, queued)) {
        if (!takeSlot(slots, card)) {
          postpone(item, week, throughDay >= 7 ? 6 : state.calendar.day);
          continue;
        }
        enqueue(state, content, card, events);
      }
    }
    state.scheduled = state.scheduled.filter((entry) => entry !== item);
  }
}

/** Domingo: efeitos de atDay 7 entram no fechamento. A carta em si espera a segunda. */
export function releaseSunday(state: GameState, content: Content, events: GfEvent[]): void {
  const week = state.calendar.week;
  const due = state.scheduled.filter((item) => item.atWeek < week || (item.atWeek === week && item.atDay <= 7));
  for (const item of due) {
    for (const effect of item.effects ?? []) {
      if ((effect.type === "SPAWN_LEAD" || effect.op === "SPAWN_LEAD") && effect.client) {
        spawnScheduledLead(state, content, effect.client, events);
      } else if (effect.op) {
        applyEffect(state, effect as CardEffect, { content, events, source: item.source });
      }
    }
    if (item.cardId && cardById(content, item.cardId)) {
      item.atWeek = week + 1;
      item.atDay = 1;
      item.effects = undefined;
      continue;
    }
    state.scheduled = state.scheduled.filter((entry) => entry !== item);
  }
}

function drawDaily(state: GameState, content: Content, events: GfEvent[], slots: Slots): void {
  const queued = new Set(state.cardQueue.map((item) => item.cardId));
  const pool = allCards(content).filter((card) => eligible(state, content, card, queued));
  if (!slots.other) {
    const stories = pool.filter((card) => card.kind === "story" && card.priority > 0);
    if (stories.length > 0) {
      const top = Math.max(...stories.map((card) => card.priority));
      const tied = stories.filter((card) => card.priority === top).sort((a, b) => a.id.localeCompare(b.id));
      const picked = tied.length === 1 ? tied[0]! : pickWeighted(state, tied.map((card) => ({ item: card, weight: Math.max(card.weight, 1) })));
      enqueue(state, content, picked, events);
      slots.other = true;
      queued.add(picked.id);
    }
  }
  const fresh = allCards(content).filter((card) => eligible(state, content, card, queued));
  if (!slots.offer) {
    const offers = fresh.filter((card) => card.kind === "offer" && card.weight > 0);
    if (offers.length > 0) {
      const picked = offers.length === 1 ? offers[0]! : pickWeighted(state, offers.map((card) => ({ item: card, weight: card.weight })));
      enqueue(state, content, picked, events);
      slots.offer = true;
    }
  }
  if (!slots.other) {
    const eventsPool = fresh.filter((card) => card.kind !== "offer" && card.weight > 0);
    if (eventsPool.length > 0) {
      const picked = eventsPool.length === 1 ? eventsPool[0]! : pickWeighted(state, eventsPool.map((card) => ({ item: card, weight: card.weight })));
      enqueue(state, content, picked, events);
    }
  }
}

function expireOffers(state: GameState, content: Content, events: GfEvent[]): void {
  const now = workIndex(state.calendar.week, state.calendar.day);
  const due = state.cardQueue.filter((item) => item.expiresWeek != null && item.expiresDay != null && now >= workIndex(item.expiresWeek, item.expiresDay));
  for (const item of due) {
    const card = cardById(content, item.cardId);
    if (!card) {
      state.cardQueue = state.cardQueue.filter((row) => row !== item);
      continue;
    }
    const option = declineOption(card);
    if (item.opened) choose(state, content, card, option, events, true);
    else {
      state.decisionsLog.push({ week: state.calendar.week, label: `${card.title}: sem resposta`, impact: 0 });
      remember(state, card, option.id);
      events.push({ type: "CARD_EXPIRED", cardId: card.id, text: card.title });
    }
  }
}

function takenToday(state: GameState, content: Content, kind: "offer" | "other"): boolean {
  return state.cardQueue.some((item) => {
    if (item.week !== state.calendar.week || item.day !== state.calendar.day) return false;
    const card = cardById(content, item.cardId);
    if (!card) return false;
    return kind === "offer" ? card.kind === "offer" : card.kind !== "offer";
  });
}

export function beginDay(state: GameState, content: Content, events: GfEvent[]): void {
  normalizeQueue(state);
  expireOffers(state, content, events);
  const slots: Slots = {
    offer: takenToday(state, content, "offer"),
    other: takenToday(state, content, "other"),
  };
  releaseScheduled(state, content, events, state.calendar.day, slots);
  drawDaily(state, content, events, slots);
}

export function applyCardAction(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "READ_LESSON") {
    const id = typeof action.id === "string" ? action.id : "";
    if (!id || !state.lessonsTriggered.includes(id)) throw new GameError("sem_licao", "Essa página ainda está queimada.");
    const mark = `read_${id}`;
    if (state.flags[mark] !== true) {
      state.flags[mark] = true;
      addRep(state, content, 1, "lição do caderno");
    }
    if (state.flags.lessonPop === id) delete state.flags.lessonPop;
    events.push({ type: "LESSON_READ", text: id });
    return true;
  }
  if (kind !== "CARD_CHOICE" && kind !== "CARD_OPEN") return false;
  normalizeQueue(state);
  const cardId = typeof action.cardId === "string" ? action.cardId : "";
  const queued = state.cardQueue.find((item) => item.cardId === cardId);
  const card = cardById(content, cardId);
  if (!queued || !card) throw new GameError("carta_sumiu", "Esse recado já não está no telefone.");
  if (kind === "CARD_OPEN") {
    queued.opened = true;
    return true;
  }
  const optionId = typeof action.optionId === "string" ? action.optionId : "";
  const option = card.options.find((item) => item.id === optionId);
  if (!option) throw new GameError("carta_sumiu", "Essa resposta não está na carta.");
  const blocked = optionBlock(state, content, option);
  if (blocked) throw new GameError("requisito", blocked);
  queued.opened = true;
  choose(state, content, card, option, events, true);
  return true;
}
