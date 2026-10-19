import assert from "node:assert/strict";
import test from "node:test";
import type { StatBlock, Upgrades } from "./data.ts";
import { RACE_CONFIG, driveMph, hudOverlap } from "./raceConfig.ts";
import {
  armRear,
  armWeapon,
  botForLevel,
  createDuel,
  gearsFor,
  purse,
  raceVerdict,
  rubberMul,
  sampleReaction,
  stepMatch,
  type Bot,
  type Grade,
  type Input,
  type Match,
} from "./sim.ts";
import { weaponById } from "./weapons.ts";

const up: Upgrades = { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
const comum: StatBlock = { durability: 53, vmax: 162, accel: 58, nitroTime: 1.8, power: 62 };

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rowFor(gear: number) {
  return RACE_CONFIG.shift[Math.max(0, Math.min(RACE_CONFIG.shift.length - 1, gear - 1))]!;
}

function driveGrade(kind: "perfeito" | "ok", gears: number, seed = 3): number | null {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("prova", bot, comum, comum, gears, gears, seed);
  m.hazards = [];
  m.crates = [];
  if (m.rival) m.rival.lane = 2.2;
  let brake = true;
  let wall = 20_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 55 && !m.player.finished && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    const rpm = m.player.rpm;
    let throttle = 1;
    if (!m.player.launched) throttle = rpm > 4900 ? 0 : 1;
    if (m.phase === "race" && !m.player.launched && m.raceTime >= 0.25) brake = false;
    const row = rowFor(m.player.gear);
    let shift = false;
    if (m.player.launched && m.player.shiftLock <= 0 && m.player.gear < gears) {
      if (kind === "perfeito" && rpm >= row.pLo && rpm <= row.pHi + 40) shift = true;
      if (kind === "ok" && rpm >= row.lo + 40 && rpm < row.pLo) shift = true;
    }
    const input: Input = {
      throttle,
      steer: 0,
      shift,
      nitro: false,
      brake: brake && !m.player.launched,
      nowMs: wall,
      brakeUpMs: brake ? null : wall,
    };
    stepMatch(m, input, dt, up, up);
  }
  return m.player.finishTime;
}

test("compressão acima de 260 mph fica entre 185 e 225", () => {
  assert.equal(driveMph(160), 160);
  assert.equal(driveMph(260), 260);
  const low = driveMph(261);
  assert.ok(low >= 185 && low < 190, String(low));
  assert.equal(Math.round(driveMph(11960)), 225);
});

test("marchas por raridade", () => {
  assert.equal(gearsFor("Comum"), 6);
  assert.equal(gearsFor("Normal"), 6);
  assert.equal(gearsFor("Raro"), 6);
  assert.equal(gearsFor("Épico"), 7);
  assert.equal(gearsFor("Lendário"), 8);
});

test("HUD 1280x720 sem caixas sobrepostas e mira acima do painel", () => {
  assert.deepEqual(hudOverlap(), []);
});

test("reação usa o timestamp da tecla, não o frame solto", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("reacao", bot, comum, comum, 6, 6, 9);
  let wall = 50_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8; i++) {
    wall += 1000 * dt;
    if (m.phase === "race" && m.raceTime >= 0.2 && brake) {
      brake = false;
      releaseAt = wall;
    }
    const input: Input = {
      throttle: m.player.rpm > 4850 ? 0 : 1,
      steer: 0,
      shift: false,
      nitro: false,
      brake,
      nowMs: wall,
      brakeUpMs: brake ? null : releaseAt,
    };
    stepMatch(m, input, dt, up, up);
    if (m.player.launched) break;
  }
  assert.ok(m.player.launched);
  assert.ok(m.greenWall > 0);
  const expect = (releaseAt - m.greenWall) / 1000;
  assert.ok(m.player.reaction != null);
  assert.ok(Math.abs((m.player.reaction ?? 0) - expect) < 1 / 60, `${m.player.reaction} vs ${expect}`);
});

test("queimar a largada não troca o vencedor: vale o tempo", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("lugar", bot, comum, comum, 6, 6, 4);
  m.player.redlight = true;
  m.player.launchGrade = "queimou";
  m.player.finished = true;
  m.player.finishTime = 19.3;
  m.player.reaction = -2.833;
  if (m.rival) {
    m.rival.finished = true;
    m.rival.finishTime = 23.183;
  }
  assert.equal(raceVerdict(m), "win");
  m.player.finishTime = 24;
  assert.equal(raceVerdict(m), "loss");
});

