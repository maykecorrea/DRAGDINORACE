import { GameError } from "./errors.ts";
import type { GameState } from "./state.ts";

export type Fitting = {
  id: "prateleira" | "prateleira2" | "elevador";
  name: string;
  cost: number;
  value: number;
  needs: Fitting["id"] | null;
};

export const FITTINGS: Fitting[] = [
  { id: "prateleira", name: "Prateleira de peças", cost: 1500, value: 900, needs: null },
  { id: "prateleira2", name: "Prateleira grande", cost: 3500, value: 2200, needs: "prateleira" },
  { id: "elevador", name: "Elevador", cost: 5000, value: 3200, needs: null },
];

const IDS = new Set(FITTINGS.map((item) => item.id));

export function fittingById(id: string): Fitting | undefined {
  return FITTINGS.find((item) => item.id === id);
}

function isLift(id: string): boolean {
  return id === "elevador" || id.startsWith("elevador-");
}

/** A primeira baia já nasce com elevador. Cada compra cobre mais uma baia. */
export function liftsInstalled(state: GameState): number {
  const bought = state.assets.filter((asset) => isLift(asset.id)).length;
  return (state.flags.liftBase === 0 ? 0 : 1) + bought;
}

export function stockQty(state: GameState): number {
  return Object.values(state.inventory).reduce((sum, lot) => sum + (lot?.qty ?? 0), 0);
}

export function stockCap(state: GameState): number {
  if (ownsFitting(state, "prateleira2")) return 160;
  if (ownsFitting(state, "prateleira")) return 80;
  return 36;
}

export function assertShelf(state: GameState, adding: number): void {
  if (adding <= 0) return;
  if (stockQty(state) + adding > stockCap(state)) {
    throw new GameError("sem_prateleira", "Não cabe. A reforma não traz prateleira: compra uma quando tiver o dinheiro.");
  }
}

export function nextShelf(state: GameState): Fitting | null {
  if (!ownsFitting(state, "prateleira")) return FITTINGS[0] ?? null;
  if (!ownsFitting(state, "prateleira2")) return FITTINGS[1] ?? null;
  return null;
}

export function ownsFitting(state: GameState, id: string): boolean {
  return state.assets.some((asset) => asset.id === id);
}

export function nextLift(state: GameState): Fitting | null {
  return liftsInstalled(state) < state.garage.bays ? (FITTINGS[2] ?? null) : null;
}

export function sellableFittings(state: GameState): { id: string; name: string; value: number }[] {
  return state.assets
    .filter((asset) => IDS.has(asset.id as Fitting["id"]) || isLift(asset.id))
    .sort((a, b) => a.value - b.value);
}
