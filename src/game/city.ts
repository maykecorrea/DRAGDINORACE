import { resolveStats, type Rarity } from "./data";
import { CLASS_HUE, streetAt, streetBuild } from "./street";

export const MAP_W = 20000;
export const MAP_H = 14520;

export type Door = "garagem" | "loja" | "pecas" | "forja" | "bar" | "stake";

export type Block = { x: number; y: number; w: number; h: number };

export type Spot = Block & {
  id: string;
  sprite: string;
  door?: Door;
  flat?: boolean;
};

type Avenue = { y: number; x0: number; x1: number; h: number };
type Street = { x: number; y0: number; y1: number; w: number };

const MARGIN = 160;
const ROAD = 570;
const PITCH = 1360;

function buildAvenues(): Avenue[] {
  const list: Avenue[] = [];
  for (let y = MARGIN; y + ROAD <= MAP_H - MARGIN; y += PITCH) {
    list.push({ y, x0: 0, x1: MAP_W, h: ROAD });
  }
  return list;
}

function buildStreets(): Street[] {
  const list: Street[] = [];
  for (let x = MARGIN; x + ROAD <= MAP_W - MARGIN; x += PITCH) {
    list.push({ x, y0: 0, y1: MAP_H, w: ROAD });
  }
  return list;
}

export const AVENUES: Avenue[] = buildAvenues();
export const STREETS: Street[] = buildStreets();

const FILL = [
  "/game/city/casa-sucata.png",
  "/game/city/sobrado-osso.png",
  "/game/city/bloco-lata.png",
  "/game/city/torre-vertebra.png",
  "/game/city/casco-nave.png",
];

const DOORS: Record<string, { id: string; door: Door; sprite: string }> = {
  "2,4": { id: "garagem", door: "garagem", sprite: "/game/city/garagem.png" },
  "6,4": { id: "pecas", door: "pecas", sprite: "/game/city/pecas.png" },
  "9,6": { id: "forja", door: "forja", sprite: "/game/city/forja.png" },
  "4,6": { id: "bar", door: "bar", sprite: "/game/city/bar.png" },
  "11,3": { id: "stake", door: "stake", sprite: "/game/city/stake.png" },
  "1,2": { id: "loja", door: "loja", sprite: "/game/city/bloco-lata.png" },
};

function wobble(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function buildSpots(): Spot[] {
  const spots: Spot[] = [];
  const cols = STREETS.length - 1;
  const rows = AVENUES.length - 1;
  let n = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = STREETS[col]!.x + STREETS[col]!.w;
      const right = STREETS[col + 1]!.x;
      const top = AVENUES[row]!.y + AVENUES[row]!.h;
      const bottom = AVENUES[row + 1]!.y;
      const pad = 36;
      const innerW = right - left - pad * 2;
      const innerH = bottom - top - pad * 2;
      if (innerW < 180 || innerH < 160) continue;
      const special = DOORS[`${col},${row}`];
      const gap = 22;
      const lotW = (innerW - gap) / 2;
      const lots: { id: string; sprite: string; door?: Door; w: number; h: number; south: boolean }[] = [
        special
          ? { id: special.id, sprite: special.sprite, door: special.door, w: Math.min(300, lotW), h: Math.min(230, innerH * 0.46), south: true }
          : {
              id: `q${n++}`,
              sprite: FILL[(col * 3 + row) % FILL.length]!,
              w: 150 + wobble(col * 17 + row) * 80,
              h: 130 + wobble(col + row * 13) * 70,
              south: false,
            },
        {
          id: `q${n++}`,
          sprite: FILL[(col + row * 2 + 2) % FILL.length]!,
          w: 140 + wobble(col * 9 + row * 4) * 70,
          h: 120 + wobble(row * 11 + col) * 60,
          south: wobble(col * row + 3) > 0.55,
        },
      ];
      lots.forEach((lot, i) => {
        const lotX = left + pad + i * (lotW + gap);
        const w = Math.min(lot.w, lotW - 8);
        const h = Math.min(lot.h, innerH - 8);
        const x = lotX + (lotW - w) / 2;
        const y = lot.south ? bottom - pad - h : top + pad + wobble(n + i * 5) * Math.max(0, innerH - h);
        spots.push({ id: lot.id, sprite: lot.sprite, door: lot.door, x, y, w, h });
      });
    }
  }
  return spots;
}

export const BUILDINGS: Spot[] = buildSpots();

export type Roundabout = { col: number; row: number; x: number; y: number; r: number; hole: number };

