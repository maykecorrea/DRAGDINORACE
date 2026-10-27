import { cardById } from "./cards.ts";
import { weekBurn } from "./campaign.ts";
import { partsOf } from "./clock.ts";
import type { Content } from "./content.ts";
import { serviceOf } from "./content.ts";
import { fromWork, leadVisible } from "./contracts.ts";
import { dayEventPlace, illnessOffer, placeNome } from "./district.ts";
import { bps } from "./format.ts";
import type { Debt, Day, GameState } from "./state.ts";

export type AgendaKind = "boleto" | "entrega" | "pagamento" | "cliente" | "peca" | "cidade" | "conta" | "recado";

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  detail: string;
  week: number;
  day: number;
  hour: number;
  amount?: number;
  late: boolean;
}

const TOURNEY = [18, 30, 44];

function clock(state: GameState, content: Content) {
  return partsOf(state.clock?.t ?? content.time.startT);
}

function passed(state: GameState, content: Content, week: number, day: number, hour: number): boolean {
  if (week !== state.calendar.week) return week < state.calendar.week;
  if (day !== state.calendar.day) return day < state.calendar.day;
  return clock(state, content).hour >= hour;
}

function nextClose(state: GameState, content: Content): { week: number; day: number; hour: number } {
  const day = content.time.closeDay;
  const hour = Math.floor(content.time.closeMinute / 60);
  if (!passed(state, content, state.calendar.week, day, hour)) {
    return { week: state.calendar.week, day, hour };
  }
  return { week: state.calendar.week + 1, day, hour };
}

function clientNome(content: Content, id: string): string {
  return content.clients.find((item) => item.id === id)?.nome ?? id;
}

function billAmount(debt: Debt, tpl: Content["debtTemplates"][string] | undefined, week: number): number | null {
  if (!tpl || debt.balance <= 0 || tpl.min === "auto") return null;
  if (tpl.min === "full") {
    const due = debt.dueWeek ?? tpl.dueWeek ?? 0;
    return week >= due ? debt.balance : null;
  }
  if (tpl.min === "interest") return Math.max(1, bps(debt.balance, debt.weeklyBps || tpl.bps));
  if (tpl.min === "pct15") {
    const fatura = (debt.statement ?? 0) + (debt.revolving ?? 0);
    const pct = Math.min(debt.balance, Math.round((fatura * (tpl.pct ?? 15)) / 100));
    const annuity = debt.annuity ?? tpl.annuity ?? 0;
    const total = pct + annuity;
    return total > 0 ? total : null;
  }
  if (tpl.min === "price") {
    const start = debt.dueWeek ?? debt.createdWeek;
    if (week < start || (debt.installmentsLeft ?? 0) <= 0) return null;
    const pay = debt.pricePayment ?? 0;
    return pay > 0 ? Math.min(debt.balance, pay) : null;
  }
  const fixed = tpl.minValue ?? 0;
  return fixed > 0 ? Math.min(debt.balance, fixed) : null;
}

function pushDebt(items: AgendaItem[], state: GameState, content: Content, debt: Debt, sunday: { week: number; day: number; hour: number }): void {
  const tpl = content.debtTemplates[debt.template];
  if (!tpl || debt.balance <= 0 || tpl.min === "auto") return;
  if (tpl.min === "full") {
    const due = debt.dueWeek ?? tpl.dueWeek ?? sunday.week;
    const when = due > sunday.week ? { week: due, day: sunday.day, hour: sunday.hour } : sunday;
    const late = state.calendar.week > due;
    items.push({
      id: `boleto-${debt.id}`,
      kind: "boleto",
      title: `Boleto · ${tpl.creditor}`,
      detail: late ? "Venceu. O banco cobra o valor inteiro." : "Nessa semana o banco cobra o valor inteiro.",
      ...when,
      amount: debt.balance,
      late,
    });
    return;
  }
  if (tpl.min === "price") {
    const start = debt.dueWeek ?? debt.createdWeek;
    const when = start > sunday.week ? { week: start, day: sunday.day, hour: sunday.hour } : sunday;
    const amount = billAmount(debt, tpl, when.week);
    if (!amount) return;
    const left = debt.installmentsLeft ?? 0;
    items.push({
      id: `boleto-${debt.id}`,
      kind: "boleto",
      title: `Parcela · ${tpl.creditor}`,
      detail: left > 0 ? `Faltam ${left} semanas.` : "Parcela do domingo.",
      ...when,
      amount,
      late: false,
    });
    return;
  }
  const amount = billAmount(debt, tpl, sunday.week);
  if (!amount) return;
  const title = tpl.min === "pct15" ? "Fatura" : tpl.min === "interest" ? "Juros" : "Boleto";
  items.push({
    id: `boleto-${debt.id}`,
    kind: "boleto",
    title: `${title} · ${tpl.creditor}`,
    detail: "O banco cobra no fechamento de domingo.",
    ...sunday,
    amount,
    late: false,
  });
}

