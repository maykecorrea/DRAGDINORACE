export type QuestId =
  | "wallet"
  | "discord-join"
  | "discord-role"
  | "x-follow"
  | "x-like"
  | "x-rt"
  | "ig-follow"
  | "ig-like"
  | "ig-comment"
  | "checkin"
  | "race"
  | "win"
  | "referral";

export type QuestDef = {
  id: QuestId;
  name: string;
  points: number;
  check: "auto" | "manual";
  repeat: "once" | "day" | "month";
  cap?: number;
};

export const QUESTS: QuestDef[] = [
  { id: "wallet", name: "Conta do jogo", points: 20, check: "auto", repeat: "once" },
  { id: "discord-join", name: "Entrar no Discord", points: 15, check: "auto", repeat: "once" },
  { id: "discord-role", name: "Confirmar conta no Discord", points: 15, check: "auto", repeat: "once" },
  { id: "x-follow", name: "Seguir @DinoDragRace no X", points: 10, check: "manual", repeat: "once" },
  { id: "x-like", name: "Curtir um post no X", points: 5, check: "manual", repeat: "day" },
  { id: "x-rt", name: "Repostar um post no X", points: 10, check: "manual", repeat: "day" },
  { id: "ig-follow", name: "Seguir @dinodragrace no Instagram", points: 10, check: "manual", repeat: "once" },
  { id: "ig-like", name: "Curtir um post no Instagram", points: 5, check: "manual", repeat: "day" },
  { id: "ig-comment", name: "Comentar num post no Instagram", points: 10, check: "manual", repeat: "day" },
  { id: "checkin", name: "Presença do dia", points: 5, check: "auto", repeat: "day" },
  { id: "race", name: "Jogar uma corrida", points: 10, check: "auto", repeat: "day", cap: 3 },
  { id: "win", name: "Vencer uma corrida", points: 15, check: "auto", repeat: "day", cap: 3 },
  { id: "referral", name: "Convidar um amigo", points: 30, check: "auto", repeat: "month", cap: 20 },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((quest) => [quest.id, quest])) as Record<QuestId, QuestDef>;

export const SPIN_COST = 100;
export const RAFFLE_COST = 500;
export const DAILY_CAP = 80;

export function shortWallet(wallet: string): string {
  const v = wallet.toLowerCase();
  return v.length < 12 ? v : `${v.slice(0, 4)}..${v.slice(-4)}`;
}
