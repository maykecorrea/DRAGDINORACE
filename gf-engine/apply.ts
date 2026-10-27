import type { Content } from "./content.ts";
import { sealScore } from "./campaign.ts";
import { applyAuction } from "./auction.ts";
import { applyCardAction, hasBlockingCard } from "./cards.ts";
import { applyContracts, openMorning, resolveDueReplies } from "./contracts.ts";
import { assertOpen, blankClock, DAY, dayIndex, inNightWindow, nextSundayClose, partsOf, startOfDay, WEEK } from "./clock.ts";
import { applyBody, applyWorkLoad, tickBody } from "./body.ts";
import { applyDistrict, here } from "./district.ts";
import { GameError } from "./errors.ts";
import { applyFinance } from "./finance.ts";
import { actFor } from "./initial.ts";
import { addMorale, morningAp } from "./morale.ts";
import { applyProduction, receiveInbound, runStaffDay } from "./production.ts";
import { crossDiaF, diaF, applyHands } from "./hands.ts";
import { applyStaff } from "./staff.ts";
import type { GameState } from "./state.ts";
import { weeklyClose, type GfEvent } from "./weeklyClose.ts";
import { awardTaskXp } from "./xp.ts";

export type Action = { type: string; ap?: number };
export type { GfEvent };

function spend(state: GameState, content: Content, amount: number, work: boolean): void {
  if (state.calendar.apLeft < amount) throw new GameError("sem_pa", "Sem energia.");
  state.calendar.apLeft -= amount;
  if (!work) return;
  const rule = content.balance;
  for (let i = 0; i < amount; i += 1) {
    state.calendar.apWorkedThisWeek += 1;
    if (state.calendar.apWorkedThisWeek > rule.overworkThreshold) addMorale(state, content, rule.overworkMorale);
  }
}

/** PA de trabalho. A Parte 07 usa isto nos serviços. */
export function spendWorkAp(state: GameState, content: Content, amount: number): void {
  spend(state, content, amount, true);
}

function syncAct(state: GameState): void {
  const p = partsOf(state.clock.t);
  state.calendar.week = p.week;
  state.calendar.day = p.day;
  state.calendar.act = actFor(p.week);
}

function ensureClock(state: GameState, content: Content): void {
  if (state.clock && typeof state.clock.t === "number") return;
  const ap = Math.max(0, Math.min(3, state.calendar.apLeft));
  const slots = [content.time.wakeMinute, 12 * 60, 18 * 60, DAY];
  const t = state.calendar.week * WEEK + (state.calendar.day - 1) * DAY + (slots[3 - ap] ?? content.time.wakeMinute);
  state.clock = blankClock(t, content.time.defaultSpeed, 70);
  syncAct(state);
}

function alignClock(state: GameState, content: Content): void {
  ensureClock(state, content);
  const p = partsOf(state.clock.t);
  if (p.week === state.calendar.week && p.day === state.calendar.day) return;
  const minute = state.clock.t % DAY;
  state.clock.t = state.calendar.week * WEEK + (Math.max(1, state.calendar.day) - 1) * DAY + minute;
  state.clock.apRefillDay = dayIndex(state.clock.t);
}

function drainAwake(state: GameState, content: Content, minutes: number, events: GfEvent[]): boolean {
  const rule = content.time.energy;
  const ended = tickBody(state, content, minutes, "awake", events);
  if (ended.minutes < minutes) state.clock.t -= minutes - ended.minutes;
  if (ended.status === "knockout") {
    syncAct(state);
    return false;
  }
  if (ended.status !== "faint" && state.clock.energy > 0) return false;
  const closeAt = nextSundayClose(state.clock.t, content.time.closeDay, content.time.closeMinute);
  let wake = state.clock.t + rule.faintHours * 60;
  if (wake > closeAt) wake = closeAt;
  const fromDay = partsOf(state.clock.t).day;
  const fromIndex = dayIndex(state.clock.t);
  state.clock.t = wake;
  state.clock.energy = 20;
  state.clock.awakeMin = 0;
  state.flags.district = "oficina";
  const hit = addMorale(state, content, rule.faintMorale);
  events.push({ type: "FAINTED", text: "Téo desmaiou. O relógio andou 8 horas e a saúde caiu 10%." });
  if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
  syncAct(state);
  if (wake >= closeAt) return true;
  if (dayIndex(wake) !== fromIndex && fromDay !== 7) runStaffDay(state, content, events);
  grantMorning(state, content, rule.faintHours, events);
  if (partsOf(wake).day !== 7) openMorning(state, content, events);
  return true;
}

