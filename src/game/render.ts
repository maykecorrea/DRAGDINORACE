import { NEON_HEX, type Upgrades } from "./data";
import type { RaceArt } from "./raceArt";
import { loadRaceArt } from "./raceArt";
import { paintBeira, paintChaseHud, paintDebug, paintParallax, paintRaceHud, paintRaceWorld } from "./raceHud";
import { weaponReach } from "./weapons";
import {
  LANE_GAP,
  REDLINE,
  TRACK_EDGE,
  launchWindow,
  mph,
  shiftWindow,
  type Match,
} from "./sim";

export const VIEW_W = 1280;
export const VIEW_H = 720;

export type Art = {
  cockpit: HTMLImageElement;
  cockpits: Record<string, HTMLImageElement>;
  sky: HTMLImageElement;
  /** Bone rear-view. Glass is transparent so the car behind can be aimed. */
  mirror: HTMLImageElement;
  cars: HTMLImageElement[];
  sides: HTMLImageElement[];
  flames: HTMLImageElement[];
  weapons: Record<string, HTMLImageElement>;
  booms: Record<string, HTMLImageElement>;
  scenery: HTMLImageElement[];
  ground: HTMLImageElement[];
  /** Purple solar row. Drawn on top of the frozen shell. */
  pescocoPanels: HTMLImageElement;
  /** Dash buttons. Drawn on top of the frozen shell. */
  pescocoButtons: HTMLImageElement;
  lockPlate: HTMLImageElement;
  race?: RaceArt;
};

const GLYPH: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "110", "100", "110", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "101", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "011", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "010", "010"],
  W: ["101", "101", "101", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  " ": ["000", "000", "000", "000", "000"],
  "+": ["000", "010", "111", "010", "000"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["000", "000", "000", "000", "010"],
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; s: number };
const sparks: Spark[] = [];

function burst(x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    if (sparks.length > 90) sparks.shift();
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random());
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: 0.35 + Math.random() * 0.3,
      max: 0.55,
      color,
      s: 3 + Math.floor(Math.random() * 3),
    });
  }
}

function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  let cx = x;
  const up = str.toUpperCase().normalize("NFC");
  for (const ch of up) {
    const folded = ch.normalize("NFD");
    let letter = "";
    let accent = false;
    for (const part of folded) {
      if (/\p{M}/u.test(part)) {
        accent = true;
        continue;
      }
      letter = part;
    }
    if (!letter) continue;
    const g = GLYPH[letter] ?? GLYPH[" "];
    if (accent) ctx.fillRect(cx + s, y, s, Math.max(1, s));
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r]!.length; c++) {
        if (g[r]![c] === "1") ctx.fillRect(cx + c * s, y + r * s, s, s);
      }
    }
    cx += 4 * s;
  }
  return cx;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const finish = () => resolve(img);
    img.onload = finish;
    img.onerror = () => {
      const blank = document.createElement("canvas");
      blank.width = 1;
      blank.height = 1;
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.src = blank.toDataURL();
    };
    img.src = src;
  });
}

export function loadArt(): Promise<Art> {
  const keys = ["vex", "nyx", "geck", "lua", "shell", "claw", "medula", "ferrao", "coroa", "bofe", "neuro", "ronin", "trex", "pescoco", "friso", "balde", "casco", "valvula", "nave", "calha", "gancho", "escora", "tambor"];
  return Promise.all([
    loadImage("/game/cockpit.png"),
    loadImage("/game/skyline.jpg?v=4"),
    ...keys.map((key) => loadImage(key === "pescoco" ? "/game/cockpit/pescoco.png?v=7" : key === "ferrao" ? "/game/cockpit/ferrao.png?v=3" : key === "shell" ? "/game/cockpit/shell.png?v=3" : key === "balde" ? "/game/cockpit/balde.png?v=4" : key === "claw" ? "/game/cockpit/claw.png?v=2" : key === "valvula" ? "/game/cockpit/valvula.png?v=3" : key === "nave" ? "/game/cockpit/nave.png?v=1" : key === "casco" ? "/game/cockpit/casco.png?v=3" : key === "calha" ? "/game/cockpit/calha.png?v=2" : key === "gancho" ? "/game/cockpit/gancho.png?v=1" : key === "escora" ? "/game/cockpit/escora.png?v=1" : key === "tambor" ? "/game/cockpit/tambor.png?v=3" : key === "coroa" ? "/game/cockpit/coroa.png?v=4" : `/game/cockpit/${key}.png`)),
    ...[0, 1, 2, 3, 4, 5].map((i) => loadImage(`/game/car-${i}.png`)),
    ...[0, 1, 2, 3, 4, 5].map((i) => loadImage(`/game/side/car-${i}.png`)),
    ...[0, 1, 2, 3].map((i) => loadImage(`/game/flame-${i}.png`)),
    loadImage("/game/cockpit/pescoco-panels.png?v=2"),
    loadImage("/game/cockpit/pescoco-buttons.png?v=2"),
    ...["mg", "missile", "homing", "poison", "ice", "ray", "boom-mg", "boom-missile", "boom-poison", "boom-ice", "boom-ray"].map((name) => loadImage(`/game/weapons/${name}.png?v=2`)),
    ...["tree-fern", "tree-bone", "tower", "shack", "fern-neon", "shroom", "raptor", "bloom", "vine", "ptero", "reed", "totem", "crab", "spine"].map((name) => loadImage(`/game/scenery/${name}.png?v=2`)),
    ...["grass", "sand", "swamp"].map((name) => loadImage(`/game/ground/${name}.png`)),
    loadImage("/game/weapons/lock-plaque.png?v=1"),
    loadImage("/game/rearview.png?v=1"),
    loadRaceArt(),
  ]).then((loaded) => {
    const race = loaded.pop() as RaceArt;
    const pack = loaded as HTMLImageElement[];
    const mirror = pack.pop() as HTMLImageElement;
    const lockPlate = pack.pop() as HTMLImageElement;
    const ground = pack.splice(pack.length - 3, 3);
    const scenery = pack.splice(pack.length - 14, 14);
    const weaponImgs = pack.splice(pack.length - 11, 11);
    const weapons: Record<string, HTMLImageElement> = {};
    const booms: Record<string, HTMLImageElement> = {};
    ["mg", "missile", "homing", "poison", "ice", "ray"].forEach((id, i) => {
      weapons[id] = weaponImgs[i]!;
    });
    ["mg", "missile", "poison", "ice", "ray"].forEach((id, i) => {
      booms[id] = weaponImgs[6 + i]!;
    });
    booms.homing = booms.missile!;
    const pescocoButtons = pack.pop() as HTMLImageElement;
    const pescocoPanels = pack.pop() as HTMLImageElement;
    const [cockpit, sky, ...rest] = pack;
    const plates = rest.slice(0, keys.length);
    const cockpits: Record<string, HTMLImageElement> = {};
    keys.forEach((key, i) => {
      cockpits[key] = plates[i] ?? cockpit;
    });
    const tail = rest.slice(keys.length);
    return {
      cockpit,
      cockpits,
      sky,
      cars: tail.slice(0, 6),
      sides: tail.slice(6, 12),
      flames: tail.slice(12),
      weapons,
      booms,
      scenery,
      ground,
      pescocoPanels,
      pescocoButtons,
      lockPlate,
      mirror,
      race,
    };
  });
}

let CAM = 1.45;
const world = { flow: 0, dress: 0, clock: 0, scroll: 0 };

const BIOME_SPAN = 240;
const groundStrip: HTMLCanvasElement[] = [];

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/** 0..1, estável. Serve pra quebrar a grade sem repetir o vizinho. */
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ensureGround(tiles: HTMLImageElement[]) {
  if (groundStrip.length === 3 && groundStrip.every((c) => c.width > 0)) return;
  groundStrip.length = 0;
  for (let i = 0; i < 3; i++) {
    const tile = tiles[i];
    if (!tile?.width || !tile.height) return;
    const reps = 64;
    const c = document.createElement("canvas");
    c.width = tile.width * reps;
    c.height = tile.height;
    const g = c.getContext("2d");
    if (!g) return;
    g.imageSmoothingEnabled = false;
    for (let r = 0; r < reps; r++) g.drawImage(tile, r * tile.width, 0);
    const pixels = g.getImageData(0, 0, c.width, c.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 0.72);
      data[i + 1] = Math.min(255, data[i + 1] * 0.92 + 10);
      data[i + 2] = Math.min(255, data[i + 2] * 0.55);
    }
    g.putImageData(pixels, 0, 0);
    groundStrip.push(c);
  }
}

function paintGround(
  ctx: CanvasRenderingContext2D,
  horizon: number,
  vp: number,
  lane: number,
  lat: number,
  W: number,
  H: number,
  dist: number,
  tiles: HTMLImageElement[],
) {
  ensureGround(tiles);
  if (groundStrip.length < 3) return;
  const roadH = H - horizon;
  const span = 48;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (let y = Math.floor(horizon); y < H; y += 2) {
    const p = (y - horizon) / roadH;
    if (p < 0.025) continue;
    const roadHalf = (TRACK_EDGE + 0.55) * p * W * lat;
    const center = vp - lane * p * W * lat;
    const shoulders: [number, number][] = [
      [-8, center - roadHalf],
      [center + roadHalf, W + 8],
    ];
    for (const [x0, x1] of shoulders) {
      if (x1 - x0 < 4) continue;
      for (let x = x0; x < x1; x += span) {
        const dw = Math.min(span, x1 - x);
        const xMid = x + dw * 0.5;
        const xWorld = lane + (xMid - vp) / (p * W * lat);
        const image = groundStrip[0]!;
        const row = Math.floor(image.height * 0.46);
        const srcW = Math.max(1, Math.min(96, image.width - 1));
        const srcX = mod(Math.floor(dist * 4 + xWorld * 2), image.width - srcW);
        ctx.globalAlpha = 1;
        ctx.drawImage(image, srcX, row, srcW, 1, x, y, dw, 2);
      }
    }
  }
  ctx.restore();
}

const FAUNA = new Set([6, 9, 12]);

