import assert from "node:assert/strict";
import test from "node:test";
import type { StatBlock, Upgrades } from "./data.ts";
import { RACE_CONFIG, SHIFT_LAMP, driveMph, gearBox, hudOverlap, placeDamageLabel } from "./raceConfig.ts";
import { isSpaceKey, noteSpaceDown, noteSpaceUp, readBrake, type SpaceLatch } from "./brakeLatch.ts";
import {
  armRear,
  armWeapon,
  botForLevel,
  createDuel,
  gearsFor,
  mph,
  performanceOf,
  purse,
  raceVerdict,
  REDLINE,
  rubberMul,
  sampleReaction,
  shiftCall,
  shiftWord,
  sights,
  stepMatch,
  type Bot,
  type Grade,
  type Input,
  type Match,
} from "./sim.ts";
import { weaponById } from "./weapons.ts";
import { bandStats, streetNearFrom, type BandCar } from "./streetBand.ts";

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

test("queimar a largada perde mesmo com o melhor tempo", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("lugar", bot, comum, comum, 6, 6, 4);
  m.player.redlight = true;
  m.player.launchGrade = "queimou";
  m.player.finished = true;
  m.player.finishTime = 12.1;
  m.player.reaction = -0.4;
  if (m.rival) {
    m.rival.finished = true;
    m.rival.finishTime = 12.53;
    m.rival.redlight = false;
  }
  assert.equal(raceVerdict(m), "loss");
  if (m.rival) m.rival.redlight = true;
  assert.equal(raceVerdict(m), "win");
  m.player.finishTime = 13;
  assert.equal(raceVerdict(m), "loss");
});

test("queimar a largada segura o carro até o castigo acabar", () => {
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
    if (m.phase === "race" && m.raceTime < RACE_CONFIG.launch.redHold - 0.05) maxSpeedDuring = Math.max(maxSpeedDuring, m.player.speed);
    if (m.phase === "race" && m.raceTime > RACE_CONFIG.launch.redHold + 0.35) break;
  }
  assert.equal(m.player.launchGrade, "queimou");
  assert.equal(m.player.redlight, true);
  assert.ok(maxSpeedDuring < 0.2, `andou cedo ${maxSpeedDuring}`);
  assert.ok(m.player.launched);
  assert.ok(m.player.speed > 0.2 || m.player.dist > 0.2);
  assert.equal(raceVerdict(m), "loss");
});

test("cinco trocas perfeitas batem cinco BOM por cerca de 0,6 s", () => {
  const perfect = driveGrade("perfeito", 6);
  const bom = driveGrade("ok", 6);
  assert.ok(perfect != null && bom != null, `${perfect} ${bom}`);
  const delta = (bom ?? 0) - (perfect ?? 0);
  assert.ok(delta >= 0.2 && delta <= 0.9, `delta ${delta.toFixed(3)} perfeito ${perfect?.toFixed(3)} bom ${bom?.toFixed(3)}`);
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

test("200 corridas: quem troca limpo ganha a maioria do spammer", () => {
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
  assert.ok(rate >= 0.7 && rate <= 0.9, `limpo ${clean} spammer ${spam} empate ${draw} (${(rate * 100).toFixed(1)}%)`);
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

test("W antes do verde queima e não dá bônus de 0 ms", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("cedo", bot, comum, comum, 6, 6, 5);
  let wall = 10_000;
  const gasDown = wall + 400;
  const dt = 1 / 60;
  let saw: string[] = [];
  for (let i = 0; i < 60 * 8; i++) {
    wall += 1000 * dt;
    const input: Input = {
      throttle: 1,
      steer: 0,
      shift: false,
      nitro: false,
      brake: false,
      nowMs: wall,
      gasDownMs: gasDown,
    };
    stepMatch(m, input, dt, up, up);
    if (m.banner) saw.push(m.banner);
    if (m.player.launched && m.raceTime > 0.7) break;
  }
  assert.equal(m.player.launchGrade, "queimou");
  assert.equal(m.player.redlight, true);
  assert.ok((m.player.reaction ?? 0) < -0.2, String(m.player.reaction));
  assert.equal(performanceOf(m).lines.some((line) => line.label.includes("reação")), false);
  assert.ok(saw.includes("3") && saw.includes("2") && saw.includes("1"), saw.join(","));
  const wait = createDuel("vai", bot, comum, comum, 6, 6, 6);
  let wall2 = 20_000;
  let vai = false;
  for (let i = 0; i < 60 * 6 && !vai; i++) {
    wall2 += 1000 * dt;
    stepMatch(wait, { throttle: 0, steer: 0, shift: false, nitro: false, brake: true, nowMs: wall2 }, dt, up, null);
    if (wait.banner === "VAI") vai = true;
  }
  assert.equal(vai, true);
});

test("rival de rua com upgrades termina a prova", () => {
  const ai = botForLevel("medio", mulberry(12));
  ai.willFoul = false;
  ai.rubber = 0;
  ai.aim = 0;
  ai.mines = 0;
  const m = createDuel("racha-gaiola", ai, comum, comum, 6, 6, 12);
  m.hazards = [];
  let brake = true;
  let wall = 40_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 50 && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    const rpm = m.player.rpm;
    const row = rowFor(m.player.gear);
    let shift = false;
    if (m.player.launched && m.player.shiftLock <= 0 && m.player.gear < 6 && rpm >= row.pLo && rpm <= row.pHi + 40) shift = true;
    if (m.phase === "race" && !m.player.launched && m.raceTime >= 0.22) brake = false;
    stepMatch(
      m,
      {
        throttle: !m.player.launched && rpm > 4900 ? 0 : 1,
        steer: 0,
        shift,
        nitro: false,
        brake: brake && !m.player.launched,
        nowMs: wall,
        brakeUpMs: brake ? null : wall,
      },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.phase, "finish");
  assert.ok(m.rival?.launched, "rival não largou");
  assert.ok(m.rival?.finishTime != null && m.rival.finishTime < 34, String(m.rival?.finishTime));
  assert.ok(m.player.finishTime != null && m.player.finishTime < 32, `ET ${m.player.finishTime}`);
});

test("míssil sai mesmo com o rival atrás e o cuspe acerta na frente", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0.6, rubber: 0, mines: 2 };
  const m = createDuel("tiro", bot, comum, comum, 6, 6, 3);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.dist = 200;
  m.player.speed = 30;
  m.player.lane = 0;
  m.raceTime = 4;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 80;
    m.rival.speed = 20;
    m.rival.lane = 0;
  }
  const missile = weaponById("missile");
  const mine = weaponById("mine");
  armWeapon(m.player, "missile", missile);
  armRear(m.player, "mine", mine);
  const ammo = m.player.ammo;
  const rear = m.player.rearAmmo;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, rear: true, rearEdge: true, brake: false }, 1 / 60, up, up);
  assert.ok(m.player.ammo < ammo, "F não gastou");
  assert.ok(m.shots.some((shot) => shot.live && shot.owner === "you" && shot.kind === "missil" && shot.dist > m.player.dist));
  assert.ok(m.player.rearAmmo < rear, "G não gastou");
  assert.ok(m.shots.some((shot) => shot.live && shot.owner === "you" && shot.kind === "mina" && shot.dist < m.player.dist));
  if (m.rival) {
    m.rival.dist = m.player.dist + 24;
    m.rival.lane = m.player.lane;
    const hp = m.rival.hp;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, cuspe: true, brake: false }, 1 / 60, up, up);
    assert.ok(m.rival.hp < hp, `${m.rival.hp} vs ${hp}`);
    assert.ok(m.player.hits >= 1);
  }
});

