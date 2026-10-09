import { CHARMS, NEONS, PAINTS, type DriverId, type NftCar, type Rarity, type Upgrades } from "./data";
import { validKeys, type Hotkeys } from "./hotkeys";

export type Save = {
  version: 1;
  fossil: number;
  selected: string;
  cars: NftCar[];
  muted: boolean;
  wins: number;
  races: number;
  best: Record<string, number>;
  callsign?: string;
  keys?: Hotkeys;
  keysSet?: boolean;
  savedAt?: number;
  storyClear?: number;
};

const KEY = "saurshift-save-v1";

function stock(): NftCar {
  return {
    tokenId: "SAUR-0001",
    driverId: "vex",
    rarity: "Comum",
    paint: "Osso",
    neon: "ácido",
    charm: "crânio",
    upgrades: { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 },
  };
}

export function freshSave(): Save {
  const car = stock();
  return {
    version: 1,
    fossil: 80,
    selected: car.tokenId,
    cars: [car],
    muted: false,
    wins: 0,
    races: 0,
    best: {},
  };
}

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Save;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cars) || parsed.cars.length === 0) {
      return freshSave();
    }
    if (parsed.keys && !validKeys(parsed.keys)) delete parsed.keys;
    return parsed;
  } catch {
    return freshSave();
  }
}

const listeners = new Set<(save: Save) => void>();
let cloudPush: ((save: Save) => void) | null = null;
let remoteReady = false;
const readyListeners = new Set<() => void>();

export function subscribeSave(fn: (save: Save) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function bindCloudPush(fn: ((save: Save) => void) | null) {
  cloudPush = fn;
}

export function resetGarageReady() {
  remoteReady = false;
}

export function markGarageReady() {
  remoteReady = true;
  readyListeners.forEach((fn) => fn());
}

export function subscribeGarageReady(fn: () => void) {
  if (remoteReady) fn();
  readyListeners.add(fn);
  return () => {
    readyListeners.delete(fn);
  };
}

export function mergeSave(local: Save, remote: Save): Save {
  const newer = (local.savedAt ?? 0) >= (remote.savedAt ?? 0) ? local : remote;
  const older = newer === local ? remote : local;
  const keysFrom = newer.keysSet && newer.keys ? newer : older.keysSet && older.keys ? older : null;
  if (!keysFrom) return newer;
  return { ...newer, keys: keysFrom.keys, keysSet: true };
}

export function writeSave(save: Save) {
  const next = { ...save, savedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
  cloudPush?.(next);
}

export function selectedCar(save: Save): NftCar {
  return save.cars.find((c) => c.tokenId === save.selected) ?? save.cars[0];
}

export function nextToken(save: Save): string {
  const n = save.cars.reduce((max, c) => {
    const v = Number(c.tokenId.replace("SAUR-", ""));
    return Number.isFinite(v) ? Math.max(max, v) : max;
  }, 1);
  return `SAUR-${String(n + 1).padStart(4, "0")}`;
}

const RARITIES: Rarity[] = ["Comum", "Comum", "Comum", "Raro", "Raro", "Lendário", "Meme"];
const DRIVERS: DriverId[] = ["vex", "nyx", "geck", "lua", "shell", "claw"];

export function forgeCar(save: Save, driverId: DriverId, rarity: Rarity): NftCar {
  const zero: Upgrades = { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
  return {
    tokenId: nextToken(save),
    driverId,
    rarity,
    paint: PAINTS[Math.floor(Math.random() * PAINTS.length)] ?? "Osso",
    neon: NEONS[Math.floor(Math.random() * NEONS.length)] ?? "ácido",
    charm: CHARMS[Math.floor(Math.random() * CHARMS.length)] ?? "crânio",
    upgrades: zero,
  };
}

export function rollCar(save: Save): NftCar {
  const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)] ?? "Comum";
  const driverId = DRIVERS[Math.floor(Math.random() * DRIVERS.length)] ?? "vex";
  return forgeCar(save, driverId, rarity);
}
