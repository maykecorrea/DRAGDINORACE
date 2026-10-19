import type { NftCar, Rarity, StatBlock, Upgrades } from "./data";

export type PartTier = "Comum" | "Normal" | "Raro" | "Épico" | "Lendário";
export type PartSlot = keyof Upgrades;

export const PART_TIERS: PartTier[] = ["Comum", "Normal", "Raro", "Épico", "Lendário"];

export const TIER_COLOR: Record<PartTier, string> = {
  Comum: "#efe6d2",
  Normal: "#d6ff3f",
  Raro: "#7fd7ff",
  Épico: "#c084fc",
  Lendário: "#ffd24a",
};

/** Level where a car's own rank reaches that tier. A long grind on purpose. */
export const RANK_LEVEL: Record<PartTier, number> = {
  Comum: 1,
  Normal: 10,
  Raro: 25,
  Épico: 45,
  Lendário: 70,
};

const SLOT_NAME: Record<PartSlot, string> = {
  chassis: "Casco",
  engine: "Motor",
  tires: "Pneu",
  nitro: "Dino-Nitro",
  gearbox: "Mandíbula",
};

const TIER_NAME: Record<PartTier, Record<PartSlot, string>> = {
  Comum: { chassis: "Caixa de cabo", engine: "Turbina suja", tires: "Pneu de prego", nitro: "Garrafa de lodo", gearbox: "Engrenagem ferrugem" },
  Normal: { chassis: "Mola de costela", engine: "Bloco de osso", tires: "Disco ciano", nitro: "Sorriso verde", gearbox: "Asa de lata" },
  Raro: { chassis: "Couraça ácida", engine: "Vértebra de plasma", tires: "Pneu de flutuação", nitro: "Ampola roxa", gearbox: "Mandíbula de aço" },
  Épico: { chassis: "Tórax de nave", engine: "Forja dos crânios", tires: "Trilho de plasma", nitro: "Orbe violeta", gearbox: "Asa ptero" },
  Lendário: { chassis: "Rex de cristal", engine: "Vórtice fóssil", tires: "Órbita fóssil", nitro: "Frasco solar", gearbox: "Trono da mandíbula" },
};

const PRICE: Record<PartTier, number> = { Comum: 270, Normal: 1300, Raro: 5040, Épico: 19000, Lendário: 144000 };
const SLOT_PRICE: Record<PartSlot, number> = { chassis: 1, tires: 0.9, nitro: 1.08, engine: 1.18, gearbox: 1.28 };

const CHASSIS: Record<PartTier, number> = { Comum: 6, Normal: 14, Raro: 28, Épico: 46, Lendário: 74 };
const ENGINE: Record<PartTier, number> = { Comum: 0.04, Normal: 0.09, Raro: 0.16, Épico: 0.26, Lendário: 0.42 };
const TIRES: Record<PartTier, number> = { Comum: 4, Normal: 10, Raro: 20, Épico: 34, Lendário: 52 };
const NITRO: Record<PartTier, number> = { Comum: 0.16, Normal: 0.38, Raro: 0.66, Épico: 1.05, Lendário: 1.6 };
const GEAR: Record<PartTier, number> = { Comum: 5, Normal: 12, Raro: 24, Épico: 40, Lendário: 62 };

export type PartDef = {
  id: string;
  slot: PartSlot;
  tier: PartTier;
  name: string;
  cost: number;
  blurb: string;
  bonus: number;
};

