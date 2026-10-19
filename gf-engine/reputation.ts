import type { Content } from "./content.ts";
import type { GameState, RepEntry } from "./state.ts";

function readLog(state: GameState): RepEntry[] {
  const value = state.flags.repLog;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is RepEntry => !!entry && typeof entry === "object" && "reason" in entry);
}

/** As outras partes chamam isto. A fama não passa do teto do nível. */
export function addRep(state: GameState, content: Content, delta: number, reason: string): number {
  const cap = content.garageLevels[state.garage.level]?.repMax ?? 100;
  const before = state.rep;
  state.rep = Math.max(0, Math.min(cap, before + delta));
  const applied = state.rep - before;
  if (applied === 0) return state.rep;
  const log = readLog(state);
  log.push({ week: state.calendar.week, delta: applied, reason });
  state.flags.repLog = log.slice(-20);
  return state.rep;
}

export function noteDelivery(state: GameState, late: boolean): void {
  const count = state.flags.deliveredWeek;
  state.flags.deliveredWeek = (typeof count === "number" ? count : 0) + 1;
  if (late) state.flags.lateWeek = true;
}

/** Decaimento e o bônus de um mês sem atraso. Roda no fechamento. */
export function stepReputation(state: GameState, content: Content): void {
  const delivered = state.flags.deliveredWeek;
  const hadDelivery = typeof delivered === "number" && delivered > 0;
  if (state.rep > 60 && !hadDelivery) addRep(state, content, -1, "semana sem entrega");
  const late = state.flags.lateWeek === true;
  const streak = state.flags.repCleanWeeks;
  const next = late ? 0 : (typeof streak === "number" ? streak : 0) + 1;
  state.flags.repCleanWeeks = next;
  if (!late && next > 0 && next % 4 === 0) addRep(state, content, 5, "mês sem atraso");
  state.flags.deliveredWeek = 0;
  state.flags.lateWeek = false;
}
