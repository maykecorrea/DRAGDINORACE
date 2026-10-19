import { weaponById, type WeaponId } from "./weapons.ts";

/** Vida do casco. O máximo é a durabilidade. Cada batida tira um pedaço. */
export function vidaMax(durability: number): number {
  return Math.max(1, Math.round(durability));
}

export function hitDamage(kind: "wall" | "bump", hpMax: number): number {
  const base = kind === "wall" ? 11 : 6;
  const scaled = base * (55 / Math.max(40, hpMax));
  return Math.max(1, Math.round(scaled));
}

const WEAPON_IDS: WeaponId[] = ["mg", "missile", "homing", "poison", "ray", "ice", "tail", "mine", "leech", "bile", "spark", "frost"];

export function hullAfter(
  durability: number,
  walls: number,
  bumps: number,
  taken?: Partial<Record<WeaponId, number>>,
  poisonTime = 0,
): { hp: number; max: number; wrecked: boolean } {
  const max = vidaMax(durability);
  const nWall = Math.max(0, Math.min(48, Math.round(walls)));
  const nBump = Math.max(0, Math.min(48, Math.round(bumps)));
  let hp = max;
  for (let i = 0; i < nWall; i++) hp -= hitDamage("wall", max);
  for (let i = 0; i < nBump; i++) hp -= hitDamage("bump", max);
  for (const id of WEAPON_IDS) {
    const hits = Math.max(0, Math.min(80, Math.round(taken?.[id] ?? 0)));
    if (hits > 0) hp -= hits * weaponById(id).damage;
  }
  const bleed = weaponById("poison").poison * Math.max(0, Math.min(60, poisonTime));
  hp -= bleed;
  hp = Math.max(0, Math.round(hp));
  return { hp, max, wrecked: hp <= 0 };
}
