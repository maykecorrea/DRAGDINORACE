import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import type { GfEvent } from "./finance.ts";
import { chance, int } from "./rng.ts";
import type { GameState } from "./state.ts";

function lots(state: GameState): NonNullable<GameState["auctionLots"]> {
  return state.auctionLots ?? [];
}

export function stepAuction(state: GameState, content: Content, events: GfEvent[]): void {
  if (state.garage.level < 1) return;
  const held = [...state.carcasses];
  for (const carcass of held) {
    if (carcass.apLeft > 0 || carcass.listedPrice == null) continue;
    carcass.weeksListed += 1;
    const yard = 20;
    state.cash -= yard;
    const def = content.carcasses.find((item) => item.id === carcass.type);
    const low = def?.sell[0] ?? carcass.boughtFor;
    const high = def?.sell[1] ?? carcass.listedPrice;
    const decay = Math.max(1, Math.round(carcass.listedPrice * 0.01));
    carcass.listedPrice = Math.max(low, carcass.listedPrice - decay);
    const discount = high > 0 ? Math.max(0, (high - carcass.listedPrice) / high) : 0;
    const odds = Math.min(0.95, (def?.liquidity ?? 0.5) + Math.floor(discount / 0.05) * 0.1);
    if (chance(state, odds)) {
      state.cash += carcass.listedPrice;
      events.push({ type: "CARCASS_SOLD", amount: carcass.listedPrice, text: carcass.type });
      state.carcasses = state.carcasses.filter((item) => item !== carcass);
    }
  }
  const pool = content.carcasses.filter((item) => item.enabled && item.level <= state.garage.level);
  if (pool.length === 0) return;
  const born: NonNullable<GameState["auctionLots"]> = [];
  for (let i = 0; i < 2; i += 1) {
    const pick = pool[int(state, 0, pool.length - 1)]!;
    born.push({ id: `${pick.id}-${state.calendar.week}-${i}`, type: pick.id, price: pick.buy, defect: chance(state, 0.2), revealed: false });
  }
  state.auctionLots = born;
  events.push({ type: "AUCTION", amount: born.length, week: state.calendar.week });
}

export function applyAuction(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind !== "INSPECT_LOT" && kind !== "BUY_LOT" && kind !== "WORK_CARCASS" && kind !== "LIST_CARCASS") return false;
  if (state.garage.level < 1) throw new GameError("nivel_baixo", "O leilão abre quando a oficina estiver remendada.");
  if (state.flags.district !== "leilao") throw new GameError("longe", "As ações do leilão só funcionam no Cais do Leilão.");
  if (kind === "INSPECT_LOT") {
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Sem energia.");
    const rows = lots(state);
    const lot = rows.find((item) => item.id === action.id);
    if (!lot) throw new GameError("lote_sumiu", "Esse lote já saiu do pátio.");
    state.calendar.apLeft -= 1;
    lot.revealed = true;
    state.auctionLots = rows;
    events.push({ type: "INSPECTED", text: lot.defect ? "defeito" : "limpa" });
    return true;
  }
  if (kind === "BUY_LOT") {
    const rows = lots(state);
    const lot = rows.find((item) => item.id === action.id);
    const def = lot ? content.carcasses.find((item) => item.id === lot.type) : undefined;
    if (!lot || !def) throw new GameError("lote_sumiu", "Esse lote já saiu do pátio.");
    const extra = lot.defect ? Math.round(def.material * 0.3) : 0;
    const price = lot.price + extra;
    if (state.cash - price < -state.overdraftLimit) throw new GameError("sem_caixa", "O limite do banco não cobre esse carro.");
    state.cash -= price;
    state.carcasses.push({
      id: lot.id,
      type: lot.type,
      boughtFor: price,
      apLeft: def.ap + (lot.defect ? 3 : 0),
      hiddenDefect: lot.defect && !lot.revealed,
      inspected: lot.revealed,
      weeksListed: 0,
    });
    state.auctionLots = rows.filter((item) => item.id !== lot.id);
    events.push({ type: "BOUGHT_CARCASS", amount: price, text: def.nome });
    return true;
  }
  const carcass = state.carcasses.find((item) => item.id === action.id);
  if (!carcass) throw new GameError("lote_sumiu", "Esse carro não está no pátio.");
  if (kind === "WORK_CARCASS") {
    if (carcass.apLeft <= 0) throw new GameError("ja_pronta", "Esse carro já está pronto.");
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Sem energia.");
    state.calendar.apLeft -= 1;
    carcass.apLeft -= 1;
    events.push({ type: "CARCASS_WORK", text: carcass.type, amount: carcass.apLeft });
    return true;
  }
  if (carcass.apLeft > 0) throw new GameError("ainda_nao", "Ainda falta trabalho nesse carro.");
  const def = content.carcasses.find((item) => item.id === carcass.type);
  const low = def?.sell[0] ?? carcass.boughtFor;
  const high = def?.sell[1] ?? low;
  const asked = typeof action.price === "number" ? Math.round(action.price) : high;
  carcass.listedPrice = Math.max(low, Math.min(high, asked));
  carcass.hiddenDefect = false;
  events.push({ type: "CARCASS_LISTED", amount: carcass.listedPrice, text: carcass.type });
  return true;
}
