import { levelOf, xpOf } from "../../../gf-engine/body.ts";
import { contentV1, type Content } from "../../../gf-engine/content.ts";
import { quotePreview } from "../../../gf-engine/contracts.ts";
import { formatF } from "../../../gf-engine/format.ts";
import type { GameState } from "../../../gf-engine/state.ts";
import { faceSrc } from "./clientes";

export const ART = {
  garage: "/game/gf/garage-day.jpg",
  night: "/game/gf/garage-night.jpg",
  ashes: "/game/gf/ashes.jpg",
  fire: "/game/gf/fire.jpg",
  desk: "/game/gf/desk.jpg",
  sealed: "/game/gf/sealed.jpg",
  notebook: "/game/gf/notebook.jpg",
  teo: "/game/gf/teo.jpg",
  ambar: "/game/gf/ambar.jpg",
  juca: "/game/gf/juca.jpg",
  rex: "/game/gf/rex.jpg",
  vizinho: "/game/gf/vizinho.jpg",
  osso: "/game/gf/osso.jpg",
} as const;

/** Retratos da história. Cliente da rua usa /assets/gf/clientes. */
export const PORTRAIT: Record<string, string> = {
  vizinho: "/game/gf/vizinho.jpg",
  motoboy: "/assets/gf/clientes/raio_velox.png?v=9",
  comerciante: "/assets/gf/clientes/dona_estegolina.png?v=9",
  pechincheiro: "/assets/gf/clientes/raimundo_cascudo.png?v=9",
  frota: "/assets/gf/clientes/silvana_raptorlog.png?v=9",
  corredor: "/assets/gf/clientes/nina_nitro.png?v=9",
  caloteiro: "/assets/gf/clientes/empresario_varano.png?v=9",
  prefeitura: "/assets/gf/clientes/secretario_burocracio.png?v=9",
  teo: "/assets/gf/npcs/teo.png?v=1",
  pai: "/assets/gf/npcs/pai.png?v=1",
  ambar: "/assets/gf/npcs/ambar.png?v=1",
  rex: "/assets/gf/npcs/rex.png?v=1",
  juca: "/assets/gf/npcs/juca.png?v=1",
  coach: "/assets/gf/npcs/coach.png?v=1",
  ricardao: "/assets/gf/npcs/ricardao.png?v=1",
  brasa: "/assets/gf/npcs/brasa.png?v=1",
  tico: "/assets/gf/npcs/tico.png?v=1",
  osso_duro: "/assets/gf/npcs/osso_duro.png?v=1",
  labia: "/assets/gf/npcs/labia.png?v=1",
  zeca: "/assets/gf/npcs/zeca.png?v=1",
  rato: "/assets/gf/npcs/rato.png?v=1",
  ankylo: "/assets/gf/npcs/ankylo.png?v=1",
  ze_femur: "/assets/gf/npcs/ze_femur.png?v=1",
  varano: "/assets/gf/npcs/varano.png?v=1",
  banco: "/assets/gf/npcs/banco.png?v=8",
  megaosso: "/assets/gf/npcs/megaosso.png?v=1",
};

export type Cast = keyof typeof ART;

export type Choice = {
  label: string;
  hint?: string;
  action?: Record<string, unknown>;
  panel?: "desk" | "notebook";
  dismiss?: string;
};

export type Beat = {
  bg: string;
  cast: string;
  who: string;
  line: string;
  choices: Choice[];
};

type Debt = { id: string; template: string; creditor: string; balance: number; missed: number };
type Lot = { qty?: number; avgCost?: number };
type LeadView = {
  id: string;
  apparentType: string;
  service: string;
  refPrice: number;
  deadlineDays: number;
  quotes: string[];
  expiresDay: number;
  appearWeek?: number;
  appearDay?: number;
  status?: string;
  counterPrice?: number;
  record?: string;
  revealed?: boolean;
  ficha?: string;
  contractTemplate?: string;
};
type JobView = {
  id: string;
  service: string;
  status: string;
  apNeeded: number;
  apDone: number;
  contractId?: string;
  assignedTo?: string;
};