function noteAwakeMorning(state: GameState, content: Content, from: number, to: number, events: GfEvent[]): void {
  const wake = content.time.wakeMinute;
  let cursor = from;
  while (cursor < to) {
    const mark = startOfDay(cursor) + wake;
    const next = mark <= cursor ? mark + DAY : mark;
    if (next > to) break;
    const index = dayIndex(next);
    if (state.clock.apRefillDay !== index) {
      state.clock.apRefillDay = index;
      const p = partsOf(next);
      if (p.day === 7 || Number(state.flags.noApWeek) === p.week) {
        state.calendar.apLeft = 0;
      } else {
        state.calendar.apLeft = morningAp(state, content);
      }
      events.push({ type: "NO_SLEEP", week: p.week, day: p.day });
    }
    cursor = next;
  }
}

function runClose(state: GameState, content: Content, events: GfEvent[]): void {
  if (partsOf(state.clock.t).day !== 7) runStaffDay(state, content, events);
  weeklyClose(state, content, events);
  payOvertime(state, content);
  state.clock.t = state.calendar.week * WEEK + content.time.wakeMinute;
  state.clock.energy = Math.min(content.time.energy.max, state.clock.energy + content.time.energy.sleepPerHour * 8);
  state.clock.awakeMin = 0;
  state.clock.apRefillDay = dayIndex(state.clock.t);
  state.clock.overtime = [];
  syncAct(state);
  openMorning(state, content, events);
  events.push({ type: "DAY_ENDED", week: state.calendar.week, day: state.calendar.day });
}

function payOvertime(state: GameState, content: Content): void {
  const extra = state.clock.overtime.reduce((sum, item) => sum + item.cost, 0);
  if (extra <= 0) return;
  state.cash -= extra;
  const last = state.history[state.history.length - 1];
  if (last) last.salaries += extra;
  void content;
}

function grantMorning(state: GameState, content: Content, sleptHours: number, events: GfEvent[]): void {
  if (state.clock.t % DAY < content.time.refillMinute) return;
  const index = dayIndex(state.clock.t);
  if (state.clock.apRefillDay === index) return;
  state.clock.apRefillDay = index;
  if (partsOf(state.clock.t).day === 7 || Number(state.flags.noApWeek) === state.calendar.week) {
    state.calendar.apLeft = 0;
    return;
  }
  state.calendar.apLeft = morningAp(state, content);
  void sleptHours;
  void events;
}

export function advanceAwake(state: GameState, content: Content, minutes: number, events: GfEvent[]): void {
  if (minutes <= 0 || state.clock.paused) return;
  if (partsOf(state.clock.t).hour >= 7) diaF(state, events, dayIndex(state.clock.t));
  let left = minutes;
  while (left > 0 && !state.ending) {
    const closeAt = nextSundayClose(state.clock.t, content.time.closeDay, content.time.closeMinute);
    const room = closeAt - state.clock.t;
    if (room <= 0) {
      runClose(state, content, events);
      return;
    }
    const step = Math.min(left, room);
    const from = state.clock.t;
    const before = state.clock.energy;
    state.clock.t += step;
    const fainted = drainAwake(state, content, step, events);
    syncAct(state);
    noteAwakeMorning(state, content, from, state.clock.t, events);
    crossDiaF(state, from, state.clock.t, events);
    resolveDueReplies(state, content, events);
    if (fainted && state.clock.t >= closeAt && !state.ending) {
      runClose(state, content, events);
      return;
    }
    if (fainted || (state.clock.energy === 0 && before > 0)) return;
    left -= step;
    if (state.clock.t >= closeAt && !state.ending) {
      runClose(state, content, events);
      return;
    }
  }
}

