import type { Content } from "./content.ts";
import { sealScore } from "./campaign.ts";
import { applyAuction } from "./auction.ts";
import { applyCardAction, hasBlockingCard } from "./cards.ts";
import { applyContracts, openMorning } from "./contracts.ts";
import { assertOpen, blankClock, DAY, dayIndex, inNightWindow, nextSundayClose, partsOf, startOfDay, WEEK } from "./clock.ts";
import { applyDistrict } from "./district.ts";
import { GameError } from "./errors.ts";
import { applyFinance } from "./finance.ts";
import { actFor } from "./initial.ts";
import { addMorale, morningAp } from "./morale.ts";
import { applyProduction, runStaffDay } from "./production.ts";
import { applyStaff } from "./staff.ts";
import type { GameState } from "./state.ts";
import { weeklyClose, type GfEvent } from "./weeklyClose.ts";

export type Action = { type: string; ap?: number };
export type { GfEvent };

function spend(state: GameState, content: Content, amount: number, work: boolean): void {
  if (state.calendar.apLeft < amount) throw new GameError("sem_pa", "Sem ponto de ação.");
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
  state.clock.awakeMin += minutes;
  const hours = Math.floor(state.clock.awakeMin / 60);
  state.clock.awakeMin -= hours * 60;
  if (hours > 0) state.clock.energy = Math.max(0, state.clock.energy - hours * rule.awakePerHour);
  if (state.clock.energy > 0) return false;
  const closeAt = nextSundayClose(state.clock.t, content.time.closeDay, content.time.closeMinute);
  let wake = Math.max(state.clock.t + rule.faintHours * 60, startOfDay(state.clock.t) + 8 * 60);
  if (wake > closeAt) wake = closeAt;
  const fromDay = partsOf(state.clock.t).day;
  const fromIndex = dayIndex(state.clock.t);
  state.clock.t = wake;
  state.clock.energy = rule.sleepBase;
  state.clock.awakeMin = 0;
  state.flags.district = "oficina";
  const hit = addMorale(state, content, rule.faintMorale);
  events.push({ type: "FAINTED" });
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
        state.calendar.apLeft = content.time.energy.noSleepAp;
        const hit = addMorale(state, content, content.time.energy.noSleepMorale);
        if (hit.collapsed) events.push({ type: "COLLAPSE", week: p.week });
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
  state.clock.energy = Math.min(content.time.energy.max, content.time.energy.sleepBase + content.time.energy.sleepPerHour * 8);
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
  if (partsOf(state.clock.t).day === 7) {
    state.calendar.apLeft = 0;
    return;
  }
  const rule = content.time.energy;
  if (sleptHours + 1e-9 < rule.shortHours) {
    state.calendar.apLeft = Number(state.flags.noApWeek) === state.calendar.week ? 0 : rule.shortAp;
    const hit = addMorale(state, content, rule.shortMorale);
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
    return;
  }
  state.calendar.apLeft = morningAp(state, content);
}