type Crew = {
  id: string;
  salary: number;
  skill: number;
  apPerDay: number;
  owedWeeks: number;
  hiredWeek: number;
  sickUntilWeek?: number;
};

export type Bay = {
  player?: { name?: string };
  calendar?: { week: number; day: number; apLeft: number; extraNightsUsed: number };
  cash?: number;
  morale?: number;
  rep?: number;
  garage?: { level?: number; hasCompressor?: boolean; bays?: number };
  flags?: Record<string, unknown>;
  assets?: { id: string; name: string; value: number }[];
  debts?: Debt[];
  inventory?: Record<string, Lot | undefined>;
  ending?: string | null;
  lessonsTriggered?: string[];
  savings?: { cofrinho: number; tesouro: number; autoDepositPct: number };
  leads?: LeadView[];
  jobs?: JobView[];
  employees?: Crew[];
  history?: { week: number; stockLoss?: number; salaries?: number; materials?: number }[];
};

const DAYS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function dayName(day: number): string {
  return DAYS[day] || "Dia";
}

export const ENDINGS: Record<string, { title: string; line: string }> = {
  F1_caixa: {
    title: "O caixa secou",
    line: "Dois domingos no vermelho além do limite do banco. A oficina fechou as portas.",
  },
  F2_banco: {
    title: "O banco tomou a garagem",
    line: "Três boletos do seu pai sem pagar. A garantia era a oficina onde você dormia.",
  },
  F3_insolvencia: {
    title: "Dívida gigante",
    line: "Você deve muito mais do que tem. Não tem peça que tape esse buraco.",
  },
  F4_agiota: {
    title: "Longe da cidade",
    line: "O Juca cobrou duas vezes. Na terceira, você teve que sair da cidade.",
  },
  F5_desistencia: {
    title: "{nome} precisou parar",
    line: "O corpo pediu descanso e não teve.\n2 Dias sem tratamentos...",
  },
  sobrevivencia: {
    title: "Você ficou de pé",
    line: "A oficina ainda funciona. Agora é aprender a crescer.",
  },
  prosperidade: {
    title: "Ferrugem & Filho",
    line: "A placa acende! Dívida zero, cofre cheio, baia cheia.",
  },
  liberdade: {
    title: "A oficina anda sozinha",
    line: "Nível máximo, dívida zero, 8 semanas guardadas e renda que paga as contas. A oficina já não precisa de você o tempo todo.",
  },
  peao: {
    title: "Na mão da gangue",
    line: "As caixas passaram. Agora o nome da oficina está na mão de quem manda na rua.",
  },
};

const LINES = [
  "O vizinho encosta o trike. O óleo da herança ainda serve.",
  "Um motoboy de escamas pede um kit e paga na hora, sem conversa.",
  "A chapa de um sedã chegou torta. Funilaria pede compressor e paciência.",
  "A rua está quieta. Dá para ouvir o relógio do banco.",
  "Alguém buzina lá fora. Trabalho curto, dinheiro curto.",
  "A lâmpada pisca. Ainda dá para mais um serviço antes de fechar.",
];

function qty(state: Bay, id: string): number {
  return state.inventory?.[id]?.qty ?? 0;
}

function hasDebt(state: Bay, template: string): boolean {
  return Boolean(state.debts?.some((debt) => debt.template === template && debt.balance > 0));
}

function shelf(state: Bay, materials: Record<string, number>): boolean {
  return Object.entries(materials).every(([id, need]) => qty(state, id) >= need);
}

function workIndex(week: number, day: number): number {
  return week * 6 + (day - 1);
}

function portraitOf(type: string, salt = type): string {
  return faceSrc(type, salt) ?? PORTRAIT[type] ?? `/assets/gf/npcs/${type}.png`;
}

function clientName(content: Content, id: string): string {
  return content.clients.find((item) => item.id === id)?.nome ?? "Cliente";
}

function serviceName(content: Content, id: string): string {
  return content.services.find((item) => item.id === id)?.nome ?? id;
}

