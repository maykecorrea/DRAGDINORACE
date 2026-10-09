import { NEON_HEX } from "./data";
import {
  LANE_GAP,
  REDLINE,
  TRACK_EDGE,
  TREE_AMBERS,
  TREE_GREEN,
  launchWindow,
  mph,
  shiftWindow,
  type Match,
} from "./sim";
import type { Upgrades } from "./data";

export const VIEW_W = 1280;
export const VIEW_H = 720;

export type Art = {
  cockpit: HTMLImageElement;
  cockpits: Record<string, HTMLImageElement>;
  sky: HTMLImageElement;
  cars: HTMLImageElement[];
  sides: HTMLImageElement[];
  flames: HTMLImageElement[];
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
  const up = str.toUpperCase();
  for (const ch of up) {
    const g = GLYPH[ch] ?? GLYPH[" "];
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (g[r][c] === "1") ctx.fillRect(cx + c * s, y + r * s, s, s);
      }
    }
    cx += 4 * s;
  }
  return cx;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

export function loadArt(): Promise<Art> {
  const keys = ["vex", "nyx", "geck", "lua", "shell", "claw", "pepe", "doge", "binance", "mexc", "btc", "neuro", "ronin", "trex"];
  return Promise.all([
    loadImage("/game/cockpit.png"),
    loadImage("/game/skyline.jpg"),
    ...keys.map((key) => loadImage(`/game/cockpit/${key}.png`)),
    ...[0, 1, 2, 3, 4, 5].map((i) => loadImage(`/game/car-${i}.png`)),
    ...[0, 1, 2, 3, 4, 5].map((i) => loadImage(`/game/side/car-${i}.png`)),
    ...[0, 1, 2, 3].map((i) => loadImage(`/game/flame-${i}.png`)),
  ]).then((loaded) => {
    const [cockpit, sky, ...rest] = loaded as HTMLImageElement[];
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
    };
  });
}

