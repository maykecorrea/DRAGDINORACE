import { COMBAT, combatKind, combatName, type CombatKind } from "./combat.ts";
import type { StatBlock, Upgrades } from "./data.ts";
import { vidaMax } from "./hp.ts";
import { accelA, AI_TABLE, badgeForReaction, driveMph, gearBox, gearsForRarity, RACE_CONFIG, type AiLevel, type RaceBadge } from "./raceConfig.ts";
import { weaponById, weaponReach, type WeaponDef, type WeaponId } from "./weapons.ts";

export const IDLE = RACE_CONFIG.idle;
export const REDLINE = RACE_CONFIG.redline;
export const STRIP = RACE_CONFIG.stripM;
export const GEARS = 6;
export const TREE_GREEN = 3;
export const STAGE = 0.15;
export const TREE_AMBERS = [1, 2, 2.99];
export const REF_MPH = 232;
export const TRACK_EDGE = 9;
export const WALL_AT = 8.15;
export const LANE_GAP = 2.2;
const LANES = RACE_CONFIG.lanes;
const MPH_PER_MS = 2.2369362920544;

export type Grade = "cedo" | "ok" | "perfeito" | "corte" | "tarde";
export type LaunchGrade = "perfeito" | "ok" | "patinou" | "morreu" | "queimou" | "atrasou";

export type Input = {
  throttle: number;
  steer: number;
  shift: boolean;
  nitro: boolean;
  fire?: boolean;
  rear?: boolean;
  brake?: boolean;
  /** Toque novo neste quadro, não o segurar. */
  fireEdge?: boolean;
  rearEdge?: boolean;
  shield?: boolean;
  /** −1 esquerda, +1 direita, no mesmo eixo de beginLane. */
  ram?: number;
  /** Espaço depois do GO. A sim ignora se o espaço ainda é o da largada. */
  cuspe?: boolean;
  /** Relógio do quadro, ms. O mesmo eixo do timeStamp da tecla. */
  nowMs?: number;
  /** timeStamp do keyup do freio (Espaço), se houve. */
  brakeUpMs?: number | null;
  /** timeStamp do keydown do gás, se houve. */
  gasDownMs?: number | null;
  /** Soltou o Espaço neste quadro, mesmo se o toque durou menos que um tick. */
  brakePulse?: boolean;
};

export type Bot = {
  reaction: number;
  shiftAt: number;
  jitter: number;
  nitroGear: number;
  launch: number;
  aim?: number;
  level?: AiLevel;
  /** Fração de teto. 0 desliga. Difícil, ranqueado e fantasma ficam em 0. */
  rubber?: number;
  willFoul?: boolean;
  /** perfeito, bom, cedo, tarde, corte */
  mix?: readonly number[];
  dodge?: number;
  dodgeDelay?: number;
  laneDelay?: number;
  crate?: number;
  draft?: number;
  mines?: number;
  minesLaid?: number;
  mineGap?: number;
  /** Cadência da briga de rua. Não entra no equilíbrio das 200 corridas. */
  fireArm?: number;
  boneArm?: number;
  lock?: number;
  style?: "duelista";
};

export type Racer = {
  rpm: number;
  gear: number;
  gears: number;
  speed: number;
  dist: number;
  yaw: number;
  lane: number;
  nitroLeft: number;
  nitroMax: number;
  nitroOn: number;
  nitroMul: number;
  nitroUsed: boolean;
  launchMul: number;
  launched: boolean;
  redlight: boolean;
  reaction: number | null;
  launchGrade: LaunchGrade | null;
  /** Soltou sozinho porque o freio ficou preso depois do VAI. */
  launchAuto: boolean;
  shifts: Grade[];
  wheelspin: number;
  launchRpm: number;
  /** Segundos em que o giro verde da largada ainda vale, mesmo se o dedo soltar o W. */
  stageMem: number;
  hook: number;
  finished: boolean;
  finishTime: number | null;
  trap: number;
  shiftLock: number;
  shiftTarget: number;
  band: boolean;
  /** Segundos em que um Shift atrasado ainda vale a faixa que acabou de passar. */
  shiftGrace: number;
  /** Toque de Shift guardado enquanto a marcha ainda não pode entrar. */
  shiftBuf: number;
  /** Nota da faixa no instante do toque. Não regrada no corte se a marcha atrasou. */
  shiftMark: Grade | null;
  /** Shift estava apertado no tick anterior. Segurar não encadeia marcha. */
  shiftWasDown: boolean;
  /** Depois de uma troca, o dedo preso só vale de novo abaixo da faixa. */
  shiftGate: boolean;
  /** Nota que o HUD está prometendo. Shift nesse prazo grava essa nota, não o limitador. */
  shown: Grade | null;
  shownT: number;
  bot: Bot | null;
  power: number;
  accel: number;
  hp: number;
  hpMax: number;
  hurt: number;
  wrecked: boolean;
  walls: number;
  bumps: number;
  weapon: WeaponId;
  load: WeaponDef;
  cool: number;
  ammo: number;
  ammoMax: number;
  rear: WeaponId;
  rearLoad: WeaponDef;
  rearCool: number;
  rearAmmo: number;
  rearAmmoMax: number;
  draft: number;
  poison: number;
  poisonTime: number;
  slow: number;
  slowT: number;
  freeze: number;
  taken: Partial<Record<WeaponId, number>>;
  lockT: number;
  iFrame: number;
  laneFrom: number;
  laneGoal: number;
  laneT: number;
  boost: number;
  boostT: number;
  choke: number;
  chokeT: number;
  redlineT: number;
  shiftAge: number;
  streak: number;
  hpGhost: number;
  draftT: number;
  jail: boolean;
  cutLatch: boolean;
  hits: number;
  fired: number;
  dodged: number;
  crates: number;
  draftTime: number;
  nitroPerfect: number;
  shiftPlan: Grade | null;
  dodgeArm: number;
  laneArm: number;
  suspect: boolean;
  heat: number;
  heatLock: number;
  charge: number;
  chargePause: number;
  shield: number;
  shieldAge: number;
  slowImmune: number;
  empT: number;
  ramCd: number;
  cuspeCd: number;
  perfectDef: number;
  minesBroken: number;
  burns: number;
  dq: boolean;
  cuspeBag: number;
  cuspeBagT: number;
};

export type Shot = {
  id: number;
  owner: "you" | "ai";
  weapon: WeaponId;
  dist: number;
  lane: number;
  speed: number;
  life: number;
  lock: number;
  hit: number;
  live: boolean;
  sure: boolean;
  back?: boolean;
  dmg?: number;
  arm: number;
  born: number;
  guide: number;
  kind: CombatKind;
  mineHp: number;
  agora: boolean;
  resolved: "" | "hit" | "miss" | "broke";
  /** Tiro que saiu mirando a faixa ao lado. */
  side?: boolean;
  /** Nome na tela, quando o tiro não é o da arma. */
  label?: string;
};

export type Impact = {
  weapon: WeaponId;
  dist: number;
  lane: number;
  life: number;
  max: number;
};

export type Floater = {
  dmg: number;
  dist: number;
  lane: number;
  life: number;
  max: number;
  drift: number;
  label?: string;
  hud?: boolean;
};

export type Phase = "staging" | "tree" | "race" | "finish" | "free";

export type Match = {
  mode: "free" | "duel";
  phase: Phase;
  t: number;
  raceTime: number;
  green: boolean;
  player: Racer;
  rival: Racer | null;
  shake: number;
  flash: number;
  flashHot: boolean;
  callout: string;
  calloutT: number;
  events: string[];
  rewarded: boolean;
  rivalId: string | null;
  practiceEt: number | null;
  strip: number;
  pace: number;
  rivalPace: number;
  wreckHold: number;
  shots: Shot[];
  impacts: Impact[];
  floats: Floater[];
  pvp: boolean;
  aim: number;
  aimLock: boolean;
  incomingAim: number;
  shotId: number;
  bumpCd: number;
  heldGas: boolean;
  brakeHeld: boolean;
  usedBrake: boolean;
  steerLatch: number;
  hitStop: number;
  presentHold: number;
  blockFront: number;
  blockRear: number;
  alertMissile: number;
  alertMine: number;
  note: string;
  noteT: number;
  /** ERROU, desenhado na retícula. Não vai para o centro da tela. */
  shotCall: string;
  shotCallT: number;
  badge: RaceBadge;
  ghost: boolean;
  ranked: boolean;
  seed: number;
  greenWall: number;
  brakeUpWall: number;
  fovKick: number;
  shakePx: number;
  rng: () => number;
  hazards: { dist: number; lane: number; kind: "piche" | "ossada"; hit: boolean }[];
  crates: { dist: number; lane: number; taken: boolean; kind: "ammo" | "nitro" | "repair" }[];
  flashAt: number;
  view: "perseguicao" | "cockpit";
  debug: boolean;
  feed: { text: string; life: number }[];
  dmgLog: { who: "you" | "ai"; source: string; dmg: number; hp: number }[];
  shotsMade: number;
  shotsHit: number;
  shotsMiss: number;
  shotsBroke: number;
  camPull: number;
  bufFire: number;
  bufRear: number;
  bufShield: number;
  bufShift: boolean;
  /** Nitro apertado cedo demais ainda sai quando o carro pode usar. */
  bufNitro: number;
  banner: string;
  firstCross: number | null;
  spaceLatch: boolean;
  hitStopCd: number;
  tick: number;
  goTick: number;
  feedback: { action: string; ms: number }[];
  reason: string;
};

export function gearsFor(rarity: string | undefined): number {
  return gearsForRarity(rarity);
}

export type AiLevelName = AiLevel;

