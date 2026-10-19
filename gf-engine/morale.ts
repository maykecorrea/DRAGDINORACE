import type { Content } from "./content.ts";
import type { GameState } from "./state.ts";

export function addMorale(state: GameState, content: Content, delta: number): { collapsed: boolean } {
  const { moraleMin, moraleMax, moraleAfterCollapse } = content.balance;
  const clamped = Math.max(moraleMin, Math.min(moraleMax, state.morale + delta));
  if (clamped <= moraleMin && state.morale > moraleMin) {
    state.collapses.push(state.calendar.week);
    state.flags.noApWeek = state.calendar.week + 1;
    state.morale = moraleAfterCollapse;
    return { collapsed: true };
  }
  state.morale = clamped;
  return { collapsed: false };
}

export function morningAp(state: GameState, content: Content): number {
  if (Number(state.flags.noApWeek) === state.calendar.week) return 0;
  return content.balance.apPerDay;
}