test("rua comum não cai em épico e o épico é achatado na faixa", () => {
  const cars: BandCar[] = [
    { id: "vex", name: "Cromo", rarity: "Comum" },
    { id: "nyx", name: "Franja", rarity: "Comum" },
    { id: "gaiola", name: "GAIOLA", rarity: "Raro" },
    { id: "luz", name: "LUZ-MORTA", rarity: "Épico" },
    { id: "medula", name: "MEDULA", rarity: "Lendário" },
  ];
  for (let n = 0; n < 12; n++) {
    const car = streetNearFrom(cars, "Comum", n);
    assert.equal(car.rarity, "Comum", car.name);
    assert.notEqual(car.id, "luz");
    assert.notEqual(car.id, "gaiola");
  }
  assert.equal(streetNearFrom(cars, "Raro", 0).id, "gaiola");
  const epic = { durability: 190, vmax: 2200, accel: 160, nitroTime: 2.2, power: 220 };
  const clamped = bandStats(comum, epic);
  assert.ok(clamped.vmax <= Math.round(comum.vmax * 1.06) && clamped.vmax >= Math.round(comum.vmax * 0.94), String(clamped.vmax));
  assert.ok(clamped.durability <= Math.round(comum.durability * 1.2) && clamped.durability >= Math.round(comum.durability * 0.9), String(clamped.durability));
});

test("o jogador termina depois que o rival cruza", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("dnf", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.strip = 2000;
  m.player.dist = 400;
  m.player.speed = 45;
  m.player.gear = 4;
  m.raceTime = 24;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.finished = true;
    m.rival.finishTime = 23.4;
    m.rival.dist = m.strip + 8;
  }
  m.firstCross = 23.4;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 10; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  assert.equal(m.phase, "race");
  assert.ok(m.raceTime > 32, String(m.raceTime));
  assert.equal(m.player.finishTime, null);
  m.player.dist = m.strip - 2;
  m.player.speed = 70;
  for (let i = 0; i < 40; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  assert.equal(m.phase, "finish");
  assert.ok(m.player.finishTime != null && m.player.finishTime > 23.4, String(m.player.finishTime));
});

test("mina cai com o rival na frente", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("mina-frente", bot, comum, comum, 6, 6, 5);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.dist = 200;
  m.player.speed = 40;
  m.player.lane = 0;
  m.raceTime = 6;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 700;
    m.rival.speed = 55;
    m.rival.lane = 0;
  }
  armRear(m.player, "mine", weaponById("mine"));
  const rear = m.player.rearAmmo;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, rear: true, rearEdge: true, brake: false }, 1 / 60, up, up);
  assert.ok(m.player.rearAmmo < rear, "G não gastou com o rival na frente");
  assert.ok(m.shots.some((shot) => shot.live && shot.owner === "you" && shot.kind === "mina" && shot.dist < m.player.dist));
});

test("F dispara mesmo com o rival longe", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("missil-longe", bot, comum, comum, 6, 6, 6);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.dist = 120;
  m.player.speed = 40;
  m.raceTime = 8;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 620;
    m.rival.speed = 50;
    m.rival.lane = 2.2;
  }
  armWeapon(m.player, "missile", weaponById("missile"));
  const ammo = m.player.ammo;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, fireEdge: true, brake: false }, 1 / 60, up, up);
  assert.ok(m.player.ammo < ammo, `F não gastou ${m.player.ammo}`);
  assert.ok(m.shots.some((shot) => shot.live && shot.owner === "you" && shot.kind === "missil" && shot.dist > m.player.dist));
});

test("IA fácil colada atira", () => {
  const easy = botForLevel("facil", mulberry(21));
  easy.willFoul = false;
  const m = createDuel("briga", easy, comum, comum, 6, 6, 21);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 240;
  m.player.speed = 36;
  m.player.gear = 3;
  m.raceTime = 8;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 210;
    m.rival.speed = 34;
    m.rival.gear = 3;
    m.rival.lane = 0;
    armWeapon(m.rival, "missile", weaponById("missile"));
    armRear(m.rival, "mine", weaponById("mine"));
  }
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 4; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  const gap = Math.abs((m.rival?.dist ?? 0) - m.player.dist);
  assert.ok(gap < 30, `afastou ${gap.toFixed(1)}`);
  assert.ok(m.shotsMade > 0 || m.player.hp < m.player.hpMax, `tiros ${m.shotsMade} hp ${m.player.hp}`);
});

test("faixa de luta aproxima o fácil e não puxa o difícil", () => {
  const easy = botForLevel("facil", mulberry(3));
  easy.willFoul = false;
  easy.aim = 0;
  easy.mines = 0;
  const m = createDuel("gap", easy, comum, comum, 6, 6, 3);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 40;
  m.player.speed = 50;
  m.player.gear = 4;
  m.raceTime = 8;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 220;
    m.rival.speed = 55;
    m.rival.gear = 4;
  }
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 4; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  const gap = (m.rival?.dist ?? 0) - m.player.dist;
  assert.ok(gap < 140, `gap fácil ${gap.toFixed(1)}`);
  assert.equal(m.phase, "race");

  const hard = createDuel("gap-hard", botForLevel("dificil", mulberry(4)), comum, comum, 6, 6, 4);
  hard.phase = "race";
  hard.green = true;
  hard.hazards = [];
  hard.crates = [];
  hard.player.launched = true;
  hard.player.dist = 40;
  hard.player.speed = 50;
  hard.player.gear = 4;
  hard.raceTime = 8;
  if (hard.rival) {
    hard.rival.launched = true;
    hard.rival.dist = 220;
    hard.rival.speed = 70;
    hard.rival.gear = 5;
    hard.rival.bot && (hard.rival.bot.rubber = 0);
    hard.rival.bot && (hard.rival.bot.aim = 0);
    hard.rival.bot && (hard.rival.bot.mines = 0);
  }
  const before = (hard.rival?.dist ?? 0) - hard.player.dist;
  stepMatch(hard, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  const after = (hard.rival?.dist ?? 0) - hard.player.dist;
  assert.ok(after > before - 8, `difícil andou ${before.toFixed(1)} → ${after.toFixed(1)}`);
});