function circBox(x: number, y: number, r: number, box: Block): boolean {
  const cx = Math.max(box.x, Math.min(x, box.x + box.w));
  const cy = Math.max(box.y, Math.min(y, box.y + box.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function buildRoundabouts(): Roundabout[] {
  const out: Roundabout[] = [];
  for (let row = 1; row < AVENUES.length - 1; row++) {
    for (let col = 1; col < STREETS.length - 1; col++) {
      if ((col * 3 + row) % 6 !== 0) continue;
      const street = STREETS[col]!;
      const avenue = AVENUES[row]!;
      const x = street.x + street.w / 2;
      const y = avenue.y + avenue.h / 2;
      const r = ROAD * 0.7;
      const hole = ROAD * 0.26;
      if (BUILDINGS.some((spot) => spot.door && circBox(x, y, r + 30, spot))) continue;
      out.push({ col, row, x, y, r, hole });
    }
  }
  return out;
}

export const ROUNDABOUTS: Roundabout[] = buildRoundabouts();

const WILD = [
  { src: "/game/city/wild/samambaia.png", s: 168 },
  { src: "/game/city/wild/baobab.png", s: 156 },
  { src: "/game/city/wild/palmeira.png", s: 150 },
  { src: "/game/city/wild/cica.png", s: 128 },
  { src: "/game/city/wild/vulcao-lima.png", s: 176 },
  { src: "/game/city/wild/vulcao-roxo.png", s: 184 },
  { src: "/game/city/wild/ninho-ovos.png", s: 132 },
  { src: "/game/city/wild/ninho-filhote.png", s: 140 },
  { src: "/game/city/wild/arco-costela.png", s: 160 },
  { src: "/game/city/wild/cratera.png", s: 148 },
  { src: "/game/city/wild/geiser.png", s: 124 },
  { src: "/game/city/wild/totem.png", s: 118 },
  { src: "/game/city/wild/ptero.png", s: 146 },
  { src: "/game/city/wild/espinhos.png", s: 112 },
  { src: "/game/city/wild/ovo-satelite.png", s: 136 },
  { src: "/game/city/wild/coluna.png", s: 108 },
  { src: "/game/city/wild/cogumelo.png", s: 134 },
  { src: "/game/city/wild/salgueiro.png", s: 162 },
  { src: "/game/city/wild/vulcao-dente.png", s: 188 },
  { src: "/game/city/wild/cacto.png", s: 96 },
  { src: "/game/city/wild/taxi.png", s: 150 },
  { src: "/game/city/wild/outdoor.png", s: 150 },
  { src: "/game/city/wild/canhao.png", s: 146 },
  { src: "/game/city/wild/capsula.png", s: 132 },
  { src: "/game/city/wild/derrick.png", s: 128 },
  { src: "/game/city/wild/cabeca.png", s: 156 },
  { src: "/game/city/wild/fogueira.png", s: 124 },
  { src: "/game/city/wild/conteiner.png", s: 160 },
  { src: "/game/city/wild/radar.png", s: 130 },
  { src: "/game/city/wild/orgao.png", s: 140 },
  { src: "/game/city/wild/lago.png", s: 148 },
  { src: "/game/city/wild/altar.png", s: 120 },
  { src: "/game/city/wild/guindaste.png", s: 150 },
  { src: "/game/city/wild/tanque.png", s: 126 },
  { src: "/game/city/wild/paraquedas.png", s: 138 },
  { src: "/game/city/wild/tumulos.png", s: 142 },
  { src: "/game/city/wild/monolito.png", s: 118 },
  { src: "/game/city/wild/barco.png", s: 150 },
  { src: "/game/city/wild/pegada.png", s: 136 },
  { src: "/game/city/wild/satelite.png", s: 154 },
];

function boxHit(a: Block, b: Block, pad = 10): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function buildWild(): Spot[] {
  const out: Spot[] = [];
  const near = new Map<string, { x: number; y: number; idx: number }[]>();
  const reach = 980;
  const bin = 980;
  let n = 0;
  const cols = STREETS.length - 1;
  const rows = AVENUES.length - 1;
  const step = 132;
  const banned = (x: number, y: number) => {
    const used = new Set<number>();
    const cx = Math.floor(x / bin);
    const cy = Math.floor(y / bin);
    for (let iy = cy - 1; iy <= cy + 1; iy++) {
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        for (const item of near.get(`${ix},${iy}`) ?? []) {
          if (Math.abs(item.x - x) < reach && Math.abs(item.y - y) < reach) used.add(item.idx);
        }
      }
    }
    return used;
  };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = STREETS[col]!.x + STREETS[col]!.w + 18;
      const right = STREETS[col + 1]!.x - 18;
      const top = AVENUES[row]!.y + AVENUES[row]!.h + 18;
      const bottom = AVENUES[row + 1]!.y - 18;
      let gy = 0;
      for (let y = top; y + 70 < bottom; y += step, gy++) {
        let gx = 0;
        for (let x = left; x + 70 < right; x += step, gx++) {
          const used = banned(x, y);
          if (used.size >= WILD.length) continue;
          let idx = (col * 5 + row * 9 + gx * 3 + gy * 8) % WILD.length;
          for (let guard = 0; used.has(idx) && guard < WILD.length; guard++) idx = (idx + 1) % WILD.length;
          if (used.has(idx)) continue;
          const art = WILD[idx]!;
          const scale = 0.78 + wobble(col * 40 + row * 17 + gx * 3 + gy) * 0.28;
          const w = Math.min(art.s * scale, right - x - 4);
          const h = Math.min(art.s * scale, bottom - y - 4);
          if (w < 72 || h < 72) continue;
          const box = { x, y, w, h };
          if (BUILDINGS.some((spot) => boxHit(box, spot, 12))) continue;
          if (ROUNDABOUTS.some((rb) => circBox(rb.x, rb.y, rb.r + 24, box))) continue;
          const crowded = STREETS.some((street) =>
            AVENUES.some((avenue) => {
              const posts = [
                [street.x - 28, avenue.y - 28],
                [street.x + street.w + 28, avenue.y - 28],
                [street.x - 28, avenue.y + avenue.h + 28],
                [street.x + street.w + 28, avenue.y + avenue.h + 28],
              ];
              return posts.some(([sx, sy]) => x < sx + 64 && x + w > sx - 16 && y < sy + 96 && y + h > sy - 16);
            }),
          );
          if (crowded) continue;
          const key = `${Math.floor(x / bin)},${Math.floor(y / bin)}`;
          const bucket = near.get(key) ?? [];
          bucket.push({ x, y, idx });
          near.set(key, bucket);
          out.push({ id: `w${n++}`, sprite: art.src, flat: true, ...box });
        }
      }
    }
  }
  return out;
}