function sleepUntil(state: GameState, content: Content, target: number, events: GfEvent[]): void {
  state.flags.district = "oficina";
  if (target <= state.clock.t) throw new GameError("hora_invalida", "O despertador tem que ser para depois de agora.");
  const closeAt = nextSundayClose(state.clock.t, content.time.closeDay, content.time.closeMinute);
  if (closeAt > state.clock.t && closeAt <= target) {
    const slept = (closeAt - state.clock.t) / 60;
    state.clock.lastSleep = { from: state.clock.t, to: closeAt };
    state.clock.t = closeAt;
    tickBody(state, content, slept * 60, "sleep", events);
    state.clock.awakeMin = 0;
    syncAct(state);
    runClose(state, content, events);
    return;
  }
  const fromT = state.clock.t;
  const fromDay = partsOf(fromT).day;
  const hours = (target - fromT) / 60;
  state.clock.lastSleep = { from: fromT, to: target };
  state.clock.t = target;
  tickBody(state, content, hours * 60, "sleep", events);
  state.clock.awakeMin = 0;
  syncAct(state);
  resolveDueReplies(state, content, events);
  const landed = partsOf(state.clock.t);
  if (dayIndex(state.clock.t) !== dayIndex(fromT) && fromDay !== 7) runStaffDay(state, content, events);
  crossDiaF(state, fromT, state.clock.t, events);
  grantMorning(state, content, hours, events);
  if (dayIndex(state.clock.t) !== dayIndex(fromT) && landed.day !== 7) openMorning(state, content, events);
  if (dayIndex(state.clock.t) !== dayIndex(fromT)) {
    events.push({ type: "DAY_ENDED", week: state.calendar.week, day: state.calendar.day });
  }
}

function endDay(state: GameState, content: Content, events: GfEvent[]): void {
  if (hasBlockingCard(state, content)) {
    throw new GameError("carta_obrigatoria", "Tem um recado no telefone que não espera.");
  }
  const minute = state.clock.t % DAY;
  const wake = content.time.wakeMinute;
  const today = startOfDay(state.clock.t) + wake;
  const target = minute < wake ? today : today + DAY;
  sleepUntil(state, content, target, events);
}

function soakWalk(state: GameState, content: Content, kind: string, events: GfEvent[]): void {
  if (kind !== "TRAVEL" && kind !== "OSSOBUS") return;
  const hop = [...events].reverse().find((event) => event.type === "TRAVELED");
  const minutes = hop?.week ?? 0;
  if (minutes <= 0) return;
  const dest = state.flags.district;
  state.clock.t -= minutes;
  advanceAwake(state, content, minutes, events);
  if (events.some((event) => event.type === "FAINTED")) {
    const index = events.findIndex((event) => event.type === "TRAVELED");
    if (index >= 0) events.splice(index, 1);
    return;
  }
  state.flags.district = dest;
}

function passActionTime(state: GameState, content: Content, kind: string, apBefore: number, events: GfEvent[]): void {
  const table = content.time.actions;
  const spent = Math.max(0, apBefore - state.calendar.apLeft);
  if (kind === "WORK_JOB" || kind === "WORK" || kind === "WORK_CARCASS") {
    if (spent <= 0) return;
    applyWorkLoad(state, spent);
    advanceAwake(state, content, (table.WORK ?? 0) * spent, events);
    return;
  }
  const minutes =
    kind === "PROSPECT" ? table.PROSPECT
    : kind === "CHECK_RECORD" || kind === "INSPECT_LOT" ? table.CHECK
    : kind === "COLLECT" ? table.COLLECT
    : kind === "STUDY" ? table.STUDY
    : kind === "BUY" ? table.BUY
    : kind === "SEND_PROPOSAL" || kind === "ANSWER_COUNTER" || kind === "NUDGE_COUNTER" ? table.NEGOTIATE
    : kind === "PAY_DEBT" || kind === "SAVE" || kind === "WITHDRAW" || kind === "TAKE_LOAN" ? table.BANK
    : kind === "EAT" ? 10
    : kind === "COOK" ? 25
    : kind === "BUY_FOOD" || kind === "BUY_MED" ? 5
    : kind === "TREAT" ? 15
    : 0;
  if (minutes) advanceAwake(state, content, minutes, events);
}

