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