export const SPOTS: Spot[] = [...BUILDINGS, ...buildWild()].sort((a, b) => a.y + a.h - (b.y + b.h));

export const SIGN_KINDS = [
  "pare",
  "ceda",
  "via",
  "velo",
  "garra",
  "unico",
  "lomba",
  "filhote",
  "Giro",
  "mudo",
  "sucata",
  "obra",
  "desvio",
  "radar",
  "fogo",
] as const;

export type SignKind = (typeof SIGN_KINDS)[number];

export type CitySign = {
  kind: SignKind;
  x: number;
  y: number;
  face: number;
};

function buildSigns(): CitySign[] {
  const out: CitySign[] = [];
  const curb = 28;
  STREETS.forEach((street, col) => {
    AVENUES.forEach((avenue, row) => {
      const corners = [
        { x: street.x - curb, y: avenue.y - curb, face: Math.PI * 0.25 },
        { x: street.x + street.w + curb, y: avenue.y - curb, face: Math.PI * 0.75 },
        { x: street.x - curb, y: avenue.y + avenue.h + curb, face: -Math.PI * 0.25 },
        { x: street.x + street.w + curb, y: avenue.y + avenue.h + curb, face: Math.PI * 1.25 },
      ];
      const rb = ROUNDABOUTS.find((item) => item.col === col && item.row === row);
      const a = (col * 3 + row) % 4;
      const b = (a + 1 + ((col + row) % 3)) % 4;
      [a, b].forEach((idx, n) => {
        const spot = corners[idx]!;
        if (spot.x < 24 || spot.y < 24 || spot.x > MAP_W - 24 || spot.y > MAP_H - 24) return;
        if (rb && Math.hypot(spot.x - rb.x, spot.y - rb.y) < rb.r + 8) return;
        const kind: SignKind = rb ? (n === 0 ? "Giro" : "ceda") : n === 0 ? "pare" : SIGN_KINDS[(col * 11 + row * 7) % SIGN_KINDS.length]!;
        out.push({ kind, x: spot.x, y: spot.y, face: spot.face });
      });
    });
  });
  return out;
}

export const SIGNS: CitySign[] = buildSigns();

export type Rider = {
  id: string;
  name: string;
  /** Id do modelo. É a chave do racha (`/pista?racha=`). */
  rival: string;
  model: string;
  rarity: Exclude<Rarity, "Meme">;
  x: number;
  y: number;
  heading: number;
  speed: number;
  axis: "h" | "v";
  dir: 1 | -1;
  road: number;
  hue: string;
  stun: number;
  lap: number;
  skin: number;
};

export type Bolt = { x: number; y: number; vx: number; vy: number; life: number };

export type CityState = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  /** Marcha atual, 1…gears. A caixa sobe sozinha no corte. */
  gear: number;
  /** Pausa da troca, em segundos. Sem empurro enquanto for > 0. */
  shift: number;
  riders: Rider[];
  bolt: Bolt | null;
  cool: number;
  hit: Rider | null;
};

const BODY = 30;

function spawnRider(
  riders: Rider[],
  n: number,
  spec: { id: string; x: number; y: number; heading: number; axis: "h" | "v"; dir: 1 | -1; road: number },
) {
  const car = streetAt(n);
  const stats = resolveStats(car.driver, car.rarity, streetBuild(car.rarity), car.id);
  const cap = cityTopSpeed(stats.vmax, true);
  riders.push({
    id: spec.id,
    name: car.name,
    rival: car.id,
    model: car.id,
    rarity: car.rarity,
    x: spec.x,
    y: spec.y,
    heading: spec.heading,
    speed: cap * (0.58 + (n % 5) * 0.045),
    axis: spec.axis,
    dir: spec.dir,
    road: spec.road,
    hue: CLASS_HUE[car.rarity],
    stun: 0,
    lap: 0,
    skin: n,
  });
}