export function applyAction(
  state: GameState,
  action: unknown,
  content: Content,
): { state: GameState; events: GfEvent[] } {
  if (!action || typeof action !== "object" || Array.isArray(action) || typeof (action as { type?: unknown }).type !== "string") {
    throw new GameError("acao_invalida", "Ação não reconhecida.");
  }
  const next = structuredClone(state);
  const events: GfEvent[] = [];
  ensureClock(next, content);
  alignClock(next, content);
  next.clock.speed = 1;
  next.clock.paused = false;
  if (next.ending) throw new GameError("encerrada", "Campanha encerrada.");
  const kind = (action as Action).type;
  const apBefore = next.calendar.apLeft;
  const raw = action as Action & { minutes?: unknown; wakeAt?: unknown; hours?: unknown; speed?: unknown; paused?: unknown; elapsedMs?: unknown };
  if (kind === "END_DAY") {
    endDay(next, content, events);
  } else if (kind === "SLEEP") {
    const asked = raw.hours;
    const wakeAt = typeof asked === "number"
      ? next.clock.t + asked * 60
      : raw.wakeAt;
    if (typeof asked === "number" && (!Number.isInteger(asked) || asked < 1 || asked > 12)) {
      throw new GameError("hora_invalida", "O sono vai de 1 a 12 horas.");
    }
    if (typeof wakeAt !== "number" || !Number.isInteger(wakeAt)) throw new GameError("hora_invalida", "O despertador precisa de um minuto inteiro.");
    if (hasBlockingCard(next, content)) throw new GameError("carta_obrigatoria", "Tem um recado no telefone que não espera.");
    sleepUntil(next, content, wakeAt, events);
  } else if (kind === "WAIT") {
    const minutes = raw.minutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes <= 0 || minutes > WEEK) {
      throw new GameError("hora_invalida", "A espera precisa de minutos inteiros.");
    }
    advanceAwake(next, content, minutes, events);
  } else if (kind === "TICK") {
    const cap = content.time.tickCapMs;
    const elapsed = typeof raw.elapsedMs === "number" ? Math.max(0, Math.min(cap, raw.elapsedMs)) : 0;
    const credited = typeof raw.minutes === "number" ? Math.max(0, Math.min(Math.floor(cap / 1000), Math.floor(raw.minutes))) : 0;
    const rawMs = next.clock.subMs + (credited > 0 ? credited * 1000 : elapsed);
    const minutes = Math.floor(rawMs / 1000);
    next.clock.subMs = rawMs % 1000;
    advanceAwake(next, content, minutes, events);
  } else if (kind === "SET_SPEED") {
    next.clock.speed = 1;
    next.clock.paused = false;
  } else if (kind === "REST") {
    spend(next, content, content.balance.restAp, false);
    const hit = addMorale(next, content, content.balance.restMorale);
    advanceAwake(next, content, content.time.actions.REST ?? 0, events);
    next.clock.energy = Math.min(content.time.energy.max, next.clock.energy + content.time.energy.restBonus);
    events.push({ type: "RESTED" });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: next.collapses[next.collapses.length - 1] });
  } else if (kind === "NIGHT_SHIFT") {
    if (!inNightWindow(content, next.clock.t)) {
      throw new GameError("cedo_demais", "Só dá para virar a noite entre 20h e 3h.");
    }
    if (next.calendar.extraNightsUsed >= content.balance.nightShiftMaxPerWeek) {
      throw new GameError("noite_esgotada", "Você já virou a noite duas vezes nesta semana.");
    }
    next.calendar.extraNightsUsed += 1;
    next.calendar.apLeft += 1;
    next.clock.energy = Math.min(content.time.energy.max, next.clock.energy + content.time.energy.nightCoffee);
    const hit = addMorale(next, content, content.balance.nightShiftMorale);
    advanceAwake(next, content, content.time.actions.NIGHT_SHIFT ?? 0, events);
    events.push({ type: "NIGHT_SHIFT" });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: next.collapses[next.collapses.length - 1] });
  } else if (
    !applyCardAction(next, action as Record<string, unknown>, content, events) &&
    !applyBody(next, action as Record<string, unknown>, content, events) &&
    !applyDistrict(next, action as Record<string, unknown>, content, events) &&
    !applyAuction(next, action as Record<string, unknown>, content, events) &&
    !applyStaff(next, action as Record<string, unknown>, content, events) &&
    !applyHands(next, action as Record<string, unknown>, events) &&
    !applyProduction(next, action as Record<string, unknown>, content, events) &&
    !applyContracts(next, action as Record<string, unknown>, content, events) &&
    !applyFinance(next, action as Record<string, unknown>, content, events)
  ) {
    throw new GameError("acao_invalida", "Ação não reconhecida.");
  } else {
    passActionTime(next, content, kind, apBefore, events);
    soakWalk(next, content, kind, events);
    if ((kind === "TRAVEL" || kind === "OSSOBUS") && here(next) === "oficina") receiveInbound(next, content, events);
  }
  if (here(next) === "oficina") receiveInbound(next, content, events);
  awardTaskXp(next, kind, action as Record<string, unknown>, Math.max(0, apBefore - next.calendar.apLeft), events);
  if (events.some((event) => event.type === "FAINTED") && (kind === "WORK" || kind === "WORK_JOB" || kind === "WORK_CARCASS")) {
    const spent = Math.max(0, apBefore - next.calendar.apLeft);
    const job = next.jobs.find((item) => item.id === (action as { jobId?: unknown }).jobId);
    if (job && job.status === "in_progress" && spent > 0) job.apDone = Math.max(0, job.apDone - spent);
  }
  sealScore(next, content);
  return { state: next, events };
}