function gauss(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

export function sampleReaction(level: AiLevel, rnd: () => number = Math.random): number {
  const row = AI_TABLE[level];
  const raw = row.reaction[0] + gauss(rnd) * row.reaction[1];
  return Math.min(0.6, Math.max(0.15, raw));
}

export function botForLevel(level: AiLevel, rnd: () => number = Math.random): Bot {
  const row = AI_TABLE[level];
  const reaction = sampleReaction(level, rnd);
  return {
    reaction,
    shiftAt: 0.9,
    jitter: row.reaction[1],
    nitroGear: level === "facil" ? 3 : 2,
    launch: level === "dificil" ? 0.86 : level === "medio" ? 0.78 : 0.7,
    aim: row.aim,
    level,
    rubber: row.rubber,
    willFoul: rnd() < row.foul,
    mix: row.mix,
    dodge: row.dodge,
    dodgeDelay: row.dodgeDelay,
    laneDelay: row.laneDelay,
    crate: row.crate,
    draft: row.draft,
    mines: row.mines,
    minesLaid: 0,
    mineGap: 0,
    lock: row.lock,
  };
}

export function levelForChapter(chapter: number): AiLevel {
  if (chapter <= 3) return "facil";
  if (chapter <= 7) return "medio";
  return "dificil";
}

export function levelForRarity(rarity: string | undefined): AiLevel {
  if (rarity === "Épico" || rarity === "Lendário" || rarity === "Meme") return "dificil";
  if (rarity === "Raro") return "medio";
  return "facil";
}

function zeroRacer(bot: Bot | null, stats: StatBlock, gears = 6): Racer {
  const stock = weaponById("mg");
  const hp = vidaMax(stats.durability);
  const burn = RACE_CONFIG.nitro.burn;
  const charges = Math.max(2, Math.round((stats.nitroTime || burn) / Math.max(0.4, stats.nitroTime > 3 ? stats.nitroTime / 2 : 1.1)));
  const tank = burn * Math.min(4, charges);
  return {
    rpm: 1400,
    gear: 1,
    gears: Math.max(6, Math.min(8, Math.round(gears) || 6)),
    speed: 0,
    dist: 0,
    yaw: 0,
    lane: 0,
    nitroLeft: tank,
    nitroMax: tank,
    nitroOn: 0,
    nitroMul: 1,
    nitroUsed: false,
    launchMul: 1,
    launched: false,
    redlight: false,
    reaction: null,
    launchGrade: null,
    launchAuto: false,
    shifts: [],
    wheelspin: 0,
    launchRpm: IDLE,
    stageMem: 0,
    hook: 0,
    finished: false,
    finishTime: null,
    trap: 0,
    shiftLock: 0,
    shiftTarget: bot ? Math.min(0.96, Math.max(0.84, bot.shiftAt)) : 0.93,
    band: false,
    shiftGrace: 0,
    shiftBuf: 0,
    shiftMark: null,
    shiftWasDown: false,
    shiftGate: false,
    shown: null,
    shownT: 0,
    bot,
    power: stats.power,
    accel: stats.accel,
    hp,
    hpMax: hp,
    hurt: 0,
    wrecked: false,
    walls: 0,
    bumps: 0,
    weapon: "mg",
    load: stock,
    cool: 0,
    ammo: stock.clip,
    ammoMax: stock.clip,
    rear: "tail",
    rearLoad: weaponById("tail"),
    rearCool: 0,
    rearAmmo: weaponById("tail").clip,
    rearAmmoMax: weaponById("tail").clip,
    draft: 0,
    poison: 0,
    poisonTime: 0,
    slow: 1,
    slowT: 0,
    freeze: 0,
    taken: {},
    lockT: 0,
    iFrame: 0,
    laneFrom: 0,
    laneGoal: 0,
    laneT: 0,
    boost: 0,
    boostT: 0,
    choke: 1,
    chokeT: 0,
    redlineT: 0,
    shiftAge: 9,
    streak: 0,
    hpGhost: hp,
    draftT: 0,
    jail: false,
    cutLatch: false,
    hits: 0,
    fired: 0,
    dodged: 0,
    crates: 0,
    draftTime: 0,
    nitroPerfect: 0,
    shiftPlan: null,
    dodgeArm: 0,
    laneArm: 0,
    suspect: false,
    heat: 0,
    heatLock: 0,
    charge: COMBAT.escudo.max,
    chargePause: 0,
    shield: 0,
    shieldAge: 0,
    slowImmune: 0,
    empT: 0,
    ramCd: 0,
    cuspeCd: 0,
    perfectDef: 0,
    minesBroken: 0,
    burns: 0,
    dq: false,
    cuspeBag: 0,
    cuspeBagT: 0,
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layTrack(strip: number, seed: number): Pick<Match, "crates" | "hazards"> {
  const rnd = mulberry32(seed || 1);
  const lanes = [-2.2, 0, 2.2];
  const kinds = ["ammo", "nitro", "repair"] as const;
  const crates: Match["crates"] = [];
  for (let d = RACE_CONFIG.boxStep; d < strip - 80; d += RACE_CONFIG.boxStep) {
    const count = rnd() < 0.45 ? 2 : 1;
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let lane = Math.floor(rnd() * 3);
      if (used.has(lane)) lane = (lane + 1) % 3;
      used.add(lane);
      crates.push({
        dist: d + Math.floor(rnd() * 30),
        lane: lanes[lane]!,
        taken: false,
        kind: kinds[Math.floor(rnd() * 3)]!,
      });
    }
  }
  const hazards: Match["hazards"] = [];
  const n = RACE_CONFIG.hazard.min + Math.floor(rnd() * (RACE_CONFIG.hazard.max - RACE_CONFIG.hazard.min + 1));
  for (let i = 0; i < n; i++) {
    const dist = 180 + Math.floor(rnd() * (strip - 360));
    const lane = lanes[Math.floor(rnd() * 3)]!;
    const crowded = hazards.some((h) => Math.abs(h.dist - dist) < 40 && h.lane === lane);
    if (crowded) continue;
    const sameRow = hazards.filter((h) => Math.abs(h.dist - dist) < 25);
    if (sameRow.length >= 2) continue;
    hazards.push({ dist, lane, kind: rnd() < 0.5 ? "piche" : "ossada", hit: false });
  }
  return { crates, hazards };
}

function blankMatch(player: Racer, rival: Racer | null, strip: number, pace: number, rivalPace: number, seedIn?: number): Omit<Match, "mode" | "phase" | "green" | "t" | "raceTime" | "callout" | "calloutT" | "rivalId"> {
  const seed = seedIn && seedIn > 0 ? seedIn : (Math.random() * 1e9) | 0;
  const track = layTrack(strip, seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  return {
    player,
    rival,
    shake: 0,
    flash: 0,
    flashHot: false,
    events: [],
    rewarded: false,
    practiceEt: null,
    strip,
    pace,
    rivalPace,
    wreckHold: 0,
    shots: [],
    impacts: [],
    floats: [],
    pvp: false,
    aim: 0,
    aimLock: false,
    incomingAim: 0,
    shotId: 1,
    bumpCd: 0,
    heldGas: false,
    brakeHeld: false,
    usedBrake: false,
    steerLatch: 0,
    hitStop: 0,
    presentHold: 0,
    blockFront: 0,
    blockRear: 0,
    alertMissile: 0,
    alertMine: 0,
    note: "",
    noteT: 0,
    shotCall: "",
    shotCallT: 0,
    badge: "filhote",
    ghost: false,
    ranked: false,
    seed,
    greenWall: 0,
    brakeUpWall: 0,
    fovKick: 0,
    shakePx: 0,
    rng,
    flashAt: -10,
    view: "perseguicao",
    debug: false,
    feed: [],
    dmgLog: [],
    shotsMade: 0,
    shotsHit: 0,
    shotsMiss: 0,
    shotsBroke: 0,
    camPull: 0,
    bufFire: 0,
    bufRear: 0,
    bufShield: 0,
    bufShift: false,
    bufNitro: 0,
    banner: "",
    firstCross: null,
    spaceLatch: false,
    hitStopCd: 0,
    tick: 0,
    goTick: 0,
    feedback: [],
    reason: "",
    ...track,
  };
}

function shiftRow(gear: number) {
  const rows = RACE_CONFIG.shift;
  return rows[Math.max(0, Math.min(rows.length - 1, gear - 1))] ?? rows[0];
}

function rollShift(bot: Bot, rnd: () => number): Grade {
  const mix = bot.mix ?? [0.35, 0.45, 0.12, 0.07, 0.01];
  const names: Grade[] = ["perfeito", "ok", "cedo", "tarde", "corte"];
  let x = rnd();
  for (let i = 0; i < names.length; i++) {
    x -= mix[i] ?? 0;
    if (x <= 0) return names[i]!;
  }
  return "ok";
}

export function shiftWindow(up: Upgrades, gear = 3): [number, number] {
  const row = shiftRow(gear);
  const w = up.gearbox * 80;
  return [(row.lo - w) / REDLINE, row.hi / REDLINE];
}

export function perfectWindow(gear = 3): [number, number] {
  const row = shiftRow(gear);
  return [row.pLo / REDLINE, row.pHi / REDLINE];
}

/** A mesma nota que o HUD pinta. Faixa verde nunca é CORTE. */
export function shiftCall(rpm: number, gear: number): Grade {
  const row = shiftRow(gear);
  if (rpm >= row.pLo && rpm <= row.pHi) return "perfeito";
  if (rpm >= row.lo && rpm <= row.hi) return "ok";
  if (rpm >= REDLINE - 40) return "corte";
  if (rpm > row.hi) return "tarde";
  return "cedo";
}

export function shiftWord(grade: Grade): string {
  if (grade === "perfeito") return "PERFEITO";
  if (grade === "ok") return "BOM";
  if (grade === "cedo") return "CEDO";
  if (grade === "tarde") return "TARDE";
  return "CORTE";
}

export function launchWindow(_up: Upgrades): [number, number] {
  return [RACE_CONFIG.launch.green[0] / REDLINE, RACE_CONFIG.launch.green[1] / REDLINE];
}

function torqueAt(rpm: number): number {
  const curve = RACE_CONFIG.torque;
  const r = Math.max(curve[0][0], Math.min(REDLINE, rpm));
  for (let i = 1; i < curve.length; i++) {
    if (r <= curve[i]![0]) {
      const [r0, t0] = curve[i - 1]!;
      const [r1, t1] = curve[i]!;
      return t0 + ((t1 - t0) * (r - r0)) / (r1 - r0);
    }
  }
  return 0.6;
}

function note(m: Match, text: string, time = 0.6) {
  m.note = text;
  m.noteT = time;
  m.callout = text;
  m.calloutT = time;
}

function pulse(m: Match, hot: boolean, amount = 0.28) {
  if (m.phase === "race" && m.raceTime - m.flashAt < 1.5) return;
  m.flashAt = m.t + m.raceTime;
  m.flash = Math.min(0.35, amount);
  m.flashHot = hot;
}

function syncRpm(m: Match, r: Racer) {
  const rawMph = (r.bot ? m.rivalPace : m.pace) * REF_MPH;
  const vMax = driveMph(rawMph) / MPH_PER_MS;
  const box = gearBox(r.gears);
  const gi = Math.max(0, Math.min(box.frac.length - 1, r.gear - 1));
  const vTop = vMax * box.frac[gi]!;
  const floor = r.gear === 1 ? 3800 : 1000;
  let rpm = Math.max((r.speed / Math.max(0.4, vTop)) * REDLINE, floor);
  if (rpm >= REDLINE) rpm = REDLINE;
  else r.redlineT = 0;
  r.rpm = rpm;
}

function gradeShift(m: Match, r: Racer, _up: Upgrades, who: "you" | "ai") {
  if (r.gear >= r.gears || r.shiftLock > 0) return;
  const rpm = r.rpm;
  const row = shiftRow(r.gear);
  let g: Grade;
  const marked = who === "you" ? r.shiftMark : null;
  if (marked === "perfeito" || marked === "ok") g = marked;
  else if (marked === "corte" || marked === "tarde" || marked === "cedo") g = marked;
  else g = shiftCall(rpm, r.gear);
  r.shifts.push(g);
  r.gear += 1;
  r.shiftLock = RACE_CONFIG.shiftTime[g];
  r.band = false;
  r.shiftAge = 0;
  r.shiftPlan = null;
  r.cutLatch = false;
  r.shiftMark = null;
  r.shiftBuf = 0;
  r.shiftGate = true;
  r.shown = null;
  r.shownT = 0;
  if (g === "perfeito" && r.empT <= 0) {
    r.streak += 1;
    r.boost = Math.max(r.boost, RACE_CONFIG.perfectBonus);
    r.boostT = Math.max(r.boostT, RACE_CONFIG.perfectTime);
    if (r.streak >= 3) {
      r.nitroLeft = Math.min(r.nitroMax, r.nitroLeft + 0.3);
      r.streak = 0;
      if (who === "you") note(m, "COMBO");
    }
  } else r.streak = 0;
  if (g === "corte") {
    r.choke = RACE_CONFIG.corteMul;
    r.chokeT = Math.max(r.chokeT, RACE_CONFIG.shiftTime.corte);
  }
  if (r.bot) {
    const j = (m.rng() - 0.5) * r.bot.jitter * 400;
    r.shiftTarget = Math.min(0.97, Math.max(0.8, (row.pLo + row.pHi) / 2 / REDLINE + j / REDLINE));
  }
  if (who === "you") {
    m.events.push(`shift:${g}`);
    const label = shiftWord(g);
    note(m, label);
    m.shakePx = Math.max(m.shakePx, g === "perfeito" ? 1.5 : 1.5);
    if (g === "perfeito") m.fovKick = Math.max(m.fovKick, 4);
  }
  syncRpm(m, r);
}

function armNitro(m: Match, r: Racer, _up: Upgrades, who: "you" | "ai") {
  if (!r.launched || r.wrecked || r.empT > 0 || r.nitroLeft < RACE_CONFIG.nitro.burn - 0.05 || r.nitroOn > 0.05) return;
  let burn = RACE_CONFIG.nitro.burn;
  let tag = "nitro";
  const perfect = r.shiftAge <= 0.25 && r.shifts[r.shifts.length - 1] === "perfeito";
  if (perfect) {
    burn *= 1 + RACE_CONFIG.nitro.perfectExtra;
    tag = "limpo";
    r.nitroPerfect += 1;
  }
  if (r.draft > 0.2) {
    r.boost = Math.max(r.boost, 0.1);
    r.boostT = Math.max(r.boostT, burn);
    tag = "limpo";
  }
  if (r.rpm < RACE_CONFIG.nitro.lowRpm) {
    r.choke = Math.min(r.choke, 0.5);
    r.chokeT = Math.max(r.chokeT, burn);
    tag = "morto";
  }
  r.nitroLeft = Math.max(0, r.nitroLeft - RACE_CONFIG.nitro.burn);
  r.nitroOn = burn;
  r.nitroMul = 1.3;
  r.nitroUsed = true;
  if (who === "you") {
    m.events.push(`nitro:${tag}`);
    note(m, tag === "limpo" ? (perfect ? "NITRO PERFEITO" : "ESTILINGUE") : tag === "morto" ? "AFOGOU" : "NITRO");
    m.shakePx = Math.max(m.shakePx, 1);
    if (r.nitroOn > 0) m.fovKick = Math.max(m.fovKick, 8);
  }
}

function reactionSeconds(m: Match, input: Input | null, fallback: number): number {
  const up = input?.brakeUpMs ?? 0;
  // Selo anterior ao VAI não é a soltura desta largada.
  if (up > 0 && m.greenWall > 0 && m.usedBrake && up + 40 >= m.greenWall) return (up - m.greenWall) / 1000;
  const gas = input?.gasDownMs ?? 0;
  if (gas > 0 && m.greenWall > 0 && !m.usedBrake && gas + 40 >= m.greenWall) return (gas - m.greenWall) / 1000;
  return fallback;
}

function markSuspect(r: Racer) {
  if (r.reaction != null && r.reaction >= 0 && r.reaction < 0.1) r.suspect = true;
}

function stagedRpm(r: Racer): number {
  const [lo, hi] = RACE_CONFIG.launch.green;
  if (r.rpm >= lo) return r.rpm;
  if (r.stageMem > 0 && r.launchRpm >= lo && r.launchRpm <= hi) return r.launchRpm;
  return r.rpm;
}

function doLaunch(m: Match, r: Racer, _up: Upgrades, green: boolean, since: number, who: "you" | "ai") {
  r.launched = true;
  r.jail = false;
  const rpm = who === "you" ? stagedRpm(r) : r.rpm;
  const [lo, hi] = RACE_CONFIG.launch.green;
  const [pLo, pHi] = RACE_CONFIG.launch.perfect;
  if ((who === "you" && !green) || (who === "you" && since < -0.001) || (who === "ai" && r.bot?.willFoul && since < 0)) {
    r.redlight = true;
    r.launchGrade = "queimou";
    r.reaction = since;
    r.jail = true;
    r.launched = false;
    r.burns += 1;
    if (who === "you" && m.ranked && r.burns >= COMBAT.queimadasDq) r.dq = true;
    if (who === "you") {
      m.events.push("redlight");
      note(m, "QUEIMOU", 0.8);
      pulse(m, true, 0.3);
    }
    return;
  }
  r.reaction = Math.max(0, since);
  markSuspect(r);
  const quick = r.reaction <= 0.2;
  const decent = r.reaction <= 0.4;
  if (rpm > hi) {
      r.launchGrade = "patinou";
      r.choke = RACE_CONFIG.launch.spinMul;
      r.chokeT = RACE_CONFIG.launch.spinTime;
      r.wheelspin = 0.8;
      if (who === "you") {
        m.events.push("launch:patinou");
        note(m, "PATINOU");
      }
    } else if (!decent) {
      r.launchGrade = "atrasou";
      r.choke = 0.8;
      r.chokeT = Math.min(0.7, 0.25 + r.reaction * 0.15);
      if (who === "you") {
        m.events.push("launch:atrasou");
        note(m, "ATRASOU", 0.8);
      }
    } else if (rpm < lo) {
      r.launchGrade = "morreu";
      r.choke = RACE_CONFIG.launch.bogMul;
      r.chokeT = RACE_CONFIG.launch.bogTime;
      if (who === "you") {
        m.events.push("launch:morreu");
        note(m, "AFOGOU");
      }
    } else if (quick && rpm >= pLo && rpm <= pHi) {
      r.launchGrade = "perfeito";
      r.boost = RACE_CONFIG.launch.perfectBonus;
      r.boostT = RACE_CONFIG.launch.perfectTime;
      if (who === "you") {
        m.events.push("launch:perfeito");
        note(m, "LARGADA PERFEITA", 0.8);
      }
      if (since <= 0.18 && who === "you") m.events.push("lightning");
    } else if (decent && rpm >= lo && rpm <= hi) {
      r.launchGrade = "ok";
      if (who === "you") {
        m.events.push("launch:ok");
        note(m, "FOI");
      }
    }
  r.launchRpm = rpm;
  r.hook = 1;
}

function markDead(m: Match, r: Racer, who: "you" | "ai") {
  if (r.hp > 0 || r.wrecked) {
    if (r.hp <= 0) r.wrecked = true;
    return;
  }
  r.hp = 0;
  r.wrecked = true;
  r.speed *= 0.72;
  r.nitroOn = 0;
  if (who === "you") note(m, "DNF");
  else note(m, "DNF");
}

function popHit(m: Match, target: Racer, weapon: WeaponId, dmg: number, label?: string, hud?: boolean) {
  const boom = weapon === "missile" || weapon === "mine" || weapon === "homing";
  m.impacts.push({ weapon, dist: target.dist, lane: target.lane, life: boom ? 0.42 : 0.26, max: boom ? 0.42 : 0.26 });
  if (target.cuspeBagT > 0 && label === "CUSPE") return;
  m.floats.push({
    dmg,
    dist: target.dist,
    lane: target.lane,
    life: dmg >= 8 ? 0.95 : 0.7,
    max: dmg >= 8 ? 0.95 : 0.7,
    drift: (m.rng() - 0.5) * 16,
    label: `-${dmg}`,
    hud: hud || target === m.player,
  });
  m.shakePx = Math.max(m.shakePx, dmg >= 8 ? 14 : boom ? 8 : 4);
  m.shake = Math.max(m.shake, dmg >= 8 ? 0.7 : boom ? 0.45 : 0.22);
}

function pushFeed(m: Match, text: string) {
  m.feed.unshift({ text, life: COMBAT.feedS });
  m.feed.length = Math.min(COMBAT.feedMax, m.feed.length);
}

function logDmg(m: Match, target: Racer, source: string, dmg: number) {
  const who: "you" | "ai" = target === m.player ? "you" : "ai";
  m.dmgLog.push({ who, source, dmg, hp: Math.round(target.hp) });
  if (m.dmgLog.length > 10) m.dmgLog.shift();
}

function stopFor(m: Match, seconds: number) {
  if (m.hitStopCd > 0) return;
  m.hitStop = Math.max(m.hitStop, seconds);
  m.hitStopCd = COMBAT.hitStop.intervalo;
}

function addSlow(r: Racer, frac: number, time: number) {
  if (frac <= 0 || r.slowImmune > 0) return;
  const have = Math.max(0, 1 - (r.slow > 0 ? r.slow : 1));
  const next = Math.min(COMBAT.lentoMax, have + frac);
  r.slow = 1 - next;
  r.slowT = Math.max(r.slowT, time);
  r.slowImmune = COMBAT.imuneS;
}

function breakLocks(m: Match, owner: "you" | "ai") {
  for (const shot of m.shots) {
    if (!shot.live || shot.owner === owner || !shot.sure) continue;
    shot.sure = false;
    shot.guide = 0;
    shot.lock = 0;
  }
}

function markFeedback(m: Match, action: string) {
  m.feedback.push({ action, ms: 16 });
  if (m.feedback.length > 12) m.feedback.shift();
}

function applyHit(m: Match, target: Racer, weapon: WeaponId, dmg: number, splash: boolean, shooter?: Racer | null, source?: string) {
  if (target.finished) return;
  const kind = combatKind(weapon);
  const label = source ?? combatName(kind);
  const shielded: "you" | "ai" = target === m.player ? "you" : "ai";
  if (target.shield > 0) {
    const perfect = target.shieldAge <= COMBAT.escudo.perfeitoS;
    breakLocks(m, shielded);
    if (perfect) {
      target.charge = Math.min(COMBAT.escudo.max, target.charge + COMBAT.escudo.devolve);
      target.boost = Math.max(target.boost, COMBAT.escudo.adrenalina);
      target.boostT = Math.max(target.boostT, COMBAT.escudo.adrenalinaS);
      target.perfectDef += 1;
      pushFeed(m, "DEFESA PERFEITA");
      note(m, "DEFESA PERFEITA");
      stopFor(m, COMBAT.hitStop.perfeito);
      m.events.push("perfect-shield");
    } else {
      m.events.push("shield");
    }
    m.events.push(target === m.player ? "hurt" : "hit");
    return;
  }
  const named = source != null && source !== combatName(kind);
  const def = weaponById(weapon);
  let dealt = Math.max(1, Math.round(splash ? dmg * 0.42 : dmg));
  const streetBot = (bot: Racer["bot"] | undefined) => !!bot && bot.level === "facil" && (bot.rubber ?? 0) > 0 && !m.ranked && !m.pvp && !m.ghost;
  const chip = (bot: Racer["bot"] | undefined) => {
    if (!bot || m.ranked || m.pvp || m.ghost) return 1;
    if (bot.level === "facil" && (bot.rubber ?? 0) > 0) return 0.5;
    if (bot.level === "medio" && (bot.rubber ?? 0) > 0) return 0.55;
    if (bot.level === "dificil") return 0.62;
    return 1;
  };
  const easyIn = streetBot(shooter?.bot) && target === m.player;
  const easyOut = streetBot(target.bot) && shooter === m.player;
  if (easyIn && label === "OSSADA") dealt = Math.max(2, Math.round(dealt * 0.55));
  else if (!easyIn && chip(shooter?.bot) < 1 && target === m.player) dealt = Math.max(1, Math.round(dealt * chip(shooter?.bot)));
  if (easyOut) dealt = Math.max(1, Math.round(dealt * 0.55));
  const easyChip = easyIn;
  if (!named && kind === "emp" && !splash) target.empT = Math.max(target.empT, COMBAT.emp.efeitoS);
  if (!named && kind === "missil" && !splash && !easyChip) addSlow(target, COMBAT.missil.lentidao, COMBAT.missil.lentoS);
  else if (!named && kind === "mina" && !splash && !easyChip) addSlow(target, COMBAT.mina.lentidao, COMBAT.mina.lentoS);
  else if (!named && kind === "emp" && !splash) addSlow(target, 0.1, COMBAT.emp.efeitoS);
  else if (!named && kind === "rajada" && !splash) addSlow(target, COMBAT.rajada.lentidao, COMBAT.rajada.lentoS);
  else if (!named && kind === "tiroTras" && !splash) addSlow(target, COMBAT.tiroTras.lentidao, COMBAT.tiroTras.lentoS);
  else if (!named && def.slow < 1 && !splash && def.slowTime > 0) addSlow(target, Math.max(0, 1 - def.slow), def.slowTime);
  if (dealt <= 0) return;
  if (weapon === "leech" && shooter && !splash) {
    const steal = Math.min(target.nitroLeft, 0.9);
    target.nitroLeft = Math.max(0, target.nitroLeft - steal);
    shooter.nitroLeft = Math.min(shooter.nitroMax, shooter.nitroLeft + steal);
  }
  target.hp = Math.max(0, target.hp - dealt);
  target.hurt = target === m.player ? 0.85 : 0.25;
  if (!splash) target.taken[weapon] = (target.taken[weapon] ?? 0) + 1;
  const died = target.hp <= 0;
  if (died) {
    target.hp = 0;
    target.wrecked = true;
    target.nitroOn = 0;
    note(m, "DNF");
    stopFor(m, COMBAT.hitStop.dnf);
  }
  if (target === m.player) {
    m.shakePx = Math.max(m.shakePx, weapon === "mine" ? 12 : 8);
    m.shake = Math.max(m.shake, weapon === "mine" ? 0.7 : 0.5);
    m.flash = Math.max(m.flash, 0.32);
    m.flashHot = true;
    if (!died) stopFor(m, weapon === "mine" ? COMBAT.hitStop.mina : COMBAT.hitStop.sofrido);
  } else if (shooter === m.player && !splash) {
    m.player.hits += 1;
    m.shakePx = Math.max(m.shakePx, dealt >= 8 ? 14 : 7);
    m.flash = Math.max(m.flash, dealt >= 8 ? 0.42 : 0.22);
    m.flashHot = true;
    if (!died) stopFor(m, weapon === "mine" ? COMBAT.hitStop.mina : COMBAT.hitStop.dado);
  }
  logDmg(m, target, label, dealt);
  if (label === "CUSPE") {
    const show = target.cuspeBagT <= 0;
    target.cuspeBag += dealt;
    target.cuspeBagT = 0.28;
    if (show) popHit(m, target, weapon, dealt, label, target === m.player);
  } else popHit(m, target, weapon, dealt, label, target === m.player);
  m.events.push(target === m.player ? "hurt" : "hit");
}

function draftOf(chaser: Racer, leader: Racer | null): number {
  if (!leader || leader.wrecked || chaser.wrecked || !chaser.launched || !leader.launched) return 0;
  const gap = leader.dist - chaser.dist;
  if (gap < RACE_CONFIG.draft.min || gap > RACE_CONFIG.draft.max) return 0;
  if (Math.abs(leader.lane - chaser.lane) > 0.85) return 0;
  return 1;
}

function facingBack(m: Match, r: Racer, owner: "you" | "ai"): boolean {
  const target = owner === "you" ? m.rival : m.player;
  return !!target && target.dist < r.dist - 1.5;
}

function cdOf(id: WeaponId, fallback: number) {
  const kind = combatKind(id);
  if (kind === "mina") return COMBAT.mina.cd;
  if (kind === "missil") return COMBAT.missil.cd;
  if (kind === "emp") return COMBAT.emp.cd;
  if (kind === "rajada") return COMBAT.rajada.cd;
  if (kind === "rastro") return COMBAT.rastro.cd;
  if (kind === "tiroTras") return COMBAT.tiroTras.cd;
  return fallback;
}

function shotDamage(shot: Shot, target: Racer) {
  const kind = shot.kind;
  const pct =
    kind === "missil" ? (shot.sure ? COMBAT.missil.travadoPct : COMBAT.missil.danoPct) : kind === "mina" ? COMBAT.mina.danoPct : kind === "emp" ? COMBAT.emp.danoPct : kind === "rajada" ? COMBAT.rajada.danoPct : kind === "tiroTras" ? COMBAT.tiroTras.danoPct : 0;
  if (pct > 0) return Math.max(1, Math.round(target.hpMax * pct));
  return shot.dmg || weaponById(shot.weapon).damage;
}

function retireShot(m: Match, shot: Shot, how: "hit" | "miss" | "broke") {
  if (!shot.live && shot.resolved) return;
  shot.live = false;
  shot.resolved = how;
  if (how === "hit") m.shotsHit += 1;
  else if (how === "broke") m.shotsBroke += 1;
  else m.shotsMiss += 1;
}

function spawnShot(m: Match, r: Racer, owner: "you" | "ai", sure: boolean, forceBack?: boolean) {
  const back = forceBack ?? facingBack(m, r, owner);
  const def = back ? r.rearLoad : r.load;
  const ammo = back ? r.rearAmmo : r.ammo;
  const cool = back ? r.rearCool : r.cool;
  if (ammo <= 0 || cool > 0 || r.wrecked) return;
  if (def.id === "mine") {
    const active = m.shots.filter((shot) => shot.live && shot.owner === owner && shot.weapon === "mine").length;
    if (active >= COMBAT.mina.max) return;
  }
  const kind = combatKind(def.id);
  const cd = cdOf(def.id, def.cooldown);
  if (back) {
    r.rearAmmo -= 1;
    r.rearCool = cd;
  } else {
    r.ammo -= 1;
    r.cool = cd;
  }
  const missile = kind === "missil" || kind === "emp";
  let speed = r.speed + COMBAT.missil.velRel;
  if (kind === "mina" || kind === "rastro") speed = 0;
  else if (kind === "tiroTras" || (back && kind === "missil")) speed = Math.max(0, r.speed - (kind === "tiroTras" ? COMBAT.tiroTras.velRel : COMBAT.missil.velRel));
  else if (kind === "emp") speed = r.speed + COMBAT.emp.velRel;
  else if (kind === "rajada") speed = r.speed + 80;
  const foe = owner === "you" ? m.rival : m.player;
  let lane = r.lane;
  if (!missile && kind !== "mina" && kind !== "rastro" && foe && owner === "ai") {
    const aimN = r.bot?.aim ?? 0.4;
    lane = foe.lane + (1.05 - Math.min(1, aimN)) * (m.rng() - 0.5) * 1.2;
  }
  const dist = kind === "mina" ? r.dist - 6 : kind === "rastro" ? r.dist : r.dist + (back ? -2.2 : 2.4);
  const guide = kind === "missil" && sure ? COMBAT.missil.rastreioS : kind === "emp" ? COMBAT.emp.rastreioS : 0;
  const shot: Shot = {
    id: m.shotId++,
    owner,
    weapon: def.id,
    dist,
    lane,
    speed,
    life: kind === "mina" ? COMBAT.mina.vidaS : kind === "rastro" ? COMBAT.rastro.duracaoS : 3.2,
    lock: guide,
    hit: COMBAT.laneHit,
    live: true,
    sure: kind === "missil" && sure,
    back,
    dmg: def.damage,
    arm: kind === "mina" ? COMBAT.mina.armaS : 0,
    born: kind === "rastro" ? r.dist - COMBAT.rastro.comprimentoM : dist,
    guide,
    kind,
    mineHp: COMBAT.cuspe.tirosMina,
    agora: false,
    resolved: "",
  };
  m.shots.push(shot);
  const span = 4.8;
  if (owner !== "you" && foe && Math.abs(foe.lane - r.lane) > 0.55 && Math.abs(foe.lane - r.lane) <= span && (kind === "missil" || kind === "emp" || kind === "rajada")) {
    const aimP = r.bot?.level === "facil" ? 0.12 : Math.max(0.45, r.bot?.aim ?? 0.4);
    if (r.bot && m.rng() < aimP) {
      const gap = foe.dist - r.dist;
      const beside = gap > -12 && gap < 30;
      shot.side = true;
      shot.guide = Math.max(shot.guide, beside ? 1.1 : 1.4);
      shot.lock = Math.max(shot.lock, shot.guide);
      shot.hit = Math.max(shot.hit, 1.05);
      if (beside) {
        shot.lane = foe.lane;
        shot.dist = Math.max(r.dist + 1.2, foe.dist - 3.5);
        shot.born = shot.dist;
        shot.speed = Math.max(shot.speed, foe.speed + 42, r.speed + 30);
      }
    }
  }
  if (owner === "you" && kind === "mina" && foe && Math.abs(foe.lane - r.lane) <= span && Math.abs(foe.dist - r.dist) < 80) {
    shot.lane = foe.lane;
    const lead = Math.max(14, Math.min(28, foe.speed * 0.5));
    shot.dist = Math.max(r.dist + 4, foe.dist + lead);
    shot.born = shot.dist;
  }
  m.shotsMade += 1;
  if (kind === "rajada") {
    for (let i = 1; i < COMBAT.rajada.tiros; i++) {
      m.shots.push({ ...shot, id: m.shotId++, dist: shot.dist + i * 1.4, born: shot.born + i * 1.4 });
      m.shotsMade += 1;
    }
  }
  if (owner === "you") {
    r.fired += 1;
    markFeedback(m, back ? "G" : "F");
    m.events.push(kind === "mina" ? "mine" : "shot");
    if (kind === "mina") note(m, "MINA");
  }
}

function tryShield(m: Match, r: Racer, who: "you" | "ai") {
  if (r.empT > 0 || r.shield > 0 || r.wrecked || r.finished) return;
  if (r.charge + 0.001 < COMBAT.escudo.custo) {
    if (who === "you") {
      m.events.push("blocked");
      note(m, "SEM CARGA");
    }
    return;
  }
  r.charge -= COMBAT.escudo.custo;
  r.chargePause = COMBAT.escudo.pausa;
  r.shield = COMBAT.escudo.janelaS;
  r.shieldAge = 0;
  if (who === "you") {
    m.events.push("shield");
    markFeedback(m, "E");
  }
}

function fireCuspe(m: Match, r: Racer, who: "you" | "ai") {
  if (r.shield > 0 || r.heatLock > 0 || r.finished || r.wrecked || !r.launched) return;
  if (who === "you" && (m.spaceLatch || m.raceTime < COMBAT.input.bloqueioCuspeS)) return;
  if (r.cuspeCd > 0) return;
  r.cuspeCd = 1 / COMBAT.cuspe.cadencia;
  r.heat = Math.min(100, r.heat + COMBAT.cuspe.calor);
  if (r.heat >= 100) {
    r.heatLock = COMBAT.cuspe.travaS;
    if (who === "you") {
      note(m, "CHIIIA");
      m.events.push("heat");
    }
  }
  const self = who === "you" ? "you" : "ai";
  for (const shot of m.shots) {
    if (!shot.live || shot.kind !== "mina" || shot.owner === self || shot.arm > 0) continue;
    const gap = shot.dist - r.dist;
    if (gap < 0 || gap > COMBAT.cuspe.alcanceM || Math.abs(shot.lane - r.lane) > COMBAT.laneHit) continue;
    shot.mineHp -= 1;
    if (shot.mineHp <= 0) {
      retireShot(m, shot, "broke");
      if (who === "you") {
        r.minesBroken += 1;
        pushFeed(m, "MINA DESTRUÍDA +1");
        m.events.push("broke");
      }
    }
    if (who === "you") markFeedback(m, "Space");
    m.events.push("cuspe");
    return;
  }
  const foe = who === "you" ? m.rival : m.player;
  if (foe && !foe.wrecked && !foe.finished) {
    const gap = foe.dist - r.dist;
    const laneDelta = Math.abs(foe.lane - r.lane);
    const ahead = gap > 0 && gap <= COMBAT.cuspe.alcanceM && laneDelta <= COMBAT.laneHit;
    const beside = laneDelta <= 4.8 && gap > -8 && gap <= 32;
    if (ahead || beside) {
      applyHit(m, foe, "mg", Math.max(1, Math.round(foe.hpMax * COMBAT.cuspe.danoPct)), false, r, "CUSPE");
    }
  }
  m.shots.push({
    id: m.shotId++,
    owner: self,
    weapon: "mg",
    dist: r.dist + 1.5,
    lane: foe && Math.abs(foe.lane - r.lane) <= 4.8 && foe.dist - r.dist > -8 && foe.dist - r.dist <= 32 ? foe.lane : r.lane,
    speed: r.speed + COMBAT.cuspe.velMs,
    life: 0.08,
    lock: 0,
    hit: 0,
    live: true,
    sure: false,
    arm: 0,
    born: r.dist,
    guide: 0,
    kind: "cuspe",
    mineHp: 0,
    agora: false,
    resolved: "",
    dmg: 0,
  });
  m.shotsMade += 1;
  if (who === "you") {
    r.fired += 1;
    markFeedback(m, "Space");
  }
  m.events.push("cuspe");
}

/** NA MIRA só quando o F desta hora acerta. Mesma faixa ou colado do lado. */
export function sights(m: Match): "" | "mira" | "fora" | "longe" {
  const foe = m.rival;
  if (!m.player.launched || m.phase === "staging" || m.phase === "tree" || !foe || foe.wrecked) return "";
  const gap = foe.dist - m.player.dist;
  const lane = Math.abs(foe.lane - m.player.lane);
  if (gap > COMBAT.missil.alcanceM || gap < -10) return "longe";
  const same = lane < 1.2 && gap >= -6 && gap <= COMBAT.missil.alcanceM;
  const beside = lane <= 4.85 && gap >= -8 && gap <= 40;
  return same || beside ? "mira" : "fora";
}

function stepWeapons(m: Match, r: Racer, input: Input | null, dt: number, who: "you" | "ai") {
  r.cool = Math.max(0, r.cool - dt);
  r.rearCool = Math.max(0, r.rearCool - dt);
  r.cuspeCd = Math.max(0, r.cuspeCd - dt);
  if (r.heatLock > 0) r.heatLock = Math.max(0, r.heatLock - dt);
  const spraying = who === "you" ? !!input?.cuspe && !m.spaceLatch : r.bot?.style === "duelista";
  if (r.heatLock > 0 || !spraying) r.heat = Math.max(0, r.heat - COMBAT.cuspe.esfria * dt);
  if (r.wrecked || r.finished || !r.launched || m.phase === "finish" || m.phase === "staging" || m.phase === "tree") return;
  if (who === "you" && (input?.shield || m.bufShield > 0)) {
    tryShield(m, r, "you");
    m.bufShield = 0;
  }
  if (spraying) fireCuspe(m, r, who);
  if (r.shield > 0) return;
  const foe = who === "you" ? m.rival : m.player;
  const ahead = foe ? foe.dist - r.dist : 0;
  if (who === "you") {
    const fire = !!input?.fire;
    const rear = !!input?.rear || m.bufRear > 0;
    if (rear && r.rearCool <= 0 && r.rearAmmo > 0) {
      spawnShot(m, r, "you", false, true);
      m.bufRear = 0;
    } else if (m.bufRear > 0 && r.rearAmmo <= 0) {
      note(m, "SEM MINA");
      m.bufRear = 0;
    }
    const same = !!foe && Math.abs(foe.lane - r.lane) < 1.35 && ahead >= 4 && ahead <= COMBAT.missil.alcanceM;
    if (fire && r.ammo > 0 && same) {
      const was = m.aimLock;
      m.aim = Math.min(1, m.aim + dt / COMBAT.missil.travaS);
      m.aimLock = m.aim >= 0.995;
      if (m.aimLock && !was) m.events.push("lock");
    }
    const want = m.bufFire > 0 || (fire && r.cool <= 0);
    if (want && r.ammo > 0 && r.cool <= 0) {
      const look = sights(m);
      spawnShot(m, r, "you", look === "mira", false);
      const shot = m.shots[m.shots.length - 1];
      if (shot && shot.live && (shot.kind === "missil" || shot.kind === "emp" || shot.kind === "rajada")) {
        if (look === "mira" && foe) {
          const gapNow = foe.dist - r.dist;
          shot.lane = foe.lane;
          shot.guide = Math.max(shot.guide, 2.4);
          shot.lock = shot.guide;
          shot.sure = true;
          shot.hit = Math.max(shot.hit, 1.25);
          shot.side = Math.abs(foe.lane - r.lane) > 0.55;
          shot.speed = Math.max(shot.speed, Math.abs(foe.speed) + 46);
          if (gapNow < 22 && gapNow > -12) {
            shot.dist = foe.dist - 2.6;
            shot.born = shot.dist;
            shot.speed = Math.max(shot.speed, Math.abs(foe.speed) + 36);
          }
          m.shotCall = "";
          m.shotCallT = 0;
        } else {
          shot.guide = 0;
          shot.lock = 0;
          shot.sure = false;
          shot.side = false;
          shot.lane = r.lane;
          m.shotCall = "ERROU";
          m.shotCallT = 0.75;
        }
      }
      m.bufFire = 0;
      if (!fire) {
        m.aim = 0;
        m.aimLock = false;
      }
    } else if (!fire) {
      m.aim = Math.max(0, m.aim - dt * 3);
      if (m.aim <= 0) m.aimLock = false;
      if (m.bufFire > 0 && r.ammo <= 0) {
        note(m, "SEM MÍSSIL");
        m.bufFire = 0;
      }
    }
    return;
  }
  if (m.pvp || !r.bot || (r.bot.aim ?? 0) <= 0.02 || !foe) return;
  const aim = r.bot.aim ?? 0;
  const locked = (r.bot?.lock ?? 0) >= 1 || ((r.bot?.lock ?? 0) > 0 && m.rng() < (r.bot?.lock ?? 0));
  const street =
    !m.pvp &&
    !m.ranked &&
    !m.ghost &&
    (((r.bot.level === "facil" || r.bot.level === "medio") && (r.bot.rubber ?? 0) > 0) || r.bot.level === "dificil");
  if (street) {
    const easy = r.bot.level === "facil";
    const medio = r.bot.level === "medio";
    const openAt = easy ? 2.25 : medio ? 1.6 : 1.1;
    const cadence = easy ? 1.55 : medio ? 1.15 : 0.85;
    const aimP = easy ? 0.34 : medio ? 0.58 : 0.84;
    r.bot.fireArm = (r.bot.fireArm ?? (easy ? 0.45 : medio ? 0.3 : 0.15)) - dt;
    r.bot.boneArm = (r.bot.boneArm ?? (easy ? 0.7 : medio ? 0.4 : 0.2)) - dt;
    const gap = ahead;
    const missLane = () => foe.lane + (m.rng() < 0.5 ? 2.6 : -2.6);
    const mineCap = easy ? 2 : medio ? 3 : Math.max(3, r.bot.mines ?? 4);
    const laid = r.bot.minesLaid ?? 0;
    const fast = foe.speed > 30 && r.speed > 30;
    const taken = foe.hpMax - foe.hp;
    const budget = easy ? 28 : medio ? 34 : 46;
    const full = taken >= budget;
    const hungry = easy && taken < 8 && m.raceTime > 6.5;
    if (
      m.raceTime >= openAt &&
      fast &&
      r.rear === "mine" &&
      laid < mineCap &&
      r.rearCool <= 0 &&
      r.rearAmmo > 0 &&
      (r.bot.mineGap ?? 0) <= 0 &&
      gap < 70 &&
      gap > -90
    ) {
      spawnShot(m, r, "ai", false, true);
      const mine = m.shots[m.shots.length - 1];
      if (mine && mine.live && mine.kind === "mina") {
        const aimed = full ? false : m.rng() < (easy ? 0.18 : medio ? 0.55 : 0.8);
        mine.lane = aimed ? foe.lane : missLane();
        const lead = Math.max(16, foe.speed * (easy ? 0.42 : 0.62));
        const aheadOfYou = foe.dist + lead;
        mine.dist = r.dist > foe.dist + 8 ? Math.min(r.dist - 3, aheadOfYou) : aheadOfYou;
        mine.born = mine.dist;
      }
      r.bot.minesLaid = laid + 1;
      r.bot.mineGap = easy ? 4.2 : medio ? 2.6 : 1.8;
    }
    const near = gap > -55 && gap < 90;
    if (m.raceTime >= openAt && near && (r.bot.boneArm ?? 0) <= 0 && !foe.finished) {
      const aimed = full ? false : m.rng() < (easy ? 0.2 : medio ? 0.68 : 0.86);
      const dir = gap >= -4 ? 1 : -1;
      const chase = aimed ? foe.speed + 50 : dir > 0 ? foe.speed + 48 : -(Math.abs(foe.speed) + 36);
      m.shots.push({
        id: m.shotId++,
        owner: "ai",
        weapon: "mg",
        dist: aimed ? foe.dist - 4 : r.dist + dir * 2.4,
        lane: aimed ? foe.lane : missLane(),
        speed: chase,
        life: 1.5,
        lock: 0,
        hit: COMBAT.laneHit,
        live: true,
        sure: false,
        arm: 0,
        born: r.dist,
        guide: 0,
        kind: "rajada",
        mineHp: 0,
        agora: false,
        resolved: "",
        dmg: easy ? 5 : Math.max(6, Math.round(foe.hpMax * 0.11)),
        label: "OSSADA",
      });
      m.shotsMade += 1;
      r.bot.boneArm = easy ? 1.55 : medio ? 1.15 : 0.85;
    }
    if (m.raceTime >= openAt && near && (r.bot.fireArm ?? 0) <= 0 && r.cool <= 0 && r.ammo > 0) {
      const kindNow = combatKind(r.load.id);
      if (easy && kindNow === "rajada") {
        r.bot.fireArm = cadence;
      } else {
        spawnShot(m, r, "ai", false, false);
        const shot = m.shots[m.shots.length - 1];
        if (shot && shot.live && (shot.kind === "missil" || shot.kind === "emp" || shot.kind === "rajada")) {
          const aimed = full ? false : hungry || m.rng() < aimP;
          shot.side = false;
          if (aimed) {
            shot.lane = foe.lane;
            shot.guide = easy ? 0.9 : medio ? 0.9 : 1.2;
            shot.lock = shot.guide;
            shot.speed = Math.max(shot.speed, Math.abs(foe.speed) + 48);
            if (gap < 16 && gap > -4) {
              shot.dist = Math.max(r.dist + 1.2, foe.dist - 3.2);
              shot.born = shot.dist;
            }
          } else {
            shot.guide = 0;
            shot.lock = 0;
            shot.sure = false;
            shot.lane = missLane();
          }
        }
        r.bot.fireArm = cadence;
      }
    }
    return;
  }
  const same = Math.abs(foe.lane - r.lane) < (locked ? 1.45 : 0.85);
  if (r.rear === "mine" && ahead < -8 && ahead > -60 && same && r.rearCool <= 0 && r.rearAmmo > 0 && aim > 0.3) {
    const cap = r.bot?.mines ?? 2;
    const laid = r.bot?.minesLaid ?? 0;
    const gap = r.bot?.mineGap ?? 0;
    if (laid < cap && gap <= 0) {
      spawnShot(m, r, "ai", false, true);
      if (r.bot) {
        r.bot.minesLaid = laid + 1;
        r.bot.mineGap = 3;
      }
    }
  }
  const eager = aim >= 0.9;
  if (ahead >= 17 && ahead <= COMBAT.missil.alcanceM && same && r.cool <= 0 && r.ammo > 0 && (eager || m.rng() < aim * dt * 2.2)) {
    spawnShot(m, r, "ai", locked, false);
  }
}

function stepShots(m: Match, dt: number) {
  const bodies = [m.player, m.rival].filter((r): r is Racer => !!r);
  for (const shot of m.shots) {
    if (!shot.live) continue;
    const hadGuide = shot.guide > 0;
    shot.life -= dt;
    shot.arm = Math.max(0, shot.arm - dt);
    shot.guide = Math.max(0, shot.guide - dt);
    const ownerR = shot.owner === "you" ? m.player : m.rival;
    if (ownerR?.wrecked) {
      retireShot(m, shot, "miss");
      continue;
    }
    if (ownerR?.finished && shot.kind !== "mina") {
      retireShot(m, shot, "miss");
      continue;
    }
    if (shot.kind === "cuspe") {
      shot.dist += shot.speed * dt;
      if (shot.life <= 0) retireShot(m, shot, "miss");
      continue;
    }
    if (shot.kind === "mina" || shot.weapon === "mine") {
      if (shot.arm > 0) continue;
      const owner = shot.owner === "you" ? m.player : m.rival;
      for (const target of bodies) {
        if (target === owner || target.wrecked || target.finished) continue;
        if (Math.abs(target.lane - shot.lane) > COMBAT.laneHit) continue;
        if (target.dist >= shot.dist - 1.4 && target.dist <= shot.dist + 2.4) {
          applyHit(m, target, "mine", shotDamage(shot, target), false, owner);
          retireShot(m, shot, "hit");
          break;
        }
      }
      if (shot.life <= 0 && shot.live) retireShot(m, shot, "miss");
      continue;
    }
    if (shot.kind === "rastro") {
      const target = shot.owner === "you" ? m.rival : m.player;
      if (target && !target.wrecked && !target.finished && Math.abs(target.lane - shot.lane) <= COMBAT.laneHit) {
        const along = target.dist <= shot.dist && target.dist >= shot.born;
        if (along) {
          target.choke = Math.min(target.choke, COMBAT.rastro.forca);
          target.chokeT = Math.max(target.chokeT, 0.2);
          if (m.tick % 30 === 0) {
            const bite = Math.max(1, Math.round(target.hpMax * COMBAT.rastro.danoPctS * 0.5));
            target.hp = Math.max(0, target.hp - bite);
            target.hurt = 0.2;
            logDmg(m, target, "RASTRO", bite);
            if (target.hp <= 0) {
              target.wrecked = true;
              note(m, "DNF");
            }
          }
        }
      }
      if (shot.life <= 0) retireShot(m, shot, "miss");
      continue;
    }
    const target = shot.owner === "you" ? m.rival : m.player;
    if ((shot.kind === "missil" || shot.kind === "emp" || shot.kind === "rajada") && target && hadGuide) {
      const pull = (shot.side ? 26 : 14) * dt;
      const d = target.lane - shot.lane;
      shot.lane += Math.max(-pull, Math.min(pull, d));
    }
    if (shot.sure && shot.owner === "you" && target && !target.wrecked && !target.finished) {
      const d = target.lane - shot.lane;
      shot.lane += Math.max(-48 * dt, Math.min(48 * dt, d));
      const gap = target.dist - shot.dist;
      if (gap > 0 && gap < 28) shot.speed = Math.max(shot.speed, target.speed + 52);
      shot.hit = Math.max(shot.hit, 1.25);
    }
    if (hadGuide && shot.guide <= 0 && shot.sure && !shot.agora) {
      shot.agora = true;
      if (shot.owner === "ai") {
        m.events.push("agora");
        note(m, "AGORA!", 0.45);
      }
    }
    shot.dist += shot.speed * dt;
    const traveled = Math.abs(shot.dist - shot.born);
    const armNeed = shot.sure ? 0.25 : shot.side ? 0.4 : COMBAT.missil.armaM;
    const armed = shot.kind !== "missil" || traveled >= armNeed;
    if (target && !target.wrecked && !target.finished && armed && shot.hit > 0) {
      const laneDelta = Math.abs(shot.lane - target.lane);
      const prev = shot.dist - shot.speed * dt;
      const lo = Math.min(prev, shot.dist);
      const hi = Math.max(prev, shot.dist);
      const crossed = hi >= target.dist - 0.6 && lo <= target.dist + 0.8;
      if (crossed && laneDelta <= shot.hit) {
        const shooter = shot.owner === "you" ? m.player : m.rival;
        const dealt = shot.label ? Math.max(1, shot.dmg ?? shotDamage(shot, target)) : shotDamage(shot, target);
        applyHit(m, target, shot.weapon, dealt, false, shooter, shot.label);
        retireShot(m, shot, "hit");
        if (shot.owner === "you") {
          m.shotCall = "";
          m.shotCallT = 0;
        }
      }
    }
    if (shot.kind === "missil" && traveled > COMBAT.missil.alcanceM) retireShot(m, shot, "miss");
    else if (shot.life <= 0 && shot.live) retireShot(m, shot, "miss");
    if (shot.live && (shot.dist < m.player.dist - 80 || shot.dist > m.player.dist + 180)) retireShot(m, shot, "miss");
    if (!shot.live && shot.resolved === "miss" && shot.owner === "you" && (shot.kind === "missil" || shot.kind === "emp")) {
      m.shotCall = "ERROU";
      m.shotCallT = 0.75;
    }
  }
  m.shots = m.shots.filter((shot) => shot.live && shot.life > 0);
  for (const hit of m.impacts) hit.life -= dt;
  m.impacts = m.impacts.filter((hit) => hit.life > 0);
  for (const num of m.floats) num.life -= dt;
  m.floats = m.floats.filter((num) => num.life > 0);
}

function rubberMul(m: Match, r: Racer): number {
  if (!r.bot) return 1;
  if (m.ghost || m.ranked || m.pvp) return 1;
  if (r.bot.level === "dificil") return 1;
  const band = r.bot.rubber ?? 0;
  if (band <= 0) return 1;
  if (r.dist > m.strip * 0.85) return 1;
  const gap = m.player.dist - r.dist;
  if (Math.abs(gap) < 8) return 1;
  return gap > 0 ? 1 + band : 1 - band;
}

export { rubberMul };

function integrate(m: Match, r: Racer, throttle: number, dt: number) {
  if (r.jail) {
    r.speed = 0;
    r.rpm = Math.max(IDLE, r.rpm);
    if (m.phase === "race" && m.raceTime >= RACE_CONFIG.launch.redHold) {
      r.jail = false;
      r.launched = true;
      r.choke = Math.min(r.choke, 0.7);
      r.chokeT = Math.max(r.chokeT, 1.2);
    }
    return;
  }
  const rawMph = (r.bot ? m.rivalPace : m.pace) * REF_MPH;
  const vmaxMph = driveMph(rawMph);
  const vMax = vmaxMph / MPH_PER_MS;
  const A = accelA(vmaxMph);
  const box = gearBox(r.gears);
  const gi = Math.max(0, Math.min(box.frac.length - 1, r.gear - 1));
  const vTop = vMax * box.frac[gi]!;
  r.shiftLock = Math.max(0, r.shiftLock - dt);
  r.shiftAge += dt;
  if (r.boostT > 0) r.boostT = Math.max(0, r.boostT - dt);
  else r.boost = 0;
  if (r.chokeT > 0) r.chokeT = Math.max(0, r.chokeT - dt);
  else r.choke = 1;
  if (r.nitroOn > 0) r.nitroOn = Math.max(0, r.nitroOn - dt);
  if (r.freeze > 0) r.freeze = Math.max(0, r.freeze - dt);
  if (r.empT > 0) r.empT = Math.max(0, r.empT - dt);
  if (r.wrecked) {
    r.speed = Math.max(0, r.speed - 90 * dt);
    r.rpm = IDLE;
    r.nitroOn = 0;
    if (!r.finished) {
      const cap = m.strip - 1.2;
      r.dist = Math.min(cap, r.dist + r.speed * dt);
      if (r.dist >= cap - 0.05) r.speed = 0;
    }
    return;
  }
  if (r.finished) {
    r.speed *= Math.exp(-1.4 * dt);
    r.rpm = Math.max(IDLE, r.rpm * 0.96);
    r.dist += r.speed * dt;
    return;
  }
  if (!r.launched) {
    r.speed = 0;
    return;
  }
  const floor = r.gear === 1 ? 3800 : 1000;
  let rpm = Math.max((r.speed / Math.max(0.4, vTop)) * REDLINE, floor);
  const limited = rpm >= REDLINE;
  if (limited) {
    rpm = REDLINE;
    r.redlineT += dt;
  } else r.redlineT = 0;
  r.rpm = rpm;
  if (r.redlineT >= RACE_CONFIG.corteHold && !r.cutLatch && r.gear < r.gears) {
    r.cutLatch = true;
    if (r.bot) {
      r.choke = RACE_CONFIG.corteMul;
      r.chokeT = Math.max(r.chokeT, RACE_CONFIG.shiftTime.corte);
    }
  }
  const topMult = box.mult[box.mult.length - 1]!;
  const c = (0.6 * A * topMult * torqueAt(7600)) / (vMax * vMax);
  let forceMul = (1 + (r.boostT > 0 ? r.boost : 0)) * (r.chokeT > 0 ? r.choke : 1);
  if (r.nitroOn > 0) forceMul *= 1 + RACE_CONFIG.nitro.force;
  if (r.empT > 0) forceMul *= COMBAT.emp.forca;
  if (r.slow < 1 && r.slowT > 0) forceMul *= r.slow;
  const other = r.bot ? m.player : m.rival;
  const draft = draftOf(r, other);
  r.draft = draft;
  if (draft > 0) {
    r.draftT += dt;
    r.draftTime += dt;
    if (r.draftT >= RACE_CONFIG.draft.arm) forceMul *= 1 + RACE_CONFIG.draft.force;
  } else r.draftT = 0;
  const hpF = r.hpMax > 0 ? r.hp / r.hpMax : 1;
  let cap = hpF < 0.25 ? RACE_CONFIG.hpCap.low : hpF < 0.5 ? RACE_CONFIG.hpCap.half : 1;
  if (r.nitroOn > 0) cap *= 1 + RACE_CONFIG.nitro.cap;
  if (draft > 0 && r.draftT >= RACE_CONFIG.draft.arm) cap *= 1 + RACE_CONFIG.draft.cap;
  cap *= rubberMul(m, r);
  if (r.slow < 1 && r.slowT > 0) cap *= r.slow;
  const thr = throttle > 0.2 || r.bot ? 1 : 0.15;
  const lastShift = r.shifts[r.shifts.length - 1];
  const short = (lastShift === "cedo" || lastShift === "corte") && m.raceTime < 2.6 && r.shiftAge < 1.2 && r.speed < vTop * 0.9;
  const pull = short ? 2.05 : 1;
  const torqueRpm = short ? Math.max(rpm, 5200) : rpm;
  const force = A * torqueAt(torqueRpm) * box.mult[gi]! * forceMul * thr * pull;
  const drag = c * r.speed * r.speed;
  let a = force - drag;
  if (r.shiftLock > 0) {
    const g = r.shifts[r.shifts.length - 1];
    const cut = g === "perfeito" || g === "ok" ? 0.72 : g === "cedo" || g === "tarde" ? 0.3 : 0.2;
    a *= cut;
  }
  if (limited) a = Math.min(0, a);
  r.speed = Math.max(0, r.speed + a * dt);
  const gearCap = vTop * (limited ? 1 : 1.04);
  if (r.speed > gearCap) r.speed = gearCap;
  const capSpeed = vMax * cap;
  if (r.speed > capSpeed) r.speed += (capSpeed - r.speed) * Math.min(1, dt * 4);
  r.dist += r.speed * dt;
  if (!r.finished && r.dist >= m.strip) {
    r.finished = true;
    r.finishTime = m.raceTime;
    r.trap = r.speed;
    if (!r.bot) m.events.push("finish");
  }
}

function sinceGreen(m: Match): number {
  if (m.phase === "tree") return m.t - TREE_GREEN;
  if (m.phase === "race" || m.phase === "finish") return m.raceTime;
  if (m.phase === "staging") return -(TREE_GREEN + STAGE - m.t);
  return 0;
}

function stepRacer(m: Match, r: Racer, up: Upgrades, input: Input | null, dt: number, who: "you" | "ai") {
  const green = m.green || m.phase === "race" || m.phase === "finish" || m.phase === "free";
  const since = sinceGreen(m);
  r.hurt = Math.max(0, r.hurt - dt);
  r.iFrame = Math.max(0, r.iFrame - dt);
  r.slowImmune = Math.max(0, r.slowImmune - dt);
  if (r.shield > 0) {
    r.shield = Math.max(0, r.shield - dt);
    r.shieldAge += dt;
  }
  if (r.chargePause > 0) r.chargePause = Math.max(0, r.chargePause - dt);
  else if (r.charge < COMBAT.escudo.max) r.charge = Math.min(COMBAT.escudo.max, r.charge + COMBAT.escudo.regen * dt);
  if (r.cuspeBagT > 0) {
    r.cuspeBagT -= dt;
    if (r.cuspeBagT <= 0) r.cuspeBag = 0;
  }
  if (r.slowT > 0) {
    r.slowT -= dt;
    if (r.slowT <= 0) r.slow = 1;
  }
  if (r.poison > 0 && !r.wrecked) {
    r.hp = Math.max(0, r.hp - r.poison * dt);
    if (r.bot?.level === "facil" && (r.bot.rubber ?? 0) > 0 && !m.ranked && !m.pvp && !m.ghost && r.hp < 1) r.hp = 1;
    r.poisonTime += dt;
    markDead(m, r, who);
  }

  let justLaunched = false;
  if (m.phase === "free") {
    if (who === "you" && !r.launched && (input?.throttle ?? 0) > 0.25) {
      r.rpm = 4700;
      doLaunch(m, r, up, true, 0.2, "you");
      justLaunched = true;
    }
    if (who === "ai" && !r.launched && m.player.launched) {
      r.rpm = 4500;
      doLaunch(m, r, up, true, 0.3, "ai");
      justLaunched = true;
    }
  }

  if (!r.launched && m.phase !== "free" && (m.phase === "staging" || m.phase === "tree" || m.phase === "race")) {
    if (who === "you") {
      const gas = (input?.throttle ?? 0) > 0.5;
      const brake = !!input?.brake;
      if (brake) m.usedBrake = true;
      if (!r.jail) {
        const [lo, hi] = RACE_CONFIG.launch.green;
        const [pLo, pHi] = RACE_CONFIG.launch.perfect;
        const hold = (pLo + pHi) / 2;
        if (brake && gas) {
          const step = 3400 * dt;
          r.rpm = r.rpm < hold ? Math.min(hold, r.rpm + step) : Math.max(hold, r.rpm - step);
        } else if (brake && r.stageMem > 0) {
          r.rpm = r.launchRpm;
        } else if (gas) {
          r.rpm = Math.max(IDLE, Math.min(REDLINE, r.rpm + RACE_CONFIG.launch.rise * dt));
        } else {
          const fall = r.stageMem > 0 ? 650 : RACE_CONFIG.launch.fall;
          r.rpm = Math.max(IDLE, r.rpm - fall * dt);
        }
        if (brake && gas && r.rpm >= lo && r.rpm <= hi) {
          r.launchRpm = r.rpm;
          r.stageMem = 0.45;
        } else r.stageMem = Math.max(0, r.stageMem - dt);
      }
      const greenNow = (m.green || m.phase === "race") && m.phase !== "staging";
      const pedalUp = !brake;
      const pulseUp = !!input?.brakePulse && pedalUp;
      if (pulseUp) {
        m.usedBrake = true;
        if (input?.brakeUpMs) m.brakeUpWall = input.brakeUpMs;
      }
      const released = (m.brakeHeld && pedalUp && m.usedBrake) || (pulseUp && m.usedBrake);
      const gasDown = input?.gasDownMs ?? 0;
      const earlyMs = m.greenWall > 0 && gasDown > 0 ? gasDown - m.greenWall : 0;
      const jumped = !m.usedBrake && !r.jail && gas && greenNow && gasDown > 0 && earlyMs < -40;
      const gasGo = !m.usedBrake && !r.jail && gas && !m.heldGas && greenNow && !jumped;
      const holdAcross = !m.usedBrake && !r.jail && gas && m.heldGas && greenNow && !jumped && gasDown > 0 && earlyMs >= -40;
      const abandoned = greenNow && m.raceTime > 4 && !r.jail;
      if (released && input?.brakeUpMs) m.brakeUpWall = input.brakeUpMs;
      if (r.jail && greenNow && m.raceTime >= RACE_CONFIG.launch.redHold) {
        r.jail = false;
        r.launched = true;
        r.gear = 1;
        r.shiftLock = 0;
        r.shiftBuf = 0;
        r.shiftMark = null;
        r.choke = 0.7;
        r.chokeT = 1.2;
        r.redlineT = 0;
        r.launchGrade = "queimou";
        if (r.reaction == null) r.reaction = m.greenWall > 0 && m.brakeUpWall > 0 ? (m.brakeUpWall - m.greenWall) / 1000 : -0.25;
        justLaunched = true;
      } else if (!r.jail && released && !greenNow) {
        r.jail = true;
        r.redlight = true;
        r.launchGrade = "queimou";
        r.reaction = m.greenWall > 0 && m.brakeUpWall > 0 ? (m.brakeUpWall - m.greenWall) / 1000 : since;
        r.burns += 1;
        if (m.ranked && r.burns >= COMBAT.queimadasDq) r.dq = true;
        m.events.push("redlight");
        note(m, "QUEIMOU", 0.8);
        pulse(m, true, 0.3);
      } else if (!r.jail && jumped) {
        doLaunch(m, r, up, false, earlyMs / 1000, "you");
        justLaunched = true;
      } else if (!r.jail && (released || gasGo || holdAcross || abandoned)) {
        const manual = released || gasGo || holdAcross;
        const raw = released || gasGo ? reactionSeconds(m, input, Math.max(0, m.raceTime)) : holdAcross ? earlyMs / 1000 : Math.max(0, m.raceTime);
        const legal = greenNow && raw >= -0.001;
        doLaunch(m, r, up, legal, legal ? Math.max(0, raw) : raw, "you");
        if (!manual && abandoned) {
          r.launchAuto = true;
          note(m, "LARGADA AUTO", 1.4);
        }
        justLaunched = true;
      }
      m.brakeHeld = brake;
      m.heldGas = gas;
      if (justLaunched && brake) m.spaceLatch = true;
    }
  }

  if (who === "ai" && !r.launched && !r.jail && m.phase !== "free" && r.bot && m.phase === "tree" && r.bot.willFoul && m.t > TREE_GREEN - 0.12) {
    r.rpm = 5200;
    r.jail = true;
    r.redlight = true;
    r.launchGrade = "queimou";
    r.reaction = m.t - TREE_GREEN;
  }

  if (who === "ai" && r.jail && m.phase === "race" && m.raceTime >= RACE_CONFIG.launch.redHold) {
    r.jail = false;
    r.launched = true;
    r.choke = Math.min(r.choke, 0.7);
    r.chokeT = Math.max(r.chokeT, 1.2);
    justLaunched = true;
  }

  if (who === "ai" && !r.launched && !r.jail && m.phase !== "free" && r.bot && green && m.phase !== "staging" && since >= r.bot.reaction) {
    const react = Math.max(0, r.bot.reaction);
    r.rpm = react <= 0.2 ? 4800 : react <= 0.4 ? 5200 : 4700;
    doLaunch(m, r, up, true, react, "ai");
    justLaunched = true;
  }

  let didShift = false;
  if (who === "you" && r.launched && !r.wrecked && r.gear < r.gears && m.phase !== "finish") {
    const call = shiftCall(r.rpm, r.gear);
    const liveGreen = call === "perfeito" || call === "ok" ? call : null;
    const carried = r.shownT > 0 && (r.shown === "perfeito" || r.shown === "ok") ? r.shown : null;
    const promised = liveGreen ?? carried;
    if (r.shiftLock <= 0) {
      if (liveGreen) {
        r.shown = liveGreen;
        r.shownT = 0.28;
      } else {
        r.shownT = Math.max(0, r.shownT - dt);
        if (r.shownT <= 0) r.shown = null;
      }
    }
    const down = !!input?.shift;
    if (down && !r.shiftWasDown) {
      r.shiftGate = false;
      r.shiftBuf = 0.9;
    }
    if (!down || call === "cedo") r.shiftGate = false;
    if (down && !r.shiftGate) r.shiftBuf = Math.max(r.shiftBuf, 0.9);
    r.shiftWasDown = down;
    if (down && promised) {
      if (promised === "perfeito" || r.shiftMark !== "perfeito") r.shiftMark = promised;
    } else if (r.shiftBuf > 0 && liveGreen && r.shiftMark !== "perfeito") {
      r.shiftMark = liveGreen;
    } else if (down && r.shiftMark !== "perfeito" && r.shiftMark !== "ok" && call !== "cedo") {
      r.shiftMark = call;
    }
    if (down && promised && r.shiftMark !== "perfeito") r.shiftMark = promised;
  }
  const canShift =
    who === "you" &&
    (r.shiftBuf > 0 || r.shiftMark === "perfeito" || r.shiftMark === "ok") &&
    r.launched &&
    !justLaunched &&
    r.shiftLock <= 0 &&
    r.gear < r.gears &&
    m.phase !== "finish" &&
    r.freeze <= 0 &&
    !r.wrecked;
  if (canShift) {
    const g = r.shiftMark ?? shiftCall(r.rpm, r.gear);
    if (g === "cedo") {
      if (m.noteT <= 0) note(m, "CEDO");
    } else {
      gradeShift(m, r, up, "you");
      didShift = true;
    }
  }
  if (who === "you" && !didShift) {
    r.shiftBuf = Math.max(0, r.shiftBuf - dt);
    if (r.shiftBuf <= 0 && r.shiftMark !== "perfeito" && r.shiftMark !== "ok") r.shiftMark = null;
  }

  if (r.launched && m.phase !== "finish") {
    const held = who === "you" ? (input?.throttle ?? 0) : 1;
    const thr = m.phase === "free" ? (who === "you" ? (r.launched ? 1 : held) : 1) : 1;
    integrate(m, r, thr, dt);
  } else if (m.phase === "finish") {
    r.speed *= Math.exp(-0.35 * dt);
    r.dist += r.speed * dt;
    r.rpm = Math.max(IDLE, r.rpm * 0.98);
  }

  if (who === "you" && r.launched && r.gear < r.gears && m.phase !== "finish") {
    const n = r.rpm / REDLINE;
    const [lo, hi] = shiftWindow(up, r.gear);
    const inside = n >= lo && n <= hi && n < 1;
    if (inside) r.shiftGrace = 0.35;
    else r.shiftGrace = Math.max(0, r.shiftGrace - dt);
    if (inside && !r.band) m.events.push("band");
    r.band = inside;
  } else if (who === "you") r.band = false;

  if (who === "ai" && r.bot && r.launched && !justLaunched && r.shiftLock <= 0 && r.gear < r.gears && r.freeze <= 0 && !r.wrecked) {
    if (r.bot.mix) {
      if (!r.shiftPlan) r.shiftPlan = rollShift(r.bot, m.rng);
      const row = shiftRow(r.gear);
      const plan = r.shiftPlan;
      const target =
        plan === "perfeito" ? (row.pLo + row.pHi) / 2 : plan === "ok" ? row.lo + 120 : plan === "cedo" ? Math.max(4500, row.lo - 450) : plan === "tarde" ? Math.min(7980, row.hi + 60) : 4400;
      const ready = plan === "corte" ? r.rpm >= target || r.redlineT > RACE_CONFIG.corteHold : r.rpm >= target;
      if (ready) gradeShift(m, r, up, "ai");
    } else if (r.rpm / REDLINE >= r.shiftTarget) gradeShift(m, r, up, "ai");
  }
  if (who === "you" && m.bufNitro > 0) {
    const beforeOn = r.nitroOn;
    const beforeLeft = r.nitroLeft;
    armNitro(m, r, up, "you");
    if (r.nitroOn > beforeOn + 0.01 || r.nitroLeft < beforeLeft - 0.01) m.bufNitro = 0;
    else m.bufNitro = Math.max(0, m.bufNitro - dt);
  }
  if (who === "ai" && r.bot && r.launched && r.nitroOn <= 0 && r.gear >= Math.min(r.bot.nitroGear, r.gears) && r.freeze <= 0 && m.rng() < 0.015) {
    const n = r.rpm / REDLINE;
    if (n > 0.6 && n < 0.9) armNitro(m, r, up, "ai");
  }
  stepWeapons(m, r, input, dt, who);
}

export function paceOf(vmax: number): number {
  return Math.max(0.4, vmax / REF_MPH);
}

export function stripFor(_stats: StatBlock): number {
  return RACE_CONFIG.stripM;
}

export function armWeapon(racer: Racer, id: string, def: WeaponDef) {
  const next = def?.id ?? (id as WeaponId);
  if (racer.weapon !== next) {
    racer.weapon = next;
    racer.ammo = def.clip;
    racer.ammoMax = def.clip;
    racer.cool = 0;
    racer.lockT = 0;
  } else if (racer.ammoMax !== def.clip) {
    racer.ammoMax = def.clip;
    racer.ammo = Math.min(racer.ammo, def.clip);
  }
  racer.load = def;
}

export function armRear(racer: Racer, id: string, def: WeaponDef) {
  const next = def?.id ?? (id as WeaponId);
  if (racer.rear !== next) {
    racer.rear = next;
    racer.rearAmmo = def.clip;
    racer.rearAmmoMax = def.clip;
    racer.rearCool = 0;
  } else if (racer.rearAmmoMax !== def.clip) {
    racer.rearAmmoMax = def.clip;
    racer.rearAmmo = Math.min(racer.rearAmmo, def.clip);
  }
  racer.rearLoad = def;
}

export function createFree(stats: StatBlock, gears = 5): Match {
  const pace = paceOf(stats.vmax);
  const player = Object.assign(zeroRacer(null, stats, gears), { lane: 0 });
  const rival = Object.assign(
    zeroRacer({ reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 9, launch: 1, aim: 0 }, { ...stats, durability: 140, nitroTime: 0 }, gears),
    { lane: LANE_GAP, dist: 6, launched: false },
  );
  return {
    mode: "free",
    phase: "free",
    t: 0,
    raceTime: 0,
    green: true,
    callout: "",
    calloutT: 0,
    rivalId: null,
    ...blankMatch(player, rival, stripFor(stats), pace, pace),
  };
}

export function createDuel(
  rivalId: string,
  bot: Bot,
  player: StatBlock,
  rival: StatBlock,
  playerGears = 5,
  rivalGears = 5,
  seed = 0,
): Match {
  const lead = {
    ...player,
    vmax: Math.max(player.vmax, rival.vmax),
    durability: Math.max(player.durability, rival.durability),
  };
  return {
    mode: "duel",
    phase: "staging",
    t: 0,
    raceTime: 0,
    green: false,
    callout: "GAS",
    calloutT: 1.2,
    rivalId,
    ...blankMatch(
      Object.assign(zeroRacer(null, player, playerGears), { lane: -LANE_GAP }),
      Object.assign(zeroRacer(bot, rival, rivalGears), { lane: LANE_GAP }),
      stripFor(lead),
      paceOf(player.vmax),
      paceOf(rival.vmax),
      seed,
    ),
    badge: badgeForReaction(bot.reaction),
  };
}

export function createPvp(player: StatBlock, rival: StatBlock, playerGears = 5, rivalGears = 5): Match {
  const match = createDuel(
    "pvp",
    { reaction: 9, shiftAt: 0.92, jitter: 0, nitroGear: 9, launch: 0.8, aim: 0 },
    player,
    rival,
    playerGears,
    rivalGears,
  );
  match.pvp = true;
  return match;
}

function nearestLane(lane: number) {
  let best = 1;
  let bestD = 99;
  LANES.forEach((x, i) => {
    const d = Math.abs(x - lane);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function beginLane(r: Racer, dir: number) {
  if (r.laneT > 0 || !dir || r.wrecked) return;
  const i = nearestLane(r.lane);
  const next = Math.max(0, Math.min(LANES.length - 1, i + dir));
  if (next === i) return;
  r.laneFrom = r.lane;
  r.laneGoal = LANES[next]!;
  r.laneT = RACE_CONFIG.laneTime;
}

function tickLane(r: Racer, dt: number) {
  if (r.laneT <= 0) {
    r.yaw *= Math.exp(-8 * dt);
    return;
  }
  const total = RACE_CONFIG.laneTime;
  r.laneT = Math.max(0, r.laneT - dt);
  const u = 1 - r.laneT / total;
  const e = u * u * (3 - 2 * u);
  r.lane = r.laneT === 0 ? r.laneGoal : r.laneFrom + (r.laneGoal - r.laneFrom) * e;
  r.yaw = ((r.laneGoal - r.laneFrom) / 2.2) * -0.32 * Math.sin(Math.min(1, u) * Math.PI);
}

function tryRam(m: Match, r: Racer, dir: number, who: "you" | "ai") {
  if (!dir || r.ramCd > 0 || r.wrecked) return;
  r.ramCd = COMBAT.pancada.cd;
  const foe = who === "you" ? m.rival : m.player;
  const toward = foe ? Math.sign(foe.lane - r.lane) : 0;
  const side = !!foe && Math.abs(foe.dist - r.dist) <= COMBAT.pancada.distM && toward !== 0 && Math.abs(foe.lane - r.lane) < 3.3;
  if (who === "you") markFeedback(m, "AD");
  if (!foe || !side || toward !== Math.sign(dir)) {
    beginLane(r, dir);
    r.choke = Math.min(r.choke, 0.92);
    r.chokeT = Math.max(r.chokeT, COMBAT.pancada.erroS);
    if (who === "you") note(m, "DERRAPOU");
    return;
  }
  const i = nearestLane(foe.lane);
  const next = i + Math.sign(dir);
  const wall = next < 0 || next > 2;
  const pct = wall ? COMBAT.pancada.muretaPct : COMBAT.pancada.alvoPct;
  applyHit(m, foe, "tail", Math.max(1, Math.round(foe.hpMax * pct)), false, r, wall ? "MURETA" : "PANCADA");
  if (wall) addSlow(foe, COMBAT.pancada.muretaLento, COMBAT.pancada.muretaS);
  else beginLane(foe, Math.sign(dir));
  applyHit(m, r, "tail", Math.max(1, Math.round(r.hpMax * COMBAT.pancada.atacantePct)), false, foe, "PANCADA");
  addSlow(r, COMBAT.pancada.atacanteLento, COMBAT.pancada.atacanteS);
  if (who === "you") {
    m.events.push("ram");
    note(m, wall ? "MURETA" : "PANCADA");
    m.shakePx = Math.max(m.shakePx, 5);
  }
}

function chaseGhost(r: Racer, dt: number) {
  if (r.hpGhost > r.hp) r.hpGhost = Math.max(r.hp, r.hpGhost - r.hpMax * (dt / 0.4));
  else r.hpGhost = r.hp;
}

export function stepMatch(m: Match, input: Input, dt: number, playerUp: Upgrades, rivalUp: Upgrades | null) {
  m.events = [];
  const h = Math.min(dt, 0.05);
  m.hitStopCd = Math.max(0, m.hitStopCd - h);
  if (input.fireEdge) m.bufFire = 0.55;
  if (input.rearEdge) m.bufRear = 0.55;
  if (input.shield) m.bufShield = COMBAT.input.bufferS;
  if (input.shift) m.bufShift = true;
  if (input.nitro) m.bufNitro = 2.4;
  if (m.hitStop > 0) {
    m.hitStop = Math.max(0, m.hitStop - h);
    return;
  }
  if (!input.brake) m.spaceLatch = false;
  const liveInput: Input = m.bufShift ? { ...input, shift: true } : input;
  m.bufShift = false;
  m.tick += 1;
  if (m.phase === "staging") {
    m.t += h;
    if (m.t >= STAGE) {
      m.phase = "tree";
      m.t = 0;
    }
  } else if (m.phase === "tree") {
    const before = m.t;
    m.t += h;
    if (before < 1 && m.t >= 1) m.events.push("lamp");
    if (before < 2 && m.t >= 2) m.events.push("lamp");
    if (m.t >= TREE_GREEN) {
      const over = m.t - TREE_GREEN;
      m.phase = "race";
      m.green = true;
      m.raceTime = over;
      m.t = 0;
      if (input.nowMs) m.greenWall = input.nowMs - over * 1000;
      if (m.player.jail && m.player.reaction == null && m.greenWall > 0 && m.brakeUpWall > 0) {
        m.player.reaction = (m.brakeUpWall - m.greenWall) / 1000;
      }
      m.events.push("green");
      m.goTick = m.tick;
      m.flash = Math.max(m.flash, 0.72);
      m.flashHot = false;
    }
  } else if (m.phase === "race" || m.phase === "free") {
    if (m.phase === "race") m.raceTime += h;
    else if (m.player.launched) m.raceTime += h;
  }

  const raw = Math.sign(input.steer || 0);
  if (raw !== m.steerLatch) {
    if (raw !== 0 && !liveInput.ram && m.player.freeze <= 0 && !m.player.wrecked) {
      if (m.alertMine > 0 || m.alertMissile > 0) m.player.dodged += 1;
      beginLane(m.player, -raw);
    }
    m.steerLatch = raw;
  }
  if (liveInput.ram && m.player.launched && m.player.ramCd <= 0 && m.player.freeze <= 0 && !m.player.wrecked) {
    tryRam(m, m.player, liveInput.ram, "you");
  }
  m.player.ramCd = Math.max(0, m.player.ramCd - h);
  tickLane(m.player, h);
  if (m.rival) {
    const bot = m.rival.bot;
    if (!m.rival.wrecked && m.rival.launched && m.rival.laneT <= 0 && bot && !m.pvp) {
      const threat = m.shots.some(
        (shot) =>
          shot.live &&
          shot.owner === "you" &&
          ((shot.weapon !== "mine" && m.rival!.dist > shot.dist && m.rival!.dist - shot.dist < 28) ||
            (shot.weapon === "mine" && shot.dist > m.rival!.dist && shot.dist - m.rival!.dist < 36)) &&
          Math.abs(shot.lane - m.rival!.lane) < 0.85,
      );
      if (threat) {
        m.rival.dodgeArm += h;
        const delay = bot.dodgeDelay ?? 0.05;
        if (m.rival.dodgeArm >= delay) {
          m.rival.dodgeArm = 0;
          if (bot.style === "duelista" && m.rival.charge >= COMBAT.escudo.custo && m.rival.shield <= 0 && m.rng() < 0.65) tryShield(m, m.rival, "ai");
          else if (m.rng() < (bot.dodge ?? 0.35)) {
            const i = nearestLane(m.rival.lane);
            beginLane(m.rival, i <= 0 ? 1 : i >= 2 ? -1 : m.rng() < 0.5 ? -1 : 1);
            m.rival.dodged += 1;
          }
        }
      } else m.rival.dodgeArm = 0;
      if (m.player.launched && m.rival.laneT <= 0 && Math.abs(m.rival.lane - m.player.lane) < 0.7) {
        m.rival.laneArm += h;
        if (m.rival.laneArm >= 0.25) {
          m.rival.laneArm = 0;
          const i = nearestLane(m.rival.lane);
          const dir = i <= 0 ? 1 : i >= 2 ? -1 : m.player.lane >= m.rival.lane ? -1 : 1;
          beginLane(m.rival, dir);
        }
      } else if (Math.abs(m.rival.lane - m.player.lane) >= 0.7) m.rival.laneArm = 0;
    }
    if (bot) bot.mineGap = Math.max(0, (bot.mineGap ?? 0) - h);
    tickLane(m.rival, h);
  }

  stepRacer(m, m.player, playerUp, liveInput, h, "you");
  if (m.rival && !m.pvp && m.mode === "duel" && rivalUp) stepRacer(m, m.rival, rivalUp, null, h, "ai");
  if (m.rival && !m.pvp && m.mode === "free") stepRacer(m, m.rival, playerUp, null, h, "ai");
  if (
    m.rival?.bot &&
    !m.pvp &&
    !m.ghost &&
    !m.ranked &&
    m.mode === "duel" &&
    (m.rival.bot.rubber ?? 0) > 0 &&
    m.rival.bot.level !== "dificil" &&
    m.rival.launched &&
    m.player.launched &&
    !m.rival.wrecked &&
    !m.player.wrecked &&
    m.rival.dist < m.strip * 0.8 &&
    m.player.dist < m.strip * 0.8
  ) {
    const gap = m.rival.dist - m.player.dist;
    if (gap > 55) {
      const rate = gap > 100 ? 42 : 24;
      m.rival.dist -= Math.min(gap - 42, rate * h);
    }
  }
  stepShots(m, h);
  for (const box of m.crates) {
    if (box.taken || !m.player.launched || m.player.wrecked) continue;
    if (Math.abs(m.player.dist - box.dist) < 3.2 && Math.abs(m.player.lane - box.lane) < 0.95) {
      box.taken = true;
      if (box.kind === "nitro") {
        m.player.nitroLeft = Math.min(m.player.nitroMax, m.player.nitroLeft + RACE_CONFIG.nitro.burn);
        note(m, "NITRO");
      } else if (box.kind === "repair") {
        m.player.hp = Math.min(m.player.hpMax, m.player.hp + m.player.hpMax * RACE_CONFIG.repair);
        note(m, "REPARO");
      } else {
        const front = m.player.ammo <= 0;
        const rear = m.player.rearAmmo <= 0;
        if (front) m.player.ammo = Math.min(m.player.ammoMax, m.player.ammo + RACE_CONFIG.ammoFront);
        if (rear) m.player.rearAmmo = Math.min(m.player.rearAmmoMax, m.player.rearAmmo + RACE_CONFIG.ammoRear);
        if (front || rear) note(m, "MUNICAO");
      }
      m.player.crates += 1;
      m.events.push("ammo");
    }
  }
  for (const hazard of m.hazards) {
    if (hazard.hit || !m.player.launched || m.player.wrecked) continue;
    if (Math.abs(m.player.dist - hazard.dist) < 2.4 && Math.abs(m.player.lane - hazard.lane) < 0.95) {
      hazard.hit = true;
      if (hazard.kind === "piche") {
        m.player.slow = Math.min(m.player.slow, RACE_CONFIG.hazard.piche);
        m.player.slowT = Math.max(m.player.slowT, RACE_CONFIG.hazard.picheT);
        note(m, "PICHE");
      } else {
        const dmg = Math.max(1, Math.round(m.player.hpMax * RACE_CONFIG.hazard.bone));
        m.player.hp = Math.max(0, m.player.hp - dmg);
        m.shakePx = Math.max(m.shakePx, 6);
        logDmg(m, m.player, "OSSADA", dmg);
        popHit(m, m.player, "mg", dmg, "OSSADA", true);
        note(m, "OSSADA");
        if (m.player.hp <= 0) {
          m.player.wrecked = true;
          note(m, "DNF");
        }
      }
    }
  }

  if (m.player.wrecked || m.rival?.wrecked) m.wreckHold += h;
  else m.wreckHold = 0;

  if (m.mode === "free" && m.player.dist >= m.strip && m.practiceEt == null && m.player.launched) {
    m.practiceEt = m.raceTime;
    note(m, "FEITO");
    m.events.push("practice");
  }

  if (m.mode === "duel" && m.phase === "race") {
    if (m.firstCross == null) {
      if (m.player.finished && !m.player.wrecked) m.firstCross = m.player.finishTime;
      else if (m.rival?.finished && !m.rival.wrecked) m.firstCross = m.rival.finishTime;
    }
    const rivalOut = !m.rival || m.rival.finished || m.rival.wrecked || m.rival.dq;
    const youOut = m.player.finished || m.player.wrecked || m.player.dq;
    const youCrossed = m.player.finished && !m.player.wrecked && m.player.finishTime != null;
    const sinceYou = youCrossed ? m.raceTime - (m.player.finishTime ?? m.raceTime) : 0;
    if ((youOut && rivalOut) || (youCrossed && sinceYou >= 1.25) || m.raceTime > RACE_CONFIG.timeout) {
      m.phase = "finish";
      m.reason = raceReason(m);
    }
  }
  if (m.mode === "free" && m.phase === "free" && (m.player.finished || m.player.wrecked)) m.phase = "finish";

  chaseGhost(m.player, h);
  if (m.rival) chaseGhost(m.rival, h);
  m.blockFront = Math.max(0, m.blockFront - h);
  m.blockRear = Math.max(0, m.blockRear - h);
  m.noteT = Math.max(0, m.noteT - h);
  m.shotCallT = Math.max(0, m.shotCallT - h);
  if (m.shotCallT <= 0) m.shotCall = "";
  m.bufFire = input.fireEdge ? m.bufFire : Math.max(0, m.bufFire - h);
  m.bufRear = input.rearEdge ? m.bufRear : Math.max(0, m.bufRear - h);
  for (const row of m.feed) row.life -= h;
  m.feed = m.feed.filter((row) => row.life > 0);
  if (m.rival) m.rival.ramCd = Math.max(0, m.rival.ramCd - h);
  const backGap = m.rival ? m.player.dist - m.rival.dist : 99;
  const behind = backGap >= COMBAT.camera.janelaRivalAtrasM[0] && backGap <= COMBAT.camera.janelaRivalAtrasM[1];
  const ease = behind ? COMBAT.camera.easeEntraS : COMBAT.camera.easeSaiS;
  m.camPull += ((behind ? 1 : 0) - m.camPull) * Math.min(1, h / Math.max(0.05, ease));
  if (m.player.wrecked) m.banner = "QUEBRADO";
  else if (m.player.dq) m.banner = "DESCLASSIFICADO";
  else if (m.player.jail) m.banner = "QUEIMOU";
  else if (m.phase === "staging") m.banner = "";
  else if (m.phase === "tree") m.banner = m.t < 1 ? "3" : m.t < 2 ? "2" : "1";
  else if (m.phase === "race" && !m.player.launched) m.banner = "VAI";
  else if (m.noteT > 0 && m.note && !["PERFEITO", "BOM", "CEDO", "TARDE", "CORTE", "MÍSSIL", "MINA", "AGORA — PERFEITO", "AGORA — BOM"].includes(m.note)) m.banner = m.note;
  else m.banner = "";
  m.alertMissile = 0;
  m.alertMine = 0;
  for (const shot of m.shots) {
    if (!shot.live || shot.owner === "you") continue;
    if (shot.weapon === "mine") {
      const gap = shot.dist - m.player.dist;
      if (gap > 0 && gap < COMBAT.mina.verM && Math.abs(shot.lane - m.player.lane) < 0.9) m.alertMine = 1;
    }
    if (shot.weapon === "missile" || shot.weapon === "homing") {
      const ahead = shot.dist - m.player.dist;
      const closing = (ahead > 0 && shot.speed < m.player.speed) || (ahead < 0 && shot.speed > m.player.speed);
      if (Math.abs(ahead) > 0.4 && Math.abs(ahead) < 50 && closing && Math.abs(shot.lane - m.player.lane) < 0.9) m.alertMissile = 1;
    }
  }

  m.shake = Math.max(0, m.shake - h * 1.8);
  m.shakePx *= Math.exp(-h / 0.09);
  const holdFov = m.player.nitroOn > 0 ? 8 : 0;
  if (m.fovKick < holdFov) m.fovKick = Math.min(holdFov, m.fovKick + h * (8 / 0.12));
  else if (m.player.nitroOn <= 0) {
    const rate = m.fovKick > 4.1 ? 8 / 0.6 : 4 / 0.4;
    m.fovKick = Math.max(0, m.fovKick - h * rate);
  }
  m.flash = Math.max(0, m.flash - h * 2.4);
  m.calloutT = Math.max(0, m.calloutT - h);
}

export function raceVerdict(m: Match): "win" | "loss" | "draw" {
  if (m.player.dq) return "loss";
  const rival = m.rival;
  if (m.player.redlight && !rival?.redlight) return "loss";
  if (!rival) return m.player.finished && !m.player.wrecked ? "win" : "loss";
  const you = m.player.finished && !m.player.wrecked;
  const them = rival.finished && !rival.wrecked;
  if (you && them) return (m.player.finishTime ?? 0) <= (rival.finishTime ?? 0) ? "win" : "loss";
  if (you) return "win";
  if (them) return "loss";
  return "draw";
}

export function raceReason(m: Match): string {
  if (m.player.dq) return "Desclassificado: 2 queimadas";
  if (m.player.redlight && !m.rival?.redlight) return "Queimou a largada";
  const you = m.player.finished && !m.player.wrecked;
  const them = !!m.rival && m.rival.finished && !m.rival.wrecked;
  if (m.player.wrecked && m.rival?.wrecked) return "DNF duplo";
  if (you && m.rival?.wrecked) return "Rival DNF";
  if (m.player.wrecked && them) return "Você DNF";
  if (you && them && m.player.finishTime != null && m.rival?.finishTime != null) {
    const d = Math.abs(m.player.finishTime - m.rival.finishTime);
    const ahead = m.player.finishTime <= m.rival.finishTime;
    return ahead ? `Você cruzou ${d.toFixed(2)} s antes` : `Ele cruzou ${d.toFixed(2)} s antes`;
  }
  if (you && !them) return "Ele não terminou";
  if (!you && them) return "Você não terminou";
  return "EMPATE / DNF DUPLO";
}

export function kmh(speed: number): number {
  return speed * 3.6;
}

export function mph(speed: number): number {
  return speed * 2.236936;
}

export type PerfLine = { label: string; pct: number };

export function performanceOf(m: Match): { raw: number; cap: number; lines: PerfLine[] } {
  const lines: PerfLine[] = [];
  const perfects = m.player.shifts.filter((g) => g === "perfeito").length;
  if (perfects > 0) lines.push({ label: `${perfects} perfeita${perfects > 1 ? "s" : ""}`, pct: perfects * 0.03 });
  const reaction = m.player.reaction;
  if (!m.player.redlight && reaction != null && reaction >= 0 && reaction < 0.2) lines.push({ label: "reação < 200 ms", pct: 0.05 });
  if (m.player.hits > 0) lines.push({ label: `${m.player.hits} acerto${m.player.hits > 1 ? "s" : ""}`, pct: m.player.hits * 0.02 });
  if (!m.player.wrecked && m.player.hp >= m.player.hpMax - 0.01) lines.push({ label: "sem dano", pct: 0.05 });
  if (m.player.nitroPerfect > 0) lines.push({ label: `${m.player.nitroPerfect} nitro perfeito`, pct: m.player.nitroPerfect * 0.05 });
  if (m.player.perfectDef > 0) lines.push({ label: `${m.player.perfectDef} defesa perfeita`, pct: m.player.perfectDef * 0.02 });
  if (m.player.minesBroken > 0) lines.push({ label: `${m.player.minesBroken} mina destruída`, pct: m.player.minesBroken * 0.01 });
  const raw = lines.reduce((sum, line) => sum + line.pct, 0);
  return { raw, cap: Math.min(0.5, raw), lines };
}

export function purse(baseWin: number, kind: "win" | "loss" | "draw", m: Match) {
  const base = kind === "win" ? baseWin : kind === "draw" ? Math.round(baseWin * 0.2) : Math.round(baseWin * 0.4);
  const perf = performanceOf(m);
  return { base, cap: perf.cap, raw: perf.raw, lines: perf.lines, total: Math.max(0, Math.round(base * (1 + perf.cap))) };
}

export type RaceStats = {
  et: number | null;
  reactionMs: number | null;
  trapMph: number;
  shifts: { perfeito: number; bom: number; cedo: number; tarde: number; corte: number };
  fired: number;
  hits: number;
  accuracy: number;
  minesDodged: number;
  crates: number;
  draftTime: number;
  nitroPerfect: number;
  win: boolean;
  base: number;
  bonusPct: number;
  fossil: number;
  suspect: boolean;
  gears: number;
};

export function raceStatsOf(m: Match, fossil: number, win: boolean, base: number, bonusPct: number): RaceStats {
  const count = (g: Grade) => m.player.shifts.filter((item) => item === g).length;
  const fired = m.player.fired;
  const hits = m.player.hits;
  return {
    et: m.player.finishTime,
    reactionMs: m.player.reaction == null ? null : Math.round(m.player.reaction * 1000),
    trapMph: Math.round(mph(m.player.trap)),
    shifts: { perfeito: count("perfeito"), bom: count("ok"), cedo: count("cedo"), tarde: count("tarde"), corte: count("corte") },
    fired,
    hits,
    accuracy: fired > 0 ? hits / fired : 0,
    minesDodged: m.player.dodged,
    crates: m.player.crates,
    draftTime: m.player.draftTime,
    nitroPerfect: m.player.nitroPerfect,
    win,
    base,
    bonusPct,
    fossil,
    suspect: m.player.suspect,
    gears: m.player.gears,
  };
}
