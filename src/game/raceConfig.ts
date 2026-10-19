/** Números da corrida. Ajuste aqui, sem mexer na lógica. */
export const RACE_CONFIG = {
  stripM: 1400,
  redline: 8000,
  idle: 1000,
  lanes: [-2.2, 0, 2.2] as const,
  laneTime: 0.3,
  timeout: 60,
  torque: [
    [1000, 0.55],
    [2000, 0.68],
    [3000, 0.8],
    [4000, 0.9],
    [5000, 0.97],
    [5500, 1],
    [6500, 0.97],
    [7000, 0.92],
    [7500, 0.8],
    [8000, 0.6],
  ] as const,
  gearFrac: [0.24, 0.39, 0.54, 0.69, 0.85, 1] as const,
  gearMult: [1, 0.615, 0.444, 0.348, 0.282, 0.24] as const,
  launch: {
    green: [4000, 5500] as const,
    perfect: [4600, 5000] as const,
    bogTime: 0.4,
    bogMul: 0.6,
    spinTime: 0.5,
    spinMul: 0.7,
    perfectBonus: 0.1,
    perfectTime: 1,
    rise: 4000,
    fall: 3000,
    redHold: 0.6,
  },
  shift: [
    { lo: 6600, hi: 7700, pLo: 7250, pHi: 7550 },
    { lo: 6700, hi: 7750, pLo: 7300, pHi: 7600 },
    { lo: 6800, hi: 7800, pLo: 7350, pHi: 7650 },
    { lo: 6900, hi: 7850, pLo: 7400, pHi: 7700 },
    { lo: 7000, hi: 7900, pLo: 7450, pHi: 7750 },
    { lo: 7100, hi: 7920, pLo: 7500, pHi: 7780 },
    { lo: 7180, hi: 7950, pLo: 7540, pHi: 7820 },
  ] as const,
  shiftTime: { perfeito: 0.08, ok: 0.2, cedo: 0.3, tarde: 0.3, corte: 0.6 },
  perfectBonus: 0.025,
  perfectTime: 1.2,
  corteMul: 0.4,
  corteHold: 0.6,
  nitro: { burn: 1.8, force: 0.3, cap: 0.06, perfectExtra: 0.4, lowRpm: 5000 },
  missile: { kick: 55, range: 150, cd: 1.2, dmg: 0.18, lockedDmg: 0.14, slow: 0.75, slowT: 1, lock: 0.5, guide: 0.4, band: [15, 150] as const },
  mine: { life: 8, arm: 0.3, max: 2, cd: 2, dmg: 0.18, slow: 0.7, slowT: 0.8, see: 120, warn: 40, drop: 6 },
  hpCap: { half: 0.97, low: 0.93 },
  draft: { min: 8, max: 35, force: 0.04, cap: 0.03, arm: 0.6 },
  hitStop: 0.05,
  boxStep: 250,
  repair: 0.12,
  ammoFront: 2,
  ammoRear: 1,
  hazard: { min: 3, max: 5, piche: 0.75, picheT: 0.6, bone: 0.05 },
} as const;

export type RaceBadge = "ovo" | "filhote" | "raptor" | "rex" | "alfa";

export function driveMph(stat: number): number {
  if (stat <= 260) return stat;
  const t = Math.log(stat / 260) / Math.log(11960 / 260);
  return 185 + Math.min(1, Math.max(0, t)) * 40;
}

export function accelA(vmaxMph: number): number {
  if (vmaxMph >= 210) return 13.6;
  if (vmaxMph >= 198) return 12;
  if (vmaxMph >= 183) return 10.7;
  return 9.8;
}

export function badgeForReaction(reaction: number): RaceBadge {
  if (reaction >= 0.35) return "ovo";
  if (reaction >= 0.25) return "filhote";
  if (reaction >= 0.15) return "raptor";
  if (reaction >= 0.08) return "rex";
  return "alfa";
}

