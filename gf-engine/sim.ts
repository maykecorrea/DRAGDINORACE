import { applyAction } from "./apply.ts";
import { cardById } from "./cards.ts";
import type { CardOption } from "./cardSchema.ts";
import { contentV1, type Content } from "./content.ts";
import { leadVisible } from "./contracts.ts";
import { GameError } from "./errors.ts";
import { createInitialState } from "./initial.ts";
import { missingMaterials } from "./production.ts";
import type { GameState } from "./state.ts";

export type BotName = "ingenuo" | "golpe" | "medroso" | "prudente" | "otimo";

export type SimEnd = { bot: BotName; seed: number; week: number; ending: string | null; level: number };

const BOTS: BotName[] = ["ingenuo", "golpe", "medroso", "prudente", "otimo"];
const REP_GATE = [0, 0, 30, 45, 60, 75];

function cashOf(option: CardOption): number {
  return (option.effects ?? []).reduce((sum, effect) => (effect.op === "cash" && typeof effect.value === "number" ? sum + effect.value : sum), 0);
}

function choose(options: CardOption[], bot: BotName, scamsLeft: number): { option: CardOption; tookScam: boolean } {
  if (bot === "ingenuo") {
    const hungry = options.find((option) => option.scam || cashOf(option) > 0) ?? options[0]!;
    return { option: hungry, tookScam: hungry.scam === true };
  }
  if (bot === "golpe" && scamsLeft > 0) {
    const bait = options.find((option) => option.scam);
    if (bait) return { option: bait, tookScam: true };
  }
  const dodge = options.find((option) => option.dodged_scam);
  if (dodge && bot !== "golpe") return { option: dodge, tookScam: false };
  const clean = options.filter((option) => !option.scam);
  clean.sort((a, b) => (b.decision_impact ?? 0) - (a.decision_impact ?? 0) || cashOf(b) - cashOf(a));
  const calm = clean.find((option) => bot !== "medroso" || cashOf(option) >= 0);
  return { option: calm ?? clean[0] ?? options[options.length - 1]!, tookScam: false };
}

function tryAct(state: GameState, action: Record<string, unknown>, content: Content): GameState {
  try {
    return applyAction(state, action, content).state;
  } catch (err) {
    if (err instanceof GameError) return state;
    throw err;
  }
}

function answerCards(state: GameState, content: Content, bot: BotName, scamsLeft: number): { state: GameState; scamsLeft: number } {
  let left = scamsLeft;
  for (const queued of [...state.cardQueue]) {
    const card = cardById(content, queued.cardId);
    if (!card) continue;
    state = tryAct(state, { type: "CARD_OPEN", cardId: card.id }, content);
    const pick = choose(card.options, bot, left);
    if (pick.tookScam) left -= 1;
    state = tryAct(state, { type: "CARD_CHOICE", cardId: card.id, optionId: pick.option.id }, content);
  }
  return { state, scamsLeft: left };
}

function priceFor(bot: BotName, ref: number): number {
  if (bot === "ingenuo") return Math.round(ref * 0.8);
  if (bot === "prudente") return Math.round(ref * 1.05);
  return ref;
}

function depositFor(bot: BotName, forced: boolean): number {
  if (forced) return 50;
  if (bot === "ingenuo" || bot === "medroso") return 0;
  if (bot === "otimo") return 30;
  return 50;
}

function workDay(state: GameState, content: Content, bot: BotName): GameState {
  for (const lead of state.leads) {
    if (lead.status !== "counter") continue;
    state = tryAct(state, { type: "ANSWER_COUNTER", leadId: lead.id, accept: bot !== "ingenuo" }, content);
  }
  for (const lead of state.leads) {
    if (!leadVisible(state, lead) || (lead.status ?? "open") !== "open") continue;
    const forced = lead.apparentType === "corredor" || lead.hiddenType === "corredor";
    state = tryAct(
      state,
      {
        type: "SEND_PROPOSAL",
        leadId: lead.id,
        price: priceFor(bot, lead.refPrice),
        depositPct: depositFor(bot, forced),
        deadline: lead.deadlineDays,
      },
      content,
    );
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const waiting = state.jobs.filter((item) => item.status === "waiting_materials" || item.status === "queued");
    const priced = waiting
      .map((job) => {
        const cost = missingMaterials(state, content, job).reduce((sum, gap) => {
          const unit = content.suppliers.find((row) => row.id === "casco")?.prices[gap.material] ?? 0;
          return sum + unit * Math.max(0, gap.need - gap.have);
        }, 0);
        return { job, cost };
      })
      .filter((row) => row.cost <= state.cash)
      .sort((a, b) => a.cost - b.cost);
    const nextJob = priced[0];
    if (nextJob) {
      for (const gap of missingMaterials(state, content, nextJob.job)) {
        const qty = Math.max(0, gap.need - gap.have);
        if (qty <= 0) continue;
        state = tryAct(state, { type: "BUY", supplier: "casco", material: gap.material, qty, terms: "cash" }, content);
      }
    }
    for (const job of state.jobs) {
      if (job.status !== "in_progress" || state.calendar.apLeft < 1) continue;
      const steps = Math.min(state.calendar.apLeft, job.apNeeded - job.apDone);
      if (steps <= 0) continue;
      state = tryAct(state, { type: "WORK_JOB", jobId: job.id, ap: steps }, content);
    }
    for (const job of state.jobs) {
      if (job.status !== "ready") continue;
      state = tryAct(state, { type: "DELIVER", jobId: job.id }, content);
    }
  }
  return state;
}

