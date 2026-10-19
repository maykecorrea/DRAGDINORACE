import assert from "node:assert/strict";
import test from "node:test";
import { hudChaseOverlap } from "./combat.ts";
import type { StatBlock, Upgrades } from "./data.ts";
import { armRear, armWeapon, createDuel, raceReason, raceVerdict, stepMatch, type Bot, type Input, type Shot } from "./sim.ts";
import { weaponById } from "./weapons.ts";

const up: Upgrades = { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
const comum: StatBlock = { durability: 100, vmax: 162, accel: 58, nitroTime: 1.8, power: 62 };
const bot: Bot = { reaction: 9, shiftAt: 1, jitter: 0, nitroGear: 99, launch: 1, aim: 0, rubber: 0 };

function boot() {
  const m = createDuel("prova", bot, comum, comum, 6, 6, 3);
  m.phase = "race";
  m.green = true;
  m.player.launched = true;
  m.player.dist = 400;
  m.player.speed = 40;
  m.raceTime = 2;
  if (m.rival) {
    m.rival.launched = true;
    m.rival.dist = 430;
    m.rival.speed = 40;
    m.rival.lane = 0;
  }
  m.player.lane = 0;
  m.shots = [];
  return m;
}

const quiet: Input = { throttle: 1, steer: 0, shift: false, nitro: false, brake: false };

test("HUD da perseguição não se sobrepõe e a mira fica acima de y=520", () => {
  assert.deepEqual(hudChaseOverlap(), []);
});

test("escudo bloqueia o dano e a defesa perfeita devolve 30 de carga", () => {
  const m = boot();
  const before = m.player.hp;
  m.player.charge = 100;
  stepMatch(m, { ...quiet, shield: true }, 1 / 60, up, up);
  assert.ok(m.player.shield > 0);
  assert.equal(m.player.charge, 40);
  m.player.shieldAge = 0.02;
  const shot = {
    id: 9,
    owner: "ai" as const,
    weapon: "missile" as const,
    dist: m.player.dist - 1,
    lane: m.player.lane,
    speed: 80,
    life: 2,
    lock: 0,
    hit: 0.75,
    live: true,
    sure: true,
    arm: 0,
    born: m.player.dist - 40,
    guide: 0,
    kind: "missil" as const,
    mineHp: 3,
    agora: true,
    resolved: "" as const,
  } satisfies Shot;
  m.shots.push(shot);
  stepMatch(m, quiet, 1 / 60, up, up);
  assert.equal(m.player.hp, before);
  assert.ok(m.player.perfectDef >= 1);
  assert.ok(m.player.charge >= 70);
});

test("três cuspes destroem a mina e ela não zera a velocidade", () => {
  const m = boot();
  if (!m.rival) return;
  m.rival.dist = m.player.dist + 30;
  m.shots.push({
    id: 1,
    owner: "ai",
    weapon: "mine",
    dist: m.player.dist + 20,
    lane: m.player.lane,
    speed: 0,
    life: 8,
    lock: 0,
    hit: 0.75,
    live: true,
    sure: false,
    arm: 0,
    born: m.player.dist + 20,
    guide: 0,
    kind: "mina",
    mineHp: 3,
    agora: false,
    resolved: "",
  });
  for (let i = 0; i < 3; i++) {
    m.player.cuspeCd = 0;
    m.player.heat = 0;
    stepMatch(m, { ...quiet, cuspe: true }, 1 / 60, up, up);
  }
  assert.equal(m.shots.some((shot) => shot.kind === "mina" && shot.live), false);
  assert.equal(m.player.minesBroken, 1);
  assert.ok(m.player.speed > 5, String(m.player.speed));
  assert.equal(m.player.wrecked, false);
  assert.equal(m.shotsBroke >= 1, true);
});

test("míssil travado segue até o AGORA e erra se a faixa muda depois", () => {
  const m = boot();
  if (!m.rival) return;
  m.rival.dist = 500;
  m.player.dist = 420;
  m.player.lane = 0;
  m.rival.lane = 0;
  const shot: Shot = {
    id: 2,
    owner: "ai",
    weapon: "missile",
    dist: 450,
    lane: 0,
    speed: 30,
    life: 3,
    lock: 0.4,
    hit: 0.75,
    live: true,
    sure: true,
    arm: 0,
    born: 430,
    guide: 0.4,
    kind: "missil",
    mineHp: 3,
    agora: false,
    resolved: "",
  };
  m.shots = [shot];
  for (let i = 0; i < 8; i++) stepMatch(m, quiet, 1 / 60, up, up);
  assert.ok(shot.guide < 0.3, String(shot.guide));
  m.rival.lane = 2.2;
  shot.guide = 0;
  shot.agora = true;
  shot.lane = 0;
  shot.dist = m.rival.dist - 5;
  for (let i = 0; i < 8; i++) stepMatch(m, quiet, 1 / 60, up, up);
  assert.equal(shot.resolved === "hit", false);
});

test("lentidão não passa de 35% e a segunda é ignorada", () => {
  const m = boot();
  if (!m.rival) return;
  m.rival.dist = m.player.dist + 4;
  const fire = (born: number) => {
    m.shots.push({
      id: born,
      owner: "you",
      weapon: "missile",
      dist: m.rival!.dist - 1,
      lane: m.rival!.lane,
      speed: 90,
      life: 2,
      lock: 0,
      hit: 0.75,
      live: true,
      sure: false,
      arm: 0,
      born: m.rival!.dist - 30,
      guide: 0,
      kind: "missil",
      mineHp: 3,
      agora: false,
      resolved: "",
    });
    stepMatch(m, quiet, 1 / 60, up, up);
  };
  fire(m.player.dist);
  const slow = m.rival.slow;
  assert.ok(slow >= 0.65, String(slow));
  fire(m.player.dist + 1);
  assert.ok(m.rival.slow >= 0.65);
  assert.ok(m.rival.slowImmune > 0);
});

test("buffer dispara no tick em que o cooldown acaba", () => {
  const m = boot();
  armWeapon(m.player, "missile", weaponById("missile"));
  m.player.cool = 0.1;
  m.player.ammo = 3;
  if (m.rival) m.rival.dist = m.player.dist + 40;
  stepMatch(m, { ...quiet, fireEdge: true }, 1 / 60, up, up);
  assert.equal(m.player.fired, 0);
  let firedAt = -1;
  for (let i = 0; i < 12; i++) {
    stepMatch(m, quiet, 1 / 60, up, up);
    if (m.player.fired > 0 && firedAt < 0) firedAt = i;
  }
  assert.ok(firedAt >= 0);
  assert.ok(m.player.cool > 0.5);
});

test("vencedor é quem cruza e a tela diz o motivo", () => {
  const m = boot();
  m.player.finished = true;
  m.player.finishTime = 19.3;
  m.player.redlight = true;
  if (m.rival) {
    m.rival.finished = true;
    m.rival.finishTime = 23.183;
  }
  assert.equal(raceVerdict(m), "win");
  assert.match(raceReason(m), /Você cruzou/);
  m.player.finished = false;
  m.player.wrecked = true;
  if (m.rival) m.rival.finished = false;
  assert.equal(raceVerdict(m), "draw");
  assert.match(raceReason(m), /EMPATE|DNF/);
});

test("contagem de projétil fecha: criado = acerto + erro + quebrado + no ar", () => {
  const m = boot();
  armWeapon(m.player, "missile", weaponById("missile"));
  armRear(m.player, "mine", weaponById("mine"));
  if (m.rival) m.rival.lane = 2.2;
  stepMatch(m, { ...quiet, fireEdge: true, rearEdge: true, rear: true }, 1 / 60, up, up);
  const live = m.shots.filter((shot) => shot.live).length;
  assert.equal(m.shotsMade, m.shotsHit + m.shotsMiss + m.shotsBroke + live);
});

test("tiro na faixa ao lado acerta quando o rival está do lado", () => {
  const m = boot();
  if (!m.rival) return;
  m.rival.lane = 2.2;
  m.player.lane = 0;
  m.rival.dist = m.player.dist + 6;
  m.rival.hp = 50;
  m.rival.hpMax = 50;
  armWeapon(m.player, "missile", weaponById("missile"));
  const before = m.rival.hp;
  stepMatch(m, { ...quiet, fireEdge: true, fire: true }, 1 / 60, up, up);
  for (let i = 0; i < 40 && m.rival.hp >= before; i++) stepMatch(m, quiet, 1 / 60, up, up);
  assert.ok(m.rival.hp < before, `vida ${m.rival.hp}`);
  assert.ok(m.player.hits >= 1, String(m.player.hits));
});
