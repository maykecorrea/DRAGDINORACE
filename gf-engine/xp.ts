import type { GfEvent } from "./finance.ts";
import type { GameState } from "./state.ts";
import { foodById, gainXp } from "./body.ts";

/** XP de cada tarefa. Comer usa o XP do prato. Serviço na baia usa 12 por PA. */
export const TASK_XP: Record<string, number> = {
  COOK: 8,
  BUY_FOOD: 2,
  PROSPECT: 6,
  SEND_PROPOSAL: 10,
  ANSWER_COUNTER: 8,
  NUDGE_COUNTER: 4,
  CHECK_RECORD: 4,
  DELIVER: 24,
  COLLECT: 10,
  PROTEST: 8,
  BUY: 4,
  ORDER_PARTS: 6,
  SELL_SCRAP: 5,
  ASSIGN: 2,
  INSPECT_LOT: 4,
  BUY_LOT: 8,
  LIST_CARCASS: 10,
  HIRE: 8,
  FIRE: 2,
  TRAIN: 10,
  PAY_WAGES: 3,
  OSSOBUS: 3,
  TRAVEL: 2,
  GARIMPO: 8,
  CHA: 3,
  CHECKUP: 4,
  CONSULTA: 4,
  COMBUSTIVEL: 2,
  RUMOR: 3,
  PANFLETO: 6,
  PLANO: 8,
  RENEGOCIAR: 12,
  DESAFIO: 15,
  TREAT: 5,
  BUY_MED: 2,
  REST: 4,
  SLEEP: 4,
  NIGHT_SHIFT: 6,
  STUDY: 10,
  PAY_DEBT: 6,
  SAVE: 3,
  WITHDRAW: 1,
  TAKE_LOAN: 4,
  SELL_ASSET: 6,
  UPGRADE: 20,
  GANG: 8,
  CARD_CHOICE: 6,
  COLISEU: 22,
};

const PER_AP = 12;
const WORK = new Set(["WORK", "WORK_JOB", "WORK_CARCASS"]);

export function taskXp(state: GameState, kind: string, action: Record<string, unknown>, spentAp: number, events: GfEvent[]): number {
  if (kind === "EAT") return foodById(String(action.food ?? ""))?.xp ?? 0;
  if (WORK.has(kind)) return PER_AP * Math.max(1, spentAp);
  if (kind === "DELIVER") {
    const job = state.jobs.find((item) => item.id === action.jobId);
    return job ? 8 * job.apNeeded : 0;
  }
  if (kind === "COLISEU") {
    const win = events.find((event) => event.type === "COLISEU_WIN");
    if (!win) return 0;
    return String(win.text ?? "").startsWith("Semana") ? 40 : TASK_XP.COLISEU;
  }
  return TASK_XP[kind] ?? 0;
}

export function awardTaskXp(state: GameState, kind: string, action: Record<string, unknown>, spentAp: number, events: GfEvent[]): number {
  const amount = taskXp(state, kind, action, spentAp, events);
  if (amount <= 0) return 0;
  gainXp(state, amount, events);
  events.push({ type: "XP", amount, text: kind });
  return amount;
}
