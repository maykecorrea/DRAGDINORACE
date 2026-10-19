import type { Content } from "../../../../gf-engine/content.ts";
import type { GfEvent } from "../../../../gf-engine/finance.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";

export const GLOSS = {
  caixa: "Caixa: o dinheiro que você tem agora, na mão.",
  divida: "Dívida: tudo o que você deve. Entra no patrimônio líquido.",
  pl: "Patrimônio líquido: tudo o que você tem menos tudo o que você deve.",
  rep: "Reputação: a fama da oficina. Abre cliente e crédito, até o teto do nível.",
  animo: "Ânimo: a saúde de Téo. Abaixo de 30 o serviço falha mais. Em zero, ele desaba.",
  pa: "Ponto de ação: o que Téo consegue fazer no dia. Três por dia, seis dias na semana.",
} as const;

const DAYS = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function dayShort(day: number): string {
  return DAYS[day] || "Dia";
}

export function priceFromPct(ref: number, pct: number): number {
  return Math.round((ref * pct) / 100);
}

function serviceName(content: Content, id: string | undefined, state: GameState, jobId?: string): string {
  const job = jobId ? state.jobs.find((item) => item.id === jobId) : undefined;
  const key = id || job?.service;
  return content.services.find((item) => item.id === key)?.nome ?? "Serviço";
}

export function describeEvents(events: GfEvent[], state: GameState, content: Content): { icon: string; text: string }[] {
  const lines: { icon: string; text: string }[] = [];
  for (const event of events) {
    const line = oneEvent(event, state, content);
    if (line) lines.push(line);
  }
  return lines;
}

function traveledLine(place: string | undefined, cost: number): string {
  const names: Record<string, string> = {
    oficina: "a oficina",
    casco_tech: "a Casco-Tech",
    ferro_velho: "o Ferro-Velho",
    megaosso: "a Megaosso",
    rato: "o beco do Rato",
    leilao: "o cais do leilão",
    banco: "o banco",
  };
  const where = names[place ?? ""] ?? "a cidade";
  if (cost <= 0) return `Já estava em ${where}`;
  return `Caminhou até ${where} (−${cost} PA)`;
}

