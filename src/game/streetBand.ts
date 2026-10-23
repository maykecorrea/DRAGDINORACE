import type { StatBlock } from "./data.ts";

export type BandCar = {
  id: string;
  name: string;
  rarity: "Comum" | "Normal" | "Raro" | "Épico" | "Lendário";
};

/** Racha de rua na mesma classe. Comum não enfrenta Épico nem Raro. */
export function streetNearFrom<T extends BandCar>(cars: readonly T[], rarity: string | undefined, n: number): T {
  const band: BandCar["rarity"] =
    rarity === "Lendário" ? "Lendário" : rarity === "Épico" || rarity === "Meme" ? "Épico" : rarity === "Raro" ? "Raro" : rarity === "Normal" ? "Normal" : "Comum";
  const list = cars.filter((car) => car.rarity === band);
  const pool = list.length ? list : cars;
  const i = ((Math.floor(n) % pool.length) + pool.length) % pool.length;
  return pool[i]!;
}

/** Teto e vida do rival ficam na faixa do jogador. O nome pode ser de outra classe; a potência, não. */
export function bandStats(you: StatBlock, them: StatBlock): StatBlock {
  const vmax = Math.round(Math.min(Math.max(them.vmax, you.vmax * 0.94), you.vmax * 1.06));
  const durability = Math.round(Math.min(Math.max(them.durability, you.durability * 0.9), you.durability * 1.2));
  const accel = Math.round(Math.min(Math.max(them.accel, you.accel * 0.95), you.accel * 1.08));
  return { ...them, vmax, durability, accel };
}

/** Mesma IA da rua, com o teto do nível. Fácil ≈ você. Médio um pouco acima. Difícil puxa. */
export function levelBand(you: StatBlock, them: StatBlock, level: "facil" | "medio" | "dificil"): StatBlock {
  const band = level === "dificil" ? { lo: 1.02, hi: 1.06, hpLo: 1.1, hpHi: 1.25, aLo: 1.02, aHi: 1.1 } : level === "medio" ? { lo: 0.98, hi: 1.03, hpLo: 1, hpHi: 1.12, aLo: 0.98, aHi: 1.06 } : { lo: 0.94, hi: 1.0, hpLo: 0.9, hpHi: 1.05, aLo: 0.95, aHi: 1.02 };
  return {
    ...them,
    vmax: Math.round(Math.min(Math.max(them.vmax, you.vmax * band.lo), you.vmax * band.hi)),
    durability: Math.round(Math.min(Math.max(them.durability, you.durability * band.hpLo), you.durability * band.hpHi)),
    accel: Math.round(Math.min(Math.max(them.accel, you.accel * band.aLo), you.accel * band.aHi)),
  };
}
