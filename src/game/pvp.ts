import type { Match } from "./sim";
import { combatKind } from "./combat";
import { isWeaponId, type WeaponId } from "./weapons";

export type PvpHello = { t: "hello"; name: string; sprite: number };
export type PvpGo = { t: "go"; strip: number };
export type PvpCar = {
  t: "car";
  dist: number;
  lane: number;
  speed: number;
  yaw: number;
  nitro: number;
  hp: number;
  hpMax: number;
  wrecked: boolean;
  finished: boolean;
  et: number | null;
  gear: number;
  rpm: number;
  launched: boolean;
  poison: number;
  freeze: number;
  slow: number;
  slowT: number;
  aim?: number;
};
export type PvpShot = {
  t: "shot";
  id: number;
  weapon: WeaponId;
  dist: number;
  lane: number;
  speed: number;
  life: number;
  lock: number;
  hit: number;
  sure?: boolean;
  back?: boolean;
  dmg?: number;
};
export type PvpMsg = PvpHello | PvpGo | PvpCar | PvpShot;

export function asPvpMsg(data: unknown): PvpMsg | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as { t?: string };
  if (msg.t === "hello" || msg.t === "go" || msg.t === "car" || msg.t === "shot") return data as PvpMsg;
  return null;
}

export function applyCar(m: Match, msg: PvpCar) {
  const rival = m.rival;
  if (!rival) return;
  rival.dist = msg.dist;
  rival.lane = msg.lane;
  rival.speed = msg.speed;
  rival.yaw = msg.yaw;
  rival.nitroOn = msg.nitro;
  rival.hp = msg.hp;
  rival.hpMax = msg.hpMax || rival.hpMax;
  rival.wrecked = msg.wrecked;
  rival.finished = msg.finished;
  rival.finishTime = msg.et;
  rival.gear = msg.gear;
  rival.rpm = msg.rpm;
  rival.launched = msg.launched;
  rival.poison = msg.poison;
  rival.freeze = msg.freeze;
  rival.slow = msg.slow;
  rival.slowT = msg.slowT;
  m.incomingAim = msg.aim ?? 0;
}

export function applyShot(m: Match, msg: PvpShot, seen: Set<number>) {
  if (!isWeaponId(msg.weapon) || seen.has(msg.id)) return;
  seen.add(msg.id);
  m.shots.push({
    id: msg.id,
    owner: "ai",
    weapon: msg.weapon,
    dist: msg.dist,
    lane: msg.lane,
    speed: msg.speed,
    life: msg.life,
    lock: msg.lock,
    hit: msg.hit,
    live: true,
    sure: !!msg.sure,
    back: !!msg.back,
    dmg: msg.dmg,
    arm: msg.weapon === "mine" ? 0.3 : 0,
    born: msg.dist,
    guide: msg.sure ? 0.4 : 0,
    kind: combatKind(msg.weapon),
    mineHp: 3,
    agora: false,
    resolved: "",
  });
}
