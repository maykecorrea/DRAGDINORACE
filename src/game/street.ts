import type { DriverId, NftCar, Rarity, Upgrades } from "./data";
import { partById, PARTS, type PartTier } from "./parts";
import { bandStats, levelBand, streetNearFrom } from "./streetBand";

/** Carros que circulam na cidade. O id é o modelo e também a chave do racha. */
export type StreetCar = {
  id: string;
  name: string;
  driver: DriverId;
  rarity: Exclude<Rarity, "Meme">;
};

const ROWS: [string, string, DriverId, StreetCar["rarity"]][] = [
  ["vex", "Cromo Mandíbula", "vex", "Comum"],
  ["nyx", "Franja Holo", "nyx", "Comum"],
  ["geck", "Lagarto Glitch", "geck", "Comum"],
  ["lua", "Asa de Taxa", "lua", "Comum"],
  ["shell", "Casco Gênesis", "shell", "Comum"],
  ["claw", "Garra WAGMI", "claw", "Comum"],
  ["calha", "CALHA", "geck", "Normal"],
  ["gancho", "GANCHO", "claw", "Normal"],
  ["tambor", "TAMBOR", "nyx", "Normal"],
  ["valvula", "VALVULA", "lua", "Normal"],
  ["escora", "ESCORA", "shell", "Normal"],
  ["costela", "COSTELA", "vex", "Normal"],
  ["fenda", "FENDA", "geck", "Normal"],
  ["broca", "BROCA", "nyx", "Normal"],
  ["balde", "BALDE", "lua", "Normal"],
  ["pino", "PINO", "claw", "Normal"],
  ["prato", "PRATO", "nyx", "Raro"],
  ["vassoura", "VASSOURA", "claw", "Raro"],
  ["barril", "BARRIL", "shell", "Raro"],
  ["gaiola", "GAIOLA", "geck", "Raro"],
  ["lanterna", "LANTERNA", "lua", "Raro"],
  ["telha", "TELHA", "vex", "Raro"],
  ["sino", "SINO", "nyx", "Raro"],
  ["placa", "PLACA", "shell", "Raro"],
  ["clava", "CLAVA", "shell", "Raro"],
  ["vela", "VELA", "vex", "Raro"],
  ["pescoco", "PESCOÇO", "lua", "Raro"],
  ["babado", "BABADO", "geck", "Raro"],
  ["bico", "BICO", "lua", "Raro"],
  ["casco", "CASCO", "shell", "Raro"],
  ["cinza", "CINZA-9", "shell", "Épico"],
  ["viuva", "VIÚVA", "lua", "Épico"],
  ["rebite", "REBITE", "nyx", "Épico"],
  ["luz", "LUZ-MORTA", "claw", "Épico"],
  ["queixo", "QUEIXO", "vex", "Épico"],
  ["unha", "CARRAPA", "claw", "Épico"],
  ["friso", "FRISO", "nyx", "Épico"],
  ["nave", "BROKEN NAVE", "vex", "Épico"],
  ["medula", "MEDULA", "vex", "Lendário"],
  ["ferrao", "FERRÃO", "claw", "Lendário"],
  ["coroa", "COROA", "nyx", "Lendário"],
  ["bofe", "BOFE", "lua", "Lendário"],
  ["neuro", "NEURO", "nyx", "Lendário"],
  ["ronin", "RONIN", "claw", "Lendário"],
  ["trex", "T-REX", "vex", "Lendário"],
];

export const STREET: StreetCar[] = ROWS.map(([id, name, driver, rarity]) => ({ id, name, driver, rarity }));

const BY_ID = new Map(STREET.map((car) => [car.id, car]));

export function streetById(id: string): StreetCar | undefined {
  return BY_ID.get(id);
}

export const CLASS_HUE: Record<Rarity, string> = {
  Comum: "#efe6d2",
  Normal: "#d6ff3f",
  Raro: "#7fd7ff",
  Épico: "#c084fc",
  Lendário: "#ffd24a",
  Meme: "#ff7ad9",
};

/** Fóssil de um racha de rua, pela classe do carro batido. */
export const STREET_PRIZE: Record<Rarity, number> = {
  Comum: 36,
  Normal: 64,
  Raro: 140,
  Épico: 380,
  Lendário: 980,
  Meme: 260,
};

