import type { StatBlock } from "./data";
import { PART_TIERS, type PartTier } from "./parts";
import { weaponById, weaponRole, type WeaponDef, type WeaponId } from "./weapons";

export const WEAPON_KINDS = ["mg", "missile", "homing", "poison", "ray", "ice"] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];
export const REAR_KINDS = ["tail", "mine", "leech", "bile", "spark", "frost"] as const;
export type RearKind = (typeof REAR_KINDS)[number];
export type GunKind = WeaponKind | RearKind;

export const PILOT_SLOTS = ["cranio", "lente", "garra", "bota", "ampola"] as const;
export type PilotSlot = (typeof PILOT_SLOTS)[number];

const KIND_NAME: Record<GunKind, string> = {
  mg: "Metralhadora",
  missile: "Míssil",
  homing: "Teleguiado",
  poison: "Gosma",
  ray: "Raio",
  ice: "Gelo",
  tail: "Cauda",
  mine: "Mina",
  leech: "Ventosa",
  bile: "Nuvem",
  spark: "Choque",
  frost: "Gelo de ré",
};

const SLOT_NAME: Record<PilotSlot, string> = {
  cranio: "Crânio",
  lente: "Lente",
  garra: "Garra",
  bota: "Bota",
  ampola: "Ampola",
};

const PRICE: Record<PartTier, number> = { Comum: 270, Normal: 1300, Raro: 5040, Épico: 19000, Lendário: 144000 };
const DMG: Record<PartTier, number> = { Comum: 1, Normal: 1.45, Raro: 2.1, Épico: 3.1, Lendário: 4.6 };
const CLIP: Record<PartTier, number> = { Comum: 1, Normal: 1.12, Raro: 1.28, Épico: 1.48, Lendário: 1.75 };
const COOL: Record<PartTier, number> = { Comum: 1, Normal: 0.94, Raro: 0.86, Épico: 0.78, Lendário: 0.7 };

const GUN: Record<WeaponKind, Record<PartTier, [string, string, string]>> = {
  mg: {
    Comum: ["Prego duplo", "Jato de lata", "Boca de prego"],
    Normal: ["Gêmeas de sucata", "Costela automática", "Dente de rua"],
    Raro: ["Presa ciano", "Mandíbula gêmea", "Chuva de rebite"],
    Épico: ["Serra de plasma", "Asa de chumbo", "Boca do ptero"],
    Lendário: ["Jurássico duplo", "Coroa de prego", "Trono de fogo"],
  },
  missile: {
    Comum: ["Osso oco", "Lata cheia", "Foguete de prego"],
    Normal: ["Costela voadora", "Tubo de brasa", "Dardo de sucata"],
    Raro: ["Presa de cometa", "Crânio-foguete", "Lança de íon"],
    Épico: ["Asa que racha", "Ovo de plasma", "Coração de nave"],
    Lendário: ["Fóssil-sol", "Cetro que estoura", "Rex-míssil"],
  },
  homing: {
    Comum: ["Mosca de cabo", "Olho torto", "Isca de gosma"],
    Normal: ["Cauda que segue", "Nariz de cão", "Pupa teimosa"],
    Raro: ["Vaga-lume ácido", "Abelha de osso", "Ventosa ciano"],
    Épico: ["Anjo de sucata", "Mariposa de plasma", "Caçador de órbita"],
    Lendário: ["Cometa fiel", "Juramento de rex", "Olho que não erra"],
  },
  poison: {
    Comum: ["Jato verde", "Bolha de lodo", "Fruta ácida"],
    Normal: ["Gosma de rua", "Gota de víbora", "Ovo verde"],
    Raro: ["Bolha ciano", "Chuvisco de meteoro", "Ampola viva"],
    Épico: ["Coração roxo", "Nuvem de ptero", "Seiva de nave"],
    Lendário: ["Gosma estelar", "Neblina fóssil", "Beijo de cometa"],
  },
  ray: {
    Comum: ["Faísca de cabo", "Estalo de osso", "Fio pelado"],
    Normal: ["Arco de sucata", "Dente de raio", "Língua azul"],
    Raro: ["Vértebra elétrica", "Lança ciano", "Olho em curto"],
    Épico: ["Asa de tempestade", "Coroa de plasma", "Grito de nave"],
    Lendário: ["Sol partido", "Raio do rex", "Aurora fóssil"],
  },
  ice: {
    Comum: ["Sopro frio", "Lasca de osso", "Gota branca"],
    Normal: ["Dente de gelo", "Canino pálido", "Selo de rua"],
    Raro: ["Presa de inverno", "Cristal ciano", "Beijo parado"],
    Épico: ["Asa de geada", "Coração de quartzo", "Prisão de ptero"],
    Lendário: ["Cometa branco", "Trono gelado", "Era do fóssil"],
  },
};

