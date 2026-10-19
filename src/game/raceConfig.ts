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
    bogTime: 0.28,
    bogMul: 0.75,
    spinTime: 0.35,
    spinMul: 0.8,
    perfectBonus: 0.1,
    perfectTime: 1,
    rise: 5200,
    fall: 2600,
    redHold: 0.45,
  },
  shift: [
    { lo: 5400, hi: 7850, pLo: 6800, pHi: 7500 },
    { lo: 5500, hi: 7880, pLo: 6850, pHi: 7550 },
    { lo: 5600, hi: 7900, pLo: 6900, pHi: 7600 },
    { lo: 5700, hi: 7920, pLo: 6950, pHi: 7650 },
    { lo: 5800, hi: 7940, pLo: 7000, pHi: 7700 },
    { lo: 5900, hi: 7960, pLo: 7050, pHi: 7740 },
    { lo: 6000, hi: 7980, pLo: 7100, pHi: 7780 },
  ] as const,
  shiftTime: { perfeito: 0.06, ok: 0.1, cedo: 0.4, tarde: 0.4, corte: 0.5 },
  perfectBonus: 0.04,
  perfectTime: 1.2,
  corteMul: 0.7,
  corteHold: 0.45,
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
  if (vmaxMph >= 210) return 16.4;
  if (vmaxMph >= 198) return 15.2;
  if (vmaxMph >= 183) return 14.4;
  return 13.8;
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
      ? [0.38, 0.5, 0.6, 0.69, 0.77, 0.85, 0.93, 1]
      : n === 7
        ? [0.38, 0.52, 0.64, 0.75, 0.85, 0.93, 1]
        : [0.38, 0.52, 0.65, 0.77, 0.88, 1];
  const base = frac[0] ?? 0.38;
  return { frac, mult: frac.map((f) => base / f) };
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
    laneDelay: 1.6,
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
  leds: { x: 540, y: 508, w: 200, h: 14 },
  tacho: { x: 530, y: 526, w: 220, h: 140 },
  note: { x: 460, y: 672, w: 360, h: 28 },
  nitro: { x: 70, y: 468, w: 16, h: 70 },
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
