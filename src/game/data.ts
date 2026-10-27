import { applyGear } from "./parts";
import { applyKit, type PilotKit } from "./armory";

export type DriverId = "vex" | "nyx" | "geck" | "lua" | "shell" | "claw";

export type Upgrades = {
  engine: number;
  gearbox: number;
  nitro: number;
  tires: number;
  chassis: number;
};

export type Rarity = "Comum" | "Normal" | "Raro" | "Épico" | "Lendário" | "Meme";

export type NftCar = {
  tokenId: string;
  driverId: DriverId;
  rarity: Rarity;
  paint: string;
  neon: string;
  charm: string;
  upgrades: Upgrades;
  xp?: number;
  gear?: Partial<Record<keyof Upgrades, string>>;
  hull?: { hp: number; max: number; wrecked: boolean; at: number };
  exclusive?: {
    signature: string;
    prompt: string;
    name: string;
    image: string;
    modelId?: string;
    reveal?: string;
  };
};

export type Driver = {
  id: DriverId;
  name: string;
  car: string;
  sprite: number;
  line: string;
};

export const DRIVERS: Driver[] = [
  { id: "vex", name: "VEX-REX", car: "Cromo Mandíbula", sprite: 0, line: "Rex Navalha na pista. Mandíbula de trem de pouso e reator de nave." },
  { id: "nyx", name: "NYXATOPS", car: "Franja Holo", sprite: 1, line: "Três antenas no casco. O visor é vidro de cabine rachado." },
  { id: "geck", name: "GECK-404", car: "Lagarto Glitch", sprite: 2, line: "Braço de robô e cauda de cabo. Errou a segunda marcha, já era." },
  { id: "lua", name: "LUA-PTERO", car: "Asa de Taxa", sprite: 3, line: "Asa de vela solar. O bico é um bocal de foguete." },
  { id: "shell", name: "SHELLNAKAMOTO", car: "Casco Gênesis", sprite: 4, line: "O casco é casco de nave. Rebite, faixa e janelinha." },
  { id: "claw", name: "HYPECLAW", car: "Garra WAGMI", sprite: 5, line: "Garra de bocal. Manta térmica em cima do motor." },
];

export const BONUS: Record<DriverId, Upgrades> = {
  vex: { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 },
  nyx: { engine: 0, gearbox: 1, nitro: 0, tires: 1, chassis: 0 },
  geck: { engine: 0, gearbox: 0, nitro: 1, tires: 0, chassis: 0 },
  lua: { engine: 1, gearbox: 0, nitro: 1, tires: 0, chassis: 0 },
  shell: { engine: 1, gearbox: 1, nitro: 0, tires: 0, chassis: 2 },
  claw: { engine: 0, gearbox: 0, nitro: 0, tires: 2, chassis: 0 },
};

export type RivalId = "geck" | "claw" | "nyx" | "shell" | "lua";

export type Rival = {
  id: RivalId;
  driver: DriverId;
  label: string;
  talk: string;
  build: Upgrades;
  reaction: number;
  shiftAt: number;
  jitter: number;
  nitroGear: number;
  launch: number;
};

export const RIVALS: Rival[] = [
  {
    id: "geck",
    driver: "geck",
    label: "Rua",
    talk: "Acertou o verde? Mesmo assim eu chego antes.",
    build: { engine: 0, gearbox: 0, nitro: 1, tires: 0, chassis: 0 },
    reaction: 0.34,
    shiftAt: 0.78,
    jitter: 0.08,
    nitroGear: 2,
    launch: 0.7,
  },
  {
    id: "claw",
    driver: "claw",
    label: "Agito",
    talk: "Eu saio na frente. Você que tente me ver.",
    build: { engine: 1, gearbox: 0, nitro: 1, tires: 2, chassis: 0 },
    reaction: 0.2,
    shiftAt: 0.86,
    jitter: 0.05,
    nitroGear: 3,
    launch: 0.78,
  },
  {
    id: "nyx",
    driver: "nyx",
    label: "Precisão",
    talk: "Minha janela é mais estreita que a sua desculpa.",
    build: { engine: 1, gearbox: 2, nitro: 1, tires: 1, chassis: 0 },
    reaction: 0.12,
    shiftAt: 0.93,
    jitter: 0.02,
    nitroGear: 3,
    launch: 0.76,
  },
  {
    id: "shell",
    driver: "shell",
    label: "Firme",
    talk: "Eu não troco na pressa. Chego inteiro.",
    build: { engine: 1, gearbox: 1, nitro: 1, tires: 0, chassis: 1 },
    reaction: 0.26,
    shiftAt: 0.95,
    jitter: 0.03,
    nitroGear: 4,
    launch: 0.66,
  },
  {
    id: "lua",
    driver: "lua",
    label: "Asa",
    talk: "Segura o nitro, que a minha asa é mais rápida.",
    build: { engine: 1, gearbox: 1, nitro: 2, tires: 1, chassis: 0 },
    reaction: 0.18,
    shiftAt: 0.9,
    jitter: 0.04,
    nitroGear: 3,
    launch: 0.74,
  },
];