test("soltar o espaço logo depois do VAI não queima", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("vai-limpo", bot, comum, comum, 6, 6, 7);
  let wall = 90_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.banner === "VAI" && m.raceTime >= 0.08 && brake) {
      brake = false;
      releaseAt = wall;
    }
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : releaseAt },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.player.launchGrade === "queimou", false, String(m.player.launchGrade));
  assert.ok((m.player.reaction ?? -1) >= 0, String(m.player.reaction));
});

test("arrancada passa de 45 mph em 2 s mesmo trocando cedo", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("arranco", bot, comum, comum, 6, 6, 4);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.rpm = 4800;
  m.player.gear = 1;
  m.player.speed = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 2; i++) {
    const early = m.player.launched && m.player.shiftLock <= 0 && m.player.gear < 3 && m.player.rpm < 5200 && m.player.rpm > 2000;
    stepMatch(m, { throttle: 1, steer: 0, shift: early, nitro: false, brake: false }, dt, up, up);
  }
  assert.ok(mph(m.player.speed) > 45, `${mph(m.player.speed).toFixed(1)} mph`);
});

test("Shift com a faixa verde na tela não registra corte", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("faixa", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 1;
  m.player.speed = 20;
  const row = rowFor(1);
  const vTop = (driveMph(comum.vmax) / 2.236936) * 0.38;
  const rpm = row.lo + 120;
  m.player.speed = vTop * (rpm / 8000);
  m.player.rpm = rpm;
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.shifts[0], "ok", m.player.shifts.join(","));
  assert.equal(m.player.gear, 2);
});

test("IA fácil na frente solta mina e tira vida", () => {
  const easy = botForLevel("facil", mulberry(11));
  easy.willFoul = false;
  const m = createDuel("mina-ia", easy, comum, comum, 6, 6, 11);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 200;
  m.player.speed = 40;
  m.player.gear = 3;
  m.player.lane = 0;
  m.raceTime = 6;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 218;
    m.rival.speed = 40;
    m.rival.gear = 3;
    m.rival.lane = 0;
    armWeapon(m.rival, "missile", weaponById("missile"));
    armRear(m.rival, "mine", weaponById("mine"));
  }
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 4; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  const gap = Math.abs((m.rival?.dist ?? 0) - m.player.dist);
  assert.ok(gap > 15 && gap < 120, `afastou ${gap.toFixed(1)}`);
  assert.ok(m.shotsMade > 0, `IA fácil não atirou`);
  assert.ok(m.player.hp > m.player.hpMax * 0.4, `fácil pesado ${m.player.hp}/${m.player.hpMax}`);
});

test("depois da queima o shift não sobe marcha morta", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("queima-giro", bot, comum, comum, 6, 6, 8);
  let wall = 100_000;
  let brake = true;
  let burned = false;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8; i++) {
    wall += 1000 * dt;
    if (!burned && m.phase === "tree" && m.t > 2.2) {
      brake = false;
      burned = true;
    }
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift: true, nitro: false, brake, nowMs: wall, brakeUpMs: burned ? wall - 500 : null },
      dt,
      up,
      up,
    );
    if (m.phase === "race" && m.raceTime > 3.6) break;
  }
  assert.equal(m.player.launchGrade, "queimou");
  assert.ok(m.player.gear <= 4, `marcha ${m.player.gear}`);
  assert.ok(!m.player.shifts.includes("corte"), m.player.shifts.join(","));
  assert.ok(mph(m.player.speed) > 30, `${mph(m.player.speed).toFixed(1)} mph marcha ${m.player.gear}`);
});

test("espaço e W juntos seguram o giro certo", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("giro-certo", bot, comum, comum, 6, 6, 9);
  let wall = 110_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  let sawGreen = false;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.phase === "tree" && m.t > 1.2) {
      const [lo, hi] = RACE_CONFIG.launch.perfect;
      if (m.player.rpm >= lo && m.player.rpm <= hi) sawGreen = true;
    }
    if (m.banner === "VAI" && m.raceTime >= 0.05 && brake) {
      brake = false;
      releaseAt = wall;
    }
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : releaseAt },
      dt,
      up,
      up,
    );
  }
  assert.equal(sawGreen, true, `rpm ${m.player.rpm}`);
  assert.ok(m.player.launchGrade === "perfeito" || m.player.launchGrade === "ok", String(m.player.launchGrade));
  assert.ok((m.player.reaction ?? 0) > 0.005, `reação zerada ${m.player.reaction}`);
});

test("shift guardado entra na faixa e não vira corte", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("faixa-guarda", bot, comum, comum, 6, 6, 3);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 1;
  const row = rowFor(1);
  const vMax = driveMph(comum.vmax) / 2.236936;
  const vTop = vMax * 0.38;
  m.player.speed = vTop * ((row.lo - 280) / 8000);
  m.player.rpm = row.lo - 280;
  const dt = 1 / 60;
  for (let i = 0; i < 90 && m.player.gear < 2; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: i === 0, nitro: false, brake: false }, dt, up, up);
  }
  assert.equal(m.player.gear, 2);
  assert.notEqual(m.player.shifts[0], "corte");
});

test("shift no verde não vira corte se a marcha ainda está engatando", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("verde-trava", bot, comum, comum, 6, 6, 4);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.gear = 5;
  m.player.gears = 6;
  const row = rowFor(5);
  const vMax = driveMph(comum.vmax) / 2.236936;
  const frac = gearBox(6).frac[4]!;
  m.player.speed = vMax * frac * (7200 / 8000);
  m.player.rpm = (row.pLo + row.pHi) / 2;
  m.player.shiftLock = 0.45;
  m.player.redlineT = 0;
  const dt = 1 / 60;
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, dt, up, up);
  assert.equal(m.player.gear, 5);
  assert.equal(m.player.shiftMark, "perfeito");
  for (let i = 0; i < 40 && m.player.gear < 6; i++) {
    m.player.rpm = REDLINE;
    m.player.redlineT = 1;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  assert.equal(m.player.gear, 6);
  assert.equal(m.player.shifts.at(-1), "perfeito", m.player.shifts.join(","));
});

test("mina da IA fácil não cai na largada", () => {
  const easy = botForLevel("facil", mulberry(7));
  easy.willFoul = false;
  const m = createDuel("mina-vai", easy, comum, comum, 6, 6, 7);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 8;
  m.player.speed = 18;
  m.player.gear = 1;
  m.player.lane = 0;
  m.raceTime = 0.2;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 14;
    m.rival.speed = 20;
    m.rival.gear = 1;
    m.rival.lane = 0;
    armWeapon(m.rival, "missile", weaponById("missile"));
    armRear(m.rival, "mine", weaponById("mine"));
  }
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  assert.ok(m.raceTime < 2.1, `tempo ${m.raceTime.toFixed(2)}`);
  assert.equal(m.shots.some((shot) => shot.kind === "mina" && shot.owner === "ai"), false);
  assert.equal(m.player.hp, m.player.hpMax);
});

