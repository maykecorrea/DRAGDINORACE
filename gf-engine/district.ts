import { assertOpen, DAY, hm, nextOpenLabel, partsOf, placeOpen, WEEK, type Periodo } from "./clock.ts";
import { actFor } from "./initial.ts";
import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import { addMorale } from "./morale.ts";
import type { GameState, SupplierId } from "./state.ts";
import type { GfEvent } from "./finance.ts";
import farmacia from "../content/garagem-falida/v1/farmacia.json" with { type: "json" };

export type PlaceId =
  | "oficina"
  | "ferro_velho"
  | "casco_tech"
  | "megaosso"
  | "rato"
  | "leilao"
  | "banco"
  | "coliseu"
  | "hospital"
  | "farmacia"
  | "posto"
  | "tenda"
  | "praca"
  | "posto_cometa"
  | "galpao";

export type Place = {
  id: PlaceId;
  nome: string;
  short: string;
  /** PA para chegar, saindo da oficina. A volta custa o mesmo. */
  cost: number;
  kind: "home" | "shop" | "auction" | "bank" | "arena" | "visit";
  blurb: string;
};

export const PLACES: Place[] = [
  {
    id: "oficina",
    nome: "Oficina Ferrugem & Filho",
    short: "Oficina",
    cost: 0,
    kind: "home",
    blurb: "A baia. Todo conserto é feito aqui, e cada serviço usa peças da prateleira.",
  },
  {
    id: "casco_tech",
    nome: "Casco-Tech",
    short: "Casco-Tech",
    cost: 1,
    kind: "shop",
    blurb: "Loja de peça nova. Dá para pagar em 14 dias quando a fama chegar e o nome estiver limpo.",
  },
  {
    id: "ferro_velho",
    nome: "Ferro-Velho do Zé",
    short: "Ferro-Velho",
    cost: 1,
    kind: "shop",
    blurb: "O Zé vende peças usadas. Mais barato, mas o serviço fica menos caprichado.",
  },
  {
    id: "megaosso",
    nome: "Megaosso",
    short: "Megaosso",
    cost: 2,
    kind: "shop",
    blurb: "Do outro lado da cidade. O pedido mínimo é alto. Depois da primeira visita, o telefone também pede.",
  },
  {
    id: "rato",
    nome: "Beco do Rato",
    short: "Beco do Rato",
    cost: 1,
    kind: "shop",
    blurb: "Peça rara usada, sem garantia. Uma vez por semana o Rato conta um rumor da gangue.",
  },
  {
    id: "leilao",
    nome: "Cais do Leilão",
    short: "Leilão",
    cost: 1,
    kind: "auction",
    blurb: "Carro velho no leilão, no cais de piche.",
  },
  {
    id: "banco",
    nome: "Banco Fóssil",
    short: "Banco Fóssil",
    cost: 1,
    kind: "bank",
    blurb: "O dino que empresta. E cobra no domingo.",
  },
  {
    id: "coliseu",
    nome: "Coliseu da Arrancada",
    short: "Coliseu",
    cost: 1,
    kind: "arena",
    blurb: "Duas pistas, dois carros, uma arrancada. Ninguém aposta. O prêmio é fixo.",
  },
  {
    id: "hospital",
    nome: "Hospital da Faixa",
    short: "Hospital",
    cost: 1,
    kind: "visit",
    blurb: "Aberto o dia todo. Consulta custa 1 PA: 120 fósseis, ou de graça com plano.",
  },
  {
    id: "farmacia",
    nome: "Farmácia do Seu Gotardo",
    short: "Farmácia",
    cost: 1,
    kind: "visit",
    blurb: "Remédio para coisa leve. Não gasta energia.",
  },
  {
    id: "posto",
    nome: "Posto de Saúde",
    short: "Posto de Saúde",
    cost: 1,
    kind: "visit",
    blurb: "Check-up grátis terça e quinta.",
  },
  {
    id: "tenda",
    nome: "Tenda do Raizão",
    short: "Tenda do Raizão",
    cost: 1,
    kind: "visit",
    blurb: "Chá e um conselho. Uma vez por dia.",
  },
  {
    id: "praca",
    nome: "Praça do Fóssil",
    short: "Praça",
    cost: 1,
    kind: "visit",
    blurb: "A rotatória do T-Rex. Cliente de rua e panfleto.",
  },
  {
    id: "posto_cometa",
    nome: "Posto Cometa",
    short: "Posto Cometa",
    cost: 1,
    kind: "visit",
    blurb: "Combustível o dia todo. Cada arrancada gasta um tanque.",
  },
  {
    id: "galpao",
    nome: "Galpão dos Mandíbula",
    short: "Galpão",
    cost: 1,
    kind: "visit",
    blurb: "O Rex Navalha espera aqui. Sem briga, só conversa e desafio.",
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

export function trophyWeeks(flags: GameState["flags"]): number[] {
  const raw = flags.coliseuTrophies;
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw.split(",").map(Number).filter((item) => Number.isFinite(item));
}

export function supplierAt(id: PlaceId): SupplierId | null {
  if (id === "ferro_velho" || id === "casco_tech" || id === "megaosso" || id === "rato") return id;
  return null;
}

/** Ida custa o destino. Volta para a oficina custa o lugar onde você está. Já estar lá custa zero. Andar não gasta mais isso: o tempo é walkMinutes. */
export function travelCost(from: PlaceId, to: PlaceId): number {
  if (from === to) return 0;
  if (to === "oficina") return BY_ID.get(from)?.cost ?? 0;
  return BY_ID.get(to)?.cost ?? 0;
}

/** Posição na arte do mapa, em % da largura e da altura. */
export const SPOT: Record<PlaceId, { x: number; y: number }> = {
  oficina: { x: 30, y: 76.2 },
  hospital: { x: 31.2, y: 36.8 },
  banco: { x: 70.2, y: 36.8 },
  coliseu: { x: 45.2, y: 18.4 },
  megaosso: { x: 71, y: 75.6 },
  casco_tech: { x: 96.8, y: 37.2 },
  ferro_velho: { x: 4.2, y: 37.5 },
  leilao: { x: 96, y: 13.5 },
  rato: { x: 81, y: 13.2 },
  farmacia: { x: 3.2, y: 75.2 },
  posto: { x: 97.2, y: 76.4 },
  tenda: { x: 16, y: 42.4 },
  praca: { x: 50, y: 52 },
  posto_cometa: { x: 5, y: 14 },
  galpao: { x: 57.8, y: 18.4 },
};

/** Minutos de caminhada. O mesmo lugar custa zero. */
export function walkMinutes(from: PlaceId, to: PlaceId): number {
  if (from === to) return 0;
  const a = SPOT[from];
  const b = SPOT[to];
  const dx = b.x - a.x;
  const dy = (b.y - a.y) * (768 / 1376);
  const raw = 10 + Math.hypot(dx, dy) * 0.6;
  return Math.max(10, Math.min(45, Math.round(raw / 5) * 5));
}

export function lockReason(state: GameState, id: PlaceId): string | null {
  if (id === "leilao" && state.garage.level < 1) return "Remende a oficina (nível 1) para abrir o Cais do Leilão.";
  return null;
}

function dayKey(state: GameState): string {
  return `${state.calendar.week}-${state.calendar.day}`;
}

function panfletoWait(state: GameState): string | null {
  const usedAt = state.flags.panfletoAt;
  if (typeof usedAt !== "number") {
    return state.flags.panfletoDay === dayKey(state) ? "Amanhã, no mesmo horário, fica disponível de novo." : null;
  }
  const ready = usedAt + DAY;
  if (state.clock.t >= ready) return null;
  const back = partsOf(ready);
  const now = partsOf(state.clock.t);
  const hh = String(back.hour).padStart(2, "0");
  const mm = String(back.minute).padStart(2, "0");
  const when = back.week === now.week && back.day === now.day ? "Hoje" : "Amanhã";
  return `${when} às ${hh}:${mm} fica disponível de novo.`;
}

export const PILOTS: { id: string; place: PlaceId; nome: string }[] = [
  { id: "geck404", place: "casco_tech", nome: "GECK-404" },
  { id: "hypeclaw", place: "megaosso", nome: "HYPECLAW" },
  { id: "nyxatops", place: "ferro_velho", nome: "NYXATOPS" },
  { id: "luaptero", place: "praca", nome: "LUA-PTERO" },
  { id: "shellnakamoto", place: "rato", nome: "SHELLNAKAMOTO" },
];

const ZONE: Record<string, PlaceId> = {
  garagem: "oficina",
  rua_b1: "oficina",
  praca: "praca",
  ponto_motoboy: "praca",
  bar: "coliseu",
  faixa: "coliseu",
  paco: "banco",
  raptorlog: "megaosso",
  rua_b2: "casco_tech",
  rua_b3: "ferro_velho",
};

export function pilotAt(place: PlaceId) {
  return PILOTS.find((pilot) => pilot.place === place) ?? null;
}

export function pilotBeaten(flags: GameState["flags"], id: string): boolean {
  return flags[`pilotDown_${id}`] === true;
}

/** Lugar dominado cobra 10% a mais até a vitória no Coliseu. */
export function tollMul(state: GameState, place: string): number {
  const pilot = PILOTS.find((item) => item.place === place);
  if (!pilot || pilotBeaten(state.flags, pilot.id)) return 1;
  return 1.1;
}

export function clientSpot(lugar: string): PlaceId | null {
  return ZONE[lugar.trim().toLowerCase()] ?? null;
}

const CLIENT_HOME: Record<string, PlaceId> = {
  vizinho: "oficina",
  motoboy: "praca",
  comerciante: "megaosso",
  pechincheiro: "ferro_velho",
  frota: "galpao",
  corredor: "coliseu",
  caloteiro: "rato",
  prefeitura: "banco",
};

export function clientHome(type: string): PlaceId {
  return CLIENT_HOME[type] ?? "praca";
}

export function placeNome(id: string): string {
  return PLACES.find((place) => place.id === id)?.nome ?? id;
}

function supplierSpot(id: string): PlaceId {
  if (id === "casco_tech" || id === "ferro_velho" || id === "megaosso" || id === "rato") return id;
  return "megaosso";
}

/** Onde o pedido está agora, entre a loja e a oficina, pela hora do relógio. */
export function orderHop(
  order: { supplier: string; atWeek: number; atDay: number; fromT?: number; arriveT?: number },
  t: number,
): { x: number; y: number; fase: Periodo } {
  const from = SPOT[supplierSpot(order.supplier)] ?? SPOT.megaosso;
  const to = SPOT.oficina;
  const arrive = typeof order.arriveT === "number" ? order.arriveT : order.atWeek * WEEK + Math.max(0, order.atDay - 1) * DAY + 8 * 60;
  const start = typeof order.fromT === "number" ? order.fromT : arrive - DAY;
  const span = Math.max(30, arrive - start);
  const p = Math.max(0, Math.min(1, (t - start) / span));
  const avenueY = 83;
  if (p < 0.82) {
    const k = p / 0.82;
    return {
      x: from.x + (to.x - from.x) * k,
      y: avenueY,
      fase: partsOf(t).periodo,
    };
  }
  const k = (p - 0.82) / 0.18;
  return {
    x: to.x,
    y: avenueY + (to.y - avenueY) * k,
    fase: partsOf(t).periodo,
  };
}

export function clientsAt(content: Content, t: number): Map<PlaceId, string[]> {
  const clock = partsOf(t);
  const minute = clock.hour * 60 + clock.minute;
  const found = new Map<PlaceId, string[]>();
  for (const [id, row] of Object.entries(content.horarios)) {
    for (const window of row.aparece) {
      const named = clientSpot(String((window as { lugar?: string }).lugar ?? row.lugar));
      if (!named || !window.dias.includes(clock.day)) continue;
      const from = hm(window.de);
      const to = hm(window.ate);
      const inside = from < to ? minute >= from && minute < to : minute >= from || minute < to;
      if (!inside) continue;
      const list = found.get(named) ?? [];
      if (!list.includes(id)) list.push(id);
      found.set(named, list);
    }
  }
  return found;
}

export function dayEventPlace(state: GameState): PlaceId {
  const ids = PLACES.map((place) => place.id).filter((id) => id !== "oficina");
  const n = state.calendar.week * 7 + state.calendar.day;
  return ids[n % ids.length] ?? "praca";
}

export function applyDistrict(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "COLISEU") {
    if (here(state) !== "coliseu") throw new GameError("lugar_invalido", "A arrancada é no Coliseu.");
    assertOpen(content, "coliseu", state.clock.t);
    const fuel = typeof state.flags.fuel === "number" ? state.flags.fuel : 1;
    if (fuel < 1) throw new GameError("sem_combustivel", "O tanque está vazio. O Posto Cometa vende combustível.");
    state.flags.fuel = fuel - 1;
    const week = state.calendar.week + 1;
    const tournament = week === 18 || week === 30 || week === 44;
    const prize = tournament ? 1000 : 400;
    state.cash += prize;
    if (tournament) {
      const have = trophyWeeks(state.flags);
      if (!have.includes(week)) state.flags.coliseuTrophies = [...have, week].join(",");
    }
    const challenge = state.flags.challenge;
    if (typeof challenge === "string" && challenge.length > 0) {
      state.flags[`pilotDown_${challenge}`] = true;
      delete state.flags.challenge;
    }
    events.push({ type: "COLISEU_WIN", amount: prize, week, text: tournament ? `Semana ${week}` : "arrancada" });
    return true;
  }
  if (kind === "OSSOBUS") {
    const place = action.place;
    if (typeof place !== "string" || !BY_ID.has(place as PlaceId)) throw new GameError("lugar_invalido", "Esse lugar não existe no mapa.");
    if (state.cash < 5) throw new GameError("sem_caixa", "O Ossobus custa 5 fósseis.");
    const to = place as PlaceId;
    const arrival = state.clock.t + 10;
    state.cash -= 5;
    state.clock.t = arrival;
    stamp(state);
    state.flags.district = to;
    events.push({ type: "TRAVELED", text: `bus:${to}`, amount: 0, week: 10 });
    return true;
  }
  if (kind === "GARIMPO") {
    if (here(state) !== "ferro_velho") throw new GameError("lugar_invalido", "O garimpo é no Ferro-Velho do Zé.");
    assertOpen(content, "ferro_velho", state.clock.t);
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Você já fez o que dava hoje. Garimpar só amanhã.");
    if (state.flags.garimpoDay === dayKey(state)) throw new GameError("ja_feito", "O garimpo de hoje já foi feito.");
    state.calendar.apLeft -= 1;
    state.flags.garimpoDay = dayKey(state);
    const hit = (state.clock.t + state.cash) % 5 === 0;
    if (hit) {
      const lot = state.inventory.osso ?? { qty: 0, avgCost: 0, source: {}, ageWeeks: 0 };
      lot.qty += 1;
      state.inventory.osso = lot;
      events.push({ type: "BOUGHT", text: "garimpo", amount: 1 });
    } else {
      events.push({ type: "BOUGHT", text: "garimpo-vazio", amount: 0 });
    }
    return true;
  }
  if (kind === "CHA") {
    if (here(state) !== "tenda") throw new GameError("lugar_invalido", "O chá é na Tenda do Raizão.");
    assertOpen(content, "tenda", state.clock.t);
    if (state.flags.chaDay === dayKey(state)) throw new GameError("ja_feito", "O chá de hoje já foi tomado.");
    if (state.cash < 10) throw new GameError("sem_caixa", "O chá custa 10 fósseis.");
    state.cash -= 10;
    state.clock.energy = Math.min(content.time.energy.max, state.clock.energy + 15);
    state.flags.chaDay = dayKey(state);
    events.push({ type: "TRAVELED", text: "cha", amount: 0 });
    return true;
  }
  if (kind === "CHECKUP") {
    if (here(state) !== "posto") throw new GameError("lugar_invalido", "O check-up é no Posto de Saúde.");
    assertOpen(content, "posto", state.clock.t);
    const day = partsOf(state.clock.t).day;
    if (day !== 2 && day !== 4) throw new GameError("fechado", "O check-up grátis é terça e quinta.");
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Hoje não dá mais. Check-up no próximo dia.");
    state.calendar.apLeft -= 1;
    state.morale = Math.min(100, state.morale + 5);
    events.push({ type: "TRAVELED", text: "checkup", amount: 0 });
    return true;
  }
  if (kind === "CONSULTA") {
    if (here(state) !== "hospital") throw new GameError("lugar_invalido", "A consulta é no Hospital da Faixa.");
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Você já fez o que dava hoje. A consulta fica para amanhã.");
    const plan = state.flags.plano === true;
    if (!plan && state.cash < 120) throw new GameError("sem_caixa", "A consulta custa 120 fósseis. Com plano, é de graça.");
    if (!plan) state.cash -= 120;
    state.calendar.apLeft -= 1;
    state.morale = Math.min(100, state.morale + 20);
    events.push({ type: "TRAVELED", text: "consulta", amount: plan ? 0 : 120 });
    return true;
  }
  if (kind === "COMBUSTIVEL") {
    if (here(state) !== "posto_cometa") throw new GameError("lugar_invalido", "O combustível é no Posto Cometa.");
    if (state.cash < 15) throw new GameError("sem_caixa", "O combustível custa 15 fósseis.");
    state.cash -= 15;
    const have = typeof state.flags.fuel === "number" ? state.flags.fuel : 1;
    state.flags.fuel = have + 1;
    events.push({ type: "BOUGHT", text: "combustivel", amount: 15 });
    return true;
  }
  if (kind === "RUMOR") {
    if (here(state) !== "rato") throw new GameError("lugar_invalido", "O rumor é no Beco do Rato.");
    assertOpen(content, "rato", state.clock.t);
    if (state.flags.rumorWeek === state.calendar.week) throw new GameError("ja_feito", "O rumor desta semana já foi contado.");
    state.flags.rumorWeek = state.calendar.week;
    events.push({ type: "MEMORY", text: "O Rato sussurra: a gangue cobra pedágio. Ganhar no Coliseu tira a placa. Ninguém sai machucado." });
    return true;
  }
  if (kind === "PANFLETO") {
    if (here(state) !== "praca") throw new GameError("lugar_invalido", "O panfleto é na Praça do Fóssil.");
    assertOpen(content, "praca", state.clock.t);
    if (state.rep < 10) throw new GameError("sem_fama", "Com 10 de fama o panfleto pega.");
    const wait = panfletoWait(state);
    if (wait) throw new GameError("ja_feito", wait);
    if (state.calendar.apLeft < 1) throw new GameError("sem_pa", "Você já fez o que dava hoje. O panfleto fica para amanhã.");
    state.calendar.apLeft -= 1;
    state.flags.panfletoDay = dayKey(state);
    state.flags.panfletoAt = state.clock.t;
    const queued = typeof state.flags.prospectsQueued === "number" ? state.flags.prospectsQueued : 0;
    state.flags.prospectsQueued = queued + 1;
    events.push({ type: "PROSPECTED", amount: 0 });
    return true;
  }
  if (kind === "PLANO") {
    if (here(state) !== "posto") throw new GameError("lugar_invalido", "O plano é no Posto de Saúde.");
    assertOpen(content, "posto", state.clock.t);
    if (state.flags.plano === true) throw new GameError("ja_feito", "Você já tem o plano carapaça.");
    if (state.cash < 200) throw new GameError("sem_caixa", "O plano carapaça custa 200 fósseis.");
    state.cash -= 200;
    state.flags.plano = true;
    events.push({ type: "MEMORY", text: "Plano carapaça assinado. A consulta no hospital fica de graça." });
    return true;
  }
  if (kind === "RENEGOCIAR") {
    if (here(state) !== "banco") throw new GameError("longe", "Renegociar só em pessoa, com o Sr. Juros-Baixo.");
    assertOpen(content, "banco", state.clock.t);
    if (state.flags.renegWeek === state.calendar.week) throw new GameError("ja_feito", "O banco já renegociou nesta semana.");
    const debt = [...state.debts].filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance)[0];
    if (!debt) throw new GameError("sem_divida", "Não há dívida para renegociar.");
    const cut = Math.max(1, Math.round(debt.balance * 0.05));
    debt.balance = Math.max(0, debt.balance - cut);
    if (typeof debt.dueWeek === "number") debt.dueWeek += 1;
    state.flags.renegWeek = state.calendar.week;
    events.push({ type: "DEBT_PAID", amount: cut, debtId: debt.id, text: "renegociado" });
    return true;
  }
  if (kind === "DESAFIO") {
    const at = here(state);
    const pending = PILOTS.filter((pilot) => !pilotBeaten(state.flags, pilot.id));
    let id = "";
    if (pending.length === 0) {
      if (at !== "galpao") throw new GameError("lugar_invalido", "O Rex Navalha espera no Galpão dos Mandíbula.");
      if (state.flags.pilotDown_vexrex === true) throw new GameError("ja_feito", "A final com o Rex já aconteceu.");
      id = "vexrex";
    } else {
      const local = pilotAt(at);
      const next = local && !pilotBeaten(state.flags, local.id) ? local : at === "galpao" ? pending[0] : null;
      if (!next) throw new GameError("lugar_invalido", "O desafio é no Galpão ou no lugar do piloto.");
      id = next.id;
    }
    state.flags.challenge = id;
    state.flags[`pilotMet_${id}`] = true;
    const line = id === "vexrex"
      ? "O Rex Navalha aceita a final no Coliseu. Prêmio fixo. Ele não ameaça ninguém."
      : "Desafio aceito. A corrida é no Coliseu, com prêmio fixo e sem aposta.";
    events.push({ type: "MEMORY", text: line });
    return true;
  }
  if (kind === "TREAT") {
    if (here(state) !== "hospital") throw new GameError("lugar_invalido", "O tratamento é no Hospital da Faixa.");
    assertOpen(content, "hospital", state.clock.t);
    const id = String(action.illness ?? "");
    const ill = illnessOffer(id);
    if (!ill) throw new GameError("doenca_invalida", "O hospital não trata isso.");
    const bag = readBag(state.flags.meds);
    const rx = medOffer(ill.rx);
    const have = (bag.get(ill.rx) ?? 0) > 0;
    const price = have ? 0 : ill.preco;
    if (state.cash < price) throw new GameError("sem_caixa", `${ill.nome} custa ${price} fósseis. Tem na farmácia.`);
    if (have) {
      bag.set(ill.rx, (bag.get(ill.rx) ?? 1) - 1);
      state.flags.meds = writeBag(bag);
    } else state.cash -= price;
    const mine = state.flags.disease === id;
    if (mine) delete state.flags.disease;
    const hit = addMorale(state, content, mine ? ill.animo : 2);
    events.push({ type: "TREATED", text: mine ? ill.nome : `consulta:${ill.nome}`, amount: price });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
    return true;
  }
  if (kind === "BUY_MED") {
    if (here(state) !== "farmacia") throw new GameError("lugar_invalido", "O remédio é na Farmácia do Seu Gotardo.");
    assertOpen(content, "farmacia", state.clock.t);
    const id = String(action.med ?? "");
    const item = medOffer(id);
    if (!item) throw new GameError("remedio_invalido", "A farmácia não vende isso.");
    if (state.cash < item.price) throw new GameError("sem_caixa", `${item.nome} custa ${item.price} fósseis.`);
    state.cash -= item.price;
    const bag = readBag(state.flags.meds);
    bag.set(id, (bag.get(id) ?? 0) + 1);
    state.flags.meds = writeBag(bag);
    events.push({ type: "BOUGHT", text: `med:${item.nome}`, amount: item.price });
    return true;
  }
  if (kind === "DEBUG") {
    if (!debugAllowed()) throw new GameError("debug", "O modo de teste está desligado neste servidor.");
    const op = String(action.op ?? "");
    if (op === "week") {
      const shown = Math.max(1, Math.min(60, Math.floor(Number(action.week) || 1)));
      const minute = state.clock.t % DAY;
      state.clock.t = (shown - 1) * WEEK + minute;
      stamp(state);
      events.push({ type: "MEMORY", text: `Pulou para a semana ${shown}.` });
      return true;
    }
    if (op === "lesson") {
      const id = String(action.id ?? "L06");
      if (!state.lessonsTriggered.includes(id)) state.lessonsTriggered.push(id);
      events.push({ type: "MEMORY", text: `Lição ${id} liberada.` });
      return true;
    }
    if (op === "disease") {
      const id = String(action.id ?? "dz_resfriado");
      state.flags.disease = id;
      events.push({ type: "MEMORY", text: `Doença forçada: ${id}.` });
      return true;
    }
    if (op === "cash") {
      const amount = Math.max(0, Math.floor(Number(action.amount) || 500));
      state.cash += amount;
      events.push({ type: "MEMORY", text: `Caixa de teste: +${amount} fósseis.` });
      return true;
    }
    if (op === "tourney") {
      state.clock.t = 17 * WEEK + 18 * 60;
      stamp(state);
      events.push({ type: "MEMORY", text: "Semana 18, 18:00. O torneio do Coliseu está aberto." });
      return true;
    }
    throw new GameError("debug", "Comando de teste desconhecido.");
  }
  if (kind !== "TRAVEL") return false;
  const place = action.place;
  if (typeof place !== "string" || !BY_ID.has(place as PlaceId)) {
    throw new GameError("lugar_invalido", "Esse lugar não existe no mapa.");
  }
  const to = place as PlaceId;
  const from = here(state);
  const minutes = walkMinutes(from, to);
  if (minutes === 0) {
    events.push({ type: "TRAVELED", text: to, amount: 0 });
    return true;
  }
  const locked = lockReason(state, to);
  if (locked) throw new GameError("trancado", locked);
  const arrival = state.clock.t + minutes;
  state.clock.t = arrival;
  stamp(state);
  state.flags.district = to;
  events.push({ type: "TRAVELED", text: to, amount: 0, week: minutes });
  return true;
}