export const PAINTS = ["Osso", "Petróleo", "Magma", "Cromo", "Ácido"] as const;
export const NEONS = ["ácido", "magma", "gelo", "hype"] as const;
export const CHARMS = ["crânio", "ovo", "moeda", "corrente"] as const;

export const NEON_HEX: Record<(typeof NEONS)[number], string> = {
  ácido: "#d6ff3f",
  magma: "#ff3b1f",
  gelo: "#d5fff4",
  hype: "#ff7ad9",
};

export const UPGRADE_COST = [70, 160, 290, 480];
export const MINT_COST = 260;
export const MAX_LEVEL = 4;

export const CATALOG: { driverId: DriverId; rarity: Rarity; cost: number; note: string; name?: string; image?: string }[] = [
  { driverId: "geck", rarity: "Normal", cost: 160, note: "Calha aberta. A gosma verde escorre no teto.", name: "CALHA", image: "/game/normal/car-calha.png?v=9" },
  { driverId: "claw", rarity: "Normal", cost: 190, note: "O aerofólio é um gancho. Dois faróis.", name: "GANCHO", image: "/game/normal/car-gancho.png?v=9" },
  { driverId: "nyx", rarity: "Normal", cost: 210, note: "A cabine é um tambor. Uma janelinha só.", name: "TAMBOR", image: "/game/normal/car-tambor.png?v=9" },
  { driverId: "lua", rarity: "Normal", cost: 240, note: "Roda de válvula no teto. Vaza brilho roxo.", name: "VÁLVULA", image: "/game/normal/car-valvula.png?v=9" },
  { driverId: "shell", rarity: "Normal", cost: 280, note: "Viga de escora no porta-malas. Boca de osso.", name: "ESCORA", image: "/game/normal/car-escora.png?v=9" },
  { driverId: "vex", rarity: "Normal", cost: 180, note: "Para-choque de costela. Simples e de frente.", name: "COSTELA", image: "/game/normal/car-costela.png?v=8" },
  { driverId: "geck", rarity: "Normal", cost: 200, note: "Cunha baixa. Uma fenda âmbar no lugar do vidro.", name: "FENDA", image: "/game/normal/car-fenda.png?v=9" },
  { driverId: "nyx", rarity: "Normal", cost: 220, note: "Nariz de broca. Janelinha redonda e ferrugem.", name: "BROCA", image: "/game/normal/car-broca.png?v=9" },
  { driverId: "lua", rarity: "Normal", cost: 250, note: "Capô de balde. Faixa de perigo e brilho roxo.", name: "BALDE", image: "/game/normal/car-balde.png?v=3" },
  { driverId: "claw", rarity: "Normal", cost: 260, note: "Um pino só no nariz. Dois faróis.", name: "PINO", image: "/game/normal/car-pino.png?v=10" },
];

export const PARTS: { key: keyof Upgrades; name: string; blurb: string }[] = [
  { key: "chassis", name: "Vida", blurb: "O casco. A faixa fica mais longa e a parede dói menos." },
  { key: "engine", name: "Velocidade máxima", blurb: "Teto de velocidade. Só o lendário, com o motor no máximo, passa de 25402 km/h." },
  { key: "tires", name: "Aceleração", blurb: "O quanto o carro morde a largada e sobe de marcha." },
  { key: "nitro", name: "Tempo de nitro", blurb: "Segundos que a garrafa fica acesa." },
  { key: "gearbox", name: "Potência", blurb: "Torque na puxada e na troca." },
];