const REAR_GUN: Record<RearKind, Record<PartTier, [string, string, string]>> = {
  tail: {
    Comum: ["Unha no escape", "Jato de cauda", "Prego virado"],
    Normal: ["Costela de ré", "Dente no retrovisor", "Gêmeas de trás"],
    Raro: ["Presa no vácuo", "Mandíbula de cauda", "Chuva invertida"],
    Épico: ["Serra no rastro", "Asa que cospe", "Boca do retrovisor"],
    Lendário: ["Jurássico de ré", "Coroa no escape", "Trono que responde"],
  },
  mine: {
    Comum: ["Osso no chão", "Lata que fica", "Prego plantado"],
    Normal: ["Costela armada", "Brasa no rastro", "Sucata semeada"],
    Raro: ["Cometa parado", "Crânio no asfalto", "Íon enterrado"],
    Épico: ["Ovo que espera", "Asa minada", "Coração no vácuo"],
    Lendário: ["Sol no chão", "Cetro plantado", "Rex que fica"],
  },
  leech: {
    Comum: ["Mosca de ré", "Olho no espelho", "Isca de cauda"],
    Normal: ["Cauda faminta", "Nariz pra trás", "Pupa no rastro"],
    Raro: ["Vaga-lume de ré", "Abelha do vácuo", "Ventosa de cauda"],
    Épico: ["Anjo invertido", "Mariposa de ré", "Caçador do espelho"],
    Lendário: ["Cometa de cauda", "Juramento de ré", "Olho no retrovisor"],
  },
  bile: {
    Comum: ["Jato no ar", "Bolha de cauda", "Fruto no rastro"],
    Normal: ["Gosma de ré", "Gota no vácuo", "Ovo no escape"],
    Raro: ["Bolha de cauda", "Chuvisco de ré", "Ampola no ar"],
    Épico: ["Coração no rastro", "Nuvem de cauda", "Seiva de ré"],
    Lendário: ["Neblina de ré", "Neblina no vácuo", "Beijo de cauda"],
  },
  spark: {
    Comum: ["Faísca de ré", "Estalo no escape", "Fio pra trás"],
    Normal: ["Arco de cauda", "Dente no rastro", "Língua de ré"],
    Raro: ["Vértebra de ré", "Lança no espelho", "Curto no vácuo"],
    Épico: ["Asa de ré", "Coroa no escape", "Grito pra trás"],
    Lendário: ["Sol de cauda", "Raio de ré", "Aurora no rastro"],
  },
  frost: {
    Comum: ["Sopro de ré", "Lasca no asfalto", "Gota pra trás"],
    Normal: ["Dente no rastro", "Canino de cauda", "Selo no chão"],
    Raro: ["Presa de ré", "Cristal no vácuo", "Beijo no escape"],
    Épico: ["Asa no chão", "Quartzo de cauda", "Prisão de ré"],
    Lendário: ["Cometa no asfalto", "Trono de ré", "Era no rastro"],
  },
};

const KIT: Record<PilotSlot, Record<PartTier, [string, string, string]>> = {
  cranio: {
    Comum: ["Testa de lata", "Casca oca", "Osso na testa"],
    Normal: ["Elmo de costela", "Fronte rebitada", "Queixo alto"],
    Raro: ["Elmo de gosma", "Testa de escama", "Crânio ciano"],
    Épico: ["Elmo de órbita", "Fronte de plasma", "Coroa quebrada"],
    Lendário: ["Elmo do jurássico", "Testa solar", "Crânio-rei"],
  },
  lente: {
    Comum: ["Caco de vigia", "Olho embaçado", "Vidro de garrafa"],
    Normal: ["Mira de cabo", "Íris de rua", "Lente de osso"],
    Raro: ["Olho de cometa", "Visor de íon", "Íris ácida"],
    Épico: ["Olho de nave", "Visor ptero", "Lente de quartzo"],
    Lendário: ["Íris do rex", "Visor estelar", "Olho que vê a reta"],
  },
  garra: {
    Comum: ["Unha de lata", "Dedo de cabo", "Luva rasgada"],
    Normal: ["Punho de sucata", "Garra de costela", "Mão rebitada"],
    Raro: ["Garra de plasma", "Punho de meteoro", "Mão ciano"],
    Épico: ["Garra alada", "Punho de forja", "Mão de vértebra"],
    Lendário: ["Garra-rei", "Punho fóssil", "Mão que arranca a marcha"],
  },
  bota: {
    Comum: ["Chinelo de lata", "Sola gasta", "Pé de osso"],
    Normal: ["Bota de esteira", "Salto de rebite", "Sola de dente"],
    Raro: ["Bota de íon", "Sola de lava", "Pé de flutuação"],
    Épico: ["Bota de impulso", "Sola de nave", "Pé que sai na frente"],
    Lendário: ["Bota-cometa", "Sola do rex", "Pé que não espera"],
  },
  ampola: {
    Comum: ["Gota no bolso", "Frasco amassado", "Gota morna"],
    Normal: ["Ampola de gosma", "Frasco no cinto", "Gota verde"],
    Raro: ["Ampola roxa", "Frasco de íon", "Gota que segura"],
    Épico: ["Ampola de órbita", "Frasco violeta", "Gota de ptero"],
    Lendário: ["Ampola solar", "Frasco de estrela", "Gota que não acaba"],
  },
};

