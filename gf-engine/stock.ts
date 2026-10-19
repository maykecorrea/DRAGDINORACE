import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import type { GameState, MaterialBatch, MaterialId, StockLot, SupplierId } from "./state.ts";

export type Take = {
  cost: number;
  qualityMod: number;
  usedRato: boolean;
  supplier: SupplierId;
};

function supplierMod(content: Content, id: SupplierId): number {
  return content.suppliers.find((item) => item.id === id)?.qualityMod ?? 0;
}

/** Lotes antigos, sem `batches`, viram um lote por origem no custo médio. */
export function ensureBatches(lot: StockLot, fallback: SupplierId = "ferro_velho"): MaterialBatch[] {
  if (lot.batches && lot.batches.length > 0) return lot.batches;
  const batches: MaterialBatch[] = [];
  const sources = Object.entries(lot.source) as [SupplierId, number][];
  const usable = sources.filter(([, qty]) => qty > 0);
  if (usable.length === 0) {
    if (lot.qty > 0) {
      batches.push({
        supplier: fallback,
        qty: lot.qty,
        unitCost: lot.avgCost,
        baseCost: lot.avgCost,
        ageWeeks: lot.ageWeeks,
        boughtWeek: 0,
      });
    }
  } else {
    for (const [supplier, qty] of usable) {
      batches.push({
        supplier,
        qty,
        unitCost: lot.avgCost,
        baseCost: lot.avgCost,
        ageWeeks: lot.ageWeeks,
        boughtWeek: 0,
      });
    }
  }
  lot.batches = batches;
  return batches;
}

function refresh(lot: StockLot): void {
  const batches = (lot.batches ?? []).filter((batch) => batch.qty > 0);
  lot.batches = batches;
  const qty = batches.reduce((sum, batch) => sum + batch.qty, 0);
  lot.qty = qty;
  if (qty <= 0) {
    lot.avgCost = 0;
    lot.source = {};
    lot.ageWeeks = 0;
    return;
  }
  const cost = batches.reduce((sum, batch) => sum + batch.unitCost * batch.qty, 0);
  lot.avgCost = Math.round(cost / qty);
  const source: StockLot["source"] = {};
  for (const batch of batches) source[batch.supplier] = (source[batch.supplier] ?? 0) + batch.qty;
  lot.source = source;
  lot.ageWeeks = Math.max(...batches.map((batch) => batch.ageWeeks));
}

function sync(state: GameState, material: MaterialId): void {
  const lot = state.inventory[material];
  if (!lot) return;
  refresh(lot);
  if (lot.qty <= 0) delete state.inventory[material];
}

export function receiveBatch(state: GameState, material: MaterialId, batch: MaterialBatch): void {
  const lot = state.inventory[material] ?? { qty: 0, avgCost: 0, source: {}, ageWeeks: 0, batches: [] };
  state.inventory[material] = lot;
  ensureBatches(lot);
  lot.batches?.push({ ...batch });
  sync(state, material);
}

export function hasMaterials(state: GameState, needs: Partial<Record<MaterialId, number>>): boolean {
  for (const [id, qty] of Object.entries(needs)) {
    if (!qty) continue;
    if ((state.inventory[id as MaterialId]?.qty ?? 0) < qty) return false;
  }
  return true;
}

/** FIFO: o lote mais velho sai primeiro. A pior qualidade do que saiu vale para o serviço. */
export function consumeMaterials(state: GameState, content: Content, material: MaterialId, qty: number): Take {
  const lot = state.inventory[material];
  if (!lot || qty <= 0 || lot.qty < qty) throw new GameError("sem_peca", "Falta peça na prateleira.");
  ensureBatches(lot);
  const ranked = (lot.batches ?? [])
    .map((batch, index) => ({ batch, index }))
    .sort((a, b) => b.batch.ageWeeks - a.batch.ageWeeks || a.index - b.index);
  let left = qty;
  let cost = 0;
  let worst = Number.POSITIVE_INFINITY;
  let supplier: SupplierId = "ferro_velho";
  let usedRato = false;
  for (const row of ranked) {
    if (left <= 0) break;
    if (row.batch.qty <= 0) continue;
    const take = Math.min(row.batch.qty, left);
    const mod = supplierMod(content, row.batch.supplier);
    if (mod < worst) {
      worst = mod;
      supplier = row.batch.supplier;
    }
    if (row.batch.supplier === "rato") usedRato = true;
    cost += row.batch.unitCost * take;
    row.batch.qty -= take;
    left -= take;
  }
  if (left > 0) throw new GameError("sem_peca", "Falta peça na prateleira.");
  sync(state, material);
  return { cost, qualityMod: worst === Number.POSITIVE_INFINITY ? 0 : worst, usedRato, supplier };
}

export function removeSupplierStock(state: GameState, supplier: SupplierId): void {
  const ids = Object.keys(state.inventory) as MaterialId[];
  for (const id of ids) {
    const lot = state.inventory[id];
    if (!lot) continue;
    ensureBatches(lot);
    for (const batch of lot.batches ?? []) {
      if (batch.supplier === supplier) batch.qty = 0;
    }
    sync(state, id);
  }
}

/** Uma vez por fechamento. Óleo e bobina envelhecem sem perder valor. */
export function oxidizeStock(state: GameState, content: Content): void {
  const rule = content.balance.quality;
  let rotting = false;
  const ids = Object.keys(state.inventory) as MaterialId[];
  for (const id of ids) {
    const lot = state.inventory[id];
    if (!lot) continue;
    ensureBatches(lot);
    const immune = content.materials.find((item) => item.id === id)?.rots === false;
    for (const batch of lot.batches ?? []) {
      batch.ageWeeks += 1;
      if (!immune && batch.ageWeeks > rule.rotWeeks) {
        const over = batch.ageWeeks - rule.rotWeeks;
        batch.unitCost = Math.max(0, Math.round(batch.baseCost * (1 - rule.rotRate * over)));
        rotting = true;
      }
    }
    sync(state, id);
  }
  if (rotting) state.flags.stockRotting = true;
}