test("queimar a largada segura o carro 0,6 s depois do VAI", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("queima", bot, comum, comum, 6, 6, 4);
  let wall = 80_000;
  let brake = true;
  let burned = false;
  const dt = 1 / 60;
  let maxSpeedDuring = 0;
  for (let i = 0; i < 60 * 8; i++) {
    wall += 1000 * dt;
    if (!burned && m.phase === "tree" && m.t > 2.4) {
      brake = false;
      burned = true;
    }
    const input: Input = {
      throttle: 1,
      steer: 0,
      shift: false,
      nitro: false,
      brake,
      nowMs: wall,
      brakeUpMs: burned ? wall - 400 : null,
    };
    stepMatch(m, input, dt, up, up);
    if (m.phase === "race" && m.raceTime < 0.6) maxSpeedDuring = Math.max(maxSpeedDuring, m.player.speed);
    if (m.phase === "race" && m.raceTime > 0.85) break;
  }
  assert.equal(m.player.launchGrade, "queimou");
  assert.ok(maxSpeedDuring < 0.2, `andou cedo ${maxSpeedDuring}`);
  assert.ok(m.player.launched);
  assert.ok(m.player.speed > 0.2 || m.player.dist > 0.2);
});

test("cinco trocas perfeitas batem cinco BOM por cerca de 0,6 s", () => {
  const perfect = driveGrade("perfeito", 6);
  const bom = driveGrade("ok", 6);
  assert.ok(perfect != null && bom != null, `${perfect} ${bom}`);
  const delta = (bom ?? 0) - (perfect ?? 0);
  assert.ok(Math.abs(delta - 0.6) <= 0.2, `delta ${delta.toFixed(3)} perfeito ${perfect?.toFixed(3)} bom ${bom?.toFixed(3)}`);
});

test("marcha extra no máximo ~0,2 s e não quebra o tempo no BOM", () => {
  const p6 = driveGrade("perfeito", 6, 11);
  const p8 = driveGrade("perfeito", 8, 11);
  const b6 = driveGrade("ok", 6, 11);
  const b8 = driveGrade("ok", 8, 11);
  assert.ok(p6 && p8 && b6 && b8);
  const gain = (p6 ?? 0) - (p8 ?? 0);
  assert.ok(gain <= 0.25 && gain >= -0.05, `ganho perfeito 8 vs 6 = ${gain.toFixed(3)} (${p6?.toFixed(3)} vs ${p8?.toFixed(3)})`);
  const drift = Math.abs((b6 ?? 0) - (b8 ?? 0));
  assert.ok(drift <= 0.2, `BOM 6 vs 8 desviou ${drift.toFixed(3)} (${b6?.toFixed(3)} vs ${b8?.toFixed(3)})`);
});

test("histograma de reação fica na tabela e dentro de 150–600 ms", () => {
  for (const level of ["facil", "medio", "dificil"] as const) {
    const rnd = mulberry(level === "facil" ? 2 : level === "medio" ? 3 : 4);
    const xs = Array.from({ length: 400 }, () => sampleReaction(level, rnd));
    const mean = xs.reduce((s, n) => s + n, 0) / xs.length;
    const target = level === "facil" ? 0.38 : level === "medio" ? 0.28 : 0.21;
    assert.ok(Math.abs(mean - target) < 0.025, `${level} média ${mean}`);
    assert.ok(xs.every((n) => n >= 0.15 - 1e-9 && n <= 0.6 + 1e-9));
  }
});

test("difícil, ranqueado e fantasma não têm rubber band", () => {
  const hard = createDuel("rb", botForLevel("dificil", mulberry(8)), comum, comum, 6, 6, 8);
  hard.player.dist = 200;
  if (hard.rival) {
    hard.rival.dist = 40;
    hard.rival.launched = true;
    assert.equal(rubberMul(hard, hard.rival), 1);
  }
  const easy = createDuel("rb2", botForLevel("facil", mulberry(9)), comum, comum, 6, 6, 9);
  easy.player.dist = 200;
  if (easy.rival) {
    easy.rival.dist = 40;
    easy.rival.launched = true;
    assert.ok(rubberMul(easy, easy.rival) > 1);
    easy.ghost = true;
    assert.equal(rubberMul(easy, easy.rival), 1);
    easy.ghost = false;
    easy.ranked = true;
    assert.equal(rubberMul(easy, easy.rival), 1);
    easy.ranked = false;
    easy.rival.dist = easy.strip * 0.9;
    assert.equal(rubberMul(easy, easy.rival), 1);
  }
});

function steerTo(target: number, lane: number): number {
  if (Math.abs(target - lane) < 0.45) return 0;
  const want = target > lane ? 1 : -1;
  return -want;
}