export function createCity(): CityState {
  const riders: Rider[] = [];
  let n = 0;
  AVENUES.forEach((avenue, i) => {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    spawnRider(riders, n++, {
      id: `h${i}`,
      x: avenue.x0 + 480 + (i % 5) * 1100,
      y: laneY(avenue, dir),
      heading: dir === 1 ? Math.PI / 2 : -Math.PI / 2,
      axis: "h",
      dir,
      road: i,
    });
    const back: 1 | -1 = dir === 1 ? -1 : 1;
    spawnRider(riders, n++, {
      id: `h${i}b`,
      x: avenue.x1 - 900 - (i % 4) * 800,
      y: laneY(avenue, back),
      heading: back === 1 ? Math.PI / 2 : -Math.PI / 2,
      axis: "h",
      dir: back,
      road: i,
    });
  });
  STREETS.forEach((street, i) => {
    if (i % 2 !== 0) return;
    const dir: 1 | -1 = i % 4 === 0 ? 1 : -1;
    spawnRider(riders, n++, {
      id: `v${i}`,
      x: laneX(street, dir),
      y: street.y0 + 640 + (i % 5) * 900,
      heading: dir === 1 ? Math.PI : 0,
      axis: "v",
      dir,
      road: i,
    });
  });
  const home = SPOTS.find((spot) => spot.door === "garagem")!;
  const avenue = AVENUES.find((road) => road.y >= home.y + home.h) ?? AVENUES[1]!;
  return {
    x: Math.min(avenue.x1 - 80, Math.max(avenue.x0 + 80, home.x + home.w / 2)),
    y: laneY(avenue, 1),
    heading: Math.PI / 2,
    speed: 0,
    gear: 1,
    shift: 0,
    riders,
    bolt: null,
    cool: 0,
    hit: null,
  };
}

export function onAsphalt(x: number, y: number): boolean {
  for (const rb of ROUNDABOUTS) {
    const d = Math.hypot(x - rb.x, y - rb.y);
    if (d <= rb.hole - 4) return false;
    if (d <= rb.r) return true;
  }
  for (const road of AVENUES) {
    if (x >= road.x0 && x <= road.x1 && y >= road.y && y <= road.y + road.h) return true;
  }
  for (const road of STREETS) {
    if (y >= road.y0 && y <= road.y1 && x >= road.x && x <= road.x + road.w) return true;
  }
  return false;
}

function laneY(road: Avenue, dir: 1 | -1): number {
  return road.y + (dir === 1 ? road.h * 0.75 : road.h * 0.25);
}

function laneX(road: Street, dir: 1 | -1): number {
  return road.x + (dir === 1 ? road.w * 0.75 : road.w * 0.25);
}

function shove(x: number, y: number): { x: number; y: number } {
  for (const spot of SPOTS) {
    const cx = Math.max(spot.x, Math.min(x, spot.x + spot.w));
    const cy = Math.max(spot.y, Math.min(y, spot.y + spot.h));
    let dx = x - cx;
    let dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= BODY * BODY) continue;
    if (d2 < 0.01) {
      const left = x - spot.x;
      const right = spot.x + spot.w - x;
      const top = y - spot.y;
      const bottom = spot.y + spot.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = spot.x - BODY;
      else if (m === right) x = spot.x + spot.w + BODY;
      else if (m === top) y = spot.y - BODY;
      else y = spot.y + spot.h + BODY;
      continue;
    }
    const d = Math.sqrt(d2);
    x += (dx / d) * (BODY - d + 0.5);
    y += (dy / d) * (BODY - d + 0.5);
  }
  for (const rb of ROUNDABOUTS) {
    let dx = x - rb.x;
    let dy = y - rb.y;
    let d = Math.hypot(dx, dy);
    const min = rb.hole + 22;
    if (d >= min) continue;
    if (d < 0.01) {
      dx = 1;
      dy = 0;
      d = 1;
    }
    x = rb.x + (dx / d) * min;
    y = rb.y + (dy / d) * min;
  }
  return { x, y };
}

export function wrapMap(x: number, y: number): { x: number; y: number } {
  return {
    x: ((x % MAP_W) + MAP_W) % MAP_W,
    y: ((y % MAP_H) + MAP_H) % MAP_H,
  };
}

function wrapDelta(a: number, b: number, size: number) {
  let d = a - b;
  d -= Math.round(d / size) * size;
  return d;
}

export type CityInput = {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  beam: boolean;
};

export function nearestDoor(x: number, y: number, speed: number, cap = 219): Spot | null {
  const spot = doorSpot(x, y);
  if (!spot || speed > Math.min(cap * 0.28, 90)) return null;
  return spot;
}

export function doorSpot(x: number, y: number): Spot | null {
  let best: Spot | null = null;
  let bestD = 280;
  for (const spot of SPOTS) {
    if (!spot.door) continue;
    const wide = spot.w * 1.25;
    const tall = spot.h * 2.1;
    const left = spot.x + spot.w / 2 - wide / 2;
    const bottom = spot.y + spot.h;
    const top = bottom - tall;
    const cx = Math.max(left, Math.min(x, left + wide));
    const cy = Math.max(top, Math.min(y, bottom));
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestD) {
      best = spot;
      bestD = d;
    }
  }
  return best;
}