function manage(state: GameState, content: Content, bot: BotName): GameState {
  if (bot === "medroso" || bot === "ingenuo") return state;
  const week = state.calendar.week;
  if (week >= 4 && !state.employees.some((employee) => employee.id === "tico") && state.cash > 1600) {
    state = tryAct(state, { type: "HIRE", employeeId: "tico" }, content);
  }
  if (bot === "otimo" && week >= 8 && state.rep >= 25 && !state.employees.some((employee) => employee.id === "brasa") && state.cash > 2200) {
    state = tryAct(state, { type: "HIRE", employeeId: "brasa" }, content);
  }
  if (bot === "otimo" && state.garage.level >= 2 && !state.employees.some((employee) => employee.id === "osso_duro") && state.cash > 2000) {
    state = tryAct(state, { type: "HIRE", employeeId: "osso_duro" }, content);
  }
  const next = content.garageLevels[state.garage.level + 1];
  const gate = REP_GATE[next?.level ?? 0] ?? 0;
  const keep = bot === "otimo" ? 1200 : 2500;
  if (next && next.cost > 0 && state.garage.upgradingTo == null && state.rep >= gate && state.cash > next.cost + keep) {
    state = tryAct(state, { type: "UPGRADE", mode: "vista" }, content);
  }
  if (state.cash > 4000) {
    const pile = state.debts.filter((debt) => debt.balance > 0).sort((a, b) => b.weeklyBps - a.weeklyBps)[0];
    if (pile && pile.weeklyBps >= 80) {
      const pay = Math.min(pile.balance, state.cash - 2500);
      if (pay >= 100) state = tryAct(state, { type: "PAY_DEBT", debtId: pile.id, value: pay }, content);
    }
  }
  if (state.cash > 2500) {
    const save = Math.min(400, state.cash - 2000);
    if (save >= 100) state = tryAct(state, { type: "SAVE", product: "cofrinho", value: save }, content);
  }
  return state;
}

/** Uma campanha inteira, no máximo 52 semanas, com o bot no volante. */
export function playSeed(seed: number, bot: BotName, content: Content = contentV1): SimEnd {
  let state = createInitialState(seed, "Téo");
  let scamsLeft = bot === "golpe" ? 2 : bot === "ingenuo" ? 99 : 0;
  let guard = 0;
  while (!state.ending && state.calendar.week <= 52 && guard < 420) {
    guard += 1;
    const answered = answerCards(state, content, bot, scamsLeft);
    state = answered.state;
    scamsLeft = answered.scamsLeft;
    if (state.calendar.day < 7) {
      state = workDay(state, content, bot);
      if (state.calendar.day === 1) state = manage(state, content, bot);
    }
    if (state.ending) break;
    state = tryAct(state, { type: "END_DAY" }, content);
  }
  return { bot, seed, week: state.calendar.week, ending: state.ending, level: state.garage.level };
}

export type SimRow = { runs: number; broke: number; rich: number; free: number };
export type SimReport = Record<BotName, SimRow>;

export function emptyReport(): SimReport {
  return Object.fromEntries(BOTS.map((bot) => [bot, { runs: 0, broke: 0, rich: 0, free: 0 }])) as SimReport;
}

export function tally(report: SimReport, end: SimEnd): void {
  const row = report[end.bot];
  row.runs += 1;
  if (end.ending?.startsWith("F") && end.week < 20) row.broke += 1;
  if (end.week >= 52 && (end.ending === "prosperidade" || end.ending === "liberdade")) row.rich += 1;
  if (end.ending === "liberdade") row.free += 1;
}

export function simulate(seeds: number, content: Content = contentV1): SimReport {
  const report = emptyReport();
  for (const bot of BOTS) {
    for (let seed = 1; seed <= seeds; seed += 1) tally(report, playSeed(seed, bot, content));
  }
  return report;
}