test("giro certo no VAI não morre mesmo soltando o W", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("giro-segura", bot, comum, comum, 6, 6, 4);
  let wall = 80_000;
  let brake = true;
  let gas = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  const [pLo, pHi] = RACE_CONFIG.launch.perfect;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.phase === "tree" && m.t > 2.65 && m.player.rpm >= pLo && m.player.rpm <= pHi) gas = false;
    if (m.banner === "VAI" && m.raceTime >= 0.03 && brake) {
      brake = false;
      releaseAt = wall;
    }
    stepMatch(
      m,
      { throttle: gas ? 1 : 0, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : releaseAt },
      dt,
      up,
      up,
    );
  }
  assert.notEqual(m.player.launchGrade, "morreu", `rpm ${m.player.launchRpm}`);
  assert.ok(m.player.launchGrade === "perfeito" || m.player.launchGrade === "ok", String(m.player.launchGrade));
  assert.ok((m.player.reaction ?? -1) >= 0 && (m.player.reaction ?? 9) < 0.25, String(m.player.reaction));
});

test("63 mph na segunda com a faixa verde não é corte", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("verde-2", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 2;
  const vMax = driveMph(comum.vmax) / 2.236936;
  const speed = 63 / 2.236936;
  m.player.speed = speed;
  m.player.rpm = (speed / (vMax * 0.52)) * 8000;
  m.player.redlineT = 0.7;
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.shifts[0], "ok", `${m.player.shifts.join(",")} rpm ${m.player.rpm.toFixed(0)}`);
});

test("limitador sozinho não troca a marcha", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("tarde-corte", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 1;
  const vMax = driveMph(comum.vmax) / 2.236936;
  m.player.speed = vMax * 0.38;
  m.player.rpm = 8000;
  m.player.redlineT = 0.5;
  for (let i = 0; i < 90; i++) stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.gear, 1);
  assert.equal(m.player.shifts.length, 0);
});

test("mina da IA fácil não cai a 40 mph", () => {
  const easy = botForLevel("facil", mulberry(8));
  easy.willFoul = false;
  const m = createDuel("mina-40", easy, comum, comum, 6, 6, 8);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 40;
  m.player.speed = 18;
  m.player.gear = 1;
  m.player.lane = 0;
  m.raceTime = 2.4;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 52;
    m.rival.speed = 22;
    m.rival.gear = 2;
    m.rival.lane = 0;
    armWeapon(m.rival, "missile", weaponById("missile"));
    armRear(m.rival, "mine", weaponById("mine"));
  }
  const dt = 1 / 60;
  for (let i = 0; i < 40; i++) stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  assert.ok(m.raceTime < 4, String(m.raceTime));
  assert.equal(m.shots.some((shot) => shot.kind === "mina" && shot.owner === "ai"), false);
});

test("carro quebrado para antes da linha e não leva tempo", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("quebra-para", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.wrecked = true;
  m.player.hp = 0;
  m.player.dist = m.strip - 40;
  m.player.speed = 70;
  m.player.gear = 5;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 200;
    m.rival.speed = 30;
  }
  const dt = 1 / 60;
  for (let i = 0; i < 180 && m.phase === "race"; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  }
  assert.equal(m.player.finished, false);
  assert.ok(m.player.dist < m.strip, `cruzou ${m.player.dist}`);
  assert.ok(m.player.speed < 2, `ainda anda ${m.player.speed}`);
});

test("reação de 2 s não é largada perfeita", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("reacao-lenta", bot, comum, comum, 6, 6, 3);
  let wall = 120_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 12 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.banner === "VAI" && m.raceTime >= 2.2 && brake) {
      brake = false;
      releaseAt = wall;
    }
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : releaseAt },
      dt,
      up,
      up,
    );
  }
  assert.notEqual(m.player.launchGrade, "perfeito", String(m.player.launchGrade));
  assert.ok((m.player.reaction ?? 0) > 1.5, String(m.player.reaction));
  assert.equal(m.player.launchGrade, "atrasou");
});

test("reação lenta com giro baixo é ATRASOU, não MORREU", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("reacao-afogou", bot, comum, comum, 6, 6, 3);
  let wall = 80_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 12 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.banner === "VAI" && m.raceTime >= 1.4 && brake) {
      brake = false;
      releaseAt = wall;
    }
    stepMatch(
      m,
      { throttle: 0, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : releaseAt },
      dt,
      up,
      up,
    );
  }
  assert.ok((m.player.reaction ?? 0) > 1, String(m.player.reaction));
  assert.equal(m.player.launchGrade, "atrasou");
});

test("Shift 0,25 s depois do PERFEITO ainda grava PERFEITO", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("graça", bot, comum, comum, 6, 6, 5);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 5;
  const vMax = driveMph(comum.vmax) / 2.236936;
  const vTop = vMax * gearBox(6).frac[4]!;
  m.player.speed = (7200 / 8000) * vTop;
  m.player.rpm = 7200;
  const dt = 1 / 60;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  assert.equal(m.player.shown, "perfeito");
  m.player.speed = vTop;
  m.player.rpm = 8000;
  m.player.redlineT = 0.5;
  for (let i = 0; i < 12; i++) stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  assert.equal(m.player.shifts.length, 0, m.player.shifts.join(","));
  assert.equal(shiftWord(m.player.shown ?? "corte"), "PERFEITO");
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, dt, up, up);
  assert.equal(m.player.shifts[0], "perfeito");
  assert.equal(m.note, "PERFEITO");
});

test("nitro apertado antes de poder sair ainda queima", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("nitro-cedo", bot, comum, comum, 6, 6, 2);
  m.phase = "staging";
  m.green = false;
  m.player.launched = false;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: true, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.nitroUsed, false);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.rpm = 6400;
  m.player.speed = 40;
  for (let i = 0; i < 20; i++) stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.nitroUsed, true);
});

test("troca limpa chega na frente da IA fácil", () => {
  const easy = botForLevel("facil", mulberry(9));
  easy.willFoul = false;
  const m = createDuel("vence-facil", easy, comum, { ...comum, vmax: 165, durability: 50 }, 6, 6, 9);
  m.hazards = [];
  m.crates = [];
  let brake = true;
  let wall = 30_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 20 && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    const rpm = m.player.rpm;
    const row = rowFor(m.player.gear);
    let shift = false;
    if (m.player.launched && m.player.shiftLock <= 0 && m.player.gear < 6 && rpm >= row.pLo && rpm <= row.pHi + 80) shift = true;
    if (m.phase === "race" && !m.player.launched && m.raceTime >= 0.16) brake = false;
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift, nitro: false, brake: brake && !m.player.launched, nowMs: wall, brakeUpMs: brake ? null : wall },
      dt,
      up,
      up,
    );
  }
  assert.ok(m.player.finishTime != null && m.rival?.finishTime != null, `${m.player.finishTime} / ${m.rival?.finishTime}`);
  assert.ok(m.player.finishTime! < m.rival!.finishTime!, `${m.player.finishTime} vs ${m.rival?.finishTime}`);
  assert.ok(mph(m.player.trap) >= 158, String(mph(m.player.trap)));
  assert.ok(!m.player.shifts.includes("corte"), m.player.shifts.join(","));
});

