export type Rng = { rngState: number };

/** mulberry32. O único aleatório do motor. Atualiza `rngState`. */
export function next(rng: Rng): number {
  let a = rng.rngState | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  rng.rngState = a >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Inteiro inclusivo. */
export function int(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(next(rng) * (hi - lo + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return next(rng) < p;
}

export function pickWeighted<T>(rng: Rng, items: { item: T; weight: number }[]): T {
  const usable = items.filter((entry) => entry.weight > 0);
  if (usable.length === 0) throw new Error("Lista vazia.");
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = next(rng) * total;
  for (const entry of usable) {
    roll -= entry.weight;
    if (roll < 0) return entry.item;
  }
  return usable[usable.length - 1]!.item;
}
