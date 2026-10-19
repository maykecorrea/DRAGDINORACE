import { applyAction } from "./apply.ts";
import type { Content } from "./content.ts";
import type { GameState } from "./state.ts";

export type CashWeek = { week: number; cash: number; ended?: string };

/** Oito semanas só com o que já está no papel: fixo, salário, parcela e recebível. Sem receita nova. */
export function projection8w(state: GameState, content: Content): CashWeek[] | null {
  if (state.flags.accountant !== true) return null;
  let sim = structuredClone(state);
  const rows: CashWeek[] = [];
  for (let week = 0; week < 8; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      sim = applyAction(sim, { type: "END_DAY" }, content).state;
      if (sim.ending) {
        rows.push({ week: sim.calendar.week, cash: sim.cash, ended: sim.ending });
        return rows;
      }
    }
    rows.push({ week: sim.calendar.week, cash: sim.cash });
  }
  return rows;
}