/** Chance da peça cair, pela classe de quem perdeu. */
const LOOT_CHANCE: Record<Rarity, number> = {
  Lendário: 0.01,
  Épico: 0.05,
  Meme: 0.05,
  Raro: 0.2,
  Normal: 0.5,
  Comum: 0.7,
};

const PATTERN: StreetCar["rarity"][] = ["Comum", "Normal", "Raro", "Comum", "Normal", "Épico", "Lendário"];

/** Um de cada classe na rua, com lendário em ~1 a cada 7. */
export function streetAt(n: number): StreetCar {
  const tier = PATTERN[n % PATTERN.length]!;
  const list = STREET.filter((car) => car.rarity === tier);
  let seen = 0;
  for (let i = 0; i < n; i++) if (PATTERN[i % PATTERN.length] === tier) seen += 1;
  return list[seen % list.length]!;
}

/** Racha de rua na mesma classe do carro do jogador. Comum não enfrenta Épico. */
export function streetNear(rarity: string | undefined, n: number): StreetCar {
  return streetNearFrom(STREET, rarity, n);
}

export { bandStats, levelBand };

export function streetBuild(rarity: Rarity): Upgrades {
  if (rarity === "Lendário") return { engine: 3, gearbox: 2, nitro: 2, tires: 2, chassis: 2 };
  if (rarity === "Épico" || rarity === "Meme") return { engine: 2, gearbox: 1, nitro: 1, tires: 2, chassis: 0 };
  if (rarity === "Raro") return { engine: 0, gearbox: 1, nitro: 0, tires: 1, chassis: 0 };
  if (rarity === "Normal") return { engine: 1, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
  return { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
}

export function streetBot(rarity: Rarity): { reaction: number; shiftAt: number; jitter: number; launch: number; nitroGear: number } {
  if (rarity === "Lendário") return { reaction: 0.07, shiftAt: 0.96, jitter: 0.012, launch: 0.9, nitroGear: 4 };
  if (rarity === "Épico" || rarity === "Meme") return { reaction: 0.12, shiftAt: 0.93, jitter: 0.025, launch: 0.84, nitroGear: 3 };
  if (rarity === "Raro") return { reaction: 0.18, shiftAt: 0.88, jitter: 0.04, launch: 0.78, nitroGear: 3 };
  if (rarity === "Normal") return { reaction: 0.28, shiftAt: 0.82, jitter: 0.06, launch: 0.72, nitroGear: 2 };
  return { reaction: 0.42, shiftAt: 0.74, jitter: 0.1, launch: 0.62, nitroGear: 2 };
}

/** Peça aleatória da classe de quem perdeu. `null` quando a chance não cai. */
export function rollLoot(rarity: Rarity, rng: () => number = Math.random): string | null {
  if (rng() >= (LOOT_CHANCE[rarity] ?? 0)) return null;
  const tier: PartTier = rarity === "Meme" ? "Épico" : rarity;
  const pool = PARTS.filter((part) => part.tier === tier);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)]!.id;
}

export type LootTake = { id: string; name: string; slot?: keyof Upgrades };

/** Peça que o vencedor leva do perdedor: estoque primeiro, senão uma equipada. */
export function ownedLoot(save: { bin?: Record<string, number>; cars: NftCar[]; selected: string }, rng: () => number = Math.random): LootTake | null {
  const bin = Object.entries(save.bin ?? {})
    .filter(([id, n]) => (n ?? 0) > 0 && partById(id))
    .map(([id]) => id);
  if (bin.length) {
    const id = bin[Math.floor(rng() * bin.length)]!;
    return { id, name: partById(id)!.name };
  }
  const car = save.cars.find((item) => item.tokenId === save.selected);
  const gear = car?.gear;
  if (!gear) return null;
  const slots = (Object.keys(gear) as (keyof Upgrades)[]).filter((slot) => gear[slot] && partById(gear[slot]!));
  if (!slots.length) return null;
  const slot = slots[Math.floor(rng() * slots.length)]!;
  const id = gear[slot]!;
  return { id, name: partById(id)!.name, slot };
}