const EXTRA: Record<PartTier, Record<PartSlot, [string, string]>> = {
  Comum: {
    chassis: ["Rede de escama", "Osso grampeado"],
    engine: ["Rádio rachado", "Vela acesa"],
    tires: ["Pneu careca", "Borracha quente"],
    nitro: ["Pinga de gosma", "Frasco cheio"],
    gearbox: ["Feixe de cabo", "Engrenagem dupla"],
  },
  Normal: {
    chassis: ["Gaiola de arame", "Colete de lata"],
    engine: ["Cárter ciano", "Brasa de osso"],
    tires: ["Aro fosco", "Aro aberto"],
    nitro: ["Gosma sem graça", "Sorriso largo"],
    gearbox: ["Asa torta", "Asa rebitada"],
  },
  Raro: {
    chassis: ["Placa de lodo", "Pele de meteoro"],
    engine: ["Fole de âmbar", "Coração de cometa"],
    tires: ["Colchão de íon", "Giro de lava"],
    nitro: ["Frasco na garra", "Sorriso de gosma"],
    gearbox: ["Queixo de cabo", "Mordida de raio"],
  },
  Épico: {
    chassis: ["Lombo de neon", "Carapaça de escama"],
    engine: ["Pulmão de samambaia", "Caldeira de crânio"],
    tires: ["Hover de osso", "Anel antigrav"],
    nitro: ["Glândula roxa", "Cálice de íon"],
    gearbox: ["Garra de cabo", "Hélice de osso"],
  },
  Lendário: {
    chassis: ["Escama de vidro", "Manto de quartzo"],
    engine: ["Fôlego de estrela", "Olho de plasma"],
    tires: ["Esteira fantasma", "Singularidade"],
    nitro: ["Bile de estrela", "Gargalo de cometa"],
    gearbox: ["Tiara de fóssil", "Cetro de vértebra"],
  },
};

function statOf(slot: PartSlot, tier: PartTier): number {
  if (slot === "chassis") return CHASSIS[tier];
  if (slot === "engine") return ENGINE[tier];
  if (slot === "tires") return TIRES[tier];
  if (slot === "nitro") return NITRO[tier];
  return GEAR[tier];
}

function shape(slot: PartSlot, value: number): number {
  if (slot === "engine") return Math.round(value * 1000) / 1000;
  if (slot === "nitro") return Math.round(value * 100) / 100;
  return Math.max(1, Math.round(value));
}

function blurbFor(slot: PartSlot, bonus: number): string {
  if (slot === "chassis") return `+${bonus} de casco.`;
  if (slot === "engine") return `+${Math.round(bonus * 100)}% de velocidade máxima.`;
  if (slot === "tires") return `+${bonus} de aceleração.`;
  if (slot === "nitro") return `+${bonus.toFixed(2)}s de nitro.`;
  return `+${bonus} de potência.`;
}

function variantBonus(slot: PartSlot, tier: PartTier, which: "low" | "high"): number {
  const base = statOf(slot, tier);
  const next = PART_TIERS[PART_TIERS.indexOf(tier) + 1];
  const cap = next ? statOf(slot, next) * 0.9 : base * 1.25;
  if (which === "low") return shape(slot, base * 0.78);
  return shape(slot, Math.min(base * 1.2, cap));
}

function priceOf(slot: PartSlot, tier: PartTier, mul: number): number {
  return Math.max(10, Math.round((PRICE[tier] * SLOT_PRICE[slot] * mul) / 10) * 10);
}

export const PARTS: PartDef[] = PART_TIERS.flatMap((tier) =>
  (Object.keys(SLOT_NAME) as PartSlot[]).flatMap((slot) => {
    const rows = [
      { id: `${slot}-${tier}`, name: TIER_NAME[tier][slot], bonus: shape(slot, statOf(slot, tier)), mul: 1 },
      { id: `${slot}-${tier}-2`, name: EXTRA[tier][slot][0], bonus: variantBonus(slot, tier, "low"), mul: 0.75 },
      { id: `${slot}-${tier}-3`, name: EXTRA[tier][slot][1], bonus: variantBonus(slot, tier, "high"), mul: 1.35 },
    ];
    return rows.map((row) => ({
      id: row.id,
      slot,
      tier,
      name: row.name,
      cost: priceOf(slot, tier, row.mul),
      bonus: row.bonus,
      blurb: blurbFor(slot, row.bonus),
    }));
  }),
);

export function partById(id: string): PartDef | undefined {
  return PARTS.find((part) => part.id === id);
}