/**
 * Altura em unidades do mundo. 1 unidade ≈ a faixa de uma pista.
 * Na tela: pixels = unidades * (CAM / distância) * W * lat.
 * Perto fica maior. Longe fica pequeno. Nunca cobre o para-brisa.
 */
const BANDS = [
  { spacing: 36, min: 48, max: 520, lat: 15.5, spread: 3.2, units: 5.4, fog: 0.08, picks: [[2, 13, 1, 11], [1, 11, 2, 7], [13, 0, 11, 4]] },
  { spacing: 18, min: 10, max: 70, lat: 11.2, spread: 1.1, units: 2.4, fog: 0, picks: [[10, 5, 8, 6], [0, 4, 3, 12], [9, 6, 5, 10]] },
] as const;

function smooth(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function drawRoadside(
  ctx: CanvasRenderingContext2D,
  horizon: number,
  vp: number,
  lane: number,
  lat: number,
  W: number,
  H: number,
  dist: number,
  sprites: HTMLImageElement[],
) {
  const roadH = H - horizon;
  const batch: { ahead: number; sprite: number; side: number; lateral: number; units: number; seed: number; fog: number }[] = [];
  for (let b = 0; b < BANDS.length; b++) {
    const band = BANDS[b]!;
    const origin = Math.floor(dist / band.spacing) * band.spacing;
    const count = Math.ceil((band.max - band.min) / band.spacing) + 3;
    for (let n = -1; n < count; n++) {
      const slot = Math.floor((origin + n * band.spacing) / band.spacing);
      if (hash01(slot * 19 + b * 7) < 0.18) continue;
      for (const side of [-1, 1]) {
        const salt = side < 0 ? 0 : 5;
        const h1 = hash01(slot * 13 + b * 3 + salt);
        const h2 = hash01(slot * 29 + b * 11 + salt);
        const z = origin + n * band.spacing + (h1 - 0.5) * band.spacing * 0.28;
        const ahead = z - dist;
        if (ahead < band.min || ahead > band.max) continue;
        const biome = Math.abs(Math.floor(z / BIOME_SPAN)) % 3;
        const picks = band.picks[biome] ?? band.picks[0];
        const sprite = picks[Math.floor(h2 * picks.length) % picks.length] ?? picks[0];
        batch.push({
          ahead,
          sprite,
          side,
          lateral: band.lat + (hash01(slot * 41 + salt + b) - 0.35) * band.spread,
          units: band.units * (0.86 + h2 * 0.28),
          seed: slot * 3 + salt + b * 17,
          fog: band.fog,
        });
      }
    }
  }
  batch.sort((a, b) => b.ahead - a.ahead);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (const item of batch) {
    const sprite = sprites[item.sprite];
    if (!sprite?.width || !sprite.height) continue;
    const p = CAM / item.ahead;
    const px = p * W * lat;
    const raw = item.units * px;
    const h = raw / (1 + raw / 132);
    if (h < 8) continue;
    const w = h * (sprite.width / sprite.height);
    const alive = FAUNA.has(item.sprite);
    const sway = alive ? Math.sin(world.clock * 1.6 + item.seed) * h * 0.015 : 0;
    const bob = alive ? Math.abs(Math.sin(world.clock * 2.2 + item.seed)) * h * 0.02 : 0;
    const foot = vp + (item.side * item.lateral - lane) * p * W * lat + sway;
    const x = item.side < 0 ? foot - w * 0.86 : foot - w * 0.14;
    const y = horizon + p * roadH;
    const wall = item.side < 0 ? vp - (TRACK_EDGE + lane) * p * W * lat : vp + (TRACK_EDGE - lane) * p * W * lat;
    if (x > W + 8 || x + w < -8) continue;
    const near = smooth((item.ahead - 9) / 7);
    const far = smooth((h - 8) / 16);
    const off = item.side < 0 ? Math.max(0, wall - (x + w)) : Math.max(0, x - wall);
    const slide = off > 0 ? smooth(1 - off / 36) : 1;
    ctx.globalAlpha = near * far * slide * (1 - item.fog);
    if (ctx.globalAlpha < 0.04) continue;
    const ih = Math.round(h);
    const iw = Math.max(1, Math.round(w));
    const ix = Math.round(x);
    const iy = Math.round(y);
    ctx.save();
    ctx.beginPath();
    if (item.side < 0) ctx.rect(-20, 0, Math.max(0, wall - 2) + 20, H);
    else ctx.rect(wall + 2, 0, W - wall + 20, H);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(item.side < 0 ? ix + iw * 0.82 : ix + iw * 0.18, iy - 1, iw * 0.22, Math.max(2, ih * 0.035), 0, 0, Math.PI * 2);
    ctx.fill();
    if (item.side < 0) {
      ctx.translate(ix + iw, iy - ih - bob);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, iw, ih);
    } else {
      ctx.drawImage(sprite, ix, iy - ih - bob, iw, ih);
    }
    ctx.restore();
  }
  ctx.restore();
}

function paintLaneDots(
  ctx: CanvasRenderingContext2D,
  horizon: number,
  vp: number,
  lane: number,
  lat: number,
  W: number,
  H: number,
  dist: number,
) {
  const roadH = H - horizon;
  const marks: number[] = [];
  for (let k = -4; k <= 4; k++) {
    const mark = k * LANE_GAP;
    if (Math.abs(mark) < TRACK_EDGE - 0.4) marks.push(mark);
  }
  const DASH = 18;
  const GAP = 16;
  const period = DASH + GAP;
  const scroll = ((dist * 22) % period + period) % period;
  ctx.fillStyle = "#f4efe2";
  for (let y = H - 1; y >= Math.floor(horizon) + 8; y--) {
    const local = (H - y + scroll) % period;
    if (local > DASH) continue;
    const p = (y - horizon) / roadH;
    if (p < 0.045) continue;
    const lw = Math.max(1.25, Math.min(4.5, p * 3.6));
    for (const mark of marks) {
      const x = vp + (mark - lane) * p * W * lat;
      if (x < -8 || x > W + 8) continue;
      ctx.fillRect(Math.round(x - lw / 2), y, Math.max(1, lw), 1);
    }
  }
}

function drawPescocoEye(ctx: CanvasRenderingContext2D, now: number) {
  const cx = 649;
  const top = 60;
  const bot = 112;
  const half = 7;
  const look = Math.sin((now % 4) / 4 * Math.PI * 2);
  const cy = (top + bot) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, half + 1, (bot - top) / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#14080c";
  ctx.fillRect(cx + look * 3 - 1, top + 6, 3, bot - top - 12);
  ctx.fillStyle = "rgba(255,214,160,0.4)";
  ctx.fillRect(cx + look * 3 - 4, cy - 8, 2, 5);
  ctx.restore();
}

