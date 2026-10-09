import { BONUS, RIVALS, resolveStats, stack, type DriverId, type Upgrades } from "./data";

export type StoryPart = {
  key: keyof Upgrades;
  levels: number;
  name: string;
  grade: "normal" | "monstro";
};

export type StoryPhase = {
  chapter: number;
  driver: DriverId;
  fossil: number;
  vmaxMul: number;
  rarity: "Comum" | "Normal" | "Raro" | "Épico" | "Lendário";
  part: StoryPart;
  reaction: number;
  shiftAt: number;
  jitter: number;
  nitroGear: number;
  launch: number;
};

export const STORY: StoryPhase[] = [
  {
    chapter: 1,
    driver: "geck",
    fossil: 40,
    vmaxMul: 0.75,
    rarity: "Comum",
    part: { key: "tires", levels: 1, name: "Pneu de rua", grade: "normal" },
    reaction: 0.48,
    shiftAt: 0.7,
    jitter: 0.12,
    nitroGear: 4,
    launch: 0.42,
  },
  {
    chapter: 2,
    driver: "claw",
    fossil: 80,
    vmaxMul: 0.8,
    rarity: "Comum",
    part: { key: "chassis", levels: 1, name: "Casco comum", grade: "normal" },
    reaction: 0.34,
    shiftAt: 0.78,
    jitter: 0.08,
    nitroGear: 3,
    launch: 0.6,
  },
  {
    chapter: 3,
    driver: "nyx",
    fossil: 140,
    vmaxMul: 0.7,
    rarity: "Normal",
    part: { key: "gearbox", levels: 1, name: "Caixa de rua", grade: "normal" },
    reaction: 0.24,
    shiftAt: 0.86,
    jitter: 0.05,
    nitroGear: 3,
    launch: 0.72,
  },
  {
    chapter: 4,
    driver: "lua",
    fossil: 260,
    vmaxMul: 0.9,
    rarity: "Raro",
    part: { key: "nitro", levels: 1, name: "Garrafa rara", grade: "normal" },
    reaction: 0.14,
    shiftAt: 0.92,
    jitter: 0.03,
    nitroGear: 3,
    launch: 0.82,
  },
  {
    chapter: 5,
    driver: "shell",
    fossil: 520,
    vmaxMul: 0.95,
    rarity: "Épico",
    part: { key: "engine", levels: 2, name: "Bloco monstro", grade: "monstro" },
    reaction: 0.09,
    shiftAt: 0.95,
    jitter: 0.015,
    nitroGear: 2,
    launch: 0.88,
  },
  {
    chapter: 6,
    driver: "vex",
    fossil: 1100,
    vmaxMul: 1,
    rarity: "Lendário",
    part: { key: "engine", levels: 2, name: "Mandíbula monstro", grade: "monstro" },
    reaction: 0.05,
    shiftAt: 0.97,
    jitter: 0.008,
    nitroGear: 2,
    launch: 0.93,
  },
];

export function storyPhase(chapter: number): StoryPhase {
  return STORY.find((phase) => phase.chapter === chapter) ?? STORY[0]!;
}

export function storyOpen(cleared: number, chapter: number): boolean {
  return chapter <= cleared + 1;
}

export function storyRivalStats(phase: StoryPhase) {
  const rival = RIVALS.find((item) => item.driver === phase.driver);
  const build = rival?.build ?? { engine: 2, gearbox: 2, nitro: 2, tires: 2, chassis: 2 };
  const stats = resolveStats(phase.driver, phase.rarity, stack(build, BONUS[phase.driver]));
  return { ...stats, vmax: stats.vmax * phase.vmaxMul };
}

export function grantStoryPart(up: Upgrades, part: StoryPart): Upgrades {
  const cap = part.grade === "monstro" ? 8 : 4;
  return { ...up, [part.key]: Math.min(cap, up[part.key] + part.levels) };
}
