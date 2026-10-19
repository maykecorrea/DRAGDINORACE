import type { DailyState, Save } from "./save";

export const MISSIONS = [
  { id: "finish", title: "Fecha uma corrida", target: 1, reward: 40 },
  { id: "win", title: "Ganha uma corrida", target: 1, reward: 70 },
  { id: "shift", title: "Três trocas no ponto", target: 3, reward: 36 },
] as const;

export type MissionId = (typeof MISSIONS)[number]["id"];

export function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ensureDaily(save: Save, now = new Date()): DailyState {
  const day = todayKey(now);
  const cur = save.daily;
  if (cur && cur.day === day && cur.done && Array.isArray(cur.claimed)) return cur;
  return { day, done: {}, claimed: [] };
}

export function bumpDaily(save: Save, patch: Partial<Record<MissionId, number>>, now = new Date()): DailyState {
  const daily = ensureDaily(save, now);
  const done = { ...daily.done };
  for (const mission of MISSIONS) {
    const add = patch[mission.id] ?? 0;
    if (add > 0) done[mission.id] = (done[mission.id] ?? 0) + add;
  }
  return { ...daily, done };
}

export function missionReady(save: Save): boolean {
  const daily = ensureDaily(save);
  return MISSIONS.some((mission) => (daily.done[mission.id] ?? 0) >= mission.target && !daily.claimed.includes(mission.id));
}