/** Comum, Normal e Raro: 6. Épico: 7. Lendário: 8. A marcha extra só abre mais uma janela de troca. */
export function gearsForRarity(rarity: string | undefined): number {
  if (rarity === "Lendário" || rarity === "Lendario" || rarity === "Meme") return 8;
  if (rarity === "Épico" || rarity === "Epico") return 7;
  return 6;
}

/** mult = 0.24 / fração, igual à caixa de 6. A curva de força por rpm não muda; muda o número de trocas. */
export function gearBox(count: number): { frac: number[]; mult: number[] } {
  const n = count >= 8 ? 8 : count >= 7 ? 7 : 6;
  const frac =
    n === 8
      ? [0.24, 0.355, 0.47, 0.575, 0.675, 0.77, 0.875, 1]
      : n === 7
        ? [0.24, 0.37, 0.5, 0.625, 0.745, 0.87, 1]
        : [0.24, 0.39, 0.54, 0.69, 0.85, 1];
  return { frac, mult: frac.map((f) => 0.24 / f) };
}

export type AiLevel = "facil" | "medio" | "dificil";

/** Reação em segundos [média, desvio]. Mistura: perfeito, bom, cedo, tarde, corte. Rubber é fração de teto; 0 = nenhum. */
export const AI_TABLE = {
  facil: {
    reaction: [0.38, 0.06],
    foul: 0,
    mix: [0.15, 0.45, 0.25, 0.12, 0.03],
    aim: 0.3,
    lock: 0,
    mines: 2,
    dodge: 0.2,
    dodgeDelay: 0.4,
    laneDelay: 1,
    crate: 0.35,
    draft: 0,
    rubber: 0.03,
  },
  medio: {
    reaction: [0.28, 0.04],
    foul: 0.02,
    mix: [0.35, 0.45, 0.12, 0.07, 0.01],
    aim: 0.55,
    lock: 0.5,
    mines: 3,
    dodge: 0.45,
    dodgeDelay: 0.28,
    laneDelay: 0.6,
    crate: 0.8,
    draft: 0.45,
    rubber: 0.02,
  },
  dificil: {
    reaction: [0.21, 0.025],
    foul: 0.04,
    mix: [0.6, 0.32, 0.05, 0.03, 0],
    aim: 0.8,
    lock: 1,
    mines: 5,
    dodge: 0.7,
    dodgeDelay: 0.18,
    laneDelay: 0.35,
    crate: 1,
    draft: 1,
    rubber: 0,
  },
} as const;

export type HudBox = { x: number; y: number; w: number; h: number };

/** Caixas do HUD em 1280×720. O canvas faz letterbox, então 1920×1080 usa as mesmas. */
export const HUD: Record<string, HudBox> = {
  hp: { x: 24, y: 28, w: 300, h: 18 },
  hpRival: { x: 956, y: 28, w: 300, h: 18 },
  progress: { x: 360, y: 6, w: 560, h: 18 },
  alerts: { x: 496, y: 348, w: 288, h: 48 },
  leds: { x: 540, y: 404, w: 200, h: 16 },
  tacho: { x: 520, y: 428, w: 240, h: 236 },
  note: { x: 460, y: 672, w: 360, h: 28 },
  nitro: { x: 492, y: 500, w: 16, h: 70 },
  front: { x: 24, y: 600, w: 64, h: 88 },
  rear: { x: 1192, y: 600, w: 64, h: 88 },
  aim: { x: 592, y: 168, w: 96, h: 96 },
};

export function hudOverlap(): string[] {
  const keys = Object.keys(HUD);
  const hits: string[] = [];
  const hit = (a: HudBox, b: HudBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const A = HUD[keys[i]!]!;
      const B = HUD[keys[j]!]!;
      if (hit(A, B)) hits.push(`${keys[i]}×${keys[j]}`);
    }
  }
  if (HUD.aim!.y + HUD.aim!.h > 520) hits.push("aim-painel");
  return hits;
}
