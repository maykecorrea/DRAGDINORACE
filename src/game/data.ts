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
  exclusive?: {
    signature: string;
    prompt: string;
    name: string;
    image: string;
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
  { id: "vex", name: "VEX-REX", car: "Cromo Mandíbula", sprite: 0, line: "Mandíbula de trem de pouso. O reator é sucata de nave." },
  { id: "nyx", name: "NYXATOPS", car: "Franja Holo", sprite: 1, line: "Três antenas de casco. O visor é vidro de cockpit rachado." },
  { id: "geck", name: "GECK-404", car: "Lagarto Glitch", sprite: 2, line: "Braço de servo. Cauda de cabo. Se errar a segunda, já era." },
  { id: "lua", name: "LUA-PTERO", car: "Asa de Taxa", sprite: 3, line: "Asa de vela solar. O bico é um bocal de propulsor." },
  { id: "shell", name: "SHELLNAKAMOTO", car: "Casco Gênesis", sprite: 4, line: "O casco é casco de nave. Rebite, faixa e vigia." },
  { id: "claw", name: "HYPECLAW", car: "Garra WAGMI", sprite: 5, line: "Garra de bocal. Manta térmica em cima do reator." },
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
    talk: "ngmi se você acertar o verde.",
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
    label: "Hype",
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
    label: "Hodl",
    talk: "Não vende na terceira. Eu chego inteiro.",
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
    label: "Taxa",
    talk: "Segura o nitro que a asa cobra juros.",
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
  { driverId: "geck", rarity: "Normal", cost: 160, note: "Barato, nervoso, erra a segunda e some." },
  { driverId: "claw", rarity: "Normal", cost: 190, note: "Largada de garra. Sai na frente ou não sai." },
  { driverId: "nyx", rarity: "Normal", cost: 440, note: "Três chifres e uma janela estreita." },
  { driverId: "lua", rarity: "Normal", cost: 480, note: "A asa cobra a taxa no nitro." },
  { driverId: "shell", rarity: "Normal", cost: 720, note: "Pode ir na frente. Ele chega inteiro." },
  { driverId: "vex", rarity: "Normal", cost: 180, note: "Para-choque de costela. Simples, de frente.", name: "COSTELA", image: "/game/normal/car-costela.jpg" },
  { driverId: "geck", rarity: "Normal", cost: 200, note: "Cunha baixa. Uma fenda âmbar no lugar do vidro.", name: "FENDA", image: "/game/normal/car-fenda.jpg" },
  { driverId: "nyx", rarity: "Normal", cost: 220, note: "Nariz de broca. Vigia redonda, ferrugem.", name: "BROCA", image: "/game/normal/car-broca.jpg" },
  { driverId: "lua", rarity: "Normal", cost: 240, note: "Capô de balde. Faixa de perigo, brilho roxo.", name: "BALDE", image: "/game/normal/car-balde.jpg" },
  { driverId: "claw", rarity: "Normal", cost: 260, note: "Um pino só no nariz. Dois faróis.", name: "PINO", image: "/game/normal/car-pino.jpg" },
];

export const PARTS: { key: keyof Upgrades; name: string; blurb: string }[] = [
  { key: "chassis", name: "Durabilidade", blurb: "Até onde o casco aguenta. A faixa fica mais longa." },
  { key: "engine", name: "Velocidade max", blurb: "Teto em milhas. No lendário, o Hypeclaw maxado passa de 15784 mph." },
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

const BASE_STATS: Record<DriverId, StatBlock> = {
  vex: { durability: 72, vmax: 248, accel: 74, nitroTime: 1.35, power: 82 },
  nyx: { durability: 80, vmax: 214, accel: 66, nitroTime: 1.55, power: 76 },
  geck: { durability: 46, vmax: 188, accel: 90, nitroTime: 1.05, power: 64 },
  lua: { durability: 62, vmax: 236, accel: 78, nitroTime: 2.15, power: 86 },
  shell: { durability: 94, vmax: 202, accel: 54, nitroTime: 1.5, power: 70 },
  claw: { durability: 58, vmax: 262, accel: 92, nitroTime: 1.15, power: 78 },
};

const VMAX_RARITY: Record<Rarity, number> = {
  Comum: 1,
  Normal: 1.6,
  Raro: 3.1,
  Épico: 8,
  Lendário: 45.62,
  Meme: 7.4,
};

export function resolveStats(id: DriverId, rarity: Rarity, up: Upgrades): StatBlock {
  const b = BASE_STATS[id];
  return {
    durability: b.durability + up.chassis * 8,
    vmax: b.vmax * VMAX_RARITY[rarity] * (1 + up.engine * 0.08),
    accel: b.accel + up.tires * 6,
    nitroTime: b.nitroTime + up.nitro * 0.28,
    power: b.power + up.gearbox * 7,
  };
}

export function driverById(id: DriverId): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
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