const CAM = 1.45;
const world = { flow: 0, clock: 0 };

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
) {
  const W = VIEW_W;
  const H = VIEW_H;
  const horizon = H * 0.36;
  const dist = m.player.dist;
  const yaw = m.player.yaw;
  const lane = m.player.lane;
  const LAT = 0.36;
  const vp = W * 0.5 + yaw * W * 0.045;

  for (const ev of events) {
    if (ev === "shift:perfeito") burst(W * 0.5, H * 0.62, "#d6ff3f", 18, 220);
    if (ev === "nitro:limpo") burst(W * 0.5, H * 0.7, "#ff3b1f", 26, 280);
    if (ev === "redlight" || ev === "wall") burst(W * 0.5, H * 0.58, "#ff3b1f", 14, 180);
    if (ev === "band") burst(W * 0.62, H * 0.66, "#efe6d2", 6, 80);
  }

  ctx.save();
  if (!reduce && m.shake > 0.02) {
    ctx.translate((Math.random() - 0.5) * m.shake * 26, (Math.random() - 0.5) * m.shake * 16);
  }

  ctx.fillStyle = "#070a08";
  ctx.fillRect(-40, -40, W + 80, H + 80);

  const sky = art.sky;
  const skyH = H * 0.52;
  const skyW = Math.max(W * 1.08, skyH * (sky.width / sky.height));
  const skyShift = yaw * 28;
  const skyY = horizon - skyH * 0.72;
  ctx.drawImage(sky, (W - skyW) / 2 + skyShift, skyY, skyW, skyH);

  const dt = Math.min(0.05, Math.max(0, now - world.clock));
  world.clock = now;
  const norm = m.pace > 0.05 ? m.player.speed / m.pace : 0;
  const body = norm > 2 ? Math.min(1, 0.08 + Math.sqrt(norm) * 0.085) : 0;
  const heat = Math.min(1.35, 0.7 + Math.log2(Math.max(m.pace, 0.5)) * 0.11);
  const rush = body * heat;
  world.flow = (world.flow + rush * dt) % 1;

  const marks: number[] = [];
  for (let i = -4; i <= 3; i++) marks.push((i + 0.5) * LANE_GAP);

  for (let y = Math.floor(horizon); y < H; y++) {
    const p = (y - horizon) / (H - horizon);
    if (p < 0.012) continue;
    const ahead = CAM / p;
    const left = (TRACK_EDGE + lane) * p * W * LAT;
    const right = (TRACK_EDGE - lane) * p * W * LAT;
    const stripe = Math.floor(ahead * 0.16 + world.flow * 56) % 8 < 4;
    ctx.fillStyle = y & 1 ? (stripe ? "#141910" : "#0e120c") : stripe ? "#1b2116" : "#12160f";
    ctx.fillRect(vp - left, y, left + right, 1);
    const rum = Math.max(2, p * 18);
    const rumbleOn = Math.floor(ahead * 0.08 + world.flow * 28) % 2 === 0;
    ctx.fillStyle = rumbleOn ? "#d6ff3f" : "#ff3b1f";
    ctx.fillRect(vp - left - rum, y, rum, 1);
    ctx.fillRect(vp + right, y, rum, 1);
    const dash = Math.floor(ahead * 0.2 + world.flow * 56) % 5 < 2;
    for (const mark of marks) {
      if (!dash) continue;
      const lw = Math.max(2, p * 5);
      const x = vp + (mark - lane) * p * W * LAT;
      ctx.fillStyle = "#efe6d2";
      ctx.fillRect(x - lw / 2, y, lw, 1);
    }
    const finishAhead = m.strip - dist;
    if (finishAhead > 0 && Math.abs(ahead - finishAhead) < Math.max(0.45, m.pace * 0.35)) {
      ctx.fillStyle = "#d6ff3f";
      ctx.fillRect(vp - left, y, left + right, 1);
    }
  }

  const posts = 9;
  for (let i = posts - 1; i >= 0; i--) {
    const t = (world.flow + i / posts) % 1;
    const sp = 0.015 + t * t * 0.99;
    const y = horizon + sp * (H - horizon) * 0.9;
    const left = (TRACK_EDGE + lane) * sp * W * LAT;
    const right = (TRACK_EDGE - lane) * sp * W * LAT;
    const h = 8 + sp * sp * 240;
    const w = Math.max(3, sp * 18);
    const bone = i % 2 === 0;
    ctx.fillStyle = bone ? "#d7c4a4" : "#c4552a";
    ctx.fillRect(vp - left - w, y - h, w, h);
    ctx.fillRect(vp + right, y - h, w, h);
    ctx.fillStyle = bone ? "#d6ff3f" : "#ff3b1f";
    ctx.fillRect(vp - left - w - 2, y - h, w + 4, 4);
    ctx.fillRect(vp + right - 2, y - h, w + 4, 4);
  }

  const shownMph = mph(m.player.speed);
  const streaks = shownMph > 140 ? Math.min(22, Math.floor((shownMph - 140) / 280)) : 0;
  if (!reduce && streaks > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#efe6d2";
    for (let i = 0; i < streaks; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const ang = side * (0.25 + ((i * 0.37) % 1) * 1.15);
      const near = 18 + (i % 5) * 6;
      const far = near + 70 + ((i * 53 + world.flow * 400) % 160) + Math.min(180, shownMph / 90);
      ctx.save();
      ctx.translate(vp, horizon + 8);
      ctx.rotate(ang);
      ctx.fillRect(near, -1, far - near, i % 3 === 0 ? 3 : 2);
      ctx.restore();
    }
    ctx.restore();
  }

  const neonHex = NEON_HEX[neon as keyof typeof NEON_HEX] ?? "#d6ff3f";
  ctx.fillStyle = neonHex;
  const glowY = horizon + (H - horizon) * 0.72;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(vp - W * 0.22, glowY, W * 0.08, 6);
  ctx.fillRect(vp + W * 0.14, glowY, W * 0.08, 6);
  ctx.globalAlpha = 1;

  const drawCar = (ahead: number, worldLane: number, sprite: number, nitro: boolean) => {
    if (ahead < -8 || ahead > 78) return;
    const z = Math.max(3.2, ahead);
    const p = Math.min(0.48, CAM / z);
    const y = horizon + p * (H - horizon);
    const h = H * p * 0.62;
    const img = art.cars[sprite] ?? art.cars[0];
    const w = h * (img.width / img.height);
    const x = vp + (worldLane - lane) * p * W * LAT;
    if (nitro) {
      const fr = art.flames[Math.floor(now * 12) % art.flames.length];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fw = h * 0.55;
      ctx.drawImage(fr, x - fw / 2, y - h * 0.15, fw, fw);
      ctx.restore();
    }
    ctx.drawImage(img, x - w / 2, y - h * 0.92, w, h);
  };

  if (m.mode === "duel" && m.rival) {
    drawCar(m.rival.dist - dist, m.rival.lane, rivalSprite, m.rival.nitroOn > 0);
  } else if (m.phase === "free") {
    drawCar(18, LANE_GAP, 2, false);
  }

  if (m.player.nitroOn > 0) {
    const fr = art.flames[Math.floor(now * 14) % art.flames.length];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(fr, W * 0.34, H * 0.58, W * 0.32, H * 0.28);
    ctx.restore();
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

  ctx.drawImage(plate, 0, 0, W, H);
  ctx.restore();

  if (m.flash > 0.02) {
    ctx.fillStyle = m.flashHot ? `rgba(255,59,31,${m.flash * 0.28})` : `rgba(214,255,63,${m.flash * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawCluster(ctx, m, up, now);
  if (m.mode === "duel" && m.rival) drawStrip(ctx, m, art, rivalSprite, youMark);
}

const sweep = { rpm: 0.12, clock: 0 };

function drawCluster(ctx: CanvasRenderingContext2D, m: Match, up: Upgrades, now: number) {
  const W = VIEW_W;
  const H = VIEW_H;
  const dt = Math.min(0.05, Math.max(0, now - sweep.clock));
  sweep.clock = now;
  const target = Math.max(0, Math.min(1.05, m.player.rpm / REDLINE));
  const follow = 1 - Math.exp(-10 * dt);
  sweep.rpm += (target - sweep.rpm) * follow;

  const cx = W * 0.515;
  const cy = H * 0.752;
  const rad = W * 0.108;
  const a0 = Math.PI * 0.78;
  const a1 = Math.PI * 2.22;
  const pre = !m.player.launched && m.mode === "duel";
  const [lo, hi] = pre ? launchWindow(up) : shiftWindow(up);
  const shown = Math.min(sweep.rpm, 1.02);
  let ang = a0 + (a1 - a0) * Math.min(shown, 1);
  if (shown >= 0.99) ang += Math.sin(now * 46) * 0.035;

  for (let n = lo; n <= hi; n += 0.018) {
    const a = a0 + (a1 - a0) * n;
    const px = cx + Math.cos(a) * rad * 0.9;
    const py = cy + Math.sin(a) * rad * 0.9;
    ctx.fillStyle = m.player.band ? "#d6ff3f" : pre ? "#efe6d2" : "#5c6b30";
    ctx.fillRect(px - 4, py - 4, 8, 8);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = shown >= 0.99 ? "#ff3b1f" : "#141806";
  ctx.fillRect(10, -7, rad * 0.7, 14);
  ctx.fillStyle = shown >= 0.99 ? "#ffb020" : "#efe6d2";
  ctx.fillRect(14, -4, rad * 0.66, 8);
  ctx.restore();
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(cx - 8, cy - 8, 16, 16);
  ctx.fillStyle = "#141806";
  ctx.fillRect(cx - 4, cy - 4, 8, 8);

  const readout = Math.min(99999, Math.round(mph(m.player.speed)));
  const label = String(readout).padStart(readout >= 1000 ? 5 : 3, "0");
  const s = readout >= 10000 ? 4 : readout >= 1000 ? 5 : 6;
  const tw = label.length * 4 * s;
  text(ctx, label, cx - tw / 2, cy + rad * 0.24, s, "#efe6d2");
  text(ctx, "MPH", cx - 18, cy + rad * 0.24 + s * 5 + 4, 3, "#9aa18c");
  text(ctx, String(m.player.gear), cx - rad * 0.72, cy - 28, 12, "#efe6d2");

  const frac = m.player.nitroMax > 0 ? Math.max(0, Math.min(1, m.player.nitroLeft / m.player.nitroMax)) : 0;
  const nx = cx + rad * 0.78;
  const ny = cy - 36;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = frac > i / 8 ? (m.player.nitroOn > 0 ? "#ff3b1f" : "#d6ff3f") : "#2a261c";
    ctx.fillRect(nx, ny + (7 - i) * 11, 16, 8);
  }

  if (m.mode === "duel" && (m.phase === "staging" || m.phase === "tree" || (m.phase === "race" && m.raceTime < 0.8))) {
    const lamps = [false, false, false, false];
    if (m.phase === "tree" || m.phase === "race") {
      const tt = m.phase === "race" ? TREE_GREEN : m.t;
      lamps[0] = tt >= TREE_AMBERS[0];
      lamps[1] = tt >= TREE_AMBERS[1];
      lamps[2] = tt >= TREE_AMBERS[2];
      lamps[3] = m.phase === "race" || tt >= TREE_GREEN;
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = !lamps[i] ? "#2a261c" : i < 3 ? "#ffb020" : "#d6ff3f";
      ctx.fillRect(W * 0.38 + i * 46, 78, 28, 28);
    }
  }

  if (m.callout && m.calloutT > 0) {
    const s = 8;
    const label = m.callout;
    const tw = label.length * 4 * s;
    text(ctx, label, W / 2 - tw / 2, H * 0.34, s, m.flashHot ? "#ff3b1f" : "#d6ff3f");
  }

  if (m.mode === "duel" && m.rival && m.phase !== "finish") {
    const delta = Math.round(m.player.dist - m.rival.dist);
    const sign = delta > 0 ? "+" : "";
    const label = `${sign}${delta}M`;
    text(ctx, label, W - label.length * 20 - 28, 78, 5, "#efe6d2");
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

function drawStrip(
  ctx: CanvasRenderingContext2D,
  m: Match,
  art: Art,
  rivalSprite: number,
  youMark: CanvasImageSource,
) {
  const W = VIEW_W;
  const x0 = 118;
  const x1 = W - 92;
  const span = x1 - x0;
  const y = 28;
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
  const strip = Math.max(1, m.strip);
  const at = (dist: number) => x0 + Math.max(0, Math.min(1, dist / strip)) * span;
  const mini = (img: CanvasImageSource, x: number, top: number) => {
    ctx.drawImage(cutMagenta(img), x - 32, top, 64, 22);
  };
  const rival = art.sides[rivalSprite] ?? art.cars[rivalSprite] ?? art.cars[0];
  const youX = at(m.player.dist);
  const rivalX = m.rival ? at(m.rival.dist) : youX;
  const stacked = Math.abs(youX - rivalX) < 36;
  if (rival && m.rival) mini(rival, rivalX, stacked ? 10 : 20);
  mini(youMark, youX, stacked ? 32 : 20);
}