export type CityPace = { vmax: number; accel: number; gears?: number };

export function cityTopSpeed(vmax: number, road: boolean): number {
  const ratio = Math.pow(Math.max(80, vmax) / 200, 0.33);
  const roadCap = 219 * ratio;
  return road ? roadCap : roadCap * 0.34;
}

/** Cidade tem a escada dela. Na pista é outra: comum/normal/raro 6, épico 7, lendário 8. */
export function cityGears(rarity: string | undefined): number {
  if (rarity === "Lendário" || rarity === "Meme") return 8;
  if (rarity === "Épico") return 7;
  if (rarity === "Raro") return 6;
  if (rarity === "Normal") return 5;
  return 4;
}

function gearCount(pace: CityPace | undefined): number {
  const hinted = pace?.gears;
  if (hinted && hinted > 0) return Math.max(1, Math.min(8, Math.round(hinted)));
  const vmax = Math.max(80, pace?.vmax ?? 200);
  if (vmax >= 4000) return 8;
  if (vmax >= 1400) return 7;
  if (vmax >= 400) return 6;
  if (vmax >= 180) return 5;
  return 4;
}

/** Teto da marcha, fração da velocidade de rua. 1ª já anda, última no limite. */
export function gearFrac(gear: number, gears: number): number {
  const n = Math.max(1, Math.min(8, gears));
  const i = Math.max(1, Math.min(n, gear));
  if (n === 1) return 1;
  const t = (i - 1) / (n - 1);
  return 0.34 + 0.66 * Math.pow(t, 0.85);
}

/** Puxada na rua. Mesma escada da pista, em escala de cidade: normal ~10s, lendário menos, comum mais. */
function cityPullBudget(accel: number, gears: number): number {
  const budget = 10 * Math.pow(68 / Math.max(40, accel), 0.42);
  return Math.max(gears * 0.7, budget);
}

function gearPull(gear: number, gears: number): number {
  const n = Math.max(1, gears);
  const t = (Math.max(1, Math.min(n, gear)) - 1) / Math.max(1, n - 1);
  return 1.45 - t * 0.85;
}

/** Ponteiro da marcha: 0 no engate, 1 no corte. */
export function cityRpm(speed: number, gear: number, gears: number, roadCap: number): number {
  const prev = gear <= 1 ? 0 : roadCap * gearFrac(gear - 1, gears);
  const cur = Math.max(prev + 1, roadCap * gearFrac(gear, gears));
  return Math.max(0, Math.min(1, (Math.abs(speed) - prev) / (cur - prev)));
}

function orbit(rider: Rider, rb: Roundabout, dt: number): boolean {
  const mid = (rb.hole + rb.r) * 0.5;
  let ang = Math.atan2(rider.y - rb.y, rider.x - rb.x);
  const step = (rider.speed / mid) * dt;
  ang -= step;
  rider.lap += step;
  rider.x = rb.x + Math.cos(ang) * mid;
  rider.y = rb.y + Math.sin(ang) * mid;
  rider.heading = ang;
  const want = rider.axis === "h" ? (rider.dir === 1 ? Math.PI / 2 : -Math.PI / 2) : rider.dir === 1 ? Math.PI : 0;
  let diff = rider.heading - want;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (rider.lap < 1.15 || Math.abs(diff) > 0.45) return true;
  const out = rb.r + 80;
  if (rider.axis === "h") {
    const avenue = AVENUES[rider.road];
    if (!avenue) return true;
    rider.x = rb.x + rider.dir * out;
    rider.y = laneY(avenue, rider.dir);
  } else {
    const street = STREETS[rider.road];
    if (!street) return true;
    rider.y = rb.y + rider.dir * out;
    rider.x = laneX(street, rider.dir);
  }
  rider.heading = want;
  rider.lap = 0;
  return false;
}

