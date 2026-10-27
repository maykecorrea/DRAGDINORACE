import { DAY, dayIndex, startOfDay } from "./clock.ts";
import { here } from "./district.ts";
import { GameError } from "./errors.ts";
import { type GfEvent } from "./finance.ts";
import { fittingById, liftsInstalled, ownsFitting, sellableFittings } from "./fittings.ts";
import { chance, int } from "./rng.ts";
import type { GameState, Hand, HandOffer } from "./state.ts";

const SEVEN = 7 * 60;
const ENERGY_MAX = 100;
const AP_COST = 25;
/** Cada foto tem um nome fixo, do mesmo gênero e da mesma cara. */
const FACE_NAMES = [
  "Bia", "Nando", "Tina", "Miro", "Lito",
  "Cida", "Roni", "Peba", "Dara", "Guto",
  "Tati", "Juca", "Léo", "Duda", "Cacá",
  "Keka", "Nilo", "Vini", "Mel", "Otto",
  "Zeca", "Lila", "Dino", "Luma", "Kika",
];
const EXCUSES = ["O pneu da bike furou.", "O filho ficou na escola.", "Perdeu o ônibus.", "A mãe chamou.", "Dormiu demais."];

function seq(state: GameState): number {
  const value = state.flags.seq;
  const next = (typeof value === "number" ? value : 0) + 1;
  state.flags.seq = next;
  return next;
}

function alignFace(item: { photo?: number; nome: string }): void {
  const n = item.photo ?? 0;
  if (n >= 1 && n <= FACE_NAMES.length) item.nome = FACE_NAMES[n - 1];
}

export function faceName(photo: number | undefined, fallback: string): string {
  if (photo && photo >= 1 && photo <= FACE_NAMES.length) return FACE_NAMES[photo - 1];
  return fallback;
}

export function handsOf(state: GameState): Hand[] {
  if (!state.hands) state.hands = [];
  for (const item of state.hands) alignFace(item);
  return state.hands;
}

function offersOf(state: GameState): HandOffer[] {
  if (!state.offers) state.offers = [];
  for (const item of state.offers) alignFace(item);
  return state.offers;
}

const OFFICE_BAYS = [1, 3, 7, 7, 7, 7];

export function officeBays(level: number): number {
  return OFFICE_BAYS[level] ?? 7;
}

function producers(state: GameState): number {
  return state.employees.filter((employee) => employee.apPerDay > 0).length + handsOf(state).length;
}

function bayCap(state: GameState): number {
  if (state.garage.upgradingTo == null) state.garage.bays = officeBays(state.garage.level);
  return state.garage.bays;
}

function salaryFor(yieldPct: number): number {
  return yieldPct * 30;
}

function freePhoto(state: GameState): number {
  const used = new Set<number>();
  for (const item of [...offersOf(state), ...handsOf(state)]) {
    if (item.photo) used.add(item.photo);
  }
  const pool: number[] = [];
  for (let n = 1; n <= 25; n += 1) if (!used.has(n)) pool.push(n);
  if (pool.length === 0) return int(state, 1, 25);
  return pool[int(state, 0, pool.length - 1)] ?? 1;
}

function freshOffer(state: GameState): HandOffer {
  const yieldPct = int(state, 30, 92);
  const photo = freePhoto(state);
  const nome = FACE_NAMES[photo - 1] ?? `Ajudante ${seq(state)}`;
  return { id: `vaga-${seq(state)}`, nome, yieldPct, salary: salaryFor(yieldPct), photo };
}

/** Às 7h troca a leva. Sempre 3 nomes novos. Quem foi contratado não volta no mesmo dia. */
function refillOffers(state: GameState): void {
  const next: HandOffer[] = [];
  state.offers = next;
  while (next.length < 3) next.push(freshOffer(state));
}

function freeJob(state: GameState, handId: string): void {
  for (const job of state.jobs) {
    if (job.handId !== handId) continue;
    job.handId = undefined;
    if ((job.apDone ?? 0) <= 0) job.yieldPct = undefined;
  }
}

function claim(state: GameState, hand: Hand) {
  const owned = state.jobs.find((job) => job.handId === hand.id && job.status === "in_progress");
  if (owned) return owned;
  const open = state.jobs.find((job) => job.status === "in_progress" && job.assignedTo === "teo" && !job.handId && job.apDone <= 0);
  if (!open) return undefined;
  open.handId = hand.id;
  open.yieldPct = hand.yieldPct;
  return open;
}