test("Shift no verde grava a mesma palavra do HUD", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("nome-igual", bot, comum, comum, 6, 6, 5);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.gear = 5;
  const vMax = driveMph(comum.vmax) / 2.236936;
  m.player.speed = 140 / 2.236936;
  m.player.rpm = (m.player.speed / (vMax * gearBox(6).frac[4]!)) * 8000;
  const call = shiftCall(m.player.rpm, m.player.gear);
  assert.equal(shiftWord(call), "BOM", `${call} rpm ${m.player.rpm}`);
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.shifts[0], "ok");
  assert.equal(m.note, "BOM");

  const late = createDuel("nome-corte", bot, comum, comum, 6, 6, 5);
  late.phase = "race";
  late.green = true;
  late.player.launched = true;
  late.player.gear = 5;
  late.player.speed = vMax * gearBox(6).frac[4]!;
  late.player.rpm = 8000;
  late.player.redlineT = 0.2;
  assert.equal(shiftWord(shiftCall(late.player.rpm, late.player.gear)), "CORTE");
  stepMatch(late, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(late.player.shifts[0], "corte");
  assert.equal(late.note, "CORTE");
});

test("quarto de milha de 162 mph fecha entre 10 e 12 s", () => {
  const et = driveGrade("perfeito", 6, 4);
  assert.ok(et != null && et >= 10 && et <= 12, String(et));
});

test("o rival fácil fica na outra faixa e solta mina na frente", () => {
  const easy = botForLevel("facil", mulberry(12));
  easy.willFoul = false;
  const m = createDuel("lado", easy, comum, comum, 6, 6, 12);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 180;
  m.player.speed = 50;
  m.player.gear = 4;
  m.player.lane = -2.2;
  m.raceTime = 6;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 176;
    m.rival.speed = 48;
    m.rival.gear = 4;
    m.rival.lane = 2.2;
    armWeapon(m.rival, "missile", weaponById("missile"));
    armRear(m.rival, "mine", weaponById("mine"));
  }
  const dt = 1 / 60;
  let side = 0;
  let sawAhead = false;
  for (let i = 0; i < 60 * 5; i++) {
    const before = m.shots.length;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
    if (m.rival && Math.abs(m.rival.lane - m.player.lane) > 1.2) side += 1;
    for (const shot of m.shots.slice(before)) {
      if (shot.kind === "mina" && shot.owner === "ai" && shot.dist > m.player.dist - 4) sawAhead = true;
    }
  }
  assert.ok(side > 60 * 3, `lado a lado ${side}`);
  assert.equal(sawAhead, true, "IA não soltou mina na frente");
});

test("banner PERFEITO apaga fora da faixa amarela e o Shift grava a nota da luz", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("luz", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.gear = 5;
  const vMax = driveMph(comum.vmax) / 2.236936;
  const vTop = vMax * gearBox(6).frac[4]!;
  m.player.speed = (7200 / 8000) * vTop;
  m.player.rpm = 7200;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(shiftCall(m.player.rpm, m.player.gear), "perfeito");
  assert.equal(m.banner.includes("AGORA"), false, m.banner);
  m.player.speed = (7000 / 8000) * vTop;
  m.player.rpm = 7000;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(shiftCall(m.player.rpm, m.player.gear), "ok");
  assert.equal(m.banner.includes("AGORA"), false, m.banner);
  stepMatch(m, { throttle: 1, steer: 0, shift: true, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(m.player.shifts[0], "ok", m.player.shifts.join(","));
});

test("soltura do Espaço com W preso não espera o fallback de 4 s", () => {
  const latch: SpaceLatch = { down: false, releaseAt: 0 };
  noteSpaceDown(latch, false);
  assert.equal(isSpaceKey({ code: "", key: " ", keyCode: 32 }), true);
  assert.equal(readBrake(latch, false, false).brake, true);
  noteSpaceUp(latch, 12_345);
  const first = readBrake(latch, true, false);
  assert.equal(first.brake, false, "tecla presa no set não segura o freio depois da soltura");
  assert.equal(first.pulse, true);
  assert.equal(first.at, 12_345);
  const again = readBrake(latch, false, false);
  assert.equal(again.pulse, true, "quadro pulado não joga a soltura fora");
  assert.equal(again.at, 12_345);
  const done = readBrake(latch, false, true);
  assert.equal(done.pulse, false);
  assert.equal(done.brake, false);
});

test("fim da barra não é BOM e a 6ª não entra a 120 mph", () => {
  assert.notEqual(shiftCall(7900, 1), "ok");
  assert.notEqual(shiftCall(7900, 5), "ok");
  assert.equal(shiftCall(8000, 5), "corte");
  const cap = driveMph(162) * gearBox(6).frac[4]!;
  const rpm120 = (120 / cap) * 8000;
  assert.equal(shiftCall(rpm120, 5), "cedo", `${rpm120.toFixed(0)} em 120 mph`);
  assert.equal(shiftWord(shiftCall(7200, 5)), "PERFEITO");
  assert.ok(rpm120 < RACE_CONFIG.shift[4]!.lo);
});

test("freio preso não deixa a reação em branco nem a corrida parada", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("freio-preso", bot, comum, comum, 6, 6, 3);
  let wall = 20_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 12 && !m.player.launched; i++) {
    wall += 1000 * dt;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: true, nowMs: wall }, dt, up, up);
  }
  assert.equal(m.player.launched, true);
  assert.ok(m.raceTime < 5, String(m.raceTime));
  assert.ok(m.player.reaction != null && m.player.reaction > 0.4, String(m.player.reaction));
  assert.equal(m.player.launchGrade, "atrasou");
});

test("toque curto no VAI mede a reação e não grava 1417", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("toque", bot, comum, comum, 6, 6, 3);
  m.hazards = [];
  m.crates = [];
  let wall = 60_000;
  const dt = 1 / 60;
  let greenAt = 0;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    if (m.phase === "race" && greenAt === 0) greenAt = m.greenWall || wall;
    const tap = m.banner === "VAI" && m.raceTime >= 0.08 && m.raceTime < 0.12;
    stepMatch(
      m,
      {
        throttle: 0,
        steer: 0,
        shift: false,
        nitro: false,
        brake: false,
        nowMs: wall,
        brakeUpMs: tap ? greenAt + 90 : null,
        brakePulse: tap,
      },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.player.launched, true);
  assert.ok(Math.abs((m.player.reaction ?? 9) - 0.09) < 0.05, String(m.player.reaction));
  assert.notEqual(Math.round((m.player.reaction ?? 0) * 1000), 1417);
  assert.notEqual(m.player.launchGrade, "atrasou");
});