export type StatBlock = {
  durability: number;
  vmax: number;
  accel: number;
  nitroTime: number;
  power: number;
};

const TIER_STOCK: Record<Rarity, StatBlock> = {
  Comum: { durability: 50, vmax: 160, accel: 58, nitroTime: 1.05, power: 62 },
  Normal: { durability: 62, vmax: 200, accel: 68, nitroTime: 1.25, power: 74 },
  Raro: { durability: 120, vmax: 680, accel: 98, nitroTime: 1.95, power: 112 },
  Épico: { durability: 190, vmax: 2200, accel: 132, nitroTime: 2.9, power: 154 },
  Lendário: { durability: 280, vmax: 11960, accel: 172, nitroTime: 4.7, power: 204 },
  Meme: { durability: 170, vmax: 1600, accel: 120, nitroTime: 2.5, power: 140 },
};

const STAT_KEYS = ["durability", "vmax", "accel", "nitroTime", "power"] as const;

const MODEL_ORDER = [
  "calha",
  "gancho",
  "tambor",
  "valvula",
  "escora",
  "costela",
  "fenda",
  "broca",
  "balde",
  "pino",
  "prato",
  "vassoura",
  "barril",
  "gaiola",
  "lanterna",
  "telha",
  "sino",
  "placa",
  "clava",
  "vela",
  "pescoco",
  "babado",
  "bico",
  "casco",
  "cinza",
  "viuva",
  "rebite",
  "luz",
  "queixo",
  "unha",
  "friso",
  "nave",
  "medula",
  "ferrao",
  "coroa",
  "bofe",
  "neuro",
  "ronin",
  "trex",
];

function leanOf(slot: number): Partial<Record<(typeof STAT_KEYS)[number], number>> {
  const high = STAT_KEYS[slot % STAT_KEYS.length]!;
  const low = STAT_KEYS[(slot + 2) % STAT_KEYS.length]!;
  return { [high]: 1.03, [low]: 0.97 };
}

function applyLean(base: StatBlock, lean: Partial<Record<(typeof STAT_KEYS)[number], number>>): StatBlock {
  const n = (key: (typeof STAT_KEYS)[number]) => base[key] * (lean[key] ?? 1);
  return {
    durability: Math.round(n("durability")),
    vmax: Math.round(n("vmax")),
    accel: Math.round(n("accel")),
    nitroTime: Math.round(n("nitroTime") * 100) / 100,
    power: Math.round(n("power")),
  };
}

export function catalogModelId(item: { driverId: DriverId; name?: string }) {
  return (item.name ?? `${item.driverId}-loja`).toLowerCase();
}

export function stockOf(id: DriverId, rarity: Rarity, modelId?: string): StatBlock {
  const modelSlot = modelId ? MODEL_ORDER.indexOf(modelId) : -1;
  const driverSlot = ["vex", "nyx", "geck", "lua", "shell", "claw"].indexOf(id);
  const slot = modelSlot >= 0 ? modelSlot : Math.max(0, driverSlot);
  return applyLean(TIER_STOCK[rarity], leanOf(slot));
}

export function resolveStats(id: DriverId, rarity: Rarity, up: Upgrades, modelId?: string): StatBlock {
  const b = stockOf(id, rarity, modelId);
  return {
    durability: b.durability + up.chassis * 8,
    vmax: b.vmax * (1 + up.engine * 0.08),
    accel: b.accel + up.tires * 6,
    nitroTime: b.nitroTime + up.nitro * 0.28,
    power: b.power + up.gearbox * 7,
  };
}

export function liveStats(car: Pick<NftCar, "driverId" | "rarity" | "upgrades" | "exclusive" | "gear">, pilotId?: string, kit?: PilotKit): StatBlock {
  const base = applyKit(applyGear(resolveStats(car.driverId, car.rarity, car.upgrades, car.exclusive?.modelId), car.gear), kit);
  const bonus = pilotById(pilotId).bonus;
  return {
    durability: Math.round(base.durability * bonus.durability),
    vmax: Math.round(base.vmax * bonus.vmax),
    accel: Math.round(base.accel * bonus.accel),
    nitroTime: Math.round(base.nitroTime * bonus.nitroTime * 100) / 100,
    power: Math.round(base.power * bonus.power),
  };
}