/** No fim do dia o ajudante gasta a energia dele na baía. Sem cliente, ele não produz. O pagamento só sai depois de 30 dias trabalhados. */
export function runHands(state: GameState, events: GfEvent[]): void {
  for (const hand of handsOf(state)) {
    if ((hand.pay ?? 0) > 0) continue;
    if (hand.out) continue;
    while (hand.energy >= AP_COST) {
      const job = claim(state, hand);
      if (!job) break;
      const room = job.apNeeded - job.apDone;
      if (room <= 0) break;
      const steps = Math.min(room, Math.floor(hand.energy / AP_COST));
      if (steps <= 0) break;
      job.apDone += steps;
      hand.energy -= steps * AP_COST;
      if (job.apDone < job.apNeeded) {
        events.push({ type: "MEMORY", text: `${hand.nome} andou o serviço na baía ${hand.bay}.` });
        break;
      }
      job.status = "ready";
      events.push({ type: "JOB_READY", jobId: job.id, text: hand.nome });
    }
    hand.daysWorked = (hand.daysWorked ?? 0) + 1;
    if (hand.daysWorked >= 30) {
      hand.pay = Math.max(0, hand.salary - (hand.advance ?? 0));
      hand.advance = 0;
      hand.daysWorked = 0;
      events.push({ type: "MEMORY", text: `${hand.nome} fechou 30 dias. O Téo deve ${hand.pay} ₣.` });
    }
  }
  collectDue(state, events);
}

function rollOne(state: GameState, hand: Hand, events: GfEvent[]): boolean {
  hand.out = "";
  hand.excuse = "";
  hand.energy = hand.energyMax;
  if (chance(state, 0.005)) {
    freeJob(state, hand.id);
    events.push({ type: "MEMORY", text: `${hand.nome} não apareceu. A notícia chegou de tarde.` });
    return false;
  }
  if (chance(state, 0.01)) {
    hand.out = "doente";
    hand.excuse = "Gripou. Disse que se vira.";
    events.push({ type: "MEMORY", text: `${hand.nome} ficou doente e faltou. A saúde é com ele.` });
  } else if (chance(state, 0.01)) {
    hand.out = "falta";
    hand.excuse = EXCUSES[int(state, 0, EXCUSES.length - 1)] ?? "Faltou.";
    events.push({ type: "MEMORY", text: `${hand.nome} faltou. ${hand.excuse}` });
  }
  if (hand.advance <= 0 && chance(state, 0.03)) {
    hand.advance = Math.max(20, Math.round(hand.salary * 0.4));
    events.push({ type: "MEMORY", text: `${hand.nome} pediu ${hand.advance} ₣ adiantados. Sai dos 30 dias.` });
  }
  if (!hand.raise && chance(state, 0.01)) {
    hand.raise = true;
    events.push({ type: "MEMORY", text: `${hand.nome} pediu aumento. Se negar, o rendimento cai 5%.` });
  }
  return true;
}

/** Todo dia às 7h. Uma vez por dia. */
export function diaF(state: GameState, events: GfEvent[], mark: number): void {
  if (state.flags.diaFDay === mark) return;
  state.flags.diaFDay = mark;
  const alive: Hand[] = [];
  for (const hand of handsOf(state)) {
    if (rollOne(state, hand, events)) alive.push(hand);
  }
  state.hands = alive;
  refillOffers(state);
}

export function crossDiaF(state: GameState, from: number, to: number, events: GfEvent[]): void {
  let cursor = from;
  while (cursor < to) {
    const mark = startOfDay(cursor) + SEVEN;
    const next = mark <= cursor ? mark + DAY : mark;
    if (next > to) break;
    diaF(state, events, dayIndex(next));
    cursor = next;
  }
}

function dueNow(state: GameState): { hands: Hand[]; total: number } {
  const hands = handsOf(state).filter((hand) => (hand.pay ?? 0) > 0);
  return { hands, total: hands.reduce((sum, hand) => sum + hand.pay, 0) };
}

function rememberDue(state: GameState, hands: Hand[], total: number): void {
  state.flags.agentDue = total;
  state.flags.agentNames = hands.map((hand) => hand.nome).join(", ");
}

function coverPays(state: GameState, amount: number): number {
  let left = amount;
  for (const hand of handsOf(state)) {
    if (left <= 0) break;
    const take = Math.min(hand.pay ?? 0, left);
    hand.pay -= take;
    left -= take;
  }
  const still = dueNow(state);
  rememberDue(state, still.hands, still.total);
  return still.total;
}