/** O que a cidade e o caixa já marcaram. Não inventa evento e não revela recado escondido. */
export function buildAgenda(state: GameState, content: Content): AgendaItem[] {
  const items: AgendaItem[] = [];
  const sunday = nextClose(state, content);
  const burn = weekBurn(state, content);
  if (burn > 0) {
    const people = state.employees.length;
    items.push({
      id: "conta-oficina",
      kind: "conta",
      title: "Contas da oficina",
      detail: people > 0 ? `Luz, oficina e ${people} salário${people > 1 ? "s" : ""}.` : "Luz e oficina. Chega mesmo sem cliente.",
      ...sunday,
      amount: burn,
      late: false,
    });
  }
  for (const debt of state.debts) pushDebt(items, state, content, debt, sunday);

  for (const job of state.jobs) {
    if (job.status === "delivered" || job.status === "paid" || job.status === "defaulted") continue;
    const late = passed(state, content, job.dueWeek, job.dueDay, 18);
    const name = serviceOf(content, job.service)?.nome ?? job.service;
    const waiting = job.status === "waiting_materials" ? "Falta peça na prateleira." : job.status === "ready" ? "O carro já está pronto." : "Ainda na baia.";
    items.push({
      id: `job-${job.id}`,
      kind: "entrega",
      title: late ? `${name} atrasado` : `Entregar ${name}`,
      detail: waiting,
      week: job.dueWeek,
      day: job.dueDay,
      hour: 18,
      amount: job.price,
      late,
    });
  }

  for (const rec of state.receivables) {
    if (rec.status === "paid" || rec.status === "defaulted") continue;
    const late = passed(state, content, rec.dueWeek, rec.dueDay, 18);
    items.push({
      id: `rec-${rec.id}`,
      kind: "pagamento",
      title: "Cliente deve pagar",
      detail: clientNome(content, rec.clientType ?? "vizinho"),
      week: rec.dueWeek,
      day: rec.dueDay,
      hour: 18,
      amount: rec.value,
      late,
    });
  }

  for (const order of state.inbound ?? []) {
    items.push({
      id: `in-${order.id}`,
      kind: "peca",
      title: `Peças de ${placeNome(order.supplier)}`,
      detail: "Chega na oficina. Na semana 6, só descarrega em casa.",
      week: order.atWeek,
      day: order.atDay,
      hour: 8,
      late: passed(state, content, order.atWeek, order.atDay, 8),
    });
  }

  for (const lead of state.leads) {
    if (lead.status === "pending" && lead.proposal?.replyAt != null) {
      const at = partsOf(lead.proposal.replyAt);
      items.push({
        id: `reply-${lead.id}`,
        kind: "cliente",
        title: `Resposta de ${clientNome(content, lead.apparentType)}`,
        detail: serviceOf(content, lead.service)?.nome ?? "Proposta enviada.",
        week: at.week,
        day: at.day,
        hour: at.hour,
        late: passed(state, content, at.week, at.day, at.hour),
      });
      continue;
    }
    if (!leadVisible(state, lead)) continue;
    const last = fromWork(Math.max(0, lead.expiresDay - 1));
    items.push({
      id: `lead-${lead.id}`,
      kind: "cliente",
      title: lead.status === "counter" ? `Pechincha de ${clientNome(content, lead.apparentType)}` : `${clientNome(content, lead.apparentType)} na porta`,
      detail: lead.status === "counter" ? "A contraproposta expira nesse dia." : "Se ninguém responder, ele vai embora.",
      week: last.week,
      day: last.day,
      hour: 18,
      late: passed(state, content, last.week, last.day, 18),
    });
  }

  for (const contract of state.contracts ?? []) {
    if (!contract.active || state.calendar.week < contract.startWeek || state.calendar.week > contract.endWeek) continue;
    const missing = Math.max(0, contract.perWeek - contract.delivered);
    if (missing <= 0) continue;
    items.push({
      id: `fleet-${contract.id}`,
      kind: "entrega",
      title: "Frota da semana",
      detail: `Falta ${missing === 1 ? "1 carro" : `${missing} carros`} até o domingo.`,
      ...sunday,
      late: false,
    });
  }

  for (const shown of TOURNEY) {
    const week = shown - 1;
    const won = String(state.flags.coliseuTrophies ?? "").split(",").includes(String(shown));
    if (won || state.calendar.week > week) continue;
    const during = state.calendar.week === week;
    items.push({
      id: `tourney-${shown}`,
      kind: "cidade",
      title: "Torneio no Coliseu",
      detail: `Semana ${shown}. Abre às 18:00. Prêmio fixo, sem aposta.`,
      week,
      day: during ? state.calendar.day : 1,
      hour: 18,
      amount: 1000,
      late: false,
    });
  }

  for (let step = 0; step < 7; step += 1) {
    const abs = state.calendar.week * 7 + (state.calendar.day - 1) + step;
    const week = Math.floor(abs / 7);
    const day = ((abs % 7) + 1) as Day;
    const spot = dayEventPlace({ ...state, calendar: { ...state.calendar, week, day } });
    items.push({
      id: `city-${week}-${day}`,
      kind: "cidade",
      title: `Evento em ${placeNome(spot)}`,
      detail: "Coisa leve na rua. Não muda boleto nem prazo.",
      week,
      day,
      hour: 10,
      late: false,
    });
  }

  for (const item of state.scheduled) {
    if (item.hidden) continue;
    const card = item.cardId ? cardById(content, item.cardId) : undefined;
    items.push({
      id: `sch-${item.atWeek}-${item.atDay}-${item.cardId ?? item.source}`,
      kind: "recado",
      title: card?.title ?? "Compromisso marcado",
      detail: card ? "Recado que já tem dia." : item.source,
      week: item.atWeek,
      day: item.atDay,
      hour: 9,
      late: passed(state, content, item.atWeek, item.atDay, 9),
    });
  }

  for (const item of state.cardQueue) {
    if (item.opened) continue;
    const card = cardById(content, item.cardId);
    const expires = item.expiresWeek != null && item.expiresDay != null ? ` Some ${item.expiresDay === state.calendar.day ? "hoje" : "no dia marcado"}.` : "";
    items.push({
      id: `card-${item.cardId}-${item.week}-${item.day}`,
      kind: "recado",
      title: card?.title ?? "Recado no celular",
      detail: `Ainda não foi aberto.${expires}`,
      week: item.week,
      day: item.day,
      hour: 8,
      late: false,
    });
  }

  if (typeof state.flags.disease === "string" && state.flags.disease.length > 0) {
    const ill = illnessOffer(state.flags.disease);
    items.push({
      id: "doenca",
      kind: "cidade",
      title: ill ? ill.nome : "Consulta",
      detail: "O hospital trata. A ficha está no doutor.",
      week: state.calendar.week,
      day: state.calendar.day,
      hour: clock(state, content).hour,
      late: false,
    });
  }

  items.sort((a, b) => {
    if (a.late !== b.late) return a.late ? -1 : 1;
    return a.week - b.week || a.day - b.day || a.hour - b.hour || a.title.localeCompare(b.title, "pt");
  });
  return items;
}