const KIT_BASE: Record<PilotSlot, Record<PartTier, number>> = {
  cranio: { Comum: 4, Normal: 10, Raro: 22, Épico: 36, Lendário: 58 },
  lente: { Comum: 0.02, Normal: 0.045, Raro: 0.08, Épico: 0.12, Lendário: 0.18 },
  garra: { Comum: 3, Normal: 8, Raro: 16, Épico: 28, Lendário: 44 },
  bota: { Comum: 3, Normal: 8, Raro: 16, Épico: 26, Lendário: 40 },
  ampola: { Comum: 0.08, Normal: 0.2, Raro: 0.36, Épico: 0.58, Lendário: 0.9 },
};

function money(tier: PartTier, which: number, weight: number): number {
  const mul = which === 1 ? 0.75 : which === 2 ? 1.35 : 1;
  return Math.max(10, Math.round((PRICE[tier] * weight * mul) / 10) * 10);
}

function shapeNum(slot: PilotSlot, value: number): number {
  if (slot === "lente") return Math.round(value * 1000) / 1000;
  if (slot === "ampola") return Math.round(value * 100) / 100;
  return Math.max(1, Math.round(value));
}

export type ArmPiece = {
  id: string;
  kind: GunKind;
  face: "frontal" | "traseira";
  tier: PartTier;
  name: string;
  cost: number;
  blurb: string;
  weapon: WeaponDef;
};

export type KitPiece = {
  id: string;
  slot: PilotSlot;
  tier: PartTier;
  name: string;
  cost: number;
  bonus: number;
  blurb: string;
};

function gunBlurb(_base: WeaponDef, next: WeaponDef, which: 0 | 1 | 2): string {
  const pace = which === 1 ? "pente longo, soco menor" : which === 2 ? "soco maior, pente curto" : "pente no meio";
  return `${next.name}. ${pace}. ${next.damage} de dano, ${next.clip} tiros, espera ${next.cooldown.toFixed(2)}s. ${weaponRole(next)}.`;
}

function buildGun(kind: GunKind, tier: PartTier, which: 0 | 1 | 2): ArmPiece {
  const base = weaponById(kind);
  const punch = which === 1 ? 0.82 : which === 2 ? 1.22 : 1;
  const ammo = which === 1 ? 1.25 : which === 2 ? 0.8 : 1;
  const wait = which === 1 ? 0.9 : which === 2 ? 1.08 : 1;
  const damage = Math.max(1, Math.round(base.damage * DMG[tier] * punch));
  const clip = Math.max(1, Math.round(base.clip * CLIP[tier] * ammo));
  const cooldown = Math.round(base.cooldown * COOL[tier] * wait * 100) / 100;
  const poison = base.poison > 0 ? Math.max(1, Math.round(base.poison * DMG[tier] * punch)) : 0;
  const table = kind in GUN ? GUN[kind as WeaponKind] : REAR_GUN[kind as RearKind];
  const weapon: WeaponDef = { ...base, name: table[tier][which], damage, clip, cooldown, poison };
  const id = which === 0 ? `arm-${kind}-${tier}` : `arm-${kind}-${tier}-${which + 1}`;
  return {
    id,
    kind,
    face: base.class === "traseira" ? "traseira" : "frontal",
    tier,
    name: weapon.name,
    cost: money(tier, which, base.class === "traseira" ? 1.15 : 1.25),
    blurb: gunBlurb(base, weapon, which),
    weapon,
  };
}

function kitBlurb(slot: PilotSlot, bonus: number): string {
  if (slot === "cranio") return `+${bonus} de vida no piloto.`;
  if (slot === "lente") return `+${(bonus * 100).toFixed(1)}% de velocidade máxima.`;
  if (slot === "garra") return `+${bonus} de potência.`;
  if (slot === "bota") return `+${bonus} de aceleração.`;
  return `+${bonus.toFixed(2)}s de nitro.`;
}

function buildKit(slot: PilotSlot, tier: PartTier, which: 0 | 1 | 2): KitPiece {
  const punch = which === 1 ? 0.78 : which === 2 ? 1.2 : 1;
  const bonus = shapeNum(slot, KIT_BASE[slot][tier] * punch);
  const id = which === 0 ? `kit-${slot}-${tier}` : `kit-${slot}-${tier}-${which + 1}`;
  return {
    id,
    slot,
    tier,
    name: KIT[slot][tier][which],
    cost: money(tier, which, 0.9),
    bonus,
    blurb: kitBlurb(slot, bonus),
  };
}