function oneEvent(event: GfEvent, state: GameState, content: Content): { icon: string; text: string } | null {
  const amount = event.amount ?? 0;
  switch (event.type) {
    case "JOB_READY":
      return { icon: "✔", text: `${serviceName(content, undefined, state, event.jobId)} pronto` };
    case "JOB_FAILED":
      return { icon: "✖", text: `${serviceName(content, undefined, state, event.jobId)} falhou. Retrabalho.` };
    case "DELIVERED":
      return { icon: "✔", text: event.text === "atrasado" ? "Entrega atrasada" : "Entrega no prazo" };
    case "PAID":
      return { icon: "✔", text: `Recebeu ${formatF(amount)}` };
    case "DEFAULT":
      return { icon: "✖", text: `Calote: ${formatF(-amount)}` };
    case "PROPOSAL_ACCEPTED":
      return { icon: "✔", text: "Proposta aceita" };
    case "PROPOSAL_REFUSED":
      return { icon: "✖", text: event.text || "Proposta recusada" };
    case "PROPOSAL_SENT":
      return { icon: "…", text: "Proposta enviada. Resposta amanhã." };
    case "COUNTER_OFFER":
      return { icon: "!", text: "Pechincha na mesa" };
    case "COUNTER_REFUSED":
      return { icon: "✖", text: "Pechincha recusada" };
    case "RECORD":
      return { icon: "!", text: event.text || "Ficha consultada" };
    case "PROSPECTED":
      return { icon: "…", text: "Prospectou a rua. Clientes na outra semana." };
    case "RESTED":
      return { icon: "♥", text: "Téo descansou" };
    case "NIGHT_SHIFT":
      return { icon: "☾", text: "Virou a noite" };
    case "COLLAPSE":
      return { icon: "✖", text: "Téo desabou. A outra semana nasce sem energia." };
    case "RED_ALERT":
      return { icon: "!", text: "Alerta vermelho. Mais um domingo assim e a porta tranca." };
    case "WEEK_CLOSED":
      return { icon: "▣", text: `Semana ${event.week ?? ""} fechada` };
    case "MATERIALS_ARRIVED":
      return { icon: "✔", text: "As peças chegaram" };
    case "COLLECTED":
      return { icon: "✔", text: `Cobrança trouxe ${formatF(amount)}` };
    case "COLLECT_MISS":
      return { icon: "✖", text: "A cobrança não achou o cliente" };
    case "PROTEST_FILED":
      return { icon: "!", text: "Protesto feito. O dinheiro pode voltar." };
    case "PROTEST_MISS":
      return { icon: "✖", text: "O protesto não segurou o calote" };
    case "JOB_OPENED":
      return { icon: "✔", text: `${serviceName(content, undefined, state, event.jobId)} entrou na baia` };
    case "FLEET_SIGNED":
      return { icon: "✔", text: "Contrato de frota assinado" };
    case "RAID":
      return { icon: "✖", text: "Batida policial" };
    case "QUIT":
      return { icon: "✖", text: "Alguém saiu por salário atrasado" };
    case "DOENCA":
      return { icon: "!", text: "Alguém adoeceu. O salário continua." };
    case "HIRED":
      return { icon: "✔", text: "Entrou na oficina" };
    case "FIRED":
      return { icon: "✖", text: "Saiu. A rescisão saiu do caixa." };
    case "TRAINING":
      return { icon: "…", text: "Curso do Tico marcado" };
    case "TRAINED":
      return { icon: "✔", text: "O Tico voltou do curso" };
    case "WAGES_PAID":
      return { icon: "✔", text: "Salário atrasado pago" };
    case "BOUGHT":
      return { icon: "…", text: event.text === "amanha" ? "Pedido feito. Chega no outro dia." : "Peças na prateleira" };
    case "TRAVELED":
      return { icon: "…", text: traveledLine(event.text, amount) };
    case "SOLD_SCRAP":
      return { icon: "✔", text: `Sucata vendida: ${formatF(amount)}` };
    case "DEBT_PAID":
      return { icon: "✔", text: `Pagou extra ${formatF(amount)}` };
    case "PRIORITY":
      return { icon: "✔", text: "A ordem do débito mudou" };
    case "SAVED":
      return { icon: "✔", text: `Guardou ${formatF(amount)}` };
    case "WITHDREW":
      return { icon: "✔", text: `Tirou ${formatF(amount)} do cofrinho` };
    case "WITHDRAW_PENDING":
      return { icon: "…", text: "O tesouro cai no domingo" };
    case "AUTODEPOSIT":
      return { icon: "✔", text: `Depósito automático em ${amount}%` };
    case "LOAN":
      return { icon: "!", text: `Crédito na mão: ${formatF(amount)}` };
    case "CARD":
      return { icon: "☎", text: `Recado no telefone: ${event.text ?? "carta"}` };
    case "CARD_RESOLVED":
      return { icon: "✔", text: event.text ?? "Recado respondido" };
    case "CARD_EXPIRED":
      return { icon: "…", text: "Uma oferta venceu sem resposta" };
    case "SCAM_DODGED":
      return { icon: "!", text: "Você farejou o golpe" };
    case "LESSON":
      return { icon: "✎", text: `Lição ${event.text ?? ""} no caderno` };
    case "LESSON_READ":
      return { icon: "✔", text: "Lição guardada" };
    case "SABOTAGE":
      return { icon: "✖", text: `Sabotagem: ${formatF(-Math.abs(amount))}` };
    case "MEMORY":
      return { icon: "✎", text: event.text ?? "Memória da semana" };
    case "OBRA":
      return { icon: "…", text: `Obra começou: ${event.text ?? "oficina"}` };
    case "UPGRADED":
      return { icon: "✔", text: `Oficina subiu: ${event.text ?? ""}` };
    case "FISCAL":
      return { icon: "!", text: `Fiscalização: ${formatF(-Math.abs(amount))}` };
    case "ROYALTY":
      return { icon: "!", text: `Royalty da franquia: ${formatF(Math.abs(amount))}` };
    case "ACT_DONE":
      return { icon: "✔", text: `Ato ${event.amount ?? ""} fechado` };
    case "AUCTION":
      return { icon: "…", text: "Lotes novos no leilão" };
    case "INSPECTED":
      return { icon: "!", text: event.text === "vício" ? "Vício escondido na carcaça" : "Carcaça limpa" };
    case "BOUGHT_CARCASS":
      return { icon: "…", text: `Carcaça no pátio: ${formatF(amount)}` };
    case "CARCASS_WORK":
      return { icon: "…", text: "Braço na carcaça" };
    case "CARCASS_LISTED":
      return { icon: "…", text: `Anúncio a ${formatF(amount)}` };
    case "CARCASS_SOLD":
      return { icon: "✔", text: `Carcaça vendida: ${formatF(amount)}` };
    case "STUDIED":
      return { icon: "✎", text: event.text ? `Caderno: ${event.text}` : "Página nova no caderno" };
    default:
      return null;
  }
}