const PART_ART: Record<string, string> = {
  "chassis-Comum": "/game/parts/caixa-comum.png",
  "chassis-Comum-2": "/game/parts/escama-comum.png",
  "chassis-Comum-3": "/game/parts/osso-comum.png",
  "engine-Comum": "/game/parts/turbina-comum.png",
  "engine-Comum-2": "/game/parts/radio-comum.png",
  "engine-Comum-3": "/game/parts/vela-comum.png",
  "tires-Comum": "/game/parts/pata-comum.png",
  "tires-Comum-2": "/game/parts/pneu-careca.png",
  "tires-Comum-3": "/game/parts/borracha-quente.png",
  "nitro-Comum": "/game/parts/garrafa-comum.png",
  "nitro-Comum-2": "/game/parts/pinga-gosma.png",
  "nitro-Comum-3": "/game/parts/frasco-cheio.png",
  "gearbox-Comum": "/game/parts/engrenagem-comum.png",
  "gearbox-Comum-2": "/game/parts/cabo-comum.png",
  "gearbox-Comum-3": "/game/parts/engrenagem-dupla.png",
  "chassis-Normal": "/game/parts/chassis-normal.png",
  "chassis-Normal-2": "/game/parts/gaiola-arame.png",
  "chassis-Normal-3": "/game/parts/colete-lata.png",
  "engine-Normal": "/game/parts/engine-normal.png",
  "engine-Normal-2": "/game/parts/bloco-frio.png",
  "engine-Normal-3": "/game/parts/bloco-quente.png",
  "tires-Normal": "/game/parts/tires-normal.png",
  "tires-Normal-2": "/game/parts/aro-fosco.png",
  "tires-Normal-3": "/game/parts/aro-aberto.png",
  "nitro-Normal": "/game/parts/nitro-normal.png",
  "nitro-Normal-2": "/game/parts/gosma-sem-graca.png",
  "nitro-Normal-3": "/game/parts/sorriso-largo.png",
  "gearbox-Normal": "/game/parts/gearbox-normal.png",
  "gearbox-Normal-2": "/game/parts/asa-torta.png",
  "gearbox-Normal-3": "/game/parts/asa-rebitada.png",
  "chassis-Raro": "/game/parts/chassis-raro.png",
  "chassis-Raro-2": "/game/parts/placa-lodo.png",
  "chassis-Raro-3": "/game/parts/lombo-neon.png",
  "tires-Raro": "/game/parts/tires-raro.png",
  "tires-Raro-2": "/game/parts/colchao-ion.png",
  "tires-Raro-3": "/game/parts/giro-lava.png",
  "gearbox-Raro": "/game/parts/gearbox-raro.png",
  "gearbox-Raro-2": "/game/parts/queixo-cabo.png",
  "gearbox-Raro-3": "/game/parts/mordida-raio.png",
  "nitro-Raro": "/game/parts/nitro-raro.png",
  "nitro-Raro-2": "/game/parts/frasco-garra.png",
  "nitro-Raro-3": "/game/parts/sorriso-gosma.png",
  "engine-Raro": "/game/parts/vertebra-plasma.png",
  "engine-Raro-2": "/game/parts/fole-ambar.png",
  "engine-Raro-3": "/game/parts/coracao-cometa.png",
  "chassis-Épico": "/game/parts/chassis-epico.png",
  "chassis-Épico-2": "/game/parts/lombo-neon-epico.png",
  "chassis-Épico-3": "/game/parts/carapaca-escama.png",
  "engine-Épico": "/game/parts/engine-epico.png",
  "engine-Épico-2": "/game/parts/pulmao-samambaia.png",
  "engine-Épico-3": "/game/parts/caldeira-cranio.png",
  "tires-Épico": "/game/parts/tires-epico.png",
  "tires-Épico-2": "/game/parts/hover-osso.png",
  "tires-Épico-3": "/game/parts/anel-antigrav.png",
  "nitro-Épico": "/game/parts/nitro-epico.png",
  "nitro-Épico-2": "/game/parts/glandula-roxa.png",
  "nitro-Épico-3": "/game/parts/calice-ion.png",
  "gearbox-Épico": "/game/parts/gearbox-epico.png",
  "gearbox-Épico-2": "/game/parts/garra-cabo.png",
  "gearbox-Épico-3": "/game/parts/helice-osso.png",
  "chassis-Lendário": "/game/parts/chassis-lendario.png",
  "chassis-Lendário-2": "/game/parts/escama-vidro.png",
  "chassis-Lendário-3": "/game/parts/manto-quartzo.png",
  "engine-Lendário": "/game/parts/engine-lendario.png",
  "engine-Lendário-2": "/game/parts/folego-estrela.png",
  "engine-Lendário-3": "/game/parts/olho-plasma.png",
  "tires-Lendário": "/game/parts/tires-lendario.png",
  "tires-Lendário-2": "/game/parts/esteira-fantasma.png",
  "tires-Lendário-3": "/game/parts/singularidade.png",
  "nitro-Lendário": "/game/parts/nitro-lendario.png",
  "nitro-Lendário-2": "/game/parts/bile-estrela.png",
  "nitro-Lendário-3": "/game/parts/gargalo-cometa.png",
  "gearbox-Lendário": "/game/parts/trono-mandibula.png",
  "gearbox-Lendário-2": "/game/parts/tiara-fossil.png",
  "gearbox-Lendário-3": "/game/parts/cetro-vertebra.png",
};