export const ARMS: ArmPiece[] = [...WEAPON_KINDS, ...REAR_KINDS].flatMap((kind) =>
  PART_TIERS.flatMap((tier) => [0, 1, 2].map((which) => buildGun(kind, tier, which as 0 | 1 | 2))),
);

export const KITS: KitPiece[] = PILOT_SLOTS.flatMap((slot) =>
  PART_TIERS.flatMap((tier) => [0, 1, 2].map((which) => buildKit(slot, tier, which as 0 | 1 | 2))),
);

const ARM_ART: Record<string, string> = {
  "arm-mg-Comum": "/game/arms/prego-duplo.png?v=2",
  "arm-mg-Comum-2": "/game/arms/cuspe-lata.png",
  "arm-mg-Comum-3": "/game/arms/boca-prego.png",
  "arm-mg-Normal": "/game/arms/gemeas-sucata.png",
  "arm-mg-Normal-2": "/game/arms/costela-automatica.png",
  "arm-mg-Normal-3": "/game/arms/dente-rua.png",
  "arm-mg-Raro": "/game/arms/presa-ciano.png",
  "arm-mg-Raro-2": "/game/arms/mandibula-gemea.png",
  "arm-mg-Raro-3": "/game/arms/chuva-rebite.png",
  "arm-missile-Comum": "/game/arms/osso-oco.png",
  "arm-missile-Comum-2": "/game/arms/lata-cheia.png",
  "arm-missile-Comum-3": "/game/arms/foguete-prego.png",
  "arm-missile-Normal": "/game/arms/costela-voadora.png",
  "arm-missile-Normal-2": "/game/arms/tubo-brasa.png",
  "arm-missile-Normal-3": "/game/arms/dardo-sucata.png",
  "arm-missile-Raro": "/game/arms/presa-cometa.png",
  "arm-missile-Raro-2": "/game/arms/cranio-foguete.png",
  "arm-missile-Raro-3": "/game/arms/lanca-ion.png?v=2",
  "arm-homing-Comum": "/game/arms/mosca-cabo.png",
  "arm-homing-Comum-2": "/game/arms/olho-torto.png",
  "arm-homing-Comum-3": "/game/arms/isca-gosma.png",
  "arm-homing-Normal": "/game/arms/cauda-segue.png",
  "arm-homing-Normal-2": "/game/arms/nariz-cao.png",
  "arm-homing-Normal-3": "/game/arms/pupa-teimosa.png",
  "arm-homing-Raro": "/game/arms/vaga-lume.png",
  "arm-homing-Raro-2": "/game/arms/abelha-osso.png",
  "arm-homing-Raro-3": "/game/arms/sanguessuga-ciano.png",
  "arm-poison-Comum": "/game/arms/cuspe-verde.png",
  "arm-poison-Comum-2": "/game/arms/bolha-lodo.png",
  "arm-poison-Comum-3": "/game/arms/fruto-podre.png",
  "arm-poison-Normal": "/game/arms/bile-rua.png",
  "arm-poison-Normal-2": "/game/arms/gota-vibora.png",
  "arm-poison-Normal-3": "/game/arms/ovo-azedo.png",
  "arm-poison-Raro": "/game/arms/glandula-ciano.png",
  "arm-poison-Raro-2": "/game/arms/esputo-meteoro.png",
  "arm-poison-Raro-3": "/game/arms/ampola-viva.png",
  "arm-ray-Comum": "/game/arms/faisca-cabo.png",
  "arm-ray-Comum-2": "/game/arms/estalo-osso.png",
  "arm-ray-Comum-3": "/game/arms/fio-pelado.png",
  "arm-ray-Normal-2": "/game/arms/dente-raio.png",
  "arm-ray-Normal-3": "/game/arms/lingua-azul.png",
  "arm-ray-Raro": "/game/arms/vertebra-eletrica.png",
  "arm-ray-Raro-2": "/game/arms/lanca-ciano.png",
  "arm-ray-Raro-3": "/game/arms/olho-em-curto.png",
  "arm-ice-Comum": "/game/arms/sopro-frio.png",
  "arm-ice-Comum-2": "/game/arms/lasca-osso.png",
  "arm-ice-Comum-3": "/game/arms/gota-branca.png",
  "arm-ice-Normal": "/game/arms/dente-gelo.png",
  "arm-ice-Normal-2": "/game/arms/canino-palido.png",
  "arm-ice-Normal-3": "/game/arms/selo-rua.png",
  "arm-ice-Raro": "/game/arms/presa-inverno.png",
  "arm-ice-Raro-2": "/game/arms/cristal-ciano.png",
  "arm-ice-Raro-3": "/game/arms/beijo-parado.png",
  "arm-ice-Lendário": "/game/arms/cometa-branco.png",
  "arm-ice-Épico": "/game/arms/asa-geada.png",
  "arm-ice-Épico-2": "/game/arms/coracao-quartzo.png",
  "arm-ice-Épico-3": "/game/arms/prisao-ptero.png",
  "arm-missile-Épico": "/game/arms/asa-racha.png",
  "arm-missile-Épico-2": "/game/arms/ovo-plasma.png",
  "arm-missile-Épico-3": "/game/arms/coracao-nave.png",
  "arm-poison-Épico": "/game/arms/coracao-roxo.png",
  "arm-homing-Épico": "/game/arms/anjo-sucata.png",
  "arm-homing-Épico-2": "/game/arms/mariposa-plasma.png",
  "arm-mg-Épico": "/game/arms/serra-plasma.png",
  "arm-mg-Épico-2": "/game/arms/asa-chumbo.png",
  "arm-mg-Épico-3": "/game/arms/boca-ptero.png",
  "arm-ray-Épico": "/game/arms/asa-tempestade.png",
  "arm-ray-Épico-2": "/game/arms/coroa-plasma.png",
  "arm-ray-Épico-3": "/game/arms/grito-nave.png",
  "arm-poison-Épico-2": "/game/arms/nuvem-ptero.png",
  "arm-poison-Épico-3": "/game/arms/seiva-nave.png",
  "arm-homing-Épico-3": "/game/arms/cacador-orbita.png",
  "arm-mg-Lendário": "/game/arms/jurassico-duplo.png",
  "arm-mg-Lendário-2": "/game/arms/coroa-prego.png",
  "arm-mg-Lendário-3": "/game/arms/trono-fogo.png",
  "arm-missile-Lendário": "/game/arms/fossil-sol.png",
  "arm-missile-Lendário-2": "/game/arms/cetro-estoura.png",
  "arm-missile-Lendário-3": "/game/arms/rex-missil.png",
  "arm-homing-Lendário": "/game/arms/cometa-fiel.png",
  "arm-homing-Lendário-2": "/game/arms/juramento-rex.png",
  "arm-homing-Lendário-3": "/game/arms/olho-nao-erra.png",
  "arm-poison-Lendário": "/game/arms/bilis-estelar.png",
  "arm-poison-Lendário-2": "/game/arms/praga-fossil.png",
  "arm-poison-Lendário-3": "/game/arms/beijo-cometa.png",
  "arm-ray-Normal": "/game/arms/arco-sucata.png",
  "arm-ray-Lendário": "/game/arms/sol-partido.png",
  "arm-ray-Lendário-2": "/game/arms/raio-rex.png",
  "arm-ray-Lendário-3": "/game/arms/aurora-fossil.png",
  "arm-ice-Lendário-2": "/game/arms/trono-gelado.png",
  "arm-ice-Lendário-3": "/game/arms/era-fossil.png",
  "arm-tail-Comum": "/game/arms/unha-escape.png",
  "arm-tail-Comum-2": "/game/arms/cuspe-cauda.png",
  "arm-tail-Comum-3": "/game/arms/prego-virado.png",
  "arm-mine-Comum": "/game/arms/osso-chao.png",
  "arm-mine-Comum-2": "/game/arms/lata-fica.png",
  "arm-mine-Comum-3": "/game/arms/prego-plantado.png",
  "arm-leech-Comum": "/game/arms/mosca-re.png",
  "arm-leech-Comum-2": "/game/arms/olho-espelho.png",
  "arm-leech-Comum-3": "/game/arms/isca-cauda.png",
  "arm-bile-Comum": "/game/arms/cuspe-ar.png",
  "arm-bile-Comum-2": "/game/arms/bolha-cauda.png",
  "arm-bile-Comum-3": "/game/arms/fruto-rastro.png",
  "arm-spark-Comum": "/game/arms/faisca-re.png",
  "arm-spark-Comum-2": "/game/arms/estalo-escape.png",
  "arm-spark-Comum-3": "/game/arms/fio-tras.png",
  "arm-frost-Comum": "/game/arms/sopro-re.png",
  "arm-frost-Comum-2": "/game/arms/lasca-asfalto.png",
  "arm-frost-Comum-3": "/game/arms/gota-tras.png",
  "arm-tail-Normal": "/game/arms/costela-re.png",
  "arm-tail-Normal-2": "/game/arms/dente-retrovisor.png",
  "arm-tail-Normal-3": "/game/arms/gemeas-tras.png",
  "arm-tail-Raro": "/game/arms/presa-vacuo.png",
  "arm-tail-Raro-2": "/game/arms/mandibula-cauda.png",
  "arm-tail-Raro-3": "/game/arms/chuva-invertida.png",
  "arm-tail-Épico": "/game/arms/serra-rastro.png",
  "arm-tail-Épico-2": "/game/arms/asa-cospe.png",
  "arm-tail-Épico-3": "/game/arms/boca-retrovisor.png",
  "arm-tail-Lendário": "/game/arms/jurassico-re.png",
  "arm-tail-Lendário-2": "/game/arms/coroa-escape.png",
  "arm-tail-Lendário-3": "/game/arms/trono-responde.png",
  "arm-mine-Normal": "/game/arms/costela-armada.png",
  "arm-mine-Normal-2": "/game/arms/brasa-rastro.png",
  "arm-mine-Normal-3": "/game/arms/sucata-semeada.png",
  "arm-mine-Raro": "/game/arms/cometa-parado.png",
  "arm-mine-Raro-2": "/game/arms/cranio-asfalto.png",
  "arm-mine-Raro-3": "/game/arms/ion-enterrado.png",
  "arm-mine-Épico": "/game/arms/ovo-espera.png",
  "arm-mine-Épico-2": "/game/arms/asa-minada.png",
  "arm-mine-Épico-3": "/game/arms/coracao-vacuo.png",
  "arm-mine-Lendário": "/game/arms/sol-chao.png",
  "arm-mine-Lendário-2": "/game/arms/cetro-plantado.png",
  "arm-mine-Lendário-3": "/game/arms/rex-fica.png",
  "arm-leech-Normal": "/game/arms/cauda-faminta.png",
  "arm-leech-Normal-2": "/game/arms/nariz-tras.png",
  "arm-leech-Normal-3": "/game/arms/pupa-rastro.png",
  "arm-leech-Raro": "/game/arms/vaga-lume-re.png",
  "arm-leech-Raro-2": "/game/arms/abelha-vacuo.png",
  "arm-leech-Raro-3": "/game/arms/sanguessuga-cauda.png",
  "arm-leech-Épico": "/game/arms/anjo-invertido.png",
  "arm-leech-Épico-2": "/game/arms/mariposa-re.png",
  "arm-leech-Épico-3": "/game/arms/cacador-espelho.png",
  "arm-leech-Lendário": "/game/arms/cometa-cauda.png",
  "arm-leech-Lendário-2": "/game/arms/juramento-re.png",
  "arm-leech-Lendário-3": "/game/arms/olho-retrovisor.png",
  "arm-bile-Normal": "/game/arms/bile-re.png",
  "arm-bile-Normal-2": "/game/arms/gota-vacuo.png",
  "arm-bile-Normal-3": "/game/arms/ovo-escape.png",
  "arm-bile-Raro": "/game/arms/glandula-cauda.png",
  "arm-bile-Raro-2": "/game/arms/esputo-re.png",
  "arm-bile-Raro-3": "/game/arms/ampola-ar.png",
  "arm-bile-Épico": "/game/arms/coracao-rastro.png",
  "arm-bile-Épico-2": "/game/arms/nuvem-cauda.png",
  "arm-bile-Épico-3": "/game/arms/seiva-re.png",
  "arm-bile-Lendário": "/game/arms/bilis-re.png",
  "arm-bile-Lendário-2": "/game/arms/praga-vacuo.png",
  "arm-bile-Lendário-3": "/game/arms/beijo-cauda.png",
  "arm-spark-Normal": "/game/arms/arco-cauda.png",
  "arm-spark-Normal-2": "/game/arms/dente-rastro.png",
  "arm-spark-Normal-3": "/game/arms/lingua-re.png",
  "arm-spark-Raro": "/game/arms/vertebra-re.png",
  "arm-spark-Raro-2": "/game/arms/lanca-espelho.png",
  "arm-spark-Raro-3": "/game/arms/curto-vacuo.png",
  "arm-spark-Épico": "/game/arms/asa-re.png",
  "arm-spark-Épico-2": "/game/arms/coroa-escape-raio.png",
  "arm-spark-Épico-3": "/game/arms/grito-tras.png",
  "arm-spark-Lendário": "/game/arms/sol-cauda.png",
  "arm-spark-Lendário-2": "/game/arms/raio-re.png",
  "arm-spark-Lendário-3": "/game/arms/aurora-rastro.png",
  "arm-frost-Normal": "/game/arms/dente-rastro-gelo.png",
  "arm-frost-Normal-2": "/game/arms/canino-cauda.png",
  "arm-frost-Normal-3": "/game/arms/selo-chao.png",
  "arm-frost-Raro": "/game/arms/presa-re.png",
  "arm-frost-Raro-2": "/game/arms/cristal-vacuo.png",
  "arm-frost-Raro-3": "/game/arms/beijo-escape.png",
  "arm-frost-Épico": "/game/arms/asa-chao.png",
  "arm-frost-Épico-2": "/game/arms/quartzo-cauda.png",
  "arm-frost-Épico-3": "/game/arms/prisao-re.png",
  "arm-frost-Lendário": "/game/arms/cometa-asfalto.png",
  "arm-frost-Lendário-2": "/game/arms/trono-re.png",
  "arm-frost-Lendário-3": "/game/arms/era-rastro.png",
};