function runBalance(seed: number): "clean" | "spammer" | "draw" {
  const rnd = mulberry(seed);
  const spam = botForLevel("facil", rnd);
  spam.reaction = 0.28;
  spam.mix = [0.02, 0.48, 0.4, 0.08, 0.02];
  spam.aim = 0.92;
  spam.lock = 1;
  spam.dodge = 0.12;
  spam.dodgeDelay = 0.45;
  spam.rubber = 0;
  spam.willFoul = false;
  spam.mines = 5;
  spam.nitroGear = 99;
  spam.laneDelay = 0.45;
  spam.level = "facil";
  const m: Match = createDuel("bal", spam, comum, comum, 6, 6, seed);
  const missile = weaponById("missile");
  const mine = weaponById("mine");
  armWeapon(m.player, "missile", missile);
  armRear(m.player, "mine", mine);
  if (m.rival) {
    armWeapon(m.rival, "missile", missile);
    armRear(m.rival, "mine", mine);
  }
  const plans: Grade[] = [0, 1, 2, 3, 4].map(() => (rnd() < 0.7 ? "perfeito" : "ok"));
  let brake = true;
  let wall = 30_000 + seed;
  const dt = 1 / 60;
  const lanes = [-2.2, 0, 2.2];
  let threatOn = false;
  let dodgeRolled = false;
  let dodgeThis = false;
  for (let i = 0; i < 60 * 60 && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    const p = m.player;
    let throttle = 1;
    if (!p.launched) throttle = p.rpm > 4900 ? 0 : 1;
    if (m.phase === "race" && !p.launched && m.raceTime >= 0.2) brake = false;
    const row = rowFor(p.gear);
    const plan = plans[p.gear - 1] ?? "perfeito";
    let shift = false;
    if (p.launched && p.shiftLock <= 0 && p.gear < p.gears) {
      if (plan === "perfeito" && p.rpm >= row.pLo && p.rpm <= row.pHi + 30) shift = true;
      if (plan === "ok" && p.rpm >= row.lo + 30 && p.rpm < row.pLo) shift = true;
    }
    let steer = 0;
    if (p.launched && p.laneT <= 0) {
      const threat = m.shots.some((shot) => {
        if (!shot.live || shot.owner !== "ai") return false;
        if (Math.abs(shot.lane - p.lane) > 0.8) return false;
        if (shot.weapon === "mine") return shot.dist > p.dist - 2 && shot.dist - p.dist < 42;
        return shot.dist < p.dist && p.dist - shot.dist < 80;
      });
      const bone = m.hazards.some((h) => !h.hit && Math.abs(h.lane - p.lane) < 0.8 && h.dist > p.dist && h.dist - p.dist < 28);
      if (bone) {
        const other = lanes.find((lane) => Math.abs(lane - p.lane) > 0.4) ?? 0;
        steer = steerTo(other, p.lane);
      } else if (threat) {
        if (!threatOn) {
          threatOn = true;
          dodgeRolled = false;
          dodgeThis = false;
        }
        if (!dodgeRolled) {
          dodgeRolled = true;
          dodgeThis = rnd() < 0.33;
        }
        if (dodgeThis) {
          const other = lanes.find((lane) => Math.abs(lane - p.lane) > 0.4) ?? 0;
          steer = steerTo(other, p.lane);
        }
      } else {
        threatOn = false;
        dodgeRolled = false;
        dodgeThis = false;
        const box = m.crates.find((c) => !c.taken && c.dist > p.dist + 4 && c.dist - p.dist < 70);
        const gap = m.rival ? m.rival.dist - p.dist : 99;
        if (box) steer = steerTo(box.lane, p.lane);
        else if (m.rival && gap > 8 && gap < 35) steer = steerTo(m.rival.lane, p.lane);
      }
    }
    stepMatch(
      m,
      { throttle, steer, shift, nitro: false, fire: false, rear: false, brake: brake && !p.launched, nowMs: wall, brakeUpMs: brake ? null : wall },
      dt,
      up,
      up,
    );
  }
  const you = m.player.finishTime;
  const them = m.rival?.finishTime ?? null;
  if (m.player.wrecked && m.rival?.wrecked) return "draw";
  if (m.player.wrecked) return "spammer";
  if (m.rival?.wrecked) return "clean";
  if (you != null && them != null) return you <= them ? "clean" : "spammer";
  if (you != null) return "clean";
  if (them != null) return "spammer";
  return m.player.dist >= (m.rival?.dist ?? 0) ? "clean" : "spammer";
}

test("200 corridas: piloto limpo ganha 55–65% do spammer", () => {
  let clean = 0;
  let spam = 0;
  let draw = 0;
  for (let i = 1; i <= 200; i++) {
    const w = runBalance(i);
    if (w === "clean") clean += 1;
    else if (w === "spammer") spam += 1;
    else draw += 1;
  }
  const rate = clean / 200;
  assert.ok(rate >= 0.55 && rate <= 0.65, `limpo ${clean} spammer ${spam} empate ${draw} (${(rate * 100).toFixed(1)}%)`);
});

test("bônus de desempenho corta em 50%", () => {
  const bot: Bot = { reaction: 0.3, shiftAt: 1, jitter: 0, nitroGear: 9, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("pay", bot, comum, comum, 6, 6, 1);
  m.player.shifts = ["perfeito", "perfeito", "perfeito", "perfeito", "perfeito", "perfeito", "perfeito", "perfeito", "perfeito", "perfeito"];
  m.player.reaction = 0.1;
  m.player.hits = 10;
  m.player.nitroPerfect = 4;
  m.player.hp = m.player.hpMax;
  const pay = purse(100, "win", m);
  assert.ok(pay.raw > 0.5);
  assert.equal(pay.cap, 0.5);
  assert.equal(pay.total, 150);
});