test("sem toque o carro não larga aos 1417 ms", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("parado", bot, comum, comum, 6, 6, 3);
  m.hazards = [];
  m.crates = [];
  let wall = 60_000;
  const dt = 1 / 60;
  let sawVai = false;
  for (let i = 0; i < 60 * 6; i++) {
    wall += 1000 * dt;
    stepMatch(m, { throttle: 0, steer: 0, shift: false, nitro: false, brake: false, nowMs: wall }, dt, up, up);
    if (m.banner === "VAI") sawVai = true;
    if (sawVai && m.raceTime > 2) break;
  }
  assert.equal(sawVai, true);
  assert.equal(m.player.launched, false);
  assert.ok(m.raceTime > 1.5, String(m.raceTime));
});

test("depois do corte o giro cabe na marcha nova", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("giro", bot, comum, comum, 6, 6, 2);
  m.hazards = [];
  m.crates = [];
  let brake = true;
  let wall = 40_000;
  const dt = 1 / 60;
  const box = gearBox(6);
  const vMax = driveMph(comum.vmax) / 2.2369362920544;
  let cuts = 0;
  for (let i = 0; i < 60 * 14 && cuts < 3; i++) {
    wall += 1000 * dt;
    const before = m.player.gear;
    if (m.phase === "race" && !m.player.launched && m.raceTime >= 0.16) brake = false;
    const callNow = shiftCall(m.player.rpm, m.player.gear);
    const shift =
      m.player.launched &&
      m.player.shiftLock <= 0 &&
      m.player.gear < 6 &&
      (callNow === "ok" || callNow === "perfeito" || callNow === "tarde");
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift, nitro: false, brake: brake && !m.player.launched, nowMs: wall, brakeUpMs: brake ? null : wall },
      dt,
      up,
      up,
    );
    if (m.player.gear === before || !m.player.launched) continue;
    cuts += 1;
    const gi = Math.max(0, Math.min(box.frac.length - 1, m.player.gear - 1));
    const vTop = vMax * box.frac[gi]!;
    const expect = Math.min(8000, Math.max(m.player.gear === 1 ? 3800 : 1000, (m.player.speed / Math.max(0.4, vTop)) * 8000));
    assert.ok(Math.abs(m.player.rpm - expect) < 120, `g${m.player.gear} rpm ${m.player.rpm} vs ${expect}`);
    const call = shiftCall(m.player.rpm, m.player.gear);
    if (m.banner === "AGORA — BOM") assert.equal(call, "ok");
    if (m.banner === "AGORA — PERFEITO") assert.equal(call, "perfeito");
    if (call === "ok" || call === "perfeito") {
      const row = rowFor(m.player.gear);
      assert.ok(m.player.rpm >= row.lo && m.player.rpm <= row.hi, `${m.player.rpm} fora de ${row.lo}-${row.hi}`);
    }
  }
  assert.ok(cuts >= 2, String(cuts));
});

test("pente cheio fere o fácil sem quebrar a corrida", () => {
  const easy = botForLevel("facil", mulberry(4));
  easy.willFoul = false;
  const m = createDuel("casco", easy, { ...comum, durability: 400 }, { ...comum, vmax: 165, durability: 50 }, 6, 6, 4);
  m.hazards = [];
  m.crates = [];
  const missile = weaponById("missile");
  const mine = weaponById("mine");
  let brake = true;
  let wall = 70_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 20 && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    const row = rowFor(m.player.gear);
    const shift = m.player.launched && m.player.shiftLock <= 0 && m.player.gear < 6 && m.player.rpm >= row.pLo && m.player.rpm <= row.pHi + 40;
    if (m.phase === "race" && !m.player.launched && m.raceTime >= 0.12) brake = false;
    if (m.player.ammo <= 0) m.player.ammo = missile.clip;
    if (m.player.rearAmmo <= 0) m.player.rearAmmo = mine.clip;
    armWeapon(m.player, "missile", missile);
    armRear(m.player, "mine", mine);
    const fire = m.player.launched && m.player.cool <= 0;
    const rear = m.player.launched && m.player.rearCool <= 0;
    stepMatch(
      m,
      {
        throttle: 1,
        steer: 0,
        shift,
        nitro: false,
        brake: brake && !m.player.launched,
        nowMs: wall,
        brakeUpMs: brake ? null : wall,
        fire,
        fireEdge: fire,
        rear,
        rearEdge: rear,
        cuspe: m.player.launched && i % 3 === 0,
      },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.rival?.wrecked, false, `hp ${m.rival?.hp}`);
  assert.ok((m.rival?.hp ?? 0) >= 8 && (m.rival?.hp ?? 99) <= 40, `hp ${m.rival?.hp}`);
  assert.ok(m.player.hits >= 3, String(m.player.hits));
});

test("a 5ª de um carro de 162 passa de 160 mph", () => {
  const cap = driveMph(162) * gearBox(6).frac[4]!;
  assert.ok(cap >= 160 && cap <= 162, String(cap));
});

test("toque velho no Espaço não vira reação de 20 ms", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("pulso-velho", bot, comum, comum, 6, 6, 5);
  m.hazards = [];
  m.crates = [];
  let wall = 40_000;
  let brake = true;
  let releaseAt = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    const late = m.phase === "race" && m.raceTime >= 0.42;
    if (late && brake) {
      brake = false;
      releaseAt = wall;
    }
    const falsePulse = m.phase === "race" && m.raceTime > 0.02 && m.raceTime < 0.06 && brake;
    stepMatch(
      m,
      {
        throttle: 1,
        steer: 0,
        shift: false,
        nitro: false,
        brake,
        nowMs: wall,
        brakeUpMs: late ? releaseAt : 1000,
        brakePulse: falsePulse || late,
      },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.player.launched, true);
  assert.ok(Math.abs((m.player.reaction ?? 9) - 0.42) < 0.08, String(m.player.reaction));
  assert.notEqual(Math.round((m.player.reaction ?? 0) * 1000), 20);
  assert.equal(m.player.launchGrade === "perfeito", false);
  assert.equal(performanceOf(m).lines.some((line) => line.label === "reação < 200 ms"), false);
});

