import { assertOpen } from "./clock.ts";
import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import type { GameState, SupplierId } from "./state.ts";
import type { GfEvent } from "./finance.ts";

export type PlaceId = "oficina" | "ferro_velho" | "casco_tech" | "megaosso" | "rato" | "leilao" | "banco";

export type Place = {
  id: PlaceId;
  nome: string;
  short: string;
  /** PA para chegar, saindo da oficina. A volta custa o mesmo. */
  cost: number;
  kind: "home" | "shop" | "auction" | "bank";
  blurb: string;
};

export const PLACES: Place[] = [
  {
    id: "oficina",
    nome: "Oficina do Téo",
    short: "Oficina",
    cost: 0,
    kind: "home",
    blurb: "A baia. O reparo só sai daqui, e cada serviço come peça da prateleira.",
  },
  {
    id: "casco_tech",
    nome: "Casco-Tech",
    short: "Casco-Tech",
    cost: 1,
    kind: "shop",
    blurb: "Loja de peça nova. Prazo de 14 dias se a fama chegar e o nome estiver limpo.",
  },
  {
    id: "ferro_velho",
    nome: "Ferro-Velho do Zé",
    short: "Ferro-Velho",
    cost: 1,
    kind: "shop",
    blurb: "O Zé vende o que sobrou do osso. Mais barato, e o serviço sai menos caprichado.",
  },
  {
    id: "megaosso",
    nome: "Megaosso Atacado",
    short: "Megaosso",
    cost: 2,
    kind: "shop",
    blurb: "Do outro lado do piche. Ida 2 PA, volta 2 PA. Com o dia de 3, você dorme no atacado.",
  },
  {
    id: "rato",
    nome: "Beco do Rato",
    short: "Beco",
    cost: 1,
    kind: "shop",
    blurb: "Peça pela metade do preço. A caminhada é 1 PA e retirar no beco é outro.",
  },
  {
    id: "leilao",
    nome: "Cais do Leilão",
    short: "Leilão",
    cost: 1,
    kind: "auction",
    blurb: "Carcaça velha no martelo, no cais de piche.",
  },
  {
    id: "banco",
    nome: "Banco do Osso",
    short: "Banco",
    cost: 1,
    kind: "bank",
    blurb: "O osso que empresta. E cobra no domingo.",
  },
];

const BY_ID = new Map(PLACES.map((place) => [place.id, place]));

export function placeById(id: string): Place | undefined {
  return BY_ID.get(id as PlaceId);
}

/** Sem bandeira, Téo ainda não saiu: está na oficina. */
export function here(state: GameState): PlaceId {
  const district = state.flags.district;
  if (typeof district === "string" && BY_ID.has(district as PlaceId)) return district as PlaceId;
  return "oficina";
}

export function supplierAt(id: PlaceId): SupplierId | null {
  if (id === "ferro_velho" || id === "casco_tech" || id === "megaosso" || id === "rato") return id;
  return null;
}

/** Ida custa o destino. Volta para a oficina custa o lugar onde você está. Já estar lá custa zero. */
export function travelCost(from: PlaceId, to: PlaceId): number {
  if (from === to) return 0;
  if (to === "oficina") return BY_ID.get(from)?.cost ?? 0;
  return BY_ID.get(to)?.cost ?? 0;
}

export function applyDistrict(state: GameState, action: Record<string, unknown>, _content: Content, events: GfEvent[]): boolean {
  if (String(action.type ?? "") !== "TRAVEL") return false;
  const place = action.place;
  if (typeof place !== "string" || !BY_ID.has(place as PlaceId)) {
    throw new GameError("lugar_invalido", "Esse lugar não existe no mapa.");
  }
  const to = place as PlaceId;
  const from = here(state);
  const cost = travelCost(from, to);
  if (state.calendar.apLeft < cost) throw new GameError("sem_pa", "Sem ponto de ação para a caminhada.");
  if (cost > 0) assertOpen(_content, to, state.clock.t);
  state.calendar.apLeft -= cost;
  state.flags.district = to;
  events.push({ type: "TRAVELED", text: to, amount: cost });
  return true;
}
