import type { StatBlock } from "./data";
import { driveMph, kmh } from "./raceConfig";
import type { WeaponDef } from "./weapons";

/** Vida + km/h + aceleração + nitro + potência. O nitro entra em pontos para não sumir ao lado da velocidade. */
export function statPower(stats: StatBlock): number {
  return Math.round(stats.durability + kmh(driveMph(stats.vmax)) + stats.accel + stats.nitroTime * 20 + stats.power);
}

export function gunPower(def: Pick<WeaponDef, "damage" | "clip" | "cooldown"> | undefined): number {
  if (!def) return 0;
  const shots = Math.min(40, Math.max(1, def.clip));
  return Math.round((def.damage * shots) / Math.max(0.2, def.cooldown) / 12);
}

export function loadPower(naked: StatBlock, live: StatBlock, guns: Array<Pick<WeaponDef, "damage" | "clip" | "cooldown"> | undefined>): { base: number; total: number } {
  const base = statPower(naked);
  const arms = guns.reduce((sum, gun) => sum + gunPower(gun), 0);
  return { base, total: statPower(live) + arms };
}