const KIT_ART: Record<string, string> = {
  "kit-cranio-Comum": "/game/arms/testa-lata.png",
  "kit-cranio-Comum-2": "/game/arms/casca-oca.png",
  "kit-cranio-Comum-3": "/game/arms/osso-testa.png",
  "kit-lente-Comum": "/game/arms/caco-vigia.png",
  "kit-lente-Comum-2": "/game/arms/olho-embacado.png",
  "kit-lente-Comum-3": "/game/arms/vidro-garrafa.png",
  "kit-lente-Normal": "/game/arms/mira-cabo.png",
  "kit-lente-Normal-2": "/game/arms/iris-rua.png",
  "kit-garra-Comum": "/game/arms/unha-suja.png?v=1",
  "kit-garra-Comum-2": "/game/arms/dedo-cabo.png",
  "kit-garra-Comum-3": "/game/arms/luva-rasgada.png",
  "kit-garra-Normal-2": "/game/arms/garra-costela.png",
  "kit-garra-Normal-3": "/game/arms/mao-rebitada.png",
  "kit-bota-Comum": "/game/arms/chinelo-lata.png",
  "kit-bota-Comum-2": "/game/arms/sola-comida.png",
  "kit-bota-Comum-3": "/game/arms/pe-osso.png",
  "kit-ampola-Comum": "/game/arms/pinga-bolso.png?v=2",
  "kit-ampola-Comum-2": "/game/arms/frasco-amassado.png?v=1",
  "kit-ampola-Comum-3": "/game/arms/gota-morna.png",
  "kit-cranio-Normal": "/game/arms/elmo-costela.png",
  "kit-cranio-Normal-2": "/game/arms/fronte-rebitada.png?v=2",
  "kit-cranio-Normal-3": "/game/arms/queixo-alto.png",
  "kit-lente-Normal-3": "/game/arms/lente-osso.png",
  "kit-lente-Raro": "/game/arms/olho-cometa.png",
  "kit-lente-Raro-2": "/game/arms/visor-ion.png",
  "kit-lente-Raro-3": "/game/arms/iris-acida.png",
  "kit-garra-Normal": "/game/arms/punho-sucata.png",
  "kit-garra-Épico-2": "/game/arms/punho-forja.png",
  "kit-garra-Épico-3": "/game/arms/mao-vertebra.png",
  "kit-bota-Normal": "/game/arms/bota-esteira.png",
  "kit-bota-Normal-2": "/game/arms/salto-rebite.png",
  "kit-bota-Normal-3": "/game/arms/sola-dente.png",
  "kit-bota-Raro": "/game/arms/bota-ion.png?v=2",
  "kit-ampola-Normal": "/game/arms/ampola-gosma.png",
  "kit-ampola-Normal-2": "/game/arms/frasco-cinto.png",
  "kit-ampola-Normal-3": "/game/arms/gota-verde.png",
  "kit-ampola-Raro-2": "/game/arms/frasco-ion.png",
  "kit-bota-Raro-2": "/game/arms/sola-lava.png",
  "kit-bota-Raro-3": "/game/arms/pe-flutuacao.png",
  "kit-bota-Épico": "/game/arms/bota-impulso.png",
  "kit-cranio-Raro": "/game/arms/elmo-bile.png",
  "kit-cranio-Raro-2": "/game/arms/testa-escama.png",
  "kit-cranio-Raro-3": "/game/arms/cranio-ciano.png",
  "kit-lente-Épico-3": "/game/arms/lente-quartzo.png",
  "kit-garra-Raro": "/game/arms/garra-plasma.png",
  "kit-garra-Raro-2": "/game/arms/punho-meteoro.png",
  "kit-garra-Raro-3": "/game/arms/mao-ciano.png",
  "kit-ampola-Raro-3": "/game/arms/gota-segura.png",
  "kit-ampola-Épico": "/game/arms/ampola-orbita.png",
  "kit-ampola-Épico-2": "/game/arms/frasco-violeta.png",
  "kit-ampola-Épico-3": "/game/arms/gota-ptero.png?v=1",
  "kit-cranio-Épico": "/game/arms/elmo-orbita.png?v=1",
  "kit-cranio-Épico-2": "/game/arms/fronte-plasma.png?v=1",
  "kit-cranio-Épico-3": "/game/arms/coroa-quebrada.png?v=1",
  "kit-cranio-Lendário": "/game/arms/elmo-jurassico.png?v=2",
  "kit-cranio-Lendário-2": "/game/arms/testa-solar.png?v=1",
  "kit-cranio-Lendário-3": "/game/arms/cranio-rei.png?v=2",
  "kit-lente-Épico": "/game/arms/olho-nave.png?v=1",
  "kit-lente-Épico-2": "/game/arms/visor-ptero.png?v=1",
  "kit-lente-Lendário": "/game/arms/iris-rex.png?v=2",
  "kit-lente-Lendário-2": "/game/arms/visor-estelar.png?v=2",
  "kit-lente-Lendário-3": "/game/arms/olho-reta.png?v=1",
  "kit-garra-Épico": "/game/arms/garra-alada.png?v=1",
  "kit-garra-Lendário": "/game/arms/garra-rei.png?v=2",
  "kit-garra-Lendário-2": "/game/arms/punho-fossil.png?v=2",
  "kit-garra-Lendário-3": "/game/arms/mao-arranca.png?v=1",
  "kit-bota-Épico-2": "/game/arms/sola-nave.png?v=1",
  "kit-bota-Épico-3": "/game/arms/pe-sai-frente.png?v=1",
  "kit-bota-Lendário": "/game/arms/bota-cometa.png?v=1",
  "kit-bota-Lendário-2": "/game/arms/sola-rex.png?v=2",
  "kit-bota-Lendário-3": "/game/arms/pe-nao-espera.png?v=1",
  "kit-ampola-Raro": "/game/arms/ampola-roxa.png?v=1",
  "kit-ampola-Lendário": "/game/arms/ampola-solar.png?v=1",
  "kit-ampola-Lendário-2": "/game/arms/frasco-estrela.png?v=1",
  "kit-ampola-Lendário-3": "/game/arms/gota-nao-acaba.png?v=2",
};

