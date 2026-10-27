import type { Content } from "../../../../gf-engine/content.ts";
import type { GfEvent } from "../../../../gf-engine/finance.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";
import { foodById } from "../../../../gf-engine/body.ts";

export const GLOSS = {
  caixa: "Caixa: o dinheiro que você tem agora, na mão.",
  divida: "Dívida: tudo o que você deve. Entra no patrimônio líquido.",
  pl: "Patrimônio: tudo o que você tem menos tudo o que você deve.",
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
    if (line) lines.push({ ...line, text: line.text.replaceAll("{nome}", state.player.name || "Téo") });
  }
  return lines;
}

function traveledLine(place: string | undefined, minutes: number): string {
  const names: Record<string, string> = {
    oficina: "a Oficina Ferrugem & Filho",
    casco_tech: "a Casco-Tech",
    ferro_velho: "o Ferro-Velho do Zé",
    megaosso: "a Megaosso",
    rato: "o Beco do Rato",
    leilao: "o Cais do Leilão",
    banco: "o Banco Fóssil",
    coliseu: "o Coliseu da Arrancada",
    hospital: "o Hospital da Faixa",
    farmacia: "a Farmácia do Seu Gotardo",
    posto: "o Posto de Saúde",
    tenda: "a Tenda do Raizão",
    praca: "a Praça do Fóssil",
    posto_cometa: "o Posto Cometa",
    galpao: "o Galpão dos Mandíbula",
    cha: "o chá do Raizão",
    checkup: "o check-up",
    consulta: "a consulta",
  };
  const bus = place?.startsWith("bus:") ? place.slice(4) : "";
  const where = names[bus || place || ""] ?? "a cidade";
  if (place === "cha") return "Tomou o chá. A energia subiu.";
  if (place === "checkup") return "Check-up feito. A saúde subiu um pouco.";
  if (place === "consulta") return "Consulta feita. A saúde subiu.";
  if (bus) return `Ossobus até ${where} (10 min, 5 ₣).`;
  if ((minutes ?? 0) <= 0) return `Já estava em ${where}.`;
  return `Caminhou até ${where} (${minutes} min). Não gastou PA.`;
}

function personName(content: Content, id: string | undefined): string {
  if (!id) return "Um ajudante";
  return content.employees.find((item) => item.id === id)?.nome ?? "Um ajudante";
}

function lessonTitle(content: Content, id: string | undefined): string {
  if (!id) return "uma lição";
  return content.lessons.find((item) => item.id === id)?.title ?? id;
}

