import { applyAction, contentV1, createInitialState, GameError, type GameState } from "../../../gf-engine/index.ts";
import { blankClock, DAY, WEEK } from "../../../gf-engine/clock.ts";
import { openingDebts } from "../../../gf-engine/finance.ts";
import type { QueuedCard } from "../../../gf-engine/state.ts";
import { GfError } from "./errors.ts";

export const ENGINE_VERSION = "0.2.0";
export const CONTENT_VERSION = "v1";
export { createInitialState };

/** Passos de formato do `state`. A chave é a versão de origem. */
export const STATE_STEPS: Record<string, { to: string; migrate: (state: unknown) => unknown }> = {};

export function migrateState(
  state: unknown,
  engineVersion: string,
): { state: unknown; engineVersion: string; changed: boolean } {
  let current = engineVersion;
  let value = state;
  let changed = false;
  const seen = new Set<string>();
  while (current !== ENGINE_VERSION) {
    const step = STATE_STEPS[current];
    if (!step || seen.has(current)) break;
    seen.add(current);
    value = step.migrate(value);
    current = step.to;
    changed = true;
  }
  return { state: value, engineVersion: current, changed };
}

/** Campanha da Parte 02 só tinha nome e caixa. A leitura completa o estado. */
export function ensureFullState(state: unknown, seed: number): { state: GameState; changed: boolean } {
  const raw = state as Partial<GameState> | null;
  if (raw && raw.schema === 1 && raw.garage && typeof raw.rngState === "number" && raw.calendar && "apLeft" in raw.calendar) {
    const state = raw as GameState;
    let changed = false;
    if (!state.clock || typeof state.clock.t !== "number") {
      const ap = Math.max(0, Math.min(3, state.calendar.apLeft));
      const slots = [contentV1.time.wakeMinute, 12 * 60, 18 * 60, DAY];
      const t = state.calendar.week * WEEK + (state.calendar.day - 1) * DAY + (slots[3 - ap] ?? contentV1.time.wakeMinute);
      state.clock = blankClock(t, contentV1.time.defaultSpeed, 70);
      changed = true;
    }
    if (state.debts.length === 0 && state.calendar.week === 0 && state.history.length === 0) {
      const next = structuredClone(state);
      next.debts = openingDebts(contentV1);
      normalizeQueue(next);
      return { state: next, changed: true };
    }
    if (normalizeQueue(state) || changed) return { state, changed: true };
    return { state, changed: false };
  }
  const name = raw?.player && typeof raw.player.name === "string" ? raw.player.name : "Téo";
  return { state: createInitialState(seed >>> 0, name), changed: true };
}

function normalizeQueue(state: GameState): boolean {
  const raw = state.cardQueue as unknown;
  if (!Array.isArray(raw)) {
    state.cardQueue = [];
    return true;
  }
  if (raw.every((item) => item && typeof item === "object" && "cardId" in item)) return false;
  state.cardQueue = raw.map((item) =>
    typeof item === "string"
      ? { cardId: item, week: state.calendar.week, day: state.calendar.day, opened: false }
      : (item as QueuedCard),
  );
  return true;
}

export function applyEngine(state: unknown, action: unknown): { state: unknown; events: unknown[] } {
  try {
    return applyAction(state as GameState, action, contentV1);
  } catch (err) {
    if (err instanceof GameError) throw new GfError(422, err.message);
    throw err;
  }
}
