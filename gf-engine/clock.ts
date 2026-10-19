import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import type { Day, GameState } from "./state.ts";

export const DAY = 1440;
export const WEEK = 10080;

const DAY_LONG = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const DAY_SHORT = ["", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

export type Periodo = "madrugada" | "manha" | "tarde" | "noite";

export type ClockParts = {
  t: number;
  week: number;
  day: Day;
  hour: number;
  minute: number;
  periodo: Periodo;
};

type Window = { dias: number[]; de: string; ate: string };

export function partsOf(t: number): ClockParts {
  const week = Math.floor(t / WEEK);
  const day = (Math.floor((t % WEEK) / DAY) + 1) as Day;
  const minuteOfDay = t % DAY;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const periodo: Periodo = hour <= 5 ? "madrugada" : hour <= 11 ? "manha" : hour <= 17 ? "tarde" : "noite";
  return { t, week, day, hour, minute, periodo };
}

export function dayIndex(t: number): number {
  const p = partsOf(t);
  return p.week * 7 + (p.day - 1);
}

export function clockLabel(t: number): string {
  const p = partsOf(t);
  return `${DAY_SHORT[p.day]} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")} · Sem ${p.week}`;
}

export function whenLabel(t: number): string {
  const p = partsOf(t);
  return `${DAY_LONG[p.day]} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function hm(value: string): number {
  if (value === "24:00") return DAY;
  const [h, m] = value.split(":").map((item) => Number(item));
  return h! * 60 + m!;
}

function covers(window: Window, day: number, minute: number): boolean {
  if (!window.dias.includes(day)) return false;
  const from = hm(window.de);
  const to = hm(window.ate);
  if (from === to) return false;
  if (from < to) return minute >= from && minute < to;
  return minute >= from || minute < to;
}

export function placeOpen(content: Content, place: string, t: number): boolean {
  const hours = content.time?.places?.[place];
  if (!hours) return true;
  const p = partsOf(t);
  return hours.some((window) => covers(window, p.day, p.hour * 60 + p.minute));
}

export function nextOpenLabel(content: Content, place: string, t: number): string {
  for (let step = 1; step <= WEEK; step += 1) {
    if (placeOpen(content, place, t + step)) return whenLabel(t + step);
  }
  return "sem previsão";
}

export function tintFor(content: Content, t: number): { color: string; opacity: number } {
  const hour = partsOf(t).hour;
  const row = content.time?.tints?.find((item) => hour >= item.from && hour <= item.to);
  return { color: row?.color ?? "#000000", opacity: row?.opacity ?? 0 };
}

export function nextSundayClose(t: number, closeDay: number, closeMinute: number): number {
  const p = partsOf(t);
  const into = t % DAY;
  let delta = ((closeDay - p.day + 7) % 7) * DAY + (closeMinute - into);
  if (delta <= 0) delta += WEEK;
  return t + delta;
}

export function startOfDay(t: number): number {
  return t - (t % DAY);
}

export function inNightWindow(content: Content, t: number): boolean {
  const minute = t % DAY;
  return minute >= content.time.nightShiftFrom || minute < content.time.nightShiftTo;
}

export function assertOpen(content: Content, place: string, t: number): void {
  if (placeOpen(content, place, t)) return;
  const name = content.time.closedName[place] ?? place;
  throw new GameError("fechado", `${name} abre ${nextOpenLabel(content, place, t)}. Agora: ${whenLabel(t)}.`);
}

export function timeContext(state: GameState): string {
  const p = partsOf(state.clock.t);
  const energy = state.clock.energy <= 10 ? "exausto" : state.clock.energy <= 25 ? "cansado" : "ok";
  return `agora: ${whenLabel(state.clock.t)} · periodo: ${p.periodo} · energia_teo: ${energy}`;
}

export function blankClock(t: number, speed: 1 | 2 | 4, energy: number): GameState["clock"] {
  return {
    t,
    speed,
    paused: false,
    energy,
    awakeSinceT: t,
    lastSleep: null,
    apRefillDay: dayIndex(t),
    awakeMin: 0,
    subMs: 0,
    overtime: [],
  };
}