function collectDue(state: GameState, events: GfEvent[]): void {
  const due = dueNow(state);
  if (due.total <= 0) {
    state.flags.agentDue = 0;
    state.flags.agentNames = "";
    return;
  }
  if (Number(state.flags.agentDue) > 0) {
    rememberDue(state, due.hands, due.total);
    return;
  }
  if (state.cash >= due.total) {
    state.cash -= due.total;
    for (const hand of due.hands) hand.pay = 0;
    events.push({ type: "MEMORY", text: `O Téo pagou ${due.total} ₣ pelos 30 dias.` });
    return;
  }
  rememberDue(state, due.hands, due.total);
  events.push({ type: "MEMORY", text: `Não deu para pagar ${due.total} ₣. O agente do banco está na oficina.` });
}

function atOffice(state: GameState): void {
  if (here(state) !== "oficina") throw new GameError("longe", "O agente está na oficina. Volta para resolver.");
}

export function applyHands(state: GameState, action: Record<string, unknown>, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "HIRE_HAND") {
    if (here(state) !== "praca") throw new GameError("longe", "A contratação é na Praça do Fóssil.");
    const id = typeof action.offerId === "string" ? action.offerId : "";
    const offer = offersOf(state).find((item) => item.id === id);
    if (!offer) throw new GameError("sem_funcionario", "Essa pessoa já achou outro serviço.");
    if (producers(state) >= bayCap(state)) throw new GameError("sem_baia", "Não tem baía livre. Uma baía, um funcionário.");
    const taken = new Set(handsOf(state).map((hand) => hand.bay));
    let bay = 1;
    while (taken.has(bay)) bay += 1;
    const hand: Hand = {
      id: `mao-${seq(state)}`,
      nome: offer.nome,
      yieldPct: offer.yieldPct,
      salary: offer.salary,
      energy: ENERGY_MAX,
      energyMax: ENERGY_MAX,
      bay,
      out: "",
      excuse: "",
      advance: 0,
      raise: false,
      daysWorked: 0,
      pay: 0,
      photo: offer.photo,
    };
    handsOf(state).push(hand);
    state.offers = offersOf(state).filter((item) => item.id !== offer.id);
    events.push({ type: "MEMORY", text: `${hand.nome} entrou na baía ${hand.bay}. Rende ${hand.yieldPct}% do Téo. O pagamento de ${hand.salary} ₣ sai depois de 30 dias de trabalho.` });
    return true;
  }
  if (kind === "FIRE_HAND") {
    const id = typeof action.handId === "string" ? action.handId : "";
    const hand = handsOf(state).find((item) => item.id === id);
    if (!hand) throw new GameError("sem_funcionario", "Essa pessoa não está na oficina.");
    freeJob(state, hand.id);
    state.hands = handsOf(state).filter((item) => item.id !== id);
    events.push({ type: "MEMORY", text: `${hand.nome} saiu da baía ${hand.bay}.` });
    return true;
  }
  if (kind === "HAND_ADVANCE") {
    const id = typeof action.handId === "string" ? action.handId : "";
    const hand = handsOf(state).find((item) => item.id === id);
    if (!hand || hand.advance <= 0) throw new GameError("nada_devido", "Ninguém pediu adiantamento.");
    if (action.accept === true) {
      if (state.cash - hand.advance < -state.overdraftLimit) throw new GameError("sem_caixa", "O caixa não cobre o adiantamento.");
      state.cash -= hand.advance;
      events.push({ type: "MEMORY", text: `${hand.nome} levou ${hand.advance} ₣. Sai do pagamento dos 30 dias.` });
    } else {
      hand.advance = 0;
      events.push({ type: "MEMORY", text: `${hand.nome} ficou sem o adiantamento.` });
    }
    return true;
  }
  if (kind === "HAND_RAISE") {
    const id = typeof action.handId === "string" ? action.handId : "";
    const hand = handsOf(state).find((item) => item.id === id);
    if (!hand || !hand.raise) throw new GameError("nada_devido", "Ninguém pediu aumento.");
    hand.raise = false;
    if (action.accept === true) {
      hand.salary = Math.round(hand.salary * 1.1);
      events.push({ type: "MEMORY", text: `${hand.nome} ficou. O salário foi para ${hand.salary} ₣.` });
    } else {
      hand.yieldPct = Math.max(20, Math.round(hand.yieldPct * 0.95));
      events.push({ type: "MEMORY", text: `${hand.nome} continuou, mas o rendimento caiu para ${hand.yieldPct}%.` });
    }
    return true;
  }
  if (kind === "PAY_HAND") {
    const id = typeof action.handId === "string" ? action.handId : "";
    const hand = handsOf(state).find((item) => item.id === id);
    if (!hand || (hand.pay ?? 0) <= 0) throw new GameError("nada_devido", "Esse funcionário ainda não fechou os 30 dias.");
    if (state.cash - hand.pay < -state.overdraftLimit) throw new GameError("sem_caixa", "O caixa não cobre os 30 dias.");
    const paid = hand.pay;
    state.cash -= paid;
    hand.pay = 0;
    events.push({ type: "MEMORY", text: `${hand.nome} recebeu ${paid} ₣ pelos 30 dias. Volta para a baía.` });
    collectDue(state, events);
    return true;
  }
  if (kind === "BUY_FITTING") {
    atOffice(state);
    const fit = fittingById(String(action.fitting ?? ""));
    if (!fit) throw new GameError("compra_invalida", "Esse equipamento não está à venda.");
    if (fit.id === "elevador") {
      if (liftsInstalled(state) >= state.garage.bays) throw new GameError("ja_tem", "Essa baia já tem elevador.");
      if (state.cash - fit.cost < -state.overdraftLimit) throw new GameError("sem_caixa", "O caixa não cobre esse equipamento.");
      state.cash -= fit.cost;
      const n = state.assets.filter((asset) => asset.id === "elevador" || asset.id.startsWith("elevador-")).length + 1;
      state.assets.push({ id: n === 1 ? "elevador" : `elevador-${n}`, name: fit.name, value: fit.value });
      events.push({ type: "MEMORY", text: `O Téo comprou o elevador da baia por ${fit.cost} ₣. A reforma não traz isso.` });
      return true;
    }
    if (ownsFitting(state, fit.id)) throw new GameError("ja_tem", `A oficina já tem ${fit.name.toLowerCase()}.`);
    if (fit.needs && !ownsFitting(state, fit.needs)) throw new GameError("falta_antes", "Primeiro compra a prateleira de peças.");
    if (state.cash - fit.cost < -state.overdraftLimit) throw new GameError("sem_caixa", "O caixa não cobre esse equipamento.");
    state.cash -= fit.cost;
    state.assets.push({ id: fit.id, name: fit.name, value: fit.value });
    events.push({ type: "MEMORY", text: `O Téo comprou ${fit.name} por ${fit.cost} ₣. A reforma não traz isso pronto.` });
    return true;
  }
  if (kind === "AGENT_PAY" || kind === "AGENT_LOAN" || kind === "AGENT_SEIZE") {
    atOffice(state);
    const due = dueNow(state);
    if (due.total <= 0) throw new GameError("nada_devido", "Não tem salário vencido.");
    rememberDue(state, due.hands, due.total);
    if (kind === "AGENT_PAY") {
      if (state.cash < due.total) throw new GameError("sem_caixa", "À vista não fecha. O empréstimo ou um equipamento.");
      state.cash -= due.total;
      coverPays(state, due.total);
      events.push({ type: "MEMORY", text: `O agente levou ${due.total} ₣ à vista e pagou o funcionário.` });
      return true;
    }
    if (kind === "AGENT_LOAN") {
      const principal = Math.round(due.total * 1.2);
      const part = Math.ceil(principal / 4);
      state.debts.push({
        id: `agente-${seq(state)}`,
        template: "agente_banco",
        creditor: "Agente do Banco Fóssil",
        principal,
        balance: principal,
        weeklyBps: 0,
        minPayment: part,
        installmentsLeft: 4,
        missed: 0,
        secured: false,
        createdWeek: state.calendar.week,
        totalPaid: 0,
        penaltyApplied: false,
        pricePayment: part,
      });
      coverPays(state, due.total);
      events.push({ type: "MEMORY", text: `O agente pagou o funcionário à vista. O Téo ficou devendo ${principal} ₣, em 4 semanas. O juro é de 20%.` });
      return true;
    }
    const goods = sellableFittings(state);
    if (goods.length === 0) throw new GameError("sem_bem", "Não tem prateleira nem elevador para ele levar. O caminho é o empréstimo.");
    const sold: string[] = [];
    for (const asset of goods) {
      if (dueNow(state).total <= 0) break;
      state.assets = state.assets.filter((item) => item.id !== asset.id);
      sold.push(`${asset.name} (${asset.value} ₣)`);
      coverPays(state, asset.value);
    }
    const left = dueNow(state).total;
    events.push({
      type: "MEMORY",
      text: left > 0
        ? `O agente vendeu ${sold.join(", ")} e ainda faltam ${left} ₣. Sem isso, só o empréstimo.`
        : `O agente vendeu ${sold.join(", ")}, pagou o funcionário e ficou com o que sobrou.`,
    });
    return true;
  }
  return false;
}