export function stepCity(state: CityState, input: CityInput, dt: number, pace?: CityPace): void {
  if (state.hit) return;
  const road = onAsphalt(state.x, state.y);
  const vmax = Math.max(80, pace?.vmax ?? 200);
  const accelStat = Math.max(40, pace?.accel ?? 68);
  const gears = gearCount(pace);
  const roadCap = cityTopSpeed(vmax, true);
  const surface = cityTopSpeed(vmax, road);
  if (!state.gear || state.gear < 1) state.gear = 1;
  if (state.gear > gears) state.gear = gears;
  state.shift = Math.max(0, (state.shift ?? 0) - dt);

  const frac = gearFrac(state.gear, gears);
  const gearCeiling = roadCap * frac;
  const prevFrac = state.gear <= 1 ? 0 : gearFrac(state.gear - 1, gears);
  const prevCeiling = roadCap * prevFrac;
  const span = Math.max(8, gearCeiling - prevCeiling);
  const dwell = cityPullBudget(accelStat, gears) / gears;
  const bias = 0.9 + 0.1 * gearPull(state.gear, gears);
  const push = (span / dwell) * bias;

  if (input.brake) state.speed -= roadCap * 0.62 * dt;
  else if (state.shift > 0) state.speed -= roadCap * 0.05 * dt;
  else if (input.throttle) {
    const limit = Math.min(surface, gearCeiling);
    if (state.speed < limit) {
      const band = Math.max(8, span * 0.28);
      const taper = Math.max(0.35, Math.min(1, (limit - state.speed) / band));
      state.speed += push * taper * dt;
    }
    const topped = state.speed >= gearCeiling * 0.97 && gearCeiling <= surface + 0.5;
    if (topped && state.gear < gears) {
      state.gear += 1;
      state.shift = 0.22;
      state.speed *= 0.994;
    }
  } else state.speed -= roadCap * 0.075 * dt;

  state.speed = Math.max(0, Math.min(surface, state.speed));
  const turn = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const grip = 0.36 + 0.64 * Math.min(1, (roadCap * 0.45) / Math.max(24, state.speed));
  state.heading += turn * 2.05 * dt * grip;
  state.x += Math.sin(state.heading) * state.speed * dt;
  state.y += -Math.cos(state.heading) * state.speed * dt;
  const stuck = shove(state.x, state.y);
  if (stuck.x !== state.x || stuck.y !== state.y) state.speed *= 0.35;
  state.x = stuck.x;
  state.y = stuck.y;
  while (state.gear > 1 && state.speed < roadCap * gearFrac(state.gear - 1, gears) * 0.72) state.gear -= 1;
  if (state.speed < 0.8) {
    state.gear = 1;
    state.shift = 0;
  }

  for (const rider of state.riders) {
    if (rider.stun > 0) {
      rider.stun = Math.max(0, rider.stun - dt);
      continue;
    }
    let ring: Roundabout | null = null;
    for (const rb of ROUNDABOUTS) {
      if (Math.hypot(rider.x - rb.x, rider.y - rb.y) < rb.r + 36) {
        ring = rb;
        break;
      }
    }
    if (ring && orbit(rider, ring, dt)) continue;
    rider.lap = 0;
    const pass = passAround(rider, state.riders, state.x, state.y);
    if (rider.axis === "h") {
      const avenue = AVENUES[rider.road]!;
      rider.x += rider.dir * rider.speed * pass.slow * dt;
      const aim = laneY(avenue, rider.dir) + pass.shift;
      const steer = Math.max(-1, Math.min(1, (aim - rider.y) / 36));
      rider.y += (aim - rider.y) * Math.min(1, dt * 3.4);
      rider.heading = Math.atan2(rider.dir, -steer * 0.62);
    } else {
      const street = STREETS[rider.road]!;
      rider.y += rider.dir * rider.speed * pass.slow * dt;
      const aim = laneX(street, rider.dir) + pass.shift;
      const steer = Math.max(-1, Math.min(1, (aim - rider.x) / 36));
      rider.x += (aim - rider.x) * Math.min(1, dt * 3.4);
      rider.heading = Math.atan2(steer * 0.62, -rider.dir);
    }
    const loopedRider = wrapMap(rider.x, rider.y);
    rider.x = loopedRider.x;
    rider.y = loopedRider.y;
  }

  bumpCity(state);
  const looped = wrapMap(state.x, state.y);
  state.x = looped.x;
  state.y = looped.y;
  for (const rider of state.riders) {
    const parked = wrapMap(rider.x, rider.y);
    rider.x = parked.x;
    rider.y = parked.y;
  }

  state.cool = Math.max(0, state.cool - dt);
  if (input.beam && !state.bolt && state.cool <= 0) {
    const v = 720;
    state.bolt = {
      x: state.x + Math.sin(state.heading) * 50,
      y: state.y - Math.cos(state.heading) * 50,
      vx: Math.sin(state.heading) * v,
      vy: -Math.cos(state.heading) * v,
      life: 0.42,
    };
    state.cool = 0.7;
  }
  if (state.bolt) {
    state.bolt.x += state.bolt.vx * dt;
    state.bolt.y += state.bolt.vy * dt;
    const flown = wrapMap(state.bolt.x, state.bolt.y);
    state.bolt.x = flown.x;
    state.bolt.y = flown.y;
    state.bolt.life -= dt;
    for (const rider of state.riders) {
      if (Math.hypot(wrapDelta(state.bolt.x, rider.x, MAP_W), wrapDelta(state.bolt.y, rider.y, MAP_H)) < 42) {
        state.hit = rider;
        state.bolt = null;
        break;
      }
    }
    if (state.bolt && state.bolt.life <= 0) state.bolt = null;
  }
}

function passAround(rider: Rider, riders: Rider[], playerX: number, playerY: number): { shift: number; slow: number } {
  let shift = 0;
  let slow = 1;
  const look = (x: number, y: number) => {
    const along = rider.axis === "h" ? wrapDelta(x, rider.x, MAP_W) * rider.dir : wrapDelta(y, rider.y, MAP_H) * rider.dir;
    const side = rider.axis === "h" ? wrapDelta(y, rider.y, MAP_H) : wrapDelta(x, rider.x, MAP_W);
    if (along < -40 || along > 200 || Math.abs(side) > 120) return;
    const close = 1 - Math.max(0, along) / 200;
    const inline = 1 - Math.min(1, Math.abs(side) / 120);
    shift += (side >= 0 ? -1 : 1) * 110 * close * inline;
    if (along > 0 && along < 88 && Math.abs(side) < 52) slow = Math.min(slow, 0.42 + along / 220);
  };
  for (const other of riders) {
    if (other.id !== rider.id) look(other.x, other.y);
  }
  look(playerX, playerY);
  if (shift > 108) shift = 108;
  if (shift < -108) shift = -108;
  return { shift, slow };
}