function stamp(state: GameState): void {
  const p = partsOf(state.clock.t);
  state.calendar.week = p.week;
  state.calendar.day = p.day;
  state.calendar.act = actFor(p.week);
}

function clockFace(t: number): string {
  const p = partsOf(t);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

const MED_ROWS = farmacia.itens as { id: string; nome: string; preco: number }[];
const ILL_ROWS = farmacia.doencas as { id: string; nome: string; rx: string; grau: string; preco: number; animo: number }[];

export function medOffer(id: string): { nome: string; price: number } | null {
  const row = MED_ROWS.find((item) => item.id === id);
  if (!row) return null;
  return { nome: row.nome, price: row.preco };
}

export function illnessOffer(id: string): { nome: string; rx: string; grau: string; preco: number; animo: number } | null {
  return ILL_ROWS.find((item) => item.id === id) ?? null;
}

function debugAllowed(): boolean {
  const flag = process.env.GF_DEBUG?.trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function readBag(raw: unknown): Map<string, number> {
  const bag = new Map<string, number>();
  if (typeof raw !== "string") return bag;
  for (const part of raw.split(",")) {
    const [id, qty] = part.split(":");
    const count = Number(qty);
    if (id && Number.isInteger(count) && count > 0) bag.set(id, count);
  }
  return bag;
}

function writeBag(bag: Map<string, number>): string {
  return [...bag.entries()].filter(([, qty]) => qty > 0).map(([id, qty]) => `${id}:${qty}`).join(",");
}

function shutMessage(content: Content, place: string, arrival: number): string {
  const name = content.time.closedName?.[place] ?? place;
  const hours = content.time.places?.[place] ?? [];
  const clock = partsOf(arrival);
  const minute = clock.hour * 60 + clock.minute;
  const today = hours.find((item) => item.dias.includes(clock.day));
  if (today) {
    const from = hm(today.de);
    const to = hm(today.ate);
    if (from < to && minute < from) return `${name} abre às ${today.de}.`;
    if (from > to && minute >= to && minute < from) return `${name} abre às ${today.de}.`;
  }
  return `${name} abre ${nextOpenLabel(content, place, arrival)}. Você chega ${clockFace(arrival)}.`;
}
