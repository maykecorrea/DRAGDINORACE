import type { WeaponId } from "./weapons.ts";

/** Números do duelo. Onde diverge do RACE_CONFIG, vale este. */
export const COMBAT = {
  camera: {
    padrao: "perseguicao" as const,
    alturaM: 3.2,
    recuoM: 7,
    recuoRivalAtrasM: 12,
    janelaRivalAtrasM: [0, 25] as const,
    easeEntraS: 0.4,
    easeSaiS: 0.6,
    carroY: 560,
    carroLarguraPx: 200,
    inclinacaoGraus: 6,
    quiquePx: 6,
  },
  radar: { x: 1200, y: 110, w: 56, h: 380, frenteM: 150, trasM: 60 },
  input: { bufferS: 0.12, duploToqueS: 0.25, gracaTravaS: 0.12, bloqueioCuspeS: 0.3 },
  /** Centro a centro. 0,75 m já saiu da faixa aos 0,15 s de uma troca de 0,30 s. */
  laneHit: 0.75,
  cuspe: { cadencia: 10, danoPct: 0.04, alcanceM: 60, velMs: 400, calor: 14, travaS: 1.6, esfria: 36, tirosMina: 3 },
  missil: { danoPct: 0.15, travadoPct: 0.12, lentidao: 0.12, lentoS: 0.85, travaS: 0.5, rastreioS: 0.4, velRel: 55, armaM: 6, alcanceM: 150, cd: 1.2 },
  rajada: { tiros: 5, duracaoS: 0.25, danoPct: 0.03, lentidao: 0.05, lentoS: 0.2, cd: 2, municao: 4 },
  emp: { danoPct: 0.05, velRel: 40, rastreioS: 0.3, efeitoS: 2, forca: 0.9, cd: 4 },
  mina: { danoPct: 0.18, lentidao: 0.3, lentoS: 0.8, armaS: 0.3, max: 2, vidaS: 8, cd: 2, verM: 120 },
  rastro: { comprimentoM: 40, duracaoS: 3, danoPctS: 0.02, forca: 0.8, cd: 5 },
  tiroTras: { danoPct: 0.12, lentidao: 0.12, lentoS: 0.8, velRel: 45, cd: 1.5 },
  pancada: { distM: 4, alvoPct: 0.06, muretaPct: 0.04, muretaLento: 0.2, muretaS: 0.5, atacantePct: 0.02, atacanteLento: 0.05, atacanteS: 0.3, cd: 3, erroS: 0.2, trombadaPct: 0.03 },
  escudo: { max: 100, regen: 6, pausa: 1, custo: 60, janelaS: 1.15, perfeitoS: 0.15, devolve: 30, adrenalina: 0.05, adrenalinaS: 0.5 },
  lentoMax: 0.35,
  imuneS: 0.5,
  hitStop: { dado: 0.05, sofrido: 0.07, mina: 0.08, pancada: 0.05, perfeito: 0.04, dnf: 0.15, intervalo: 0.3 },
  fimAposS: 8,
  queimadasDq: 2,
  feedS: 1.5,
  feedMax: 2,
} as const;

export type CombatKind = "cuspe" | "missil" | "rajada" | "emp" | "mina" | "rastro" | "tiroTras";

export function combatKind(id: WeaponId): CombatKind {
  if (id === "missile" || id === "homing") return "missil";
  if (id === "ray" || id === "ice") return "emp";
  if (id === "poison" || id === "mg") return "rajada";
  if (id === "mine") return "mina";
  if (id === "tail") return "tiroTras";
  return "rastro";
}

export function combatName(kind: CombatKind | "pancada" | "mureta" | "ossada"): string {
  if (kind === "missil") return "MÍSSIL";
  if (kind === "mina") return "MINA";
  if (kind === "cuspe") return "CUSPE";
  if (kind === "emp") return "CHOQUE";
  if (kind === "rajada") return "RAJADA";
  if (kind === "rastro") return "RASTRO";
  if (kind === "tiroTras") return "TIRO";
  if (kind === "pancada") return "PANCADA";
  if (kind === "mureta") return "MURETA";
  return "OSSADA";
}

export type HudBox = { x: number; y: number; w: number; h: number };

/** HUD da perseguição. A mira fica no asfalto, nunca em y > 520. */
export const HUD_CHASE: Record<string, HudBox> = {
  hp: { x: 24, y: 24, w: 280, h: 18 },
  hpRival: { x: 880, y: 24, w: 280, h: 18 },
  progress: { x: 320, y: 4, w: 520, h: 16 },
  feed: { x: 320, y: 26, w: 520, h: 36 },
  banner: { x: 390, y: 78, w: 500, h: 36 },
  radar: { x: 1200, y: 110, w: 56, h: 360 },
  alerts: { x: 24, y: 48, w: 220, h: 22 },
  aim: { x: 560, y: 200, w: 160, h: 36 },
  note: { x: 1010, y: 456, w: 180, h: 28 },
  tacho: { x: 1010, y: 492, w: 200, h: 168 },
  weapons: { x: 24, y: 500, w: 300, h: 96 },
};

export function hudChaseOverlap(): string[] {
  const keys = Object.keys(HUD_CHASE);
  const hits: string[] = [];
  const hit = (a: HudBox, b: HudBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (hit(HUD_CHASE[keys[i]!]!, HUD_CHASE[keys[j]!]!)) hits.push(`${keys[i]}×${keys[j]}`);
    }
  }
  const aim = HUD_CHASE.aim!;
  if (aim.y + aim.h > 520) hits.push("aim abaixo de 520");
  return hits;
}