function peel(ax: number, ay: number, bx: number, by: number, min: number) {
  let dx = wrapDelta(bx, ax, MAP_W);
  let dy = wrapDelta(by, ay, MAP_H);
  let d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return null;
  if (d2 < 0.01) {
    dx = 1;
    dy = 0;
    d2 = 1;
  }
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, overlap: min - d };
}

function bumpCity(state: CityState) {
  const playerR = 36;
  const botR = 28;
  for (const rider of state.riders) {
    const hit = peel(state.x, state.y, rider.x, rider.y, playerR + botR);
    if (!hit) continue;
    rider.x += hit.nx * hit.overlap * 0.82;
    rider.y += hit.ny * hit.overlap * 0.82;
    state.x -= hit.nx * hit.overlap * 0.18;
    state.y -= hit.ny * hit.overlap * 0.18;
    if (state.speed > 40) state.speed *= 0.94;
  }
  const parked = shove(state.x, state.y);
  state.x = parked.x;
  state.y = parked.y;

  for (let i = 0; i < state.riders.length; i++) {
    const a = state.riders[i]!;
    for (let j = i + 1; j < state.riders.length; j++) {
      const b = state.riders[j]!;
      if (a.axis !== b.axis || a.road !== b.road) {
        const hit = peel(a.x, a.y, b.x, b.y, botR * 2);
        if (!hit) continue;
        a.x -= hit.nx * hit.overlap * 0.5;
        a.y -= hit.ny * hit.overlap * 0.5;
        b.x += hit.nx * hit.overlap * 0.5;
        b.y += hit.ny * hit.overlap * 0.5;
        continue;
      }
      const gap = a.axis === "h" ? Math.abs(wrapDelta(a.y, b.y, MAP_H)) : Math.abs(wrapDelta(a.x, b.x, MAP_W));
      if (gap > 46) continue;
      const along = a.axis === "h" ? wrapDelta(a.x, b.x, MAP_W) : wrapDelta(a.y, b.y, MAP_H);
      if (Math.abs(along) >= botR * 2) continue;
      const push = (botR * 2 - Math.abs(along)) / 2 + 1;
      const sign = along < 0 ? -1 : 1;
      if (a.axis === "h") {
        a.x += sign * push;
        b.x -= sign * push;
      } else {
        a.y += sign * push;
        b.y -= sign * push;
      }
      const aBehind = a.dir === 1 ? along < 0 : along > 0;
      const rear = aBehind ? a : b;
      const front = aBehind ? b : a;
      if (a.dir === b.dir) rear.speed = Math.min(rear.speed, Math.max(70, front.speed * 0.9));
    }
  }
}

export function cityAudit(): string[] {
  const problems: string[] = [];
  const roads: Block[] = [
    ...AVENUES.map((road) => ({ x: road.x0, y: road.y, w: road.x1 - road.x0, h: road.h })),
    ...STREETS.map((road) => ({ x: road.x, y: road.y0, w: road.w, h: road.y1 - road.y0 })),
  ];
  for (const spot of SPOTS) {
    for (const road of roads) {
      const hit = spot.x < road.x + road.w && spot.x + spot.w > road.x && spot.y < road.y + road.h && spot.y + spot.h > road.y;
      if (hit) problems.push(`${spot.id} em cima da rua`);
    }
    if (spot.x < 0 || spot.y < 0 || spot.x + spot.w > MAP_W || spot.y + spot.h > MAP_H) problems.push(`${spot.id} fora do mapa`);
  }
  return problems;
}

export type CityPoint = { x: number; y: number };

function snapRoad(x: number, y: number): CityPoint & { axis: "h" | "v"; index: number } {
  let best: { x: number; y: number; axis: "h" | "v"; index: number; d: number } = { x, y, axis: "h", index: 0, d: Infinity };
  AVENUES.forEach((road, index) => {
    const px = Math.max(road.x0, Math.min(road.x1, x));
    const py = road.y + road.h / 2;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { x: px, y: py, axis: "h", index, d };
  });
  STREETS.forEach((road, index) => {
    const px = road.x + road.w / 2;
    const py = Math.max(road.y0, Math.min(road.y1, y));
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { x: px, y: py, axis: "v", index, d };
  });
  return best;
}

function ringPoints(rb: Roundabout, from: CityPoint, to: CityPoint): CityPoint[] {
  const mid = (rb.hole + rb.r) * 0.52;
  const a0 = Math.atan2(from.y - rb.y, from.x - rb.x);
  const a1 = Math.atan2(to.y - rb.y, to.x - rb.x);
  let sweep = a0 - a1;
  while (sweep <= 0.2) sweep += Math.PI * 2;
  while (sweep > Math.PI * 2) sweep -= Math.PI * 2;
  const steps = Math.max(3, Math.ceil(sweep / 0.55));
  const pts: CityPoint[] = [];
  for (let s = 1; s <= steps; s++) {
    const a = a0 - (sweep * s) / steps;
    pts.push({ x: rb.x + Math.cos(a) * mid, y: rb.y + Math.sin(a) * mid });
  }
  return pts;
}