export function kitArt(id: string): string | undefined {
  return KIT_ART[id];
}

export function armArt(id: string): string | undefined {
  return ARM_ART[id];
}

const ARM_MAP = new Map(ARMS.map((item) => [item.id, item]));
const KIT_MAP = new Map(KITS.map((item) => [item.id, item]));

export function armById(id: string | undefined): ArmPiece | undefined {
  return id ? ARM_MAP.get(id) : undefined;
}

export function kitById(id: string | undefined): KitPiece | undefined {
  return id ? KIT_MAP.get(id) : undefined;
}

export function armsOf(tier: PartTier, kind?: GunKind | "Todos", face?: "frontal" | "traseira"): ArmPiece[] {
  return ARMS.filter(
    (item) => item.tier === tier && (kind === undefined || kind === "Todos" || item.kind === kind) && (!face || item.face === face),
  );
}

export function kitsOf(tier: PartTier, slot?: PilotSlot | "Todos"): KitPiece[] {
  return KITS.filter((item) => item.tier === tier && (slot === undefined || slot === "Todos" || item.slot === slot));
}

export function kindLabel(kind: GunKind): string {
  return KIND_NAME[kind];
}

export function pilotSlotLabel(slot: PilotSlot): string {
  return SLOT_NAME[slot];
}

