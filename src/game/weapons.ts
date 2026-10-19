export const WEAPON_CLASSES = ["frontal", "traseira"] as const;

export type WeaponClass = (typeof WEAPON_CLASSES)[number];

export type WeaponId = "mg" | "missile" | "homing" | "poison" | "ray" | "ice" | "tail" | "mine" | "leech" | "bile" | "spark" | "frost";

export type WeaponDef = {
  id: WeaponId;
  class: WeaponClass;
  name: string;
  blurb: string;
  damage: number;
  cooldown: number;
  speed: number;
  spread: number;
  hit: number;
  lock: number;
  life: number;
  poison: number;
  slow: number;
  slowTime: number;
  freeze: number;
  color: string;
  /** Pente de fábrica. A metralhadora é a régua: 125 tiros de 1 de dano. */
  clip: number;
};

export function weaponRole(def: Pick<WeaponDef, "freeze" | "slow" | "poison" | "hit">): "Dano direto" | "Controle" | "Área" {
  if (def.freeze > 0 || def.slow < 1 || def.poison > 0) return "Controle";
  if (def.hit >= 1.4) return "Área";
  return "Dano direto";
}

/** Alcance em metros da pista. O anel verde usa este número. */
export function weaponReach(def: Pick<WeaponDef, "id" | "speed" | "life">): number {
  if (def.id === "ray") return 22;
  if (def.id === "spark") return 11;
  if (def.id === "homing" || def.id === "leech") return 78;
  if (def.id === "ice" || def.id === "frost") return 18;
  if (def.id === "mine") return 6;
  return Math.max(16, Math.round(def.speed * def.life * 0.4));
}

export const FRONTAL: WeaponDef[] = [
  {
    id: "mg",
    class: "frontal",
    name: "Metralhadora dupla",
    blurb: "A de fábrica. Duas bocas, tiro curto, 1 de dano. Pente de 125.",
    damage: 1,
    cooldown: 0.14,
    speed: 78,
    spread: 0.42,
    hit: 0.5,
    lock: 0,
    life: 1.4,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#c2410c",
    clip: 125,
  },
  {
    id: "missile",
    class: "frontal",
    name: "Míssil",
    blurb: "Voa reto. Em cheio dói mais. Se passar perto, estoura com menos dano.",
    damage: 26,
    cooldown: 1.15,
    speed: 28,
    spread: 0,
    hit: 2.7,
    lock: 0,
    life: 4.6,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#ff7300",
    clip: 6,
  },
  {
    id: "homing",
    class: "frontal",
    name: "Míssil teleguiado",
    blurb: "Segura o tiro até a mira travar. Solta e ele não erra.",
    damage: 7,
    cooldown: 0.9,
    speed: 46,
    spread: 0.7,
    hit: 0.55,
    lock: 3.4,
    life: 4.2,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#7fd7ff",
    clip: 18,
  },
  {
    id: "poison",
    class: "frontal",
    name: "Bola de veneno",
    blurb: "Se acerta, sangra até o fim da corrida.",
    damage: 6,
    cooldown: 1.35,
    speed: 40,
    spread: 0.28,
    hit: 0.34,
    lock: 0,
    life: 2.4,
    poison: 4,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#b44cff",
    clip: 5,
  },
  {
    id: "ray",
    class: "frontal",
    name: "Raio",
    blurb: "Muito dano e deixa o carro lerdo. Difícil de cravar.",
    damage: 32,
    cooldown: 1.7,
    speed: 0,
    spread: 0,
    hit: 0.16,
    lock: 0,
    life: 0.12,
    poison: 0,
    slow: 0.55,
    slowTime: 2.4,
    freeze: 0,
    color: "#7af0ff",
    clip: 4,
  },
  {
    id: "ice",
    class: "frontal",
    name: "Bola de gelo",
    blurb: "Deixa o rival mais lento. O alcance é curto.",
    damage: 4,
    cooldown: 2.3,
    speed: 30,
    spread: 0.55,
    hit: 0.45,
    lock: 0,
    life: 2.8,
    poison: 0,
    slow: 0.62,
    slowTime: 2.4,
    freeze: 0,
    color: "#d7f6ff",
    clip: 4,
  },
];

export const REAR: WeaponDef[] = [
  {
    id: "tail",
    class: "traseira",
    name: "Metralhadora de cauda",
    blurb: "Cuspe curto pra trás. Quem cola no vácuo come o pente.",
    damage: 1,
    cooldown: 0.16,
    speed: 70,
    spread: 0.36,
    hit: 0.48,
    lock: 0,
    life: 0.7,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#ffb020",
    clip: 90,
  },
  {
    id: "mine",
    class: "traseira",
    name: "Mina de osso",
    blurb: "Fica parada no chão. Estoura quando passam por cima.",
    damage: 18,
    cooldown: 1.4,
    speed: 14,
    spread: 0,
    hit: 1.6,
    lock: 0,
    life: 2.2,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#ff5a1f",
    clip: 5,
  },
  {
    id: "leech",
    class: "traseira",
    name: "Sanguessuga de cauda",
    blurb: "Rouba nitro de quem vem atrás.",
    damage: 6,
    cooldown: 1.05,
    speed: 36,
    spread: 0.4,
    hit: 0.5,
    lock: 2.2,
    life: 2.4,
    poison: 0,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#ff7ad9",
    clip: 12,
  },
  {
    id: "bile",
    class: "traseira",
    name: "Nuvem de bile",
    blurb: "Se o de trás entra na nuvem, sangra até o fim.",
    damage: 5,
    cooldown: 1.5,
    speed: 18,
    spread: 0.2,
    hit: 0.4,
    lock: 0,
    life: 1.6,
    poison: 3,
    slow: 1,
    slowTime: 0,
    freeze: 0,
    color: "#c084fc",
    clip: 4,
  },
  {
    id: "spark",
    class: "traseira",
    name: "Choque de escape",
    blurb: "Trava a marcha de quem vem colado atrás.",
    damage: 22,
    cooldown: 1.9,
    speed: 0,
    spread: 0,
    hit: 0.2,
    lock: 0,
    life: 0.1,
    poison: 0,
    slow: 0.62,
    slowTime: 1.6,
    freeze: 0,
    color: "#7af0ff",
    clip: 4,
  },
  {
    id: "frost",
    class: "traseira",
    name: "Placa de gelo",
    blurb: "Deixa mais lento quem vem atrás. Alcance curto.",
    damage: 3,
    cooldown: 2.5,
    speed: 16,
    spread: 0.35,
    hit: 0.4,
    lock: 0,
    life: 1.6,
    poison: 0,
    slow: 0.66,
    slowTime: 2.2,
    freeze: 0,
    color: "#d7f6ff",
    clip: 3,
  },
];

const ALL = new Map([...FRONTAL, ...REAR].map((weapon) => [weapon.id, weapon]));

export function weaponById(id: string | undefined): WeaponDef {
  return ALL.get(id as WeaponId) ?? FRONTAL[0]!;
}

export function isWeaponId(id: string | undefined): id is WeaponId {
  return !!id && ALL.has(id as WeaponId);
}