export function partArt(id: string): string | undefined {
  return PART_ART[id];
}

export function partsOfTier(tier: PartTier): PartDef[] {
  return PARTS.filter((part) => part.tier === tier);
}

function stepXp(level: number): number {
  return 20 + level * 7;
}

export function levelOf(xp: number): number {
  let level = 1;
  let left = Math.max(0, xp);
  while (level < 99) {
    const need = stepXp(level);
    if (left < need) break;
    left -= need;
    level += 1;
  }
  return level;
}

export function xpBar(xp: number): { level: number; into: number; need: number } {
  const safe = Math.max(0, xp);
  let level = 1;
  let left = safe;
  while (level < 99) {
    const need = stepXp(level);
    if (left < need) return { level, into: left, need };
    left -= need;
    level += 1;
  }
  return { level, into: 1, need: 1 };
}

export function rankOf(level: number): PartTier {
  let rank: PartTier = "Comum";
  for (const tier of PART_TIERS) {
    if (level >= RANK_LEVEL[tier]) rank = tier;
  }
  return rank;
}

export function carLevel(car: Pick<NftCar, "xp">): number {
  return levelOf(car.xp ?? 0);
}

export function carRank(car: Pick<NftCar, "xp">): PartTier {
  return rankOf(carLevel(car));
}

function tierIndex(tier: string): number {
  const found = PART_TIERS.indexOf(tier as PartTier);
  return found < 0 ? 4 : found;
}

export function canWear(car: Pick<NftCar, "rarity" | "xp">, tier: PartTier): boolean {
  const blood = car.rarity === "Meme" ? "Lendário" : car.rarity;
  return tierIndex(blood) >= tierIndex(tier) || tierIndex(carRank(car)) >= tierIndex(tier);
}

export function wearReason(car: Pick<NftCar, "rarity" | "xp">, tier: PartTier): string | null {
  if (canWear(car, tier)) return null;
  return `Exige carro ${tier} ou nível ${RANK_LEVEL[tier]}. Agora: ${car.rarity}, nível ${carLevel(car)}.`;
}

export function raceXp(win: boolean): number {
  return win ? 14 : 8;
}

export function applyGear(base: StatBlock, gear?: Partial<Record<PartSlot, string>>): StatBlock {
  let durability = base.durability;
  let vmax = base.vmax;
  let accel = base.accel;
  let nitroTime = base.nitroTime;
  let power = base.power;
  for (const id of Object.values(gear ?? {})) {
    if (!id) continue;
    const part = partById(id);
    if (!part) continue;
    if (part.slot === "chassis") durability += part.bonus;
    if (part.slot === "engine") vmax *= 1 + part.bonus;
    if (part.slot === "tires") accel += part.bonus;
    if (part.slot === "nitro") nitroTime += part.bonus;
    if (part.slot === "gearbox") power += part.bonus;
  }
  return {
    durability: Math.round(durability),
    vmax: Math.round(vmax),
    accel: Math.round(accel),
    nitroTime: Math.round(nitroTime * 100) / 100,
    power: Math.round(power),
  };
}

export function slotLabel(slot: PartSlot): string {
  return SLOT_NAME[slot];
}

export function rarityRank(rarity: Rarity): PartTier {
  return rarity === "Meme" ? "Lendário" : (PART_TIERS.includes(rarity as PartTier) ? (rarity as PartTier) : "Comum");
}