export type PilotKit = Partial<Record<PilotSlot, string>>;

export function applyKit(base: StatBlock, kit?: PilotKit): StatBlock {
  let durability = base.durability;
  let vmax = base.vmax;
  let accel = base.accel;
  let nitroTime = base.nitroTime;
  let power = base.power;
  for (const id of Object.values(kit ?? {})) {
    const item = kitById(id);
    if (!item) continue;
    if (item.slot === "cranio") durability += item.bonus;
    if (item.slot === "lente") vmax *= 1 + item.bonus;
    if (item.slot === "garra") power += item.bonus;
    if (item.slot === "bota") accel += item.bonus;
    if (item.slot === "ampola") nitroTime += item.bonus;
  }
  return {
    durability: Math.round(durability),
    vmax: Math.round(vmax),
    accel: Math.round(accel),
    nitroTime: Math.round(nitroTime * 100) / 100,
    power: Math.round(power),
  };
}

export function armedDef(armId: string | undefined, frontal: string | undefined): WeaponDef {
  const piece = armById(armId);
  if (piece?.face === "frontal") return piece.weapon;
  const kind = (WEAPON_KINDS as readonly string[]).includes(frontal ?? "") ? (frontal as WeaponId) : "mg";
  return weaponById(kind);
}

export function armedRear(armId: string | undefined, rear: string | undefined): WeaponDef {
  const piece = armById(armId);
  if (piece?.face === "traseira") return piece.weapon;
  const kind = (REAR_KINDS as readonly string[]).includes(rear ?? "") ? (rear as WeaponId) : "tail";
  return weaponById(kind);
}

/** Nome que a pista e a oficina mostram. A peça equipada ganha do tipo solto. */
export function wornLabel(armId: string | undefined, kind: string | undefined, face: "frontal" | "traseira"): string {
  const piece = armById(armId);
  if (piece?.face === face) return piece.name;
  return face === "frontal" ? armedDef(armId, kind).name : armedRear(armId, kind).name;
}