export function advanceAwake(state: GameState, content: Content, minutes: number, events: GfEvent[]): void {
  if (minutes <= 0 || state.clock.paused) return;
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
    syncAct(state);
    noteAwakeMorning(state, content, from, state.clock.t, events);
    const fainted = drainAwake(state, content, step, events);
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
  if (target <= state.clock.t) throw new GameError("hora_invalida", "O despertador tem que ser depois de agora.");
  const closeAt = nextSundayClose(state.clock.t, content.time.closeDay, content.time.closeMinute);
  if (closeAt > state.clock.t && closeAt <= target) {
    const slept = (closeAt - state.clock.t) / 60;
    state.clock.lastSleep = { from: state.clock.t, to: closeAt };
    state.clock.t = closeAt;
    state.clock.energy = Math.min(content.time.energy.max, content.time.energy.sleepBase + content.time.energy.sleepPerHour * slept);
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
  state.clock.energy = Math.min(content.time.energy.max, content.time.energy.sleepBase + content.time.energy.sleepPerHour * hours);
  state.clock.awakeMin = 0;
  syncAct(state);
  const landed = partsOf(state.clock.t);
  if (dayIndex(state.clock.t) !== dayIndex(fromT) && fromDay !== 7) runStaffDay(state, content, events);
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

function passActionTime(state: GameState, content: Content, kind: string, apBefore: number, events: GfEvent[]): void {
  const table = content.time.actions;
  const spent = Math.max(0, apBefore - state.calendar.apLeft);
  if (kind === "WORK_JOB" || kind === "WORK" || kind === "WORK_CARCASS") {
    if (spent <= 0) return;
    state.clock.energy = Math.max(0, state.clock.energy - content.time.energy.workExtra * spent);
    advanceAwake(state, content, (table.WORK ?? 0) * spent, events);
    return;
  }
  const minutes =
    kind === "PROSPECT" ? table.PROSPECT
    : kind === "CHECK_RECORD" || kind === "INSPECT_LOT" ? table.CHECK
    : kind === "COLLECT" ? table.COLLECT
    : kind === "STUDY" ? table.STUDY
    : kind === "BUY" ? table.BUY
    : kind === "SEND_PROPOSAL" || kind === "ANSWER_COUNTER" ? table.NEGOTIATE
    : kind === "PAY_DEBT" || kind === "SAVE" || kind === "WITHDRAW" || kind === "TAKE_LOAN" ? table.BANK
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
  if (next.ending) throw new GameError("encerrada", "Campanha encerrada.");
  const kind = (action as Action).type;
  const apBefore = next.calendar.apLeft;
  const raw = action as Action & { minutes?: unknown; wakeAt?: unknown; speed?: unknown; paused?: unknown; elapsedMs?: unknown };
  if (kind === "END_DAY") {
    endDay(next, content, events);
  } else if (kind === "SLEEP") {
    const wakeAt = raw.wakeAt;
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
    const credited = typeof raw.minutes === "number" ? Math.max(0, Math.min(Math.floor((cap * next.clock.speed) / 1000), Math.floor(raw.minutes))) : 0;
    const rawMs = next.clock.subMs + (credited > 0 ? credited * 1000 : elapsed * next.clock.speed);
    const minutes = Math.floor(rawMs / 1000);
    next.clock.subMs = rawMs % 1000;
    advanceAwake(next, content, minutes, events);
  } else if (kind === "SET_SPEED") {
    if (raw.speed === 1 || raw.speed === 2 || raw.speed === 4) next.clock.speed = raw.speed;
    else throw new GameError("hora_invalida", "A velocidade é 1, 2 ou 4.");
    if (typeof raw.paused === "boolean") next.clock.paused = raw.paused;
  } else if (kind === "REST") {
    spend(next, content, content.balance.restAp, false);
    const hit = addMorale(next, content, content.balance.restMorale);
    advanceAwake(next, content, content.time.actions.REST ?? 0, events);
    next.clock.energy = Math.min(content.time.energy.max, next.clock.energy + content.time.energy.restBonus);
    events.push({ type: "RESTED" });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: next.collapses[next.collapses.length - 1] });
  } else if (kind === "NIGHT_SHIFT") {
    if (!inNightWindow(content, next.clock.t)) {
      throw new GameError("cedo_demais", "Virar a noite só começa entre 20:00 e 03:00.");
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
    !applyDistrict(next, action as Record<string, unknown>, content, events) &&
    !applyAuction(next, action as Record<string, unknown>, content, events) &&
    !applyStaff(next, action as Record<string, unknown>, content, events) &&
    !applyProduction(next, action as Record<string, unknown>, content, events) &&
    !applyContracts(next, action as Record<string, unknown>, content, events) &&
    !applyFinance(next, action as Record<string, unknown>, content, events)
  ) {
    throw new GameError("acao_invalida", "Ação não reconhecida.");
  } else {
    passActionTime(next, content, kind, apBefore, events);
  }
  sealScore(next, content);
  return { state: next, events };
}