test("queima fica mais lenta que a largada limpa e perde", () => {
  const clean = driveGrade("perfeito", 6, 6);
  const bot: Bot = { reaction: 0.28, shiftAt: 0.9, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("queima-tempo", bot, comum, comum, 6, 6, 6);
  m.hazards = [];
  m.crates = [];
  let wall = 20_000;
  let brake = true;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 20 && m.phase !== "finish"; i++) {
    wall += 1000 * dt;
    if (m.phase === "tree" && m.t > 1.5) brake = false;
    const row = rowFor(m.player.gear);
    const shift = m.player.launched && m.player.shiftLock <= 0 && m.player.gear < 6 && m.player.rpm >= row.pLo && m.player.rpm <= row.pHi + 40;
    stepMatch(
      m,
      { throttle: 1, steer: 0, shift, nitro: false, brake: brake && !m.player.launched, nowMs: wall, brakeUpMs: brake ? null : wall },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.player.launchGrade, "queimou");
  assert.equal(raceVerdict(m), "loss");
  assert.ok(m.player.finishTime != null && clean != null && m.player.finishTime > clean + 1.2, `${m.player.finishTime} vs limpa ${clean}`);
});

test("soltar centenas de ms depois do VAI não vira 20 ms", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("tarde-de-verdade", bot, comum, comum, 6, 6, 8);
  m.hazards = [];
  m.crates = [];
  let wall = 50_000;
  let brake = true;
  const dt = 1 / 60;
  const want = 0.32;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    const go = m.phase === "race" && m.raceTime >= want;
    if (go) brake = false;
    stepMatch(
      m,
      {
        throttle: 1,
        steer: 0,
        shift: false,
        nitro: false,
        brake,
        nowMs: wall,
        brakeUpMs: go ? wall : 1000,
        brakePulse: false,
      },
      dt,
      up,
      up,
    );
  }
  assert.equal(m.player.redlight, false);
  assert.ok(Math.abs((m.player.reaction ?? 9) - want) < 0.05, String(m.player.reaction));
  assert.notEqual(Math.round((m.player.reaction ?? 0) * 1000), 20);
  assert.equal(m.player.launchGrade === "perfeito", false);
  assert.equal(performanceOf(m).lines.some((line) => line.label === "reação < 200 ms"), false);
});

test("tempo limpo cabe na física e a queima não fica mais rápida", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const clean = createDuel("fisica", bot, comum, comum, 6, 6, 4);
  clean.hazards = [];
  clean.crates = [];
  let brake = true;
  let wall = 15_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 30 && !clean.player.finished; i++) {
    wall += 1000 * dt;
    if (clean.phase === "race" && !clean.player.launched && clean.raceTime >= 0.18) brake = false;
    const row = rowFor(clean.player.gear);
    const shift = clean.player.launched && clean.player.shiftLock <= 0 && clean.player.gear < 6 && clean.player.rpm >= row.pLo && clean.player.rpm <= row.pHi + 40;
    stepMatch(
      clean,
      { throttle: 1, steer: 0, shift, nitro: false, brake: brake && !clean.player.launched, nowMs: wall, brakeUpMs: brake ? null : wall },
      dt,
      up,
      up,
    );
  }
  const et = clean.player.finishTime ?? 0;
  const trap = clean.player.trap;
  assert.ok(mph(trap) >= 158 && mph(trap) <= 164, `trap ${mph(trap).toFixed(1)}`);
  assert.ok(et >= 10 && et <= 13, `ET ${et}`);
  assert.ok(et * trap > clean.strip * 1.15, `ET ${et} trap ${trap} faixa ${clean.strip}`);
  const foul = createDuel("fisica-queima", bot, comum, comum, 6, 6, 4);
  foul.hazards = [];
  foul.crates = [];
  let held = true;
  let clock = 15_000;
  for (let i = 0; i < 60 * 30 && !foul.player.finished; i++) {
    clock += 1000 * dt;
    if (foul.phase === "tree" && foul.t > 1.6) held = false;
    const row = rowFor(foul.player.gear);
    const shift = foul.player.launched && foul.player.shiftLock <= 0 && foul.player.gear < 6 && foul.player.rpm >= row.pLo && foul.player.rpm <= row.pHi + 40;
    stepMatch(
      foul,
      { throttle: 1, steer: 0, shift, nitro: false, brake: held && !foul.player.launched, nowMs: clock, brakeUpMs: held ? null : clock },
      dt,
      up,
      up,
    );
  }
  assert.equal(foul.player.redlight, true);
  assert.equal(raceVerdict(foul), "loss");
  assert.ok((foul.player.finishTime ?? 0) > et + 1.2, `queima ${foul.player.finishTime} limpa ${et}`);
  assert.ok((foul.player.finishTime ?? 0) * Math.max(foul.player.trap, 1) > foul.strip, "queima mais rápida que a física");
});

test("número de dano fica fora da luz de troca e fora do carro", () => {
  const onLamp = placeDamageLabel(640, SHIFT_LAMP.y + 40, 0);
  const onCar = placeDamageLabel(640, 430, 1);
  const hitsLamp = onLamp.y + 22 > SHIFT_LAMP.y && onLamp.y < SHIFT_LAMP.y + SHIFT_LAMP.h && onLamp.x < SHIFT_LAMP.x + SHIFT_LAMP.w && onLamp.x + 96 > SHIFT_LAMP.x;
  assert.equal(hitsLamp, false, `${onLamp.x},${onLamp.y} luz ${SHIFT_LAMP.x},${SHIFT_LAMP.y}`);
  assert.ok(onCar.x < 220 && onCar.y < 160, `${onCar.x},${onCar.y}`);
  assert.ok(onCar.y > onLamp.y, "rótulos empilhados");
});

test("NA MIRA acerta e tira pelo menos 8", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("mira-peso", bot, comum, { ...comum, durability: 50 }, 6, 6, 3);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 180;
  m.player.speed = 50;
  m.player.lane = -2.2;
  m.player.gear = 3;
  m.raceTime = 4;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 200;
    m.rival.speed = 48;
    m.rival.lane = 2.2;
    m.rival.hp = 50;
    m.rival.hpMax = 50;
  }
  armWeapon(m.player, "missile", weaponById("missile"));
  assert.equal(sights(m), "mira");
  const before = m.rival?.hp ?? 0;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, fireEdge: true, brake: false }, 1 / 60, up, up);
  const shot = m.shots.find((s) => s.owner === "you" && s.kind === "missil");
  assert.equal(shot?.sure, true);
  for (let i = 0; i < 80 && (m.rival?.hp ?? 0) >= before; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  }
  const lost = before - (m.rival?.hp ?? before);
  assert.ok(lost >= 8 && lost <= 12, `perda ${lost}`);
  assert.ok(m.floats.some((n) => n.dmg >= 8), "número grande");
  assert.ok(m.shakePx > 4, "tremida");
});

test("FORA não vira acerto garantido", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("fora", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.dist = 100;
  m.player.speed = 40;
  m.player.lane = -2.2;
  m.raceTime = 4;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 160;
    m.rival.speed = 40;
    m.rival.lane = 2.2;
  }
  assert.equal(sights(m), "fora");
});