function leadVisible(state: Bay, lead: LeadView): boolean {
  const status = lead.status ?? "open";
  if (status !== "open" && status !== "counter") return false;
  const week = state.calendar?.week ?? 0;
  const day = state.calendar?.day ?? 1;
  if (week < (lead.appearWeek ?? 0)) return false;
  if (week === (lead.appearWeek ?? 0) && day < (lead.appearDay ?? 1)) return false;
  return workIndex(week, day) < lead.expiresDay;
}

function chanceLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function quoteHint(state: Bay, content: Content, leadId: string, price: number, depositPct: number): string {
  if (!state.debts || !state.calendar || !state.garage) return "";
  try {
    const quote = quotePreview(state as GameState, content, leadId, price, depositPct);
    return `Sobra do serviço ${formatF(quote.margin)} · chance ${chanceLabel(quote.acceptChance)}`;
  } catch {
    return "";
  }
}

export function bayBeat(state: Bay, content: Content = contentV1, skipLead?: string | null): Beat {
  const week = state.calendar?.week ?? 0;
  const day = state.calendar?.day ?? 1;
  const ap = state.calendar?.apLeft ?? 0;
  const name = state.player?.name || "Téo";
  const flags = state.flags ?? {};
  const night = ap <= 0;
  const choices: Choice[] = [];

  if (week >= 2 && day === 1 && !flags.heardJuca && !hasDebt(state, "agiota_juca")) {
    return {
      bg: ART.night,
      cast: ART.juca,
      who: "Juca Juros",
      line: "Ouvi do fogo. Dez por cento por semana, só os juros. Parece ajuda. É uma corrente.",
      choices: [
        { label: "Pegar 1.000", hint: "Os juros comem o empréstimo.", action: { type: "TAKE_LOAN", template: "agiota_juca", value: 1000 } },
        { label: "Pegar 3.000", hint: "Mais fundo, mesma corrente.", action: { type: "TAKE_LOAN", template: "agiota_juca", value: 3000 } },
        { label: "Fechar a porta na cara dele", action: { type: "ACK", key: "heardJuca" } },
      ],
    };
  }

  if (week >= 3 && day === 2 && !flags.protection && !flags.refusedGang && !flags.heardRex) {
    return {
      bg: ART.ashes,
      cast: ART.rex,
      who: "Rex Navalha",
      line: "Proteção. 250 por semana. Seu pai disse não. Olha a fuligem.",
      choices: [
        { label: "Pagar o pedágio", hint: "O valor sobe. O ânimo desce.", action: { type: "GANG", accept: true } },
        { label: "Dizer não, como o pai", action: { type: "GANG", accept: false } },
      ],
    };
  }

  if (week >= 4 && day === 3 && !flags.heardCard && !hasDebt(state, "cartao_platina")) {
    return {
      bg: ART.desk,
      cast: ART.ambar,
      who: "Dona Âmbar",
      line: "Chegou um cartão pré-aprovado. Brilha. O rotativo come 3,5% por semana, e ainda tem anuidade.",
      choices: [
        { label: "Aceitar 2.000 no cartão", hint: "A fatura vira rotativo.", action: { type: "TAKE_LOAN", template: "cartao_platina", value: 2000 } },
        { label: "Rasgar o plástico", action: { type: "ACK", key: "heardCard" } },
      ],
    };
  }

  if (week >= 6 && day === 1 && !flags.heardEasy && !hasDebt(state, "pre_aprovado")) {
    return {
      bg: ART.desk,
      cast: ART.ambar,
      who: "Dona Âmbar",
      line: "O anúncio diz 1,9% ao mês. O contrato cobra 1,2% por semana. Quitar antes tem multa.",
      choices: [
        { label: "Assinar 2.000 em 26 semanas", action: { type: "TAKE_LOAN", template: "pre_aprovado", value: 2000, weeks: 26 } },
        { label: "Devolver o folheto", action: { type: "ACK", key: "heardEasy" } },
      ],
    };
  }

  const ready = (state.jobs ?? []).find((job) => job.status === "ready");
  if (ready) {
    return {
      bg: ART.garage,
      cast: portraitOf("vizinho"),
      who: name,
      line: `${serviceName(content, ready.service)} está pronto. Entregar no prazo sobe a fama. Atraso come 10% por dia.`,
      choices: [
        { label: "Entregar agora", hint: "O que falta entra no caixa ou vira prazo.", action: { type: "DELIVER", jobId: ready.id } },
        { label: "Olhar as contas", panel: "desk" },
        { label: night ? "Fechar a porta" : "Encerrar o dia", action: { type: "END_DAY" } },
      ],
    };
  }

  const counter = (state.leads ?? []).find((lead) => lead.id !== skipLead && lead.status === "counter" && leadVisible(state, lead));
  if (counter && counter.counterPrice != null) {
    return {
      bg: ART.garage,
      cast: portraitOf(counter.apparentType, counter.id),
      who: clientName(content, counter.apparentType),
      line: counter.quotes[0] ?? "Tá caro. Tira trinta por cento.",
      choices: [
        { label: `Aceitar ${formatF(counter.counterPrice)}`, hint: "A pechincha ensina preço abaixo do custo.", action: { type: "ANSWER_COUNTER", leadId: counter.id, accept: true } },
        { label: "Recusar a pechincha", action: { type: "ANSWER_COUNTER", leadId: counter.id, accept: false } },
        { label: "Atender a baia primeiro", dismiss: counter.id },
      ],
    };
  }

  const lead = (state.leads ?? []).find((item) => item.id !== skipLead && (item.status ?? "open") === "open" && leadVisible(state, item));
  if (lead) {
    const fleet = lead.contractTemplate === "frota_raptor";
    const record = lead.record ? ` Ficha: ${lead.record}.` : "";
    const offer = fleet
      ? `A frota quer ${formatF(lead.refPrice)} por semana. O dinheiro só cai quatro semanas depois.`
      : `${serviceName(content, lead.service)} · referência ${formatF(lead.refPrice)} · prazo ${lead.deadlineDays} dias.`;
    return {
      bg: ART.garage,
      cast: portraitOf(lead.ficha && lead.revealed ? lead.ficha : lead.apparentType, lead.id),
      who: clientName(content, lead.ficha && lead.revealed ? lead.ficha : lead.apparentType),
      line: `${lead.quotes[0] ?? "Tem um serviço aí?"} ${offer}${record}`,
      choices: [
        {
          label: fleet ? `Assinar por ${formatF(lead.refPrice)}` : `Fechar por ${formatF(lead.refPrice)}`,
          hint: `Sem sinal. ${quoteHint(state, content, lead.id, lead.refPrice, 0)}`.trim(),
          action: { type: "SEND_PROPOSAL", leadId: lead.id, price: lead.refPrice, depositPct: 0, deadline: lead.deadlineDays },
        },
        {
          label: "Pedir metade de sinal",
          hint: quoteHint(state, content, lead.id, lead.refPrice, 50) || "O sinal entra no caixa hoje.",
          action: { type: "SEND_PROPOSAL", leadId: lead.id, price: lead.refPrice, depositPct: 50, deadline: lead.deadlineDays },
        },
        lead.record
          ? { label: "A ficha já foi aberta", hint: lead.record }
          : { label: "Ver a ficha", hint: "1 energia · 20 ₣", action: { type: "CHECK_RECORD", targetId: lead.id } },
        { label: "Prospectar a rua", hint: "1 energia · 10 ₣ · mais dois clientes na outra semana", action: { type: "PROSPECT" } },
        { label: "Atender a baia primeiro", dismiss: lead.id },
        { label: night ? "Fechar a porta" : "Encerrar o dia", action: { type: "END_DAY" } },
      ],
    };
  }

  if (night) {
    choices.push({ label: "Fechar a porta", hint: "O dia acaba. Domingo cobra.", action: { type: "END_DAY" } });
    choices.push({ label: "Equipe da oficina", hint: "Quem trabalha, quanto custa, quem quer entrar.", panel: "desk" });
    choices.push({ label: "Olhar as contas", panel: "desk" });
    choices.push({ label: "Caderno do pai", panel: "notebook" });
    return {
      bg: ART.night,
      cast: ART.teo,
      who: name,
      line: "Os braços não sobem mais. A rua pode esperar até amanhã.",
      choices,
    };
  }

  const line = LINES[(week + day) % LINES.length] ?? LINES[0]!;
  const level = state.garage?.level ?? 0;
  for (const service of content.services) {
    const needLevel = service.requires.level ?? 0;
    const patent = service.requires.patent ?? 0;
    if (needLevel > level) continue;
    if (patent > levelOf(xpOf(state)).level) continue;
    if (service.requires.compressor && !state.garage?.hasCompressor) continue;
    if (!shelf(state, service.materials)) continue;
    choices.push({
      label: service.nome,
      hint: `${service.ap} ${service.ap === 1 ? "energia" : "energias"} · entra ${formatF(service.ref)}`,
      action: { type: "WORK", jobId: service.id },
    });
  }
  const running = (state.jobs ?? []).find((job) => job.status === "in_progress");
  if (running) {
    choices.unshift({
      label: `Continuar ${serviceName(content, running.service)}`,
      hint: `${running.apDone} de ${running.apNeeded} energias`,
      action: { type: "WORK_JOB", jobId: running.id },
    });
  }
  const waiting = (state.jobs ?? []).some((job) => job.status === "waiting_materials");
  if (waiting) choices.push({ label: "Falta peça na prateleira", hint: "Compra no balcão.", panel: "desk" });
  const queued = (state.jobs ?? []).filter((job) => job.status === "queued");
  if (queued.length > 0) choices.push({ label: `${queued.length} na fila da baia`, hint: "A vaga abre quando um serviço fica pronto." });
  const prospects = typeof flags.prospectsUsed === "number" ? flags.prospectsUsed : 0;
  if (prospects < content.balance.leads.prospectMaxWeek) {
    choices.push({ label: "Prospectar a rua", hint: "1 energia · 10 ₣ · mais clientes na outra semana", action: { type: "PROSPECT" } });
  }
  choices.push({ label: "Descansar no pneu", hint: "Sobe o ânimo", action: { type: "REST" } });
  if ((state.calendar?.extraNightsUsed ?? 0) < content.balance.nightShiftMaxPerWeek) {
    choices.push({ label: "Virar a noite", hint: "Mais uma energia. Custa o corpo.", action: { type: "NIGHT_SHIFT" } });
  }
  if (content.lessons.length > 0 && (state.lessonsTriggered?.length ?? 0) < content.lessons.length) {
    choices.push({ label: "Estudar com a Âmbar", hint: "Abre o caderno e o crédito bom.", action: { type: "STUDY" } });
  }
  choices.push({ label: "Equipe da oficina", hint: "Contratar custa uma semana agora, e o salário sai todo domingo.", panel: "desk" });
  choices.push({ label: "Encerrar o dia", action: { type: "END_DAY" } });
  choices.push({ label: "Olhar as contas", panel: "desk" });
  choices.push({ label: "Caderno do pai", panel: "notebook" });

  const empty = content.services.every((service) => !shelf(state, service.materials));
  return {
    bg: ART.garage,
    cast: empty ? ART.teo : ART.vizinho,
    who: empty ? name : "Cliente da rua",
    line: empty ? "A prateleira acabou. Sem peça, a baia é só um teto." : line,
    choices,
  };
}

export function sundayLine(summary: { fixed: number; tax: number; debtPaid: number; interest: number; cashEnd: number; salaries?: number }): string {
  const pay = summary.salaries ? ` Os salários levaram ${summary.salaries}.` : "";
  return `Domingo. A oficina comeu ${summary.fixed} de conta fixa, ${summary.tax} de imposto e ${summary.debtPaid} de boleto. Os juros incharam ${summary.interest}.${pay} O caixa fechou em ${summary.cashEnd}.`;
}

export function levelName(level: number, content: Content = contentV1): string {
  return content.garageLevels.find((row) => row.level === level)?.nome ?? "Ruína";
}

export function upgradeCost(level: number, content: Content = contentV1): number {
  return content.garageLevels.find((row) => row.level === level + 1)?.cost ?? 0;
}

export function shopPrice(material: "oleo" | "kit" | "chapa" | "cabo" | "osso" | "bobina", units = 1, content: Content = contentV1): number {
  const row = content.suppliers.find((item) => item.id === "ferro_velho");
  return (row?.prices[material] ?? 0) * units;
}