function drawPescocoLamps(ctx: CanvasRenderingContext2D, art: Art, now: number, reduce: boolean) {
  const panel = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 2.2));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = reduce ? 0.45 : 0.2 + 0.7 * panel;
  ctx.drawImage(art.pescocoPanels, 0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = reduce ? 0.6 : Math.sin(now * 5.5) > 0 ? 0.9 : 0.15;
  ctx.drawImage(art.pescocoButtons, 0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  drawPescocoEye(ctx, reduce ? 0 : now);
}

function drawAim(
  ctx: CanvasRenderingContext2D,
  m: Match,
  art: Art,
  now: number,
  airAt: (ahead: number, worldLane: number) => { x: number; y: number; sp: number },
) {
  const W = VIEW_W;
  const H = VIEW_H;
  const lockingFront = m.player.weapon === "homing" && !!m.rival && m.rival.dist > m.player.dist + 1.2;
  if (lockingFront && (m.aim > 0.02 || m.aimLock) && (m.phase === "race" || m.phase === "free")) {
    const ahead = m.rival!.dist - m.player.dist;
    const raw = airAt(Math.min(Math.max(ahead, 1.2), 78), m.rival!.lane);
    const k = m.aimLock ? 1 : m.aim;
    const s = 62 - k * 34;
    const p = roadPoint(raw, s + 28);
    const arm = 14 + k * 10;
    ctx.save();
    ctx.strokeStyle = m.aimLock ? "#d6ff3f" : "#7fd7ff";
    ctx.lineWidth = 4;
    ctx.lineJoin = "miter";
    const marks: [number, number, number, number][] = [
      [-1, -1, 1, 1],
      [1, -1, -1, 1],
      [-1, 1, 1, -1],
      [1, 1, -1, -1],
    ];
    for (const [sx, sy, dx, dy] of marks) {
      ctx.beginPath();
      ctx.moveTo(p.x + sx * s, p.y + sy * s + dy * arm);
      ctx.lineTo(p.x + sx * s, p.y + sy * s);
      ctx.lineTo(p.x + sx * s + dx * arm, p.y + sy * s);
      ctx.stroke();
    }
    ctx.font = "700 22px Impact, Arial Black, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = m.aimLock ? "#d6ff3f" : "#e8fbff";
    const label = m.aimLock ? "TRAVADA — SOLTA" : "TRAVANDO";
    ctx.strokeText(label, p.x, p.y + s + 28);
    ctx.fillText(label, p.x, p.y + s + 28);
    ctx.restore();
  }
  if (m.incomingAim > 0.12) {
    const plate = art.lockPlate;
    const w = 560;
    const h = plate?.width ? w * (plate.height / plate.width) : 180;
    const x = (W - w) / 2;
    const y = H * 0.2;
    ctx.save();
    ctx.globalAlpha = 0.84 + Math.sin(now * 9) * 0.16;
    if (plate?.width) ctx.drawImage(plate, x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.font = "900 26px Impact, Arial Black, sans-serif";
    ctx.textAlign = "left";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#ff4d3a";
    const msg = "VOCÊ ESTÁ SENDO MIRADO";
    const tx = x + w * 0.34;
    const ty = y + h * 0.58;
    ctx.strokeText(msg, tx, ty);
    ctx.fillText(msg, tx, ty);
    ctx.restore();
  }
}

function roadPoint(p: { x: number; y: number; sp: number }, pad = 0) {
  return { x: p.x, y: Math.min(p.y, 500 - pad), sp: p.sp };
}

function paintRange(
  ctx: CanvasRenderingContext2D,
  m: Match,
  airAt: (ahead: number, worldLane: number) => { x: number; y: number; sp: number },
) {
  if (!m.rival || (m.mode !== "duel" && m.mode !== "free") || m.phase === "finish") return;
  const ahead = m.rival.dist - m.player.dist;
  if (ahead < -1.2) return;
  const chasing = ahead > 1.2;
  const reach = weaponReach(chasing ? m.player.load : m.player.rearLoad);
  const inside = Math.abs(ahead) <= reach && Math.abs(m.player.lane - m.rival.lane) < 1.35;
  const raw = airAt(Math.max(-6, Math.min(ahead, 78)), m.rival.lane);
  const rad = Math.max(22, raw.sp * (inside ? 70 : 48));
  const p = roadPoint(raw, rad + 20);
  ctx.save();
  ctx.strokeStyle = inside ? "#d6ff3f" : "#efe6d2";
  ctx.lineWidth = inside ? 5 : 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "900 18px Impact, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#070806";
  ctx.fillStyle = inside ? "#d6ff3f" : "#efe6d2";
  const label = inside ? "NO ALCANCE" : `${Math.max(0, Math.round(Math.abs(ahead) - reach))}M`;
  ctx.strokeText(label, p.x, p.y - rad - 8);
  ctx.fillText(label, p.x, p.y - rad - 8);
  ctx.restore();
}

function paintHits(
  ctx: CanvasRenderingContext2D,
  m: Match,
  dist: number,
  airAt: (ahead: number, worldLane: number) => { x: number; y: number; sp: number },
) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const num of m.floats ?? []) {
    const p = num.hud ? { x: 180, y: 70, sp: 1 } : roadPoint(airAt(num.dist - dist, num.lane), 24);
    const a = Math.max(0, num.life / num.max);
    const rise = (1 - a) * 46;
    const size = 28;
    ctx.globalAlpha = Math.min(1, a + 0.15);
    ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
    const label = `-${num.dmg}`;
    const text = num.label || label;
    const x = p.x + num.drift * (1 - a);
    const y = p.y - rise - 18;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#070806";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#ffe27a";
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

const MIRROR_HOLE = { l: 0.101, t: 0.48, r: 0.899, b: 0.857 };

/** Rear glass. Stays in the sky so the road, the car ahead, and the MG stream stay visible. */
function paintMirror(
  ctx: CanvasRenderingContext2D,
  m: Match,
  art: Art,
  rivalSprite: number,
  now: number,
  underStrip: boolean,
) {
  const img = art.mirror;
  if (!img?.width || !img.height) return;
  const horizon = VIEW_H * 0.36;
  const mw = 540;
  const mh = Math.round(mw * (img.height / img.width));
  const bottom = horizon - 16;
  const my = underStrip ? Math.max(66, Math.round(bottom - mh)) : 6;
  const mx = Math.round((VIEW_W - mw) / 2);
  const gl = mx + mw * MIRROR_HOLE.l;
  const gt = my + mh * MIRROR_HOLE.t;
  const gw = mw * (MIRROR_HOLE.r - MIRROR_HOLE.l);
  const gh = mh * (MIRROR_HOLE.b - MIRROR_HOLE.t);
  const gb = gt + gh;

  ctx.save();
  ctx.beginPath();
  ctx.rect(gl + 1, gt + 1, gw - 2, gh - 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#10141c";
  ctx.fillRect(gl, gt, gw, gh);
  const sky = art.sky;
  if (sky?.width && sky.height) {
    ctx.drawImage(sky, sky.width * 0.2, sky.height * 0.05, sky.width * 0.6, sky.height * 0.42, gl, gt, gw, gh * 0.42);
  }

  // Same road as the windshield, looking back: asphalt, lime lips, white dashes.
  const lane = m.player.lane;
  const mHorizon = gt + gh * 0.16;
  const mBottom = gb;
  const mRoad = Math.max(8, mBottom - mHorizon);
  const mvp = gl + gw * 0.5 + m.player.yaw * gw * 0.06;
  const mLat = 0.1;
  const mCam = 1.35;
  ctx.fillStyle = "#1a3c22";
  ctx.fillRect(gl, mHorizon, gw, mBottom - mHorizon);
  for (let y = Math.floor(mHorizon); y < mBottom; y++) {
    const p = (y - mHorizon) / mRoad;
    if (p < 0.04) continue;
    const behind = mCam / p;
    const half = TRACK_EDGE * p * gw * mLat;
    const center = mvp - lane * p * gw * mLat;
    const cell = Math.floor((m.player.dist - behind) * 0.02);
    ctx.fillStyle = (cell & 1) === 0 ? "#141910" : "#1b2116";
    ctx.fillRect(center - half, y, half * 2, 1);
    const lip = Math.max(1, p * 2.4);
    ctx.fillStyle = "#d6ff3f";
    ctx.fillRect(center - half, y, lip, 1);
    ctx.fillRect(center + half - lip, y, lip, 1);
  }
  const marks: number[] = [];
  for (let k = -4; k <= 4; k++) {
    const mark = k * LANE_GAP;
    if (Math.abs(mark) < TRACK_EDGE - 0.4) marks.push(mark);
  }
  const period = 34;
  const scroll = ((m.player.dist * 22 + now * 6) % period + period) % period;
  ctx.fillStyle = "#f4efe2";
  for (let y = Math.floor(mBottom) - 1; y >= Math.floor(mHorizon) + 2; y--) {
    const local = (mBottom - y + scroll) % period;
    if (local > 16) continue;
    const p = (y - mHorizon) / mRoad;
    if (p < 0.08) continue;
    const lw = Math.max(1, p * 2.2);
    for (const mark of marks) {
      const x = mvp + (mark - lane) * p * gw * mLat;
      if (x < gl || x > gl + gw) continue;
      ctx.fillRect(Math.round(x - lw / 2), y, Math.max(1, lw), 1);
    }
  }

  const project = (behind: number, worldLane: number) => {
    const sp = Math.min(0.92, mCam / Math.max(0.85, behind));
    return {
      x: mvp + (worldLane - lane) * sp * gw * mLat,
      y: mHorizon + sp * mRoad,
      sp,
    };
  };

  for (const shot of m.shots ?? []) {
    if (!shot.live || !shot.back || shot.weapon === "mine") continue;
    const behind = m.player.dist - shot.dist;
    if (behind < 0.25 || behind > 32) continue;
    const p = project(behind, shot.lane);
    const tail = project(Math.max(0.55, behind - 2.2), shot.lane);
    const slug = shot.weapon === "leech" || shot.weapon === "bile" || shot.weapon === "frost";
    const r = Math.max(slug ? 4 : 3.2, p.sp * (slug ? 16 : 12));
    const color = shot.weapon === "bile" ? "#c084fc" : shot.weapon === "frost" ? "#9ee7ff" : shot.weapon === "leech" ? "#ff7ad9" : "#ffb020";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.55);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(p.x - r, p.y - r * 0.72, r * 2, r * 1.45);
    ctx.fillStyle = "#fff6df";
    ctx.fillRect(p.x - r * 0.38, p.y - r * 0.28, r * 0.76, r * 0.56);
  }

  let lined = false;
  let tag = "LIMPO";
  let tagColor = "#9aa18c";
  if (m.rival && (m.mode === "duel" || m.mode === "free")) {
    const behind = m.player.dist - m.rival.dist;
    if (behind > 0.4) {
      const reach = weaponReach(m.player.rearLoad);
      const shown = behind > reach ? 16 + Math.min(8, (behind - reach) / reach) : 1.6 + (behind / reach) * 14;
      const p = project(shown, m.rival.lane);
      const car = art.cars[rivalSprite] ?? art.cars[0];
      if (car?.width && car.height) {
        const ch = Math.min(gh * 0.7, Math.max(gh * 0.28, gh * (0.22 + p.sp * 0.9)));
        const cw = ch * 0.72;
        const src = cutMagenta(car);
        ctx.drawImage(src, car.width * 0.1, car.height * 0.3, car.width * 0.8, car.height * 0.58, p.x - cw / 2, p.y - ch * 0.92, cw, ch);
      }
      const delta = Math.abs(m.rival.lane - lane);
      lined = delta <= 0.85;
      const inside = behind <= reach && lined;
      if (m.aimLock && m.player.rear === "leech") {
        tag = "TRAVADA";
        tagColor = "#d6ff3f";
      } else if (inside) {
        tag = "NO ALVO";
        tagColor = "#d6ff3f";
      } else {
        tag = `${Math.max(1, Math.round(behind))}M`;
        tagColor = lined ? "#d6ff3f" : "#efe6d2";
      }
    }
  }

  const aim = project(6, lane);
  ctx.strokeStyle = lined ? "#d6ff3f" : "rgba(239,230,210,0.9)";
  ctx.lineWidth = lined ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(aim.x - 10, aim.y);
  ctx.lineTo(aim.x - 4, aim.y);
  ctx.moveTo(aim.x + 4, aim.y);
  ctx.lineTo(aim.x + 10, aim.y);
  ctx.moveTo(aim.x, aim.y - 7);
  ctx.lineTo(aim.x, aim.y - 2);
  ctx.moveTo(aim.x, aim.y + 2);
  ctx.lineTo(aim.x, aim.y + 7);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, mx, my, mw, mh);
  text(ctx, tag, mx + 12, my + mh * 0.62, 3, tagColor);
  ctx.restore();
}

function paintChaseCar(ctx: CanvasRenderingContext2D, m: Match, neon: string, now: number, sprite?: CanvasImageSource) {
  const hex = NEON_HEX[neon as keyof typeof NEON_HEX] ?? "#d6ff3f";
  const tilt = m.player.laneT > 0 ? (m.player.laneGoal >= m.player.laneFrom ? 1 : -1) * ((6 * Math.PI) / 180) : 0;
  const x = VIEW_W * 0.5;
  const y = 560 - (m.player.hurt > 0.05 ? 6 : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const img = sprite as CanvasImageSource & { width?: number; height?: number };
  if (img && (img.width ?? 0) > 8 && (img.height ?? 0) > 8) {
    const src = cutMagenta(img);
    const w = 210;
    const h = w * ((img.height ?? 1) / (img.width ?? 1));
    ctx.drawImage(src, -w / 2, -h * 0.78, w, h);
  } else {
    ctx.fillStyle = "#1a140f";
    ctx.fillRect(-100, -28, 200, 78);
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(-78, -46, 156, 28);
    ctx.fillStyle = "#070806";
    ctx.fillRect(-36, -40, 72, 16);
    ctx.fillStyle = hex;
    ctx.fillRect(-86, -6, 26, 12);
    ctx.fillRect(60, -6, 26, 12);
  }
  ctx.fillStyle = "#8a8172";
  ctx.fillRect(-16, 36, 10, 16);
  ctx.fillRect(6, 36, 10, 16);
  if (m.player.hp < m.player.hpMax * 0.5) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = m.player.hp < m.player.hpMax * 0.25 ? "#1a1a1a" : "#9aa0a6";
    ctx.beginPath();
    ctx.arc(-20 + Math.sin(now * 6) * 6, -58, 14, 0, Math.PI * 2);
    ctx.arc(18, -64, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (m.player.empT > 0) {
    ctx.strokeStyle = "#3ee0ff";
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(-96, -50, 192, 100);
    ctx.globalAlpha = 1;
  }
  if (m.player.shield > 0) {
    ctx.strokeStyle = "#d4ff3a";
    ctx.fillStyle = "rgba(212,255,58,0.18)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -10, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (m.player.nitroOn > 0) {
    ctx.fillStyle = "#7fd7ff";
    const h = 36 + (Math.floor(now * 16) % 3) * 14;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillRect(-18, 28, 14, h);
    ctx.fillRect(6, 28, 14, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-8, 28, 8, h * 0.55);
    ctx.fillRect(2, 28, 8, h * 0.55);
  }
  ctx.restore();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  m: Match,
  art: Art,
  up: Upgrades,
  neon: string,
  rivalSprite: number,
  events: string[],
  now: number,
  reduce: boolean,
  plate: CanvasImageSource,
  youMark: CanvasImageSource,
  gaugeKey = "default",
  plateVideo: HTMLVideoElement | null = null,
  digital = false,
  strip: "solid" | "fade" | "off" = "solid",
) {
  const W = VIEW_W;
  const H = VIEW_H;
  const chase = m.view !== "cockpit";
  const horizon = chase ? 300 - (m.camPull || 0) * 16 : H * 0.36;
  const dist = m.player.dist;
  const yaw = m.player.yaw;
  const lane = m.player.lane;
  const LAT = 0.1;
  const vp = W * 0.5 + yaw * W * 0.045;
  const vmaxMs = Math.max(12, (m.player.bot ? m.rivalPace : m.pace) * (232 / 2.237));
  const feel = Math.max(0, Math.min(1, m.player.speed / vmaxMs));
  const fov = 70 + 14 * Math.pow(feel, 1.5) + (m.fovKick || 0);
  CAM = 1.45 * (fov / 70);
  if (chase) CAM *= 1 - (m.camPull || 0) * 0.22;

  for (const ev of events) {
    if (ev === "shift:perfeito") burst(W * 0.5, H * 0.62, "#d6ff3f", 18, 220);
    if (ev.startsWith("nitro")) burst(W * 0.5, H * 0.78, "#7fd7ff", 28, 320);
    if (ev === "redlight" || ev === "wall") burst(W * 0.5, H * 0.58, "#ff3b1f", 14, 180);
    if (ev === "band") burst(W * 0.62, H * 0.66, "#efe6d2", 6, 80);
    if (ev === "shot") burst(W * 0.5, H * 0.62, "#ff7300", 22, 260);
    if (ev === "mine") burst(W * 0.5, H * 0.86, "#ff3b1f", 20, 240);
    if (ev === "shield") burst(W * 0.5, H * 0.7, "#d4ff3a", 24, 280);
    if (ev === "hurt") burst(W * 0.5, H * 0.5, "#ff3b1f", 16, 200);
  }

  ctx.save();
  if (!reduce) {
    const mphNow = m.player.speed * 2.236936;
    const s = feel;
    const base = mphNow < 40 ? 0 : 2.5 * s + (m.player.nitroOn > 0 ? 1 : 0);
    const hz = 18 + 7 * (0.5 + 0.5 * Math.sin(dist * 0.17));
    const wob = Math.sin(now * hz * Math.PI * 2) * base;
    const kick = m.shakePx || 0;
    const jx = kick > 0.2 ? Math.sin(now * 47) * kick : 0;
    const jy = kick > 0.2 ? Math.cos(now * 39) * kick * 0.65 : 0;
    ctx.translate(wob + jx, jy);
  }

  ctx.fillStyle = "#10141c";
  ctx.fillRect(-40, -40, W + 80, H + 80);

  const sky = art.sky;
  const skyBottom = horizon + 8;
  if (sky?.width && sky.height) {
    // Cover the whole sky band. The jpg's last rows are a black curb — drop them
    // so the ferns sit on the grass instead of leaving a black stripe.
    const srcH = sky.height * 0.86;
    const bleed = 200;
    const destW = W + bleed * 2;
    const destH = skyBottom + 12;
    const scale = Math.max(destW / sky.width, destH / srcH);
    const drawW = sky.width * scale;
    const drawH = srcH * scale;
    const drawX = (W - drawW) / 2 - yaw * 36;
    const drawY = skyBottom - drawH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-80, -40, W + 160, skyBottom);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sky, 0, 0, sky.width, srcH, drawX, drawY, drawW, drawH);
    ctx.restore();
  }
  if (art.race) paintParallax(ctx, art.race, dist, yaw, W, horizon);

  ctx.fillStyle = "#4a341c";
  ctx.fillRect(-20, horizon, W + 40, H - horizon + 30);

  const dt = Math.min(0.05, Math.max(0, now - world.clock));
  world.clock = now;
  const cruise = Math.min(16, Math.max(0, m.player.speed));
  world.scroll += cruise * dt * 0.55;
  world.dress = (dist * 0.008) % 1;

  paintGround(ctx, horizon, vp, lane, LAT, W, H, dist, art.ground ?? []);

  for (let y = Math.floor(horizon); y < H; y++) {
    const p = (y - horizon) / (H - horizon);
    if (p < 0.02) continue;
    const ahead = CAM / p;
    const half = TRACK_EDGE * p * W * LAT;
    const center = vp - lane * p * W * LAT;
    const cell = Math.floor(ahead * 0.02 + world.scroll * 0.12);
    const asphalt = (cell & 1) === 0 ? "#141910" : "#1b2116";
    ctx.fillStyle = asphalt;
    ctx.fillRect(center - half, y, half * 2, 1);
    const wallW = Math.max(8, p * 36);
    ctx.fillStyle = "#24160f";
    ctx.fillRect(center - half - wallW, y, wallW, 1);
    ctx.fillRect(center + half, y, wallW, 1);
    ctx.fillStyle = "#d6ff3f";
    const lip = Math.max(2, p * 4);
    ctx.fillRect(center - half, y, lip, 1);
    ctx.fillRect(center + half - lip, y, lip, 1);
    const finishAhead = m.strip - dist;
    if (finishAhead > 0 && Math.abs(ahead - finishAhead) < Math.max(0.45, m.pace * 0.35)) {
      ctx.fillStyle = y & 1 ? "#d6ff3f" : "#efe6d2";
      ctx.fillRect(center - half, y, half * 2, 1);
    }
  }

  paintLaneDots(ctx, horizon, vp, lane, LAT, W, H, dist);
  if (art.race) paintBeira(ctx, art.race, dist, W, horizon, H);
  drawRoadside(ctx, horizon, vp, lane, LAT, W, H, dist, art.scenery);

  const airAt = (ahead: number, worldLane: number) => {
    if (chase && ahead < 0) {
      const t = Math.max(0, Math.min(1, -ahead / 25));
      const sp = 0.42 + (m.camPull || 0) * 0.12;
      const y = 575 + t * (36 + (m.camPull || 0) * 48);
      const x = vp + (worldLane - lane) * sp * W * LAT;
      return { x, y: Math.min(700, y), sp };
    }
    const z = Math.max(0.85, ahead);
    const sp = Math.min(0.9, CAM / z);
    const y = horizon + sp * (H - horizon) - sp * H * 0.16;
    const x = vp + (worldLane - lane) * sp * W * LAT;
    return { x, y, sp };
  };

  const paintStreak = (headA: number, tailA: number, worldLane: number, core: string, hot: string, thick: number) => {
    const a = airAt(headA, worldLane);
    const b = airAt(Math.max(0.55, tailA), worldLane);
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const len = Math.hypot(dx, dy);
    if (len < 1.2) return;
    const nx = -dy / len;
    const ny = dx / len;
    const w0 = Math.max(1.1, a.sp * thick);
    const w1 = Math.max(0.35, b.sp * thick * 0.22);
    ctx.beginPath();
    ctx.moveTo(a.x + nx * w0, a.y + ny * w0);
    ctx.lineTo(b.x + nx * w1, b.y + ny * w1);
    ctx.lineTo(b.x - nx * w1, b.y - ny * w1);
    ctx.lineTo(a.x - nx * w0, a.y - ny * w0);
    ctx.closePath();
    const g = ctx.createLinearGradient(b.x, b.y, a.x, a.y);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.4, core);
    g.addColorStop(1, hot);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = "#fff6df";
    const tip = Math.max(1.4, w0 * 0.45);
    ctx.fillRect(a.x - tip / 2, a.y - tip / 2, tip, tip);
  };

  const paintSlug = (headA: number, tailA: number, worldLane: number, color: string) => {
    const a = airAt(Math.max(0.7, headA), worldLane);
    const b = airAt(Math.max(0.55, tailA), worldLane);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, a.sp * 10);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(a.x, a.y);
    ctx.stroke();
    const r = Math.max(5, a.sp * 22);
    ctx.fillStyle = color;
    ctx.fillRect(a.x - r, a.y - r * 0.7, r * 2, r * 1.4);
    ctx.fillStyle = "#fff6df";
    ctx.fillRect(a.x - r * 0.4, a.y - r * 0.28, r * 0.8, r * 0.56);
  };

  ctx.save();
  for (const shot of m.shots ?? []) {
    const raced = art.race;
    const spriteReady =
      !!raced &&
      ((shot.weapon === "mine" && raced.minaOsso.width > 0) ||
        ((shot.weapon === "missile" || shot.weapon === "homing") && (shot.back ? raced.missilTras.width : raced.missilFrente.width) > 0));
    if (spriteReady) continue;
    const ahead = shot.dist - dist;
    if (shot.back && shot.weapon !== "mine") continue;
    if (shot.weapon === "mine" && (ahead < -40 || ahead > 80)) continue;
    if (shot.weapon !== "mine" && ahead < -6) continue;
    const ownBullet = shot.owner === "you" && shot.weapon === "mg";
    if (ownBullet) continue;
    const head = shot.weapon === "mine" ? ahead : Math.min(Math.max(ahead, 0.8), 84);
    const fade = ahead > 70 ? Math.max(0, 1 - (ahead - 70) / 46) : 1;
    if (fade <= 0) continue;
    const kin =
      shot.weapon === "tail" ? "mg" : shot.weapon === "mine" ? "missile" : shot.weapon === "leech" ? "homing" : shot.weapon === "bile" ? "poison" : shot.weapon === "spark" ? "ray" : shot.weapon === "frost" ? "ice" : shot.weapon;
    const own = art.weapons?.[shot.weapon];
    const icon = own?.width ? own : art.weapons?.[kin];
    const p = airAt(head, shot.lane);
    const stamp = (img: HTMLImageElement | undefined, h: number) => {
      if (!img?.width || !img.height) return;
      const w = h * (img.width / img.height);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, p.x - w / 2, p.y - h * 0.55, w, h);
      ctx.restore();
    };
    if (kin === "ray") {
      const from = shot.back ? airAt(Math.max(head, 12), shot.lane) : airAt(2.4, shot.lane);
      const to = shot.back ? airAt(1.5, shot.lane) : airAt(Math.max(head, 36), shot.lane);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      ctx.strokeStyle = "#7af0ff";
      ctx.lineWidth = Math.max(2, from.sp * 10);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      stamp(icon, Math.max(28, p.sp * 70));
      continue;
    }
    if (kin === "mg") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      paintSlug(head, Math.max(0.7, head - 3.4), shot.lane, shot.owner === "you" ? "#ffb020" : "#ff3b1f");
      ctx.restore();
      continue;
    }
    if (kin === "missile") {
      const nose = airAt(head + 1.6, shot.lane);
      const tail = airAt(Math.max(0.7, head - 1.1), shot.lane);
      const dx = nose.x - tail.x;
      const dy = nose.y - tail.y;
      const len = Math.max(8, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const pxn = -uy;
      const pyn = ux;
      const bodyW = Math.max(7, nose.sp * 28);
      const fin = bodyW * 1.7;
      const flick = 0.75 + ((Math.floor(now * 16) % 2) === 0 ? 0.25 : 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      const flame = len * (0.85 + flick * 0.45);
      ctx.beginPath();
      ctx.moveTo(tail.x + pxn * bodyW * 0.35, tail.y + pyn * bodyW * 0.35);
      ctx.lineTo(tail.x - ux * flame, tail.y - uy * flame);
      ctx.lineTo(tail.x - pxn * bodyW * 0.35, tail.y - pyn * bodyW * 0.35);
      ctx.closePath();
      ctx.fillStyle = "#ff4d1a";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tail.x + pxn * bodyW * 0.16, tail.y + pyn * bodyW * 0.16);
      ctx.lineTo(tail.x - ux * flame * 0.72, tail.y - uy * flame * 0.72);
      ctx.lineTo(tail.x - pxn * bodyW * 0.16, tail.y - pyn * bodyW * 0.16);
      ctx.closePath();
      ctx.fillStyle = "#ffe27a";
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#d7dde6";
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.lineTo(tail.x + pxn * bodyW * 0.45, tail.y + pyn * bodyW * 0.45);
      ctx.lineTo(tail.x - pxn * bodyW * 0.45, tail.y - pyn * bodyW * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8d97a6";
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tail.x + pxn * fin + ux * len * 0.28, tail.y + pyn * fin + uy * len * 0.28);
      ctx.lineTo(tail.x + ux * len * 0.42, tail.y + uy * len * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tail.x - pxn * fin + ux * len * 0.28, tail.y - pyn * fin + uy * len * 0.28);
      ctx.lineTo(tail.x + ux * len * 0.42, tail.y + uy * len * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff7300";
      ctx.fillRect(nose.x - 2, nose.y - 2, 4, 4);
      ctx.restore();
      continue;
    }
    if (kin === "homing" && icon?.width) {
      const noseA = shot.back ? Math.max(0.7, head - 1.6) : head + 2.1;
      const tailA = shot.back ? head + 1.7 : Math.max(0.7, head - 1.5);
      const nose = airAt(noseA, shot.lane);
      const tail = airAt(tailA, shot.lane);
      const ang = Math.atan2(nose.y - tail.y, nose.x - tail.x) + Math.PI / 2;
      const h = Math.max(16, Math.min(42, p.sp * 40));
      const w = h * (icon.width / icon.height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * 0.8;
      paintStreak(head, Math.max(0.8, head - 5), shot.lane, "#1498c4", "#e8fbff", 2.2);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.imageSmoothingEnabled = false;
      ctx.translate((nose.x + tail.x) / 2, (nose.y + tail.y) / 2);
      ctx.rotate(ang);
      ctx.drawImage(icon, -w / 2, -h * 0.62, w, h);
      ctx.restore();
      continue;
    }
    const trail = kin === "homing" ? 7 : 3.5;
    const thick = kin === "ice" ? 3 : 4;
    const core = kin === "poison" ? "#7a1cff" : kin === "ice" ? "#9fdfff" : kin === "homing" ? "#1498c4" : "#ff7300";
    const hot = kin === "poison" ? "#d6ff3f" : kin === "ice" ? "#ffffff" : kin === "homing" ? "#e8fbff" : "#ffd27a";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = fade * 0.85;
    paintStreak(head, Math.max(1.2, head - trail), shot.lane, core, hot, thick);
    ctx.restore();
    const size = kin === "homing" ? 64 : kin === "poison" ? 78 : 74;
    stamp(icon, Math.max(22, p.sp * size));
  }
  ctx.restore();

  const neonHex = NEON_HEX[neon as keyof typeof NEON_HEX] ?? "#d6ff3f";
  ctx.fillStyle = neonHex;
  const glowY = horizon + (H - horizon) * 0.72;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(vp - W * 0.22, glowY, W * 0.08, 6);
  ctx.fillRect(vp + W * 0.14, glowY, W * 0.08, 6);
  ctx.globalAlpha = 1;

  const drawCar = (ahead: number, worldLane: number, sprite: number, nitro: boolean) => {
    if (ahead < (chase ? -28 : -12) || ahead > 140) return;
    const z = Math.max(3.2, ahead);
    const p = Math.min(0.48, CAM / z);
    const y = horizon + p * (H - horizon);
    const lanePx = LANE_GAP * p * W * LAT;
    const w = Math.max(ahead > 50 ? 44 : 26, lanePx * 1.15);
    const img = art.cars[sprite] ?? art.cars[0];
    const h = w * (img.height / Math.max(1, img.width));
    const x = vp + (worldLane - lane) * p * W * LAT;
    ctx.drawImage(img, x - w / 2, y - h * 0.92, w, h);
    if (w < 90) {
      ctx.save();
      ctx.strokeStyle = "#d6ff3f";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - w / 2 - 2, y - h * 0.92 - 2, w + 4, h + 4);
      ctx.restore();
    }
    if (nitro) {
      const fr = art.flames[Math.floor(now * 12) % art.flames.length];
      const fw = h * 0.72;
      const fh = h * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(x, y - h * 0.02);
      ctx.scale(1, -1);
      ctx.drawImage(fr, -fw / 2, -fh * 0.2, fw, fh);
      ctx.restore();
    }
  };

  if (m.rival && (m.mode === "duel" || m.mode === "free")) {
    const ahead = m.rival.dist - dist;
    if (m.player.draft > 0.04 && ahead > 1.6 && ahead < 26) paintSlip(ctx, now, airAt, ahead, m.rival.lane, m.player.draft);
    if (ahead < (chase ? -28 : -12) || ahead > 140) {
      const pin = ahead > 0 ? 64 : 8;
      const p = airAt(pin, m.rival.lane);
      ctx.save();
      ctx.fillStyle = "#d6ff3f";
      ctx.beginPath();
      if (ahead > 0) {
        ctx.moveTo(p.x, p.y - 16);
        ctx.lineTo(p.x - 12, p.y + 8);
        ctx.lineTo(p.x + 12, p.y + 8);
      } else {
        ctx.moveTo(p.x, p.y + 16);
        ctx.lineTo(p.x - 12, p.y - 8);
        ctx.lineTo(p.x + 12, p.y - 8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const far = `${Math.abs(Math.round(ahead))}M`;
      text(ctx, far, p.x - far.length * 4, p.y + (ahead > 0 ? 12 : -22), 2, "#d6ff3f");
    } else {
      drawCar(ahead, m.rival.lane, rivalSprite, m.rival.nitroOn > 0);
    }
    const coat = m.rival.poison > 0 ? art.booms?.poison : m.rival.freeze > 0 ? art.booms?.ice : m.rival.slow < 1 && m.rival.slowT > 0 ? art.weapons?.ray : null;
    if (coat && coat.width && coat.height) {
      const p = airAt(ahead, m.rival.lane);
      const h = Math.max(16, p.sp * 46);
      const w = h * (coat.width / coat.height);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(coat, p.x - w / 2, p.y - h * 0.8, w, h);
      ctx.restore();
    }
  }

  for (const box of m.crates ?? []) {
    if (art.race || box.taken) continue;
    const gap = box.dist - dist;
    if (gap < -8 || gap > 90) continue;
    const p = airAt(Math.max(2, gap), box.lane);
    ctx.save();
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(p.x - 7, p.y - 10, 14, 14);
    ctx.restore();
  }

  for (const hit of m.impacts ?? []) {
    const sheetReady = art.race && ((hit.weapon === "mine" && art.race.minaBoom.width > 0) || (hit.weapon !== "mine" && art.race.impacto.width > 0));
    if (sheetReady && (hit.weapon === "missile" || hit.weapon === "mine" || hit.weapon === "homing")) continue;
    if (!hit.max) continue;
    const p = airAt(hit.dist - dist, hit.lane);
    const a = Math.max(0, hit.life / hit.max);
    const rad = (1.35 - a) * Math.max(6, p.sp * 54);
    const boom = art.booms?.[hit.weapon] ?? art.booms?.[hit.weapon === "mine" ? "missile" : hit.weapon === "bile" ? "poison" : hit.weapon === "spark" ? "ray" : hit.weapon === "frost" ? "ice" : hit.weapon === "leech" ? "missile" : hit.weapon === "tail" ? "mg" : hit.weapon];
    const blast = hit.weapon === "missile" || hit.weapon === "mine";
    if (blast) {
      const boomR = Math.max(36, rad * 3.4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ff4d1a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, boomR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, boomR * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, a + 0.2);
      ctx.strokeStyle = "#fff6df";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, boomR * (1.15 + (1 - a) * 0.35), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (boom?.width && boom.height) {
      const h = blast ? Math.max(86, rad * 6) : Math.max(28, rad * 2.4);
      const w = h * (boom.width / boom.height);
      ctx.save();
      ctx.globalAlpha = Math.min(1, a + 0.15);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(boom, p.x - w / 2, p.y - h * 0.55, w, h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.fillStyle = hit.weapon === "ice" ? "#d7f6ff" : hit.weapon === "poison" ? "#c084fc" : hit.weapon === "ray" ? "#7af0ff" : "#ff7300";
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= 1 / 60;
    s.x += s.vx / 60;
    s.y += s.vy / 60;
    s.vy += 80 / 60;
    if (s.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, s.life / s.max);
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.s, s.s);
    ctx.globalAlpha = 1;
  }

  const clip = gaugeKey === "pescoco" ? null : plateVideo && plateVideo.readyState >= 2 ? plateVideo : null;
  const box = plateBox(gaugeKey);
  if (!chase) {
    ctx.drawImage(plate, box.x, box.y, box.w, box.h);
  } else {
    paintChaseCar(ctx, m, neon, now, youMark);
  }
  if (m.player.nitroOn > 0) {
    ctx.save();
    const edge = ctx.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, "rgba(80,170,255,0.28)");
    edge.addColorStop(0.16, "rgba(80,170,255,0)");
    edge.addColorStop(0.84, "rgba(80,170,255,0)");
    edge.addColorStop(1, "rgba(80,170,255,0.28)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const fr = art.flames.length > 0 ? art.flames[Math.floor(now * 14) % art.flames.length] : undefined;
    if (fr?.width) {
      const fw = 86;
      const fh = 54;
      ctx.translate(vp, 508);
      ctx.scale(1, -1);
      ctx.drawImage(fr, -fw / 2, 0, fw, fh);
    } else {
      for (let i = 0; i < 5; i++) {
        const h = 16 + ((Math.floor(now * 16) + i) % 3) * 8;
        ctx.fillStyle = i % 2 === 0 ? "#7fd7ff" : "#e7f7ff";
        ctx.fillRect(vp + (i - 2) * 16, 492 - h, 7, h);
      }
    }
    ctx.restore();
  }
  if (m.player.laneT > 0) {
    const dir = m.player.laneGoal >= m.player.laneFrom ? 1 : -1;
    ctx.save();
    ctx.fillStyle = "#d6ff3f";
    const x = vp + dir * 90;
    const y = 460;
    ctx.beginPath();
    ctx.moveTo(x + dir * 18, y);
    ctx.lineTo(x - dir * 12, y - 14);
    ctx.lineTo(x - dir * 12, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (!chase && gaugeKey === "pescoco") drawPescocoLamps(ctx, art, now, reduce);
  else if (!chase && clip) drawKeyedClip(ctx, clip, plate);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const shot of m.shots ?? []) {
    if (!shot.live || shot.owner !== "you" || shot.weapon !== "mg") continue;
    const ahead = shot.dist - dist;
    if (ahead < 0.35 || ahead > 42) continue;
    paintSlug(ahead, Math.max(0.55, ahead - 3.2), shot.lane, "#ffb020");
  }
  ctx.restore();
  if (!chase) paintMirror(ctx, m, art, rivalSprite, now, strip !== "off" && m.mode === "duel" && !!m.rival);
  if (art.race) paintRaceWorld(ctx, m, art.race, now, dist, airAt);
  paintRange(ctx, m, airAt);
  paintHits(ctx, m, dist, airAt);
  ctx.restore();

  if (!reduce && m.player.speed * 2.236936 > 70) {
    const mphNow = m.player.speed * 2.236936;
    const vmaxMph = Math.max(80, vmaxMs * 2.236936);
    const t = Math.max(0, Math.min(1, (mphNow - 70) / Math.max(30, vmaxMph - 70)));
    const nitro = m.player.nitroOn > 0;
    const count = Math.floor((nitro ? 80 : 40) * t);
    ctx.save();
    ctx.strokeStyle = nitro ? "#7fd7ff" : "#efe6d2";
    ctx.globalAlpha = 0.45 * t;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < count; i++) {
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + now * 0.4;
      const inner = 18 + (i % 5) * 6;
      const outer = inner + 24 + t * 70;
      ctx.beginPath();
      ctx.moveTo(vp + Math.cos(ang) * inner, horizon + Math.sin(ang) * inner * 0.45);
      ctx.lineTo(vp + Math.cos(ang) * outer, horizon + Math.sin(ang) * outer * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (!reduce && m.player.speed * 2.236936 > 100) {
    const mphNow = m.player.speed * 2.236936;
    const vmaxMph = Math.max(120, vmaxMs * 2.236936);
    const t = Math.max(0, Math.min(1, (mphNow - 100) / Math.max(20, vmaxMph - 100)));
    const smear = 6 * t;
    ctx.save();
    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : W * 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.18 * t;
        ctx.fillStyle = i === 1 ? "#0c1210" : "#1a2218";
        ctx.fillRect(x + (side === 0 ? i * smear : -i * smear), horizon, W * 0.2, Math.max(0, 500 - horizon));
      }
    }
    ctx.restore();
  }

  if (!reduce && m.flash > 0.02) {
    const a = Math.min(0.35, m.flash);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, m.flashHot ? `rgba(120,16,8,${a})` : `rgba(80,110,20,${a * 0.6})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (art.race) {
    /* HUD da pista substitui o cluster do cockpit pra não desenhar dois painéis. */
  } else drawCluster(ctx, m, up, now, gaugeKey, digital);
  if (strip !== "off" && m.mode === "duel" && m.rival && !art.race) drawStrip(ctx, m, art, rivalSprite, youMark, strip);
  if (!art.race) drawHull(ctx, m, strip !== "off" && m.mode === "duel" && !!m.rival);
  if (chase) paintChaseHud(ctx, m, now);
  else if (art.race) paintRaceHud(ctx, m, art.race, now);
  if (m.debug && !chase) paintDebug(ctx, m, now);
}

/** Centro do velocímetro em fração do quadro. O mesmo papel de left/top de um CSS por cockpit. */
export type GaugePlace = { x: number; y: number; r: number };

/** T-Rex skull was full-bleed and hid the road the shots travel on. */
const COCKPIT_FIT: Record<string, number> = { trex: 0.54 };

function plateBox(gaugeKey: string) {
  const fit = COCKPIT_FIT[gaugeKey] ?? 1;
  const w = VIEW_W * fit;
  const h = VIEW_H * fit;
  return { x: (VIEW_W - w) / 2, y: VIEW_H - h, w, h };
}

export const COCKPIT_GAUGE: Record<string, GaugePlace> = {
  default: { x: 0.515, y: 0.752, r: 0.062 },
  claw: { x: 0.505, y: 0.806, r: 0.07 },
  geck: { x: 0.504, y: 0.825, r: 0.048 },
  lua: { x: 0.5, y: 0.82, r: 0.036 },
  medula: { x: 0.5, y: 0.772, r: 0.07 },
  ferrao: { x: 0.506, y: 0.799, r: 0.07 },
  coroa: { x: 0.5, y: 0.817, r: 0.072 },
  bofe: { x: 0.5, y: 0.817, r: 0.06 },
  neuro: { x: 0.5, y: 0.84, r: 0.05 },
  nyx: { x: 0.503, y: 0.824, r: 0.048 },
  ronin: { x: 0.5, y: 0.83, r: 0.046 },
  shell: { x: 0.506, y: 0.813, r: 0.046 },
  friso: { x: 0.507, y: 0.783, r: 0.038 },
  balde: { x: 0.5, y: 0.843, r: 0.066 },
  valvula: { x: 0.5, y: 0.884, r: 0.055 },
  casco: { x: 0.5, y: 0.813, r: 0.051 },
  nave: { x: 0.511, y: 0.803, r: 0.068 },
  calha: { x: 0.501, y: 0.88, r: 0.09 },
  gancho: { x: 0.507, y: 0.737, r: 0.05 },
  escora: { x: 0.509, y: 0.89, r: 0.061 },
  tambor: { x: 0.5, y: 0.876, r: 0.05 },
  trex: { x: 0.499, y: 0.737, r: 0.046 },
  vex: { x: 0.501, y: 0.66, r: 0.044 },
  babado: { x: 0.504, y: 0.825, r: 0.048 },
  pescoco: { x: 0.506, y: 0.815, r: 0.028 },
};

const keyScratch = typeof document === "undefined" ? null : document.createElement("canvas");
const keyCtx = keyScratch?.getContext("2d", { willReadFrequently: true }) ?? null;
const holdScratch = typeof document === "undefined" ? null : document.createElement("canvas");
const holdCtx = holdScratch?.getContext("2d") ?? null;
let maskSrc = "";

function cockpitMask(clip: HTMLVideoElement) {
  if (!keyScratch || !keyCtx || clip.readyState < 2 || !clip.videoWidth) return null;
  const w = clip.videoWidth;
  const h = clip.videoHeight;
  if (maskSrc === clip.src && keyScratch.width === w) return keyScratch;
  keyScratch.width = w;
  keyScratch.height = h;
  keyCtx.drawImage(clip, 0, 0, w, h);
  const frame = keyCtx.getImageData(0, 0, w, h);
  const d = frame.data;
  const n = w * h;
  const hole = new Uint8Array(n);
  let keyed = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const punch = r > 210 && b > 170 && g < 36 && Math.abs(r - b) < 50;
    if (punch) {
      hole[p] = 1;
      keyed++;
    }
  }
  if (keyed < 200) {
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
    keyCtx.putImageData(frame, 0, 0);
    maskSrc = clip.src;
    return keyScratch;
  }
  // Claw's lower windshield is a duller magenta, disconnected from the fur. Grow only from the hole.
  const stack = new Int32Array(n);
  let sp = 0;
  for (let p = 0; p < n; p++) if (hole[p]) stack[sp++] = p;
  while (sp > 0) {
    const p = stack[--sp]!;
    const x = p % w;
    const next = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p + w < n ? p + w : -1];
    for (const np of next) {
      if (np < 0 || hole[np]) continue;
      const i = np * 4;
      const r = d[i]!;
      const g = d[i + 1]!;
      const b = d[i + 2]!;
      const band = g < 30 && r > 200 && b > 165 && Math.abs(r - b) < 55;
      if (!band) continue;
      hole[np] = 1;
      stack[sp++] = np;
    }
  }
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = hole[p] ? 0 : 255;
  }
  keyCtx.putImageData(frame, 0, 0);
  maskSrc = clip.src;
  return keyScratch;
}

function drawKeyedClip(ctx: CanvasRenderingContext2D, clip: HTMLVideoElement, plate: CanvasImageSource) {
  try {
    drawKeyedClipInner(ctx, clip, plate);
  } catch {
    return;
  }
}

function drawKeyedClipInner(ctx: CanvasRenderingContext2D, clip: HTMLVideoElement, plate: CanvasImageSource) {
  if (!holdScratch || !holdCtx) return;
  const mask = cockpitMask(clip);
  if (!mask) return;
  const w = mask.width;
  const h = mask.height;
  if (holdScratch.width !== w || holdScratch.height !== h) {
    holdScratch.width = w;
    holdScratch.height = h;
  }
  holdCtx.globalCompositeOperation = "source-over";
  holdCtx.clearRect(0, 0, w, h);
  holdCtx.drawImage(clip, 0, 0, w, h);
  const frame = holdCtx.getImageData(0, 0, w, h);
  const px = frame.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    if (r < 16 && g < 16 && b < 16) px[i + 3] = 0;
  }
  holdCtx.putImageData(frame, 0, 0);
  holdCtx.globalCompositeOperation = "destination-in";
  holdCtx.drawImage(mask, 0, 0);
  // Regra: animação de cockpit nunca entra no para-brisa.
  // O vídeo só aparece onde a chapa é opaca. O vidro fica só com a pista.
  holdCtx.globalCompositeOperation = "destination-in";
  holdCtx.drawImage(plate, 0, 0, w, h);
  holdCtx.globalCompositeOperation = "source-over";
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(holdScratch, 0, 0, VIEW_W, VIEW_H);
  ctx.imageSmoothingEnabled = smooth;
}

const motions = new Map<string, HTMLVideoElement>();

const COCKPIT_CLIP: Record<string, string> = {
  babado: "/game/cockpit/babado.mp4?v=3",
  vex: "/game/cockpit/vex.mp4?v=1",
  nyx: "/game/cockpit/nyx.mp4?v=1",
  geck: "/game/cockpit/geck.mp4?v=1",
  lua: "/game/cockpit/lua.mp4?v=1",
  shell: "/game/cockpit/shell.mp4?v=5",
  friso: "/game/cockpit/friso.mp4?v=2",
  balde: "/game/cockpit/balde.mp4?v=3",
  valvula: "/game/cockpit/valvula.mp4?v=5",
  casco: "/game/cockpit/casco.mp4?v=6",
  nave: "/game/cockpit/nave.mp4?v=1",
  calha: "/game/cockpit/calha.mp4?v=1",
  gancho: "/game/cockpit/gancho.mp4?v=1",
  escora: "/game/cockpit/escora.mp4?v=5",
  tambor: "/game/cockpit/tambor.mp4?v=1",
  medula: "/game/cockpit/medula.mp4?v=1",
  ferrao: "/game/cockpit/ferrao.mp4?v=1",
  bofe: "/game/cockpit/bofe.mp4?v=1",
};

const RETIRED_CLIP: Record<string, string> = { pepe: "medula", doge: "ferrao", binance: "coroa", mexc: "bofe", btc: "medula" };

export function cockpitMotion(modelId?: string): HTMLVideoElement | null {
  if (!modelId) return null;
  modelId = RETIRED_CLIP[modelId] ?? modelId;
  const src = COCKPIT_CLIP[modelId];
  if (!src) return null;
  let clip = motions.get(modelId);
  if (!clip) {
    clip = document.createElement("video");
    clip.crossOrigin = "anonymous";
    clip.loop = true;
    clip.muted = true;
    clip.defaultMuted = true;
    clip.playsInline = true;
    clip.preload = "auto";
    clip.setAttribute("muted", "");
    clip.setAttribute("playsinline", "");
    clip.style.cssText = "position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none";
    document.body.appendChild(clip);
    motions.set(modelId, clip);
  }
  if (clip.dataset.file !== src) {
    clip.dataset.file = src;
    clip.src = src;
    clip.load();
  }
  for (const [id, other] of motions) {
    if (id !== modelId && !other.paused) other.pause();
  }
  if (clip.paused) clip.play().catch(() => undefined);
  return clip;
}

const sweep = { rpm: 0.12, clock: 0 };

function drawDigital(ctx: CanvasRenderingContext2D, m: Match) {
  const W = VIEW_W;
  const H = VIEW_H;
  const readout = Math.min(99999, Math.round(mph(m.player.speed)));
  const label = String(readout).padStart(5, "0");
  const s = 4;
  const gear = String(m.player.gear);
  const digit = 4 * s;
  const block = digit * 7 + 36;
  const x = W * 0.5 - block / 2;
  const y = H * 0.6;
  ctx.fillStyle = "rgba(8,10,6,0.62)";
  ctx.fillRect(x - 10, y - 8, block + 20, s * 5 + 18);
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(x - 10, y - 8, 3, s * 5 + 18);
  text(ctx, gear, x, y, s, m.player.band ? "#d6ff3f" : "#efe6d2");
  text(ctx, label, x + digit + 10, y, s, "#d6ff3f");
  text(ctx, "MPH", x + digit + 10 + digit * 5 + 8, y + s, 3, "#9aa18c");
  const frac = m.player.nitroMax > 0 ? Math.max(0, Math.min(1, m.player.nitroLeft / m.player.nitroMax)) : 0;
  const ny = y + s * 5 + 2;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = frac > i / 10 ? (m.player.nitroOn > 0 ? "#ff3b1f" : "#d6ff3f") : "#2a261c";
    ctx.fillRect(x + i * 12, ny, 9, 3);
  }
}

function drawCluster(ctx: CanvasRenderingContext2D, m: Match, up: Upgrades, now: number, gaugeKey: string, digital = false) {
  const W = VIEW_W;
  const H = VIEW_H;
  const dt = Math.min(0.05, Math.max(0, now - sweep.clock));
  sweep.clock = now;
  const target = Math.max(0, Math.min(1.05, m.player.rpm / REDLINE));
  const follow = 1 - Math.exp(-10 * dt);
  sweep.rpm += (target - sweep.rpm) * follow;

  const gauge = COCKPIT_GAUGE[gaugeKey] ?? COCKPIT_GAUGE.default;
  const box = plateBox(gaugeKey);
  const cx = box.x + box.w * gauge.x;
  const cy = box.y + box.h * gauge.y;
  const rad = box.w * gauge.r;
  const a0 = Math.PI * 0.78;
  const a1 = Math.PI * 2.22;
  const pre = !m.player.launched && m.mode === "duel";
  const [lo, hi] = pre ? launchWindow(up) : shiftWindow(up);
  const shown = Math.min(sweep.rpm, 1.02);
  let ang = a0 + (a1 - a0) * Math.min(shown, 1);
  if (shown >= 0.99) ang += Math.sin(now * 46) * 0.035;

  if (digital) {
    drawDigital(ctx, m);
  } else {
  for (let n = lo; n <= hi; n += 0.04) {
    const a = a0 + (a1 - a0) * n;
    const px = cx + Math.cos(a) * rad * 0.78;
    const py = cy + Math.sin(a) * rad * 0.78;
    const tick = Math.max(2, Math.round(rad * 0.06));
    ctx.fillStyle = m.player.band ? "#d6ff3f" : pre ? "#efe6d2" : "#5c6b30";
    ctx.fillRect(px - tick / 2, py - tick / 2, tick, tick);
  }

  const thick = Math.max(3, Math.round(rad * 0.1));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = shown >= 0.99 ? "#ff3b1f" : "#141806";
  ctx.fillRect(rad * 0.12, -thick / 2, rad * 0.62, thick);
  ctx.fillStyle = shown >= 0.99 ? "#ffb020" : "#efe6d2";
  ctx.fillRect(rad * 0.16, -thick / 4, rad * 0.54, Math.max(2, thick / 2));
  ctx.restore();
  const hub = Math.max(4, Math.round(rad * 0.12));
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(cx - hub, cy - hub, hub * 2, hub * 2);
  ctx.fillStyle = "#141806";
  ctx.fillRect(cx - hub / 2, cy - hub / 2, hub, hub);

  const readout = Math.min(99999, Math.round(mph(m.player.speed)));
  const label = String(readout).padStart(readout >= 1000 ? 5 : 3, "0");
  const s = Math.max(2, Math.round(rad / (label.length > 3 ? 28 : 22)));
  const tw = label.length * 4 * s;
  text(ctx, label, cx - tw / 2, cy + rad * 0.22, s, "#efe6d2");
  const sm = Math.max(2, s - 1);
  text(ctx, "MPH", cx - 6 * sm, cy + rad * 0.22 + s * 6, sm, "#9aa18c");
  const sg = Math.max(3, Math.round(rad / 16));
  text(ctx, String(m.player.gear), cx - rad * 0.55 - sg, cy - sg * 3, sg, "#efe6d2");

  const frac = m.player.nitroMax > 0 ? Math.max(0, Math.min(1, m.player.nitroLeft / m.player.nitroMax)) : 0;
  const bar = Math.max(3, Math.round(rad * 0.08));
  const gap = bar + 2;
  const nx = cx + rad * 0.62;
  const ny = cy - gap * 3.5;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = frac > i / 8 ? (m.player.nitroOn > 0 ? "#ff3b1f" : "#d6ff3f") : "#2a261c";
    ctx.fillRect(nx, ny + (7 - i) * gap, bar * 1.6, bar);
  }
  }

  if (m.phase === "race" && m.player.launched) {
    const clock = `${m.raceTime.toFixed(1)}s`;
    text(ctx, clock, 24, 18, 4, "#efe6d2");
  }

  if (false && m.player.launched && m.player.gear < m.player.gears && m.phase !== "finish") {
    const n = m.player.rpm / REDLINE;
    if (m.player.band || n >= 0.99 || n >= 0.7) {
      const hot = n >= 0.99;
      const label = m.player.band ? "TROCA" : hot ? "TROCA AGORA" : "";
      if (label) {
        const s = hot || m.player.band ? 8 : 7;
        text(ctx, label, W / 2 - (label.length * 4 * s) / 2, H * 0.42, s, hot ? "#ff3b1f" : "#d6ff3f");
      }
      const [lo, hi] = shiftWindow(up);
      const x = W / 2 - 150;
      const y = H * 0.48;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, y, 300, 16);
      ctx.fillStyle = "#3d4a22";
      ctx.fillRect(x + lo * 300, y, Math.max(8, (hi - lo) * 300), 16);
      ctx.fillStyle = m.player.band ? "#d6ff3f" : hot ? "#ff3b1f" : "#efe6d2";
      ctx.fillRect(x + Math.max(0, Math.min(1, n)) * 300 - 2, y - 4, 4, 24);
    }
  }

  if (false && m.callout && m.calloutT > 0) {
    const s = 8;
    const label = m.callout;
    const tw = label.length * 4 * s;
    text(ctx, label, W / 2 - tw / 2, H * 0.34, s, m.flashHot ? "#ff3b1f" : "#d6ff3f");
  }

  if ((m.mode === "duel" || m.mode === "free") && m.rival && m.phase !== "finish") {
    const delta = Math.round(m.player.dist - m.rival.dist);
    const where = delta < -8 ? "FRENTE" : delta > 8 ? "ATRAS" : "PERTO";
    const label = `${where} ${Math.abs(delta)}M`;
    const x = W - label.length * 16 - 56;
    const y = 36;
    ctx.save();
    ctx.fillStyle = "#d6ff3f";
    ctx.beginPath();
    const ax = x - 8;
    const ay = y + 12;
    if (delta < -8) {
      ctx.moveTo(ax, ay - 14);
      ctx.lineTo(ax - 11, ay + 8);
      ctx.lineTo(ax + 11, ay + 8);
    } else if (delta > 8) {
      ctx.moveTo(ax, ay + 14);
      ctx.lineTo(ax - 11, ay - 8);
      ctx.lineTo(ax + 11, ay - 8);
    } else {
      ctx.arc(ax, ay, 7, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    text(ctx, label, x, y, 4, "#d6ff3f");
  }
}

const cutCache = new WeakMap<object, CanvasImageSource>();

function cutMagenta(img: CanvasImageSource): CanvasImageSource {
  if (!(img instanceof HTMLImageElement) && !(img instanceof HTMLCanvasElement)) return img;
  const cached = cutCache.get(img);
  if (cached) return cached;
  const w = img.width;
  const h = img.height;
  if (!w || !h) return img;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, w, h);
  const d = data.data;
  let hit = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 200 && d[i + 2] > 200 && d[i + 1] < 120) {
      d[i + 3] = 0;
      hit += 1;
    }
  }
  if (hit > 20) g.putImageData(data, 0, 0);
  const out = hit > 20 ? c : img;
  cutCache.set(img, out);
  return out;
}

function paintSlip(
  ctx: CanvasRenderingContext2D,
  now: number,
  airAt: (ahead: number, worldLane: number) => { x: number; y: number; sp: number },
  ahead: number,
  worldLane: number,
  draft: number,
) {
  const pocket = Math.max(0, Math.min(1, draft));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const ribbons = [
    { side: -0.18, tint: "#d7f4ff", weight: 0.75 },
    { side: -0.06, tint: "#f4fffb", weight: 1 },
    { side: 0.07, tint: "#f4fffb", weight: 1 },
    { side: 0.18, tint: "#e7ffc7", weight: 0.75 },
  ];
  for (const ribbon of ribbons) {
    for (let s = 0; s < 9; s++) {
      const u = s / 9;
      const z0 = Math.max(1.15, ahead * (0.9 - u * 0.74));
      const z1 = Math.max(1.1, ahead * (0.9 - (u + 1 / 9) * 0.74));
      const breathe = (v: number) => Math.sin(now * 2.2 + v * 7 + ribbon.side * 12) * (0.02 + v * 0.08);
      const a = airAt(z0, worldLane + ribbon.side * (0.4 + u) + breathe(u));
      const b = airAt(z1, worldLane + ribbon.side * (0.4 + u + 0.1) + breathe(u + 0.1));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = ribbon.tint;
      ctx.globalAlpha = (0.16 + pocket * 0.42) * ribbon.weight * (1 - u * 0.35);
      ctx.lineWidth = Math.max(1.25, a.sp * (7 + pocket * 16));
      ctx.stroke();
    }
  }
  for (let i = 0; i < 14; i++) {
    const u = (now * (0.38 + (i % 3) * 0.07) + i / 14) % 1;
    const z = Math.max(1.1, 1.4 + (ahead - 2.4) * (1 - u));
    const sway = Math.sin(now * 2.8 + i * 1.7) * 0.2 * u;
    const p = airAt(z, worldLane + sway);
    ctx.globalAlpha = (1 - u) * (0.2 + pocket * 0.55);
    ctx.fillStyle = i % 2 === 0 ? "#f7fffc" : "#d9fff1";
    const r = Math.max(1.1, p.sp * (2.4 + u * 11));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * (2.4 + pocket * 1.4), r * 0.62, sway * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHull(ctx: CanvasRenderingContext2D, m: Match, underStrip: boolean) {
  const y = underStrip ? 74 : 14;
  const bar = (x: number, label: string, hp: number, max: number) => {
    const w = 220;
    const frac = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
    ctx.fillStyle = "rgba(7,10,8,0.82)";
    ctx.fillRect(x, y, w, 18);
    ctx.fillStyle = frac > 0.5 ? "#d6ff3f" : frac > 0.22 ? "#ffb020" : "#ff3b1f";
    ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * frac), 14);
    text(ctx, `${label} ${Math.round(hp)}`, x + 6, y + 4, 2, "#141806");
  };
  bar(16, "VIDA", m.player.hp, m.player.hpMax);
  const rearHot = !!m.rival && m.rival.dist < m.player.dist - 1.5;
  const frontDef = m.player.load;
  const rearDef = m.player.rearLoad;
  text(
    ctx,
    `FRENTE ${frontDef.name} ${m.player.ammo}-${m.player.ammoMax}`,
    16,
    y + 22,
    2,
    !rearHot && m.player.ammo > 0 ? frontDef.color : "#6d7464",
  );
  text(
    ctx,
    `TRAS ${rearDef.name} ${m.player.rearAmmo}-${m.player.rearAmmoMax}`,
    16,
    y + 40,
    2,
    rearHot && m.player.rearAmmo > 0 ? "#ff5a1f" : m.player.rearAmmo > 0 ? rearDef.color : "#6d7464",
  );
  if (m.player.draft > 0.08) text(ctx, "VACUO", 16, y + 58, 2, "#e7fff6");
  if (m.rival && (m.mode === "duel" || m.mode === "free")) bar(VIEW_W - 236, "ALVO", m.rival.hp, m.rival.hpMax);
}

function drawStrip(
  ctx: CanvasRenderingContext2D,
  m: Match,
  art: Art,
  rivalSprite: number,
  youMark: CanvasImageSource,
  strip: "solid" | "fade" | "off" = "solid",
) {
  const W = VIEW_W;
  const x0 = 118;
  const x1 = W - 92;
  const span = x1 - x0;
  const y = 28;
  ctx.save();
  ctx.globalAlpha = strip === "fade" ? 0.42 : 1;
  ctx.fillStyle = "rgba(7,10,8,0.82)";
  ctx.fillRect(16, 8, W - 32, 58);
  ctx.fillStyle = "#1b2116";
  ctx.fillRect(x0, y + 14, span, 10);
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(x0 - 4, y + 6, 4, 26);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#efe6d2" : "#141806";
      ctx.fillRect(x1 + col * 6, y + 4 + row * 7, 6, 7);
    }
  }
  text(ctx, "INICIO", 24, 16, 3, "#d6ff3f");
  text(ctx, "FIM", W - 78, 16, 3, "#efe6d2");
  const length = Math.max(1, m.strip);
  const at = (dist: number) => x0 + Math.max(0, Math.min(1, dist / length)) * span;
  const mini = (img: CanvasImageSource, x: number, top: number) => {
    ctx.drawImage(cutMagenta(img), x - 32, top, 64, 22);
  };
  const rival = art.sides[rivalSprite] ?? art.cars[rivalSprite] ?? art.cars[0];
  const youX = at(m.player.dist);
  const rivalX = m.rival ? at(m.rival.dist) : youX;
  const stacked = Math.abs(youX - rivalX) < 36;
  if (rival && m.rival) mini(rival, rivalX, stacked ? 10 : 20);
  mini(youMark, youX, stacked ? 32 : 20);
  ctx.restore();
}