test("fácil atrás não é puxado de volta", () => {
  const easy = botForLevel("facil", mulberry(8));
  easy.willFoul = false;
  easy.aim = 0;
  easy.mines = 0;
  const m = createDuel("solto", easy, comum, comum, 6, 6, 8);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 200;
  m.player.speed = 62;
  m.player.gear = 4;
  m.raceTime = 6;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 150;
    m.rival.speed = 40;
    m.rival.gear = 3;
  }
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 2; i++) stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
  const gap = (m.rival?.dist ?? 0) - m.player.dist;
  assert.ok(gap < -25, `colou ${gap.toFixed(1)}`);
});

test("PERFEITO da 2ª marcha dura o bastante para ver", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("janela", bot, comum, comum, 6, 6, 2);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.gear = 2;
  m.player.shiftLock = 0;
  const row = rowFor(2);
  const vMax = driveMph(comum.vmax) / 2.236936;
  const vTop = vMax * gearBox(6).frac[1]!;
  m.player.speed = ((row.pLo - 80) / 8000) * vTop;
  m.player.rpm = row.pLo - 80;
  let frames = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, dt, up, up);
    if (shiftCall(m.player.rpm, m.player.gear) === "perfeito") frames += 1;
    else if (frames > 0) break;
  }
  assert.ok(frames >= 12, `frames ${frames}`);
});

test("colado do lado é NA MIRA e o F acerta", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("colado", bot, comum, { ...comum, durability: 50 }, 6, 6, 4);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 220;
  m.player.speed = 55;
  m.player.lane = -2.2;
  m.raceTime = 5;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 218;
    m.rival.speed = 54;
    m.rival.lane = 2.2;
    m.rival.hp = 50;
    m.rival.hpMax = 50;
  }
  assert.equal(sights(m), "mira");
  armWeapon(m.player, "missile", weaponById("missile"));
  const before = m.rival?.hp ?? 0;
  stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, fireEdge: true, brake: false }, 1 / 60, up, up);
  for (let i = 0; i < 40 && (m.rival?.hp ?? 0) >= before; i++) {
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  }
  assert.ok(before - (m.rival?.hp ?? before) >= 8, `colado ${m.rival?.hp}`);
});

test("mesma faixa na frente é NA MIRA e a outra faixa longe é FORA", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const lined = createDuel("linha", bot, comum, comum, 6, 6, 2);
  lined.phase = "race";
  lined.green = true;
  lined.player.launched = true;
  lined.player.dist = 100;
  lined.player.lane = 2.2;
  if (lined.rival) {
    lined.rival.launched = true;
    lined.rival.dist = 180;
    lined.rival.lane = 2.2;
  }
  assert.equal(sights(lined), "mira");
  const wide = createDuel("larga", bot, comum, comum, 6, 6, 2);
  wide.phase = "race";
  wide.green = true;
  wide.player.launched = true;
  wide.player.dist = 100;
  wide.player.lane = -2.2;
  wide.raceTime = 4;
  if (wide.rival) {
    wide.rival.launched = true;
    wide.rival.dist = 180;
    wide.rival.lane = 2.2;
  }
  assert.equal(sights(wide), "fora");
  armWeapon(wide.player, "missile", weaponById("missile"));
  const hp = wide.rival?.hp ?? 0;
  stepMatch(wide, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, fireEdge: true, brake: false }, 1 / 60, up, up);
  assert.equal(wide.shotCall, "ERROU");
  const shot = wide.shots.find((s) => s.owner === "you" && s.kind === "missil");
  assert.equal(shot?.sure, false);
  for (let i = 0; i < 30; i++) stepMatch(wide, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
  assert.equal(wide.rival?.hp, hp);
});

test("IA com 315 ms não larga MORREU", () => {
  const bot = botForLevel("facil", mulberry(2));
  bot.reaction = 0.315;
  bot.willFoul = false;
  const m = createDuel("larg-real", bot, comum, comum, 6, 6, 2);
  m.hazards = [];
  m.crates = [];
  let brake = true;
  let wall = 30_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8 && !m.rival?.launched; i++) {
    wall += 1000 * dt;
    if (m.phase === "race" && m.raceTime >= 0.12) brake = false;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake, nowMs: wall, brakeUpMs: brake ? null : wall }, dt, up, up);
  }
  assert.equal(m.rival?.launched, true);
  assert.notEqual(m.rival?.launchGrade, "morreu", String(m.rival?.launchGrade));
  assert.equal(m.rival?.launchGrade, "ok", String(m.rival?.launchGrade));
  assert.ok(Math.abs((m.rival?.reaction ?? 9) - 0.315) < 0.05, String(m.rival?.reaction));
});

test("freio preso até os 4 s marca largada AUTO", () => {
  const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };
  const m = createDuel("auto", bot, comum, comum, 6, 6, 3);
  let wall = 20_000;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 8 && !m.player.launched; i++) {
    wall += 1000 * dt;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: true, nowMs: wall }, dt, up, up);
  }
  assert.equal(m.player.launched, true);
  assert.equal(m.player.launchAuto, true);
  assert.equal(m.player.launchGrade, "atrasou");
  assert.equal(m.note, "LARGADA AUTO");
});

test("seis mísseis no fácil deixam o rival vivo", () => {
  const easy = botForLevel("facil", mulberry(5));
  easy.willFoul = false;
  easy.aim = 0;
  easy.mines = 0;
  const m = createDuel("briga-hp", easy, comum, { ...comum, durability: 52 }, 6, 6, 5);
  m.phase = "race";
  m.green = true;
  m.hazards = [];
  m.crates = [];
  m.player.launched = true;
  m.player.dist = 200;
  m.player.speed = 55;
  m.player.lane = 0;
  m.player.gear = 3;
  m.raceTime = 4;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 214;
    m.rival.speed = 52;
    m.rival.lane = 0;
    m.rival.hp = m.rival.hpMax;
  }
  armWeapon(m.player, "missile", weaponById("missile"));
  const max = m.rival?.hpMax ?? 0;
  for (let n = 0; n < 6; n++) {
    m.player.cool = 0;
    m.player.ammo = Math.max(1, m.player.ammo);
    const before = m.rival?.hp ?? 0;
    stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, fire: true, fireEdge: true, brake: false }, 1 / 60, up, up);
    for (let i = 0; i < 40 && (m.rival?.hp ?? 0) >= before; i++) {
      stepMatch(m, { throttle: 1, steer: 0, shift: false, nitro: false, brake: false }, 1 / 60, up, up);
    }
  }
  const hp = m.rival?.hp ?? 0;
  const chip = m.dmgLog.find((row) => row.who === "ai");
  assert.ok(chip && chip.dmg >= 4 && chip.dmg <= 7, `tiro ${chip?.dmg}`);
  assert.equal(m.rival?.wrecked, false);
  assert.ok(hp >= 12 && hp <= 34, `hp ${hp}/${max}`);
});