function oneEvent(event: GfEvent, state: GameState, content: Content): { icon: string; text: string } | null {
  const amount = event.amount ?? 0;
  const who = personName(content, event.text);
  switch (event.type) {
    case "JOB_READY":
      return { icon: "✔", text: `Serviço pronto: ${serviceName(content, undefined, state, event.jobId)}! Agora é só entregar.` };
    case "JOB_FAILED": {
      const name = serviceName(content, undefined, state, event.jobId);
      if (event.text === "rato") return { icon: "✖", text: `${name} deu errado: a peça do Rato veio com defeito. Tente de novo.` };
      if (event.text === "ajudante") return { icon: "✖", text: `${name} deu errado: o ajudante errou. Tente de novo.` };
      if (event.text === "qualidade") return { icon: "✖", text: `${name} deu errado. A equipe estava cansada. Tente de novo.` };
      if (event.text === "pecas") return { icon: "✖", text: `${name} deu errado e faltam peças para refazer. Compre mais.` };
      return { icon: "✖", text: `${name} deu errado. O carro volta para a fila. Tente de novo.` };
    }
    case "DELIVERED":
      return { icon: "✔", text: event.text === "atrasado" ? "Carro entregue, mas atrasado. O cliente pagou menos." : event.text === "frota" ? "Carro da frota entregue." : "Carro entregue no prazo! Cliente feliz." };
    case "PAID":
      return { icon: "✔", text: `O cliente pagou ${formatF(amount)}. Dinheiro no caixa!` };
    case "DEFAULT":
      return { icon: "✖", text: `O cliente sumiu sem pagar ${formatF(Math.abs(amount))}. Tente cobrar.` };
    case "PROPOSAL_ACCEPTED":
      return { icon: "✔", text: "O cliente aceitou! O serviço é seu." };
    case "PROPOSAL_REFUSED":
      return { icon: "✖", text: event.text || "O cliente não aceitou. Tente um preço menor." };
    case "PROPOSAL_SENT": {
      const mins = Number(event.text);
      if (Number.isFinite(mins) && mins > 0 && mins < 90) return { icon: "…", text: `Proposta enviada! A resposta chega em ${Math.round(mins)} min.` };
      const hours = Number.isFinite(mins) && mins > 0 ? Math.max(1, Math.round(mins / 60)) : 0;
      return { icon: "…", text: hours > 0 ? `Proposta enviada! A resposta chega em ${hours}h.` : "Proposta enviada. A resposta chega amanhã." };
    }
    case "COUNTER_OFFER":
      return event.text === "subiu"
        ? { icon: "!", text: `Na casa do cliente o preço subiu para ${formatF(amount)}.` }
        : { icon: "!", text: "O cliente pediu desconto. Aceite ou recuse." };
    case "TREATED":
      return event.text?.startsWith("consulta:")
        ? { icon: "…", text: `Consulta feita: não era ${event.text.slice(9)}.` }
        : { icon: "♥", text: `${event.text ?? "Doença"} tratado.` };
    case "COUNTER_REFUSED":
      return { icon: "✖", text: "Você não deu o desconto. O cliente foi embora." };
    case "RECORD":
      return { icon: "!", text: event.text || "Você olhou a ficha do cliente." };
    case "PROSPECTED":
      return { icon: "…", text: "Você espalhou o nome da oficina. Clientes novos chegam semana que vem." };
    case "RESTED":
      return { icon: "♥", text: "Você descansou e recuperou energia." };
    case "NIGHT_SHIFT":
      return { icon: "☾", text: "Você virou a noite: +1 de energia, mas a equipe ficou cansada." };
    case "COLLAPSE":
      return { icon: "✖", text: "Cansaço demais! A próxima semana começa sem energia. Descanse mais." };
    case "RED_ALERT":
      return { icon: "!", text: "Caixa no vermelho! Junte dinheiro até domingo ou a oficina fecha." };
    case "WEEK_CLOSED":
      return { icon: "▣", text: `Semana ${event.week ?? ""} terminou. Veja o resumo!` };
    case "MATERIALS_ARRIVED":
      if (event.text === "perdido") return { icon: "✖", text: "A caixa se perdeu no caminho. O dinheiro não volta." };
      if (event.text === "dinoturbo" || event.text === "dinodrone") return { icon: "✔", text: "A entrega chegou. As peças estão na prateleira." };
      return { icon: "✔", text: "As peças chegaram! Já dá para trabalhar." };
    case "COLLECTED":
      return { icon: "✔", text: `A cobrança deu certo: ${formatF(amount)} de volta!` };
    case "COLLECT_MISS":
      return { icon: "✖", text: "A cobrança não achou o cliente. Tente de novo ou proteste." };
    case "PROTEST_FILED":
      return { icon: "!", text: "Você cobrou por escrito. O dinheiro pode voltar." };
    case "PROTEST_MISS":
      return { icon: "✖", text: "A cobrança por escrito não deu certo. O cliente não pagou." };
    case "JOB_OPENED":
      return { icon: "✔", text: `Carro novo: ${serviceName(content, undefined, state, event.jobId)}. Escolha o mecânico.` };
    case "FLEET_SIGNED":
      return { icon: "✔", text: "Contrato da frota assinado! Mais carros vão chegar." };
    case "RAID":
      return { icon: "✖", text: "A fiscalização achou peças do Rato. Compre em loja certa." };
    case "QUIT":
      return { icon: "✖", text: `${who} foi embora: o salário atrasou. Pague em dia.` };
    case "DOENCA":
      return { icon: "!", text: `${who} ficou doente e vai descansar. O salário continua.` };
    case "HIRED":
      return { icon: "✔", text: `${who} entrou na equipe! Dê um serviço para começar.` };
    case "FIRED":
      return { icon: "✖", text: `${who} saiu da equipe. O acerto saiu do caixa.` };
    case "TRAINING":
      return { icon: "…", text: "O Tico foi fazer o curso. Ele volta em 8 semanas." };
    case "TRAINED":
      return { icon: "✔", text: "O Tico voltou do curso. Agora ele erra menos!" };
    case "WAGES_PAID":
      return { icon: "✔", text: "Salário atrasado pago. A equipe agradece!" };
    case "FOOD":
      return { icon: "✔", text: `Comprou ${foodById(event.text ?? "")?.nome ?? "comida"} por ${formatF(amount)}.` };
    case "ATE":
      return { icon: "♥", text: `Comeu ${foodById(event.text ?? "")?.nome ?? "alguma coisa"}. A fome baixou.` };
    case "COOKED":
      return { icon: "✔", text: `No fogão: ${foodById(event.text ?? "")?.nome ?? "um prato"}. Está na despensa.` };
    case "LEVEL_UP":
      return { icon: "★", text: `Téo subiu para ${event.text ?? "o próximo nível"}.` };
    case "BOUGHT":
      if (event.text === "amanha") return { icon: "…", text: "Pedido feito! As peças chegam amanhã." };
      if (event.text === "dinoturbo") return { icon: "…", text: `O DinoTurbo saiu com o pedido. Frete e peças: ${formatF(amount)}.` };
      if (event.text === "dinodrone") return { icon: "…", text: `O DinoDrone saiu com o pedido. Frete e peças: ${formatF(amount)}.` };
      if (event.text === "garimpo") return { icon: "✔", text: "O garimpo achou um osso." };
      if (event.text === "garimpo-vazio") return { icon: "…", text: "O garimpo de hoje não achou nada." };
      if (event.text?.startsWith("med:")) return { icon: "✔", text: `${event.text.slice(4)} foi pra mochila.` };
      return { icon: "…", text: "Peças compradas e já na prateleira!" };
    case "TRAVELED":
      return { icon: "…", text: traveledLine(event.text, event.week ?? amount) };
    case "SOLD_SCRAP":
      return { icon: "✔", text: `Sucata vendida! Entraram ${formatF(amount)}.` };
    case "DEBT_PAID":
      return { icon: "✔", text: event.text === "renegociado" ? `O Sr. Juros-Baixo renegociou. A dívida baixou ${formatF(amount)} e o prazo andou uma semana.` : `Você pagou ${formatF(amount)} a mais. A dívida diminuiu!` };
    case "PRIORITY":
      return { icon: "✔", text: "A ordem de pagamento mudou." };
    case "SAVED":
      return { icon: "✔", text: `Guardou ${formatF(amount)} no cofre.` };
    case "WITHDREW":
      return { icon: "✔", text: `Tirou ${formatF(amount)} do cofre.` };
    case "WITHDRAW_PENDING":
      return { icon: "…", text: "O tesouro cai no domingo." };
    case "AUTODEPOSIT":
      return { icon: "✔", text: `Depósito automático em ${amount}%.` };
    case "LOAN":
      return { icon: "!", text: `Crédito na mão: ${formatF(amount)}` };
    case "CARD":
      return { icon: "☎", text: `Recado no celular: ${event.text ?? "carta"}` };
    case "CARD_RESOLVED":
      return { icon: "✔", text: event.text ?? "Recado respondido" };
    case "CARD_EXPIRED":
      return { icon: "…", text: "Uma oferta passou sem resposta." };
    case "SCAM_DODGED":
      return { icon: "!", text: "Você descobriu o golpe!" };
    case "LESSON":
      return { icon: "✎", text: `Lição nova: ${lessonTitle(content, event.text)}` };
    case "LESSON_READ":
      return { icon: "✔", text: "Lição guardada." };
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
      return { icon: "…", text: "Carros novos no leilão." };
    case "INSPECTED":
      return { icon: "!", text: event.text === "defeito" ? "Defeito escondido no carro velho." : "Carro velho sem defeito." };
    case "BOUGHT_CARCASS":
      return { icon: "…", text: `Carcaça no pátio: ${formatF(amount)}` };
    case "CARCASS_WORK":
      return { icon: "…", text: "Trabalho no carro velho." };
    case "CARCASS_LISTED":
      return { icon: "…", text: `Anúncio a ${formatF(amount)}` };
    case "CARCASS_SOLD":
      return { icon: "✔", text: `Carcaça vendida: ${formatF(amount)}` };
    case "STUDIED":
      return { icon: "✎", text: event.text ? `Caderno: ${event.text}` : "Página nova no caderno." };
    default:
      return null;
  }
}