export function driverById(id: DriverId): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
}

export function rarityLabel(rarity: string): string {
  return rarity === "Normal" ? "Incomum" : rarity;
}

export type PilotId =
  | "teo"
  | "vex"
  | "geck"
  | "claw"
  | "nyx"
  | "lua"
  | "shell"
  | "neuro"
  | "ronin"
  | "trex";

export type Pilot = {
  id: PilotId;
  name: string;
  grade: "Rua" | "Lendário";
  image: string;
  line: string;
  cost: number;
  bonus: StatBlock;
};

export const PILOTS: Pilot[] = [
  { id: "teo", name: "Téo", grade: "Rua", image: "/game/pilot-0.png?v=8", line: "Você mesmo no volante. Sem bônus, com coragem.", cost: 0, bonus: { durability: 1, vmax: 1, accel: 1, nitroTime: 1, power: 1 } },
  { id: "geck", name: "GECK-404", grade: "Rua", image: "/game/pilot-2.png?v=8", line: "Segura o nitro por mais tempo.", cost: 120, bonus: { durability: 1.01, vmax: 1.01, accel: 1.02, nitroTime: 1.08, power: 1.01 } },
  { id: "claw", name: "HYPECLAW", grade: "Rua", image: "/game/pilot-5.png?v=8", line: "Sai na garra. Mais aceleração.", cost: 140, bonus: { durability: 1.01, vmax: 1.01, accel: 1.08, nitroTime: 1.02, power: 1.02 } },
  { id: "nyx", name: "NYXATOPS", grade: "Rua", image: "/game/pilot-1.png?v=8", line: "Troca na hora certa. Mais potência.", cost: 180, bonus: { durability: 1.02, vmax: 1.02, accel: 1.02, nitroTime: 1.02, power: 1.08 } },
  { id: "lua", name: "LUA-PTERO", grade: "Rua", image: "/game/pilot-3.png?v=8", line: "A asa puxa o ponteiro. Mais nitro.", cost: 220, bonus: { durability: 1.02, vmax: 1.03, accel: 1.02, nitroTime: 1.06, power: 1.02 } },
  { id: "shell", name: "SHELLNAKAMOTO", grade: "Rua", image: "/game/pilot-4.png?v=8", line: "Chega inteiro. Mais casco e potência.", cost: 280, bonus: { durability: 1.1, vmax: 1.02, accel: 1.02, nitroTime: 1.02, power: 1.05 } },
  { id: "neuro", name: "NEURO", grade: "Lendário", image: "/game/legend/pilot-neuro.png?v=2", line: "Troca no milissegundo. Mais potência e nitro.", cost: 1400, bonus: { durability: 1.05, vmax: 1.03, accel: 1.05, nitroTime: 1.1, power: 1.14 } },
  { id: "ronin", name: "RONIN", grade: "Lendário", image: "/game/legend/pilot-ronin.png?v=2", line: "Aguenta a batida. O casco sobe mais.", cost: 1500, bonus: { durability: 1.14, vmax: 1.04, accel: 1.05, nitroTime: 1.05, power: 1.05 } },
  { id: "trex", name: "T-REX", grade: "Lendário", image: "/game/legend/pilot-trex.png?v=2", line: "O máximo da oficina. Quase tudo no topo.", cost: 1800, bonus: { durability: 1.08, vmax: 1.04, accel: 1.08, nitroTime: 1.08, power: 1.08 } },
];

export function pilotById(id?: string): Pilot {
  return PILOTS.find((pilot) => pilot.id === id) ?? PILOTS[0]!;
}

export function stack(a: Upgrades, b: Upgrades): Upgrades {
  return {
    engine: a.engine + b.engine,
    gearbox: a.gearbox + b.gearbox,
    nitro: a.nitro + b.nitro,
    tires: a.tires + b.tires,
    chassis: a.chassis + b.chassis,
  };
}