/** Street route. The car drives this. It never jumps. */
export function planCityRoute(x0: number, y0: number, x1: number, y1: number): CityPoint[] {
  const start = snapRoad(x0, y0);
  const goal = snapRoad(x1, y1);
  const cols = STREETS.length;
  const rows = AVENUES.length;
  const at = (c: number, r: number): CityPoint => ({
    x: STREETS[c]!.x + STREETS[c]!.w / 2,
    y: AVENUES[r]!.y + AVENUES[r]!.h / 2,
  });
  const key = (c: number, r: number) => `${c},${r}`;
  const brackets = (snap: { x: number; y: number; axis: "h" | "v"; index: number }) => {
    if (snap.axis === "h") {
      let left = 0;
      let right = cols - 1;
      for (let c = 0; c < cols; c++) {
        const cx = STREETS[c]!.x + STREETS[c]!.w / 2;
        if (cx <= snap.x) left = c;
        if (cx >= snap.x) {
          right = c;
          break;
        }
      }
      return right === left ? [{ c: left, r: snap.index }] : [{ c: left, r: snap.index }, { c: right, r: snap.index }];
    }
    let up = 0;
    let down = rows - 1;
    for (let r = 0; r < rows; r++) {
      const cy = AVENUES[r]!.y + AVENUES[r]!.h / 2;
      if (cy <= snap.y) up = r;
      if (cy >= snap.y) {
        down = r;
        break;
      }
    }
    return down === up ? [{ c: snap.index, r: up }] : [{ c: snap.index, r: up }, { c: snap.index, r: down }];
  };
  const startLinks = brackets(start);
  const goalLinks = brackets(goal);
  const dist = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
  const neigh = (id: string) => {
    const out: { id: string; cost: number }[] = [];
    if (id === "s") {
      for (const n of startLinks) out.push({ id: key(n.c, n.r), cost: dist(start, at(n.c, n.r)) });
      if (start.axis === goal.axis && start.index === goal.index) out.push({ id: "g", cost: dist(start, goal) });
      return out;
    }
    if (id === "g") return out;
    const [c, r] = id.split(",").map(Number) as [number, number];
    const here = at(c, r);
    const push = (nc: number, nr: number) => {
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return;
      out.push({ id: key(nc, nr), cost: dist(here, at(nc, nr)) });
    };
    push(c + 1, r);
    push(c - 1, r);
    push(c, r + 1);
    push(c, r - 1);
    for (const n of goalLinks) if (n.c === c && n.r === r) out.push({ id: "g", cost: dist(here, goal) });
    return out;
  };
  const open: { id: string; f: number }[] = [{ id: "s", f: dist(start, goal) }];
  const gscore = new Map<string, number>([["s", 0]]);
  const came = new Map<string, string>();
  const seen = new Set<string>();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (cur.id === "g") break;
    if (seen.has(cur.id)) continue;
    seen.add(cur.id);
    const base = gscore.get(cur.id) ?? 1e18;
    for (const nb of neigh(cur.id)) {
      const g = base + nb.cost;
      if (g >= (gscore.get(nb.id) ?? 1e18)) continue;
      came.set(nb.id, cur.id);
      gscore.set(nb.id, g);
      const h = nb.id === "g" ? 0 : dist(at(Number(nb.id.split(",")[0]), Number(nb.id.split(",")[1])), goal);
      open.push({ id: nb.id, f: g + h });
    }
  }
  const ids = ["g"];
  if (!came.has("g")) return [{ x: x0, y: y0 }, { x: x1, y: y1 }];
  while (ids[0] !== "s") {
    const prev = came.get(ids[0]!);
    if (!prev) break;
    ids.unshift(prev);
  }
  const raw: CityPoint[] = [{ x: x0, y: y0 }];
  for (const id of ids) {
    if (id === "s") raw.push({ x: start.x, y: start.y });
    else if (id === "g") raw.push({ x: goal.x, y: goal.y });
    else {
      const [c, r] = id.split(",").map(Number) as [number, number];
      raw.push(at(c, r));
    }
  }
  raw.push({ x: x1, y: y1 });
  const bent: CityPoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i]!;
    const rb = i > 0 && i < raw.length - 1 ? ROUNDABOUTS.find((item) => Math.hypot(p.x - item.x, p.y - item.y) < 40) : undefined;
    if (!rb) {
      bent.push(p);
      continue;
    }
    bent.push(...ringPoints(rb, raw[i - 1]!, raw[i + 1]!));
  }
  const out: CityPoint[] = [];
  for (const p of bent) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 28) out.push(p);
  }
  return out.length >= 2 ? out : [{ x: x0, y: y0 }, { x: x1, y: y1 }];
}
