import { BONUS, pilotById, resolveStats, stack, type DriverId, type PilotId, type Upgrades } from "./data";
import { applyKit, type PilotKit } from "./armory";

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
    reaction: 0.42,
    shiftAt: 0.74,
    jitter: 0.1,
    nitroGear: 4,
    launch: 0.72,
  },
  {
    chapter: 2,
    driver: "claw",
    fossil: 80,
    vmaxMul: 0.77,
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

export const BOSSES: Record<number, { rear: string; before: string; win: string; loss: string }> = {
  1: { rear: "arm-mine-Comum", before: "GECK: ele corre do seu lado e joga mina. Desvia com A/D.", win: "Você passou por cima das minas.", loss: "A mina te pegou." },
  2: { rear: "arm-mine-Comum", before: "CLAW: troca tiro de perto. A seta mostra de onde vem.", win: "O raio não te alcançou.", loss: "Perto demais do raio." },
  3: { rear: "arm-mine-Normal", before: "NYX: mesma briga da rua, carro mais rápido. Desvia o míssil.", win: "Você quebrou a mira.", loss: "O míssil não errou." },
  4: { rear: "arm-mine-Raro", before: "LUA: médio. Ele cola e atira mais. A/D tira você da linha.", win: "O gelo não te segurou.", loss: "Você ficou lento." },
  5: { rear: "arm-mine-Épico", before: "SHELL: difícil. Não deixa ele abrir. Revida quando estiver colado.", win: "O casco aguentou o veneno.", loss: "O veneno te comeu." },
  6: { rear: "arm-mine-Lendário", before: "VEX: ou chega primeiro, ou eu te derrubo. Mesma briga, sem piedade.", win: "A mandíbula ficou na pista.", loss: "O rex te passou." },
};

export type StoryKit = {
  arm: string;
  pilot: PilotId;
  kit: PilotKit;
  upgrades: Upgrades;
  /** 0 erra a faixa. 1 cola no seu carro. */
  aim: number;
};

const GROWTH = {
  Comum: 0.05,
  Normal: 0.08,
  Raro: 0.12,
  Épico: 0.18,
  Lendário: 0.16,
  Meme: 0.1,
} as const;

export function storyLoadout(phase: StoryPhase): StoryKit {
  const table: Record<number, StoryKit> = {
    1: {
      arm: "arm-mg-Comum",
      pilot: "vex",
      kit: { cranio: "kit-cranio-Comum" },
      upgrades: { engine: 0, gearbox: 0, nitro: 0, tires: 1, chassis: 0 },
      aim: 0.36,
    },
    2: {
      arm: "arm-ray-Comum",
      pilot: "geck",
      kit: { cranio: "kit-cranio-Comum", bota: "kit-bota-Comum", ampola: "kit-ampola-Comum" },
      upgrades: { engine: 0, gearbox: 0, nitro: 0, tires: 1, chassis: 0 },
      aim: 0.42,
    },
    3: {
      arm: "arm-homing-Normal",
      pilot: "claw",
      kit: {
        cranio: "kit-cranio-Normal",
        lente: "kit-lente-Normal",
        garra: "kit-garra-Normal",
        bota: "kit-bota-Normal",
        ampola: "kit-ampola-Normal",
      },
      upgrades: { engine: 2, gearbox: 2, nitro: 1, tires: 2, chassis: 2 },
      aim: 0.52,
    },
    4: {
      arm: "arm-ice-Raro",
      pilot: "nyx",
      kit: {
        cranio: "kit-cranio-Raro",
        lente: "kit-lente-Raro",
        garra: "kit-garra-Raro",
        bota: "kit-bota-Raro",
        ampola: "kit-ampola-Raro",
      },
      upgrades: { engine: 3, gearbox: 3, nitro: 2, tires: 3, chassis: 3 },
      aim: 0.68,
    },
    5: {
      arm: "arm-poison-Épico",
      pilot: "shell",
      kit: {
        cranio: "kit-cranio-Épico",
        lente: "kit-lente-Épico",
        garra: "kit-garra-Épico",
        bota: "kit-bota-Épico",
        ampola: "kit-ampola-Épico",
      },
      upgrades: { engine: 5, gearbox: 5, nitro: 4, tires: 5, chassis: 5 },
      aim: 0.84,
    },
    6: {
      arm: "arm-missile-Lendário",
      pilot: "trex",
      kit: {
        cranio: "kit-cranio-Lendário-3",
        lente: "kit-lente-Lendário-3",
        garra: "kit-garra-Lendário-3",
        bota: "kit-bota-Lendário-3",
        ampola: "kit-ampola-Lendário-3",
      },
      upgrades: { engine: 8, gearbox: 8, nitro: 8, tires: 8, chassis: 8 },
      aim: 0.96,
    },
  };
  return table[phase.chapter] ?? table[1]!;
}

export function storyRivalStats(phase: StoryPhase) {
  const load = storyLoadout(phase);
  const built = resolveStats(phase.driver, phase.rarity, stack(load.upgrades, BONUS[phase.driver]));
  const worn = applyKit(built, load.kit);
  const pilot = pilotById(load.pilot).bonus;
  const grown = 1 + Math.max(0, phase.chapter - 1) * GROWTH[phase.rarity];
  return {
    durability: Math.round(worn.durability * pilot.durability * grown),
    vmax: Math.round(worn.vmax * pilot.vmax * grown * phase.vmaxMul),
    accel: Math.round(worn.accel * pilot.accel * grown),
    nitroTime: Math.round(worn.nitroTime * pilot.nitroTime * (0.85 + grown * 0.15) * 100) / 100,
    power: Math.round(worn.power * pilot.power * grown),
  };
}

export function grantStoryPart(up: Upgrades, part: StoryPart): Upgrades {
  const cap = part.grade === "monstro" ? 8 : 4;
  return { ...up, [part.key]: Math.min(cap, up[part.key] + part.levels) };
}
