import { useEffect, useRef, useState } from "react";
import { WEEK, DAY } from "../../../../../gf-engine/clock.ts";
import type { Content } from "../../../../../gf-engine/content.ts";
import { stallHours, type StallId } from "../../../../../gf-engine/body.ts";
import {
  clientsAt,
  dayEventPlace,
  here,
  lockReason,
  PILOTS,
  pilotAt,
  pilotBeaten,
  type PlaceId,
} from "../../../../../gf-engine/district.ts";
import type { GameState } from "../../../../../gf-engine/state.ts";
import raw from "./lotes.json" with { type: "json" };
import { art } from "./scene";

const OFICINA_FOOT = (472 * 327) / 512;
const OFICINA_PLATE: Record<number, number> = { 2: 1014, 3: 1022, 4: 1022, 5: 1022 };

function oficinaLook(level: number) {
  const n = Number.isFinite(level) ? Math.floor(level) : 1;
  const lv = n > 5 ? 5 : n;
  if (lv >= 2) {
    return {
      lv,
      src: `/assets/gf/v2/mapa/fachada_oficina_l${lv}.webp?v=30`,
      holo: lv === 5 ? "/assets/gf/v2/mapa/fachada_oficina_l5_holo.webp?v=30" : "",
      plate: OFICINA_PLATE[lv] ?? 1022,
      inset: 0,
    };
  }
  return {
    lv: 1,
    src: "/assets/gf/v2/mapa/mapa_predio_oficina.png",
    holo: "",
    plate: 0,
    inset: 0.04,
  };
}

type Pt = [number, number];
type Lot = {
  id: string;
  kind: "place" | "stall" | "soon";
  nome: string;
  rect: number[];
  inner: number[];
  anchor: Pt;
  door: Pt;
  sprite: { src: string; box: { w: number; h: number }; baseInset: number };
  label?: boolean;
  clickable?: string;
  toast?: string;
};
type Route = {
  id: string;
  kind: "car" | "ped";
  mode: "loop" | "pingpong" | "oneway";
  pts: Pt[];
  speed: number;
  sprites: { lado: string; baixo?: string; cima?: string };
  fade?: Pt[];
};
type MapFile = {
  world: { w: number; h: number; bg: string };
  preview: { src: string; w: number; h: number };
  tiles: { id: string; src: string; half: string; x: number; y: number; w: number; h: number }[];
  camera: { maxZoom: number; defaultView: { w: number; h: number }; start: string };
  wall: { outer: number[]; inner: number[]; gates: { id: string; rect: number[]; aberto: boolean }[] };
  canal: { rects: number[][]; bridge: number[] };
  center: { id: string; rect: number[]; anchor: Pt };
  lots: Lot[];
  routes: Route[];
  graph: { nodes: Record<string, Pt>; edges: [string, string][] };
  zones: { id: string; poly: Pt[] }[];
  sizes: { ped_h: number; car_lado_w: number; car_vertical_h: number };
};

const MAP = raw as unknown as MapFile;
const WORLD_W = MAP.world.w;
const WORLD_H = MAP.world.h;
const LIFT_BOX = MAP.center.rect;
const LIFT_H = LIFT_BOX[3] - LIFT_BOX[1];
const LIFT_W = LIFT_H * (700 / 1254);
const LIFT_X = (LIFT_BOX[0] + LIFT_BOX[2]) / 2;
const LIFT_FOOT = LIFT_BOX[3];
const VIDA = "/assets/gf/v2/mapa/vida/";
const PLACA = "/assets/gf/v2/ui2/mapa_rotulo_placa.png";

type Cam = { tx: number; ty: number; s: number; vx: number; vy: number };
type Mask = { w: number; h: number; data: Uint8ClampedArray };
type Drawn = { w: number; h: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function hypot(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}
function pathOf(pts: Pt[], loop: boolean): Pt[] {
  if (!loop || pts.length < 2) return pts;
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  if (a[0] === b[0] && a[1] === b[1]) return pts;
  return [...pts, a];
}
function pathLen(pts: Pt[]) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += hypot(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]);
  return n;
}
function pointAt(pts: Pt[], distance: number) {
  let left = distance;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = hypot(a[0], a[1], b[0], b[1]) || 1;
    if (left <= seg || i === pts.length - 1) {
      const u = clamp(left / seg, 0, 1);
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, dx: b[0] - a[0], dy: b[1] - a[1] };
    }
    left -= seg;
  }
  const a = pts[0] ?? [0, 0];
  return { x: a[0], y: a[1], dx: 1, dy: 0 };
}
function inRect(x: number, y: number, r: number[], pad = 0) {
  return x >= r[0]! - pad && y >= r[1]! - pad && x <= r[2]! + pad && y <= r[3]! + pad;
}
function rectsHit(ax: number, ay: number, bx: number, by: number, rect: number[], pad: number) {
  const steps = Math.max(1, Math.ceil(hypot(ax, ay, bx, by) / 8));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    if (inRect(ax + (bx - ax) * u, ay + (by - ay) * u, rect, pad)) return true;
  }
  return false;
}

const LINKS = new Map<string, string[]>();
for (const [a, b] of MAP.graph.edges) {
  if (!LINKS.has(a)) LINKS.set(a, []);
  if (!LINKS.has(b)) LINKS.set(b, []);
  LINKS.get(a)!.push(b);
  LINKS.get(b)!.push(a);
}
function nearestNode(x: number, y: number) {
  let best = "";
  let bestD = Infinity;
  for (const [id, pt] of Object.entries(MAP.graph.nodes)) {
    const d = hypot(x, y, pt[0], pt[1]);
    if (d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}
function routeGraph(from: Pt, to: Pt): Pt[] {
  const a = nearestNode(from[0], from[1]);
  const b = nearestNode(to[0], to[1]);
  if (!a || !b) return [from, to];
  if (a === b) return [from, to];
  const prev = new Map<string, string | null>([[a, null]]);
  const q = [a];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i]!;
    if (cur === b) break;
    for (const next of LINKS.get(cur) ?? []) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      q.push(next);
    }
  }
  if (!prev.has(b)) return [from, to];
  const nodes: string[] = [];
  for (let cur: string | null = b; cur; cur = prev.get(cur) ?? null) nodes.push(cur);
  nodes.reverse();
  return [from, ...nodes.map((id) => MAP.graph.nodes[id]!), to];
}
function lotById(id: string) {
  return MAP.lots.find((lot) => lot.id === id) ?? null;
}

function buildMask(img: HTMLImageElement): Mask | null {
  const w = 64;
  const h = Math.max(1, Math.round((64 * img.naturalHeight) / Math.max(1, img.naturalWidth)));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, w, h);
  return { w, h, data: g.getImageData(0, 0, w, h).data };
}

export function MapaMundi({
  state,
  pack,
  dest,
  hour,
  onOpen,
  onReady,
}: {
  state: GameState;
  pack: Content;
  dest: string;
  hour: number;
  onOpen: (id: string) => void;
  onReady?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const teoRef = useRef<HTMLImageElement>(null);
  const pinRef = useRef<HTMLImageElement>(null);
  const arrowRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const camRef = useRef<Cam>({ tx: 0, ty: 0, s: 0.2, vx: 0, vy: 0 });
  const masks = useRef(new Map<string, Mask>());
  const drawn = useRef(new Map<string, Drawn>());
  const destRef = useRef(dest);
  const hourRef = useRef(hour);
  const stateRef = useRef(state);
  const packRef = useRef(pack);
  destRef.current = dest;
  hourRef.current = hour;
  stateRef.current = state;
  packRef.current = pack;
  const [tilesOn, setTilesOn] = useState(false);
  const [hover, setHover] = useState("");
  const [tip, setTip] = useState<{ nome: string; horas: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState("");
  const [evolve, setEvolve] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [debugOn, setDebugOn] = useState(false);
  const [debugText, setDebugText] = useState("");
  const [weak, setWeak] = useState(false);
  const maxZoom = weak ? 0.5 : MAP.camera.maxZoom;

  useEffect(() => {
    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (typeof memory === "number" && memory <= 2) setWeak(true);
    setDebugOn(new URLSearchParams(location.search).get("debug") === "lotes");
    try {
      setHint(localStorage.getItem("gf-map-hint") !== "1");
    } catch {
      setHint(true);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const read = () => {
      try {
        const n = Number(localStorage.getItem("gf-fachada-preview"));
        setPreview(n >= 1 && n <= 5 ? n : null);
      } catch {
        setPreview(null);
      }
    };
    read();
    window.addEventListener("gf-fachada-preview", read);
    return () => window.removeEventListener("gf-fachada-preview", read);
  }, []);

  const seenLevel = useRef(state.garage.level);
  useEffect(() => {
    if (state.garage.level > seenLevel.current) {
      setEvolve(true);
      setToast("A oficina evoluiu!");
      const timer = window.setTimeout(() => setEvolve(false), 600);
      seenLevel.current = state.garage.level;
      return () => window.clearTimeout(timer);
    }
    seenLevel.current = state.garage.level;
  }, [state.garage.level]);

  const fachada = oficinaLook(preview ?? state.garage.level);
  useEffect(() => {
    const next = oficinaLook((preview ?? state.garage.level) + 1);
    if (next.src === fachada.src) return;
    const img = new Image();
    img.src = next.src;
  }, [fachada.src, preview, state.garage.level]);

  useEffect(() => {
    const frame = frameRef.current!;
    const world = worldRef.current!;
    if (!frame || !world) return;
    const cam = camRef.current;
    let alive = true;
    let raf = 0;
    let restTimer = 0;
    let vw = frame.clientWidth || 1;
    let vh = frame.clientHeight || 1;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; tx: number; ty: number; moved: boolean; t: number } | null = null;
    let pinch: { dist: number; s: number; tx: number; ty: number; mx: number; my: number } | null = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    const samples: { x: number; y: number; t: number }[] = [];
    let teo = { pts: [] as Pt[], len: 0, d: 0, flip: false, frame: 0, acc: 0 };
    let teoKey = "";
    const motions = MAP.routes.map((route) => {
      const pts = pathOf(route.pts, route.mode === "loop");
      return { d: Math.random() * pathLen(pts), dir: 1, wait: 0, fade: route.mode === "oneway" ? 0 : 1, walked: 0, face: "" };
    });
    const routePts = MAP.routes.map((route) => pathOf(route.pts, route.mode === "loop"));
    const routeLens = routePts.map(pathLen);

    function zoomBounds() {
      const fit = Math.min(vw / WORLD_W, vh / WORLD_H);
      const def = clamp(Math.max(vw / MAP.camera.defaultView.w, vh / MAP.camera.defaultView.h), fit, maxZoom);
      return { fit, def, max: maxZoom };
    }
    function clampCam() {
      const { fit, max } = zoomBounds();
      cam.s = clamp(cam.s, fit, max);
      const sw = WORLD_W * cam.s;
      const sh = WORLD_H * cam.s;
      cam.tx = sw <= vw ? (vw - sw) / 2 : clamp(cam.tx, vw - sw, 0);
      cam.ty = sh <= vh ? (vh - sh) / 2 : clamp(cam.ty, vh - sh, 0);
    }
    function centerOf(x: number, y: number, s: number) {
      return { tx: vw / 2 - x * s, ty: vh / 2 - y * s, s };
    }
    let laid = -1;
    function apply(live: boolean) {
      if (!live) {
        const step = 1 / (window.devicePixelRatio || 1);
        cam.tx = Math.round(cam.tx / step) * step;
        cam.ty = Math.round(cam.ty / step) * step;
      }
      world.style.zoom = "";
      world.style.removeProperty("zoom");
      world.style.width = `${WORLD_W * cam.s}px`;
      world.style.height = `${WORLD_H * cam.s}px`;
      world.style.transform = `translate3d(${cam.tx}px,${cam.ty}px,0)`;
      world.style.setProperty("--s", String(cam.s));
      world.style.setProperty("--inv", "1");
      world.style.willChange = live ? "transform" : "auto";
      if (Math.abs(laid - cam.s) > 0.0001) {
        laid = cam.s;
        for (const [id, box] of drawn.current) {
          const button = world.querySelector<HTMLElement>(`button.mm-lot[data-id="${id}"]`);
          const img = button?.querySelector("img");
          if (!button || !img) continue;
          img.style.width = `${box.w * cam.s}px`;
          img.style.height = `${box.h * cam.s}px`;
          const holo = button.querySelector<HTMLImageElement>(".mm-holo");
          if (holo) {
            holo.style.width = img.style.width;
            holo.style.height = img.style.height;
          }
          const shadow = button.previousElementSibling as HTMLElement | null;
          if (shadow?.classList.contains("mm-shadow")) {
            shadow.style.width = `${box.w * 0.9 * cam.s}px`;
            shadow.style.height = `${box.h * 0.12 * cam.s}px`;
          }
        }
      }
      const box = miniRef.current?.querySelector("b") as HTMLElement | null;
      if (box) {
        const left = (-cam.tx / cam.s / WORLD_W) * 100;
        const top = (-cam.ty / cam.s / WORLD_H) * 100;
        box.style.left = `${left}%`;
        box.style.top = `${top}%`;
        box.style.width = `${(vw / cam.s / WORLD_W) * 100}%`;
        box.style.height = `${(vh / cam.s / WORLD_H) * 100}%`;
      }
    }
    let hidden = false;
    const loop = () => {
      if (!alive || hidden) return;
      stepWorld(performance.now());
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      hidden = document.hidden;
      if (!hidden && alive) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };
    function kick() {
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function rest() {
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(() => {
        apply(false);
        placeLabels();
      }, 120);
    }
    function zoomAt(cx: number, cy: number, next: number) {
      const s2 = clamp(next, zoomBounds().fit, zoomBounds().max);
      const wx = (cx - cam.tx) / cam.s;
      const wy = (cy - cam.ty) / cam.s;
      cam.s = s2;
      cam.tx = cx - wx * s2;
      cam.ty = cy - wy * s2;
      clampCam();
      apply(true);
    }
    function flyTo(x: number, y: number, s: number, ms = 450) {
      const from = { tx: cam.tx, ty: cam.ty, s: cam.s };
      const s2 = clamp(s, zoomBounds().fit, zoomBounds().max);
      let to = centerOf(x, y, s2);
      const saved = { ...cam, s: s2, tx: to.tx, ty: to.ty };
      cam.s = saved.s;
      cam.tx = saved.tx;
      cam.ty = saved.ty;
      clampCam();
      to = { tx: cam.tx, ty: cam.ty, s: cam.s };
      cam.tx = from.tx;
      cam.ty = from.ty;
      cam.s = from.s;
      const t0 = performance.now();
      cam.vx = 0;
      cam.vy = 0;
      const run = (now: number) => {
        const u = clamp((now - t0) / ms, 0, 1);
        const e = 1 - (1 - u) ** 3;
        cam.s = from.s + (to.s - from.s) * e;
        cam.tx = from.tx + (to.tx - from.tx) * e;
        cam.ty = from.ty + (to.ty - from.ty) * e;
        clampCam();
        apply(true);
        if (u < 1 && alive) requestAnimationFrame(run);
        else rest();
      };
      requestAnimationFrame(run);
      kick();
    }
    (frame as HTMLDivElement & { flyTo?: typeof flyTo }).flyTo = flyTo;

    function worldPoint(clientX: number, clientY: number) {
      const rect = frame.getBoundingClientRect();
      return { x: (clientX - rect.left - cam.tx) / cam.s, y: (clientY - rect.top - cam.ty) / cam.s, px: clientX - rect.left, py: clientY - rect.top };
    }
    function hitLot(x: number, y: number) {
      const lots = [...MAP.lots].sort((a, b) => b.anchor[1] - a.anchor[1]);
      for (const lot of lots) {
        const drawnBox = drawn.current.get(lot.id);
        const dw = drawnBox?.w ?? lot.sprite.box.w;
        const dh = drawnBox?.h ?? lot.sprite.box.h;
        const inset = lot.sprite.baseInset ?? 0;
        const left = lot.anchor[0] - dw / 2;
        const top = lot.anchor[1] - dh + inset * dh;
        const mask = masks.current.get(lot.id);
        if (mask && x >= left && x <= left + dw && y >= top && y <= top + dh) {
          const mx = clamp(Math.floor(((x - left) / dw) * mask.w), 0, mask.w - 1);
          const my = clamp(Math.floor(((y - top) / dh) * mask.h), 0, mask.h - 1);
          if ((mask.data[(my * mask.w + mx) * 4 + 3] ?? 0) > 16) return lot;
        }
        if (inRect(x, y, [lot.rect[0], lot.rect[1], lot.rect[2], lot.rect[3]])) return lot;
      }
      return null;
    }
    function hitLift(x: number, y: number) {
      const left = LIFT_X - LIFT_W / 2;
      const top = LIFT_FOOT - LIFT_H;
      return x >= left && x <= left + LIFT_W && y >= top && y <= LIFT_FOOT;
    }
    function placeLabels() {
      const labels = [...world.querySelectorAll<HTMLElement>(".mm-label")];
      const rank = (el: HTMLElement) => (el.dataset.kind === "soon" ? 4 : el.dataset.id === "oficina" ? 0 : el.dataset.id === destRef.current ? 1 : el.dataset.kind === "stall" ? 3 : 2);
      labels.sort((a, b) => rank(a) - rank(b));
      const taken: DOMRect[] = [];
      const zoomedOut = cam.s < 0.3;
      for (const el of labels) {
        const keep = !zoomedOut || el.dataset.id === "oficina" || el.dataset.id === hoverId();
        el.hidden = !keep;
        if (!keep) continue;
        const box = el.getBoundingClientRect();
        const hit = taken.some((old) => !(box.right < old.left || box.left > old.right || box.bottom < old.top || box.top > old.bottom));
        if (hit && el.dataset.id !== "oficina" && el.dataset.id !== hoverId()) el.hidden = true;
        else taken.push(box);
      }
    }
    function hoverId() {
      return world.querySelector<HTMLElement>(".mm-lot.is-hover")?.dataset.id ?? "";
    }

    function stepWorld(now: number) {
      if (cam.vx || cam.vy) {
        const dt = 16.67;
        cam.tx += cam.vx * dt;
        cam.ty += cam.vy * dt;
        const damp = 0.92 ** (dt / 16.67);
        cam.vx *= damp;
        cam.vy *= damp;
        const beforeX = cam.tx;
        const beforeY = cam.ty;
        clampCam();
        if (cam.tx !== beforeX) cam.vx = 0;
        if (cam.ty !== beforeY) cam.vy = 0;
        if (Math.hypot(cam.vx, cam.vy) < 0.02) {
          cam.vx = 0;
          cam.vy = 0;
          rest();
        }
        apply(true);
      }
      const h = hourRef.current;
      const dawn = h < 6;
      const night = h >= 18;
      let carN = 0;
      let pedN = 0;
      const nodes = [...world.querySelectorAll<HTMLElement>(".mm-walker")];
      MAP.routes.forEach((route, index) => {
        const el = nodes[index];
        const icon = el?.firstElementChild as HTMLElement | null;
        if (!el || !icon) return;
        const order = route.kind === "car" ? carN++ : pedN++;
        const show = route.kind === "ped" ? (dawn ? order < 2 : night ? order < 5 : true) : dawn || night ? order < 4 : true;
        const motion = motions[index]!;
        const pts = routePts[index]!;
        const len = routeLens[index]!;
        const dt = 0.016;
        if (motion.wait > 0) {
          motion.wait -= dt;
          if (motion.wait <= 0 && route.mode === "oneway") {
            motion.d = 0;
            motion.fade = 0;
          }
        } else {
          motion.d += route.speed * dt * motion.dir;
          motion.walked += route.speed * dt;
          if (route.mode === "pingpong" && (motion.d >= len || motion.d <= 0)) {
            motion.d = clamp(motion.d, 0, len);
            motion.dir *= -1;
          } else if (route.mode === "oneway" && motion.d >= len) {
            motion.d = len;
            motion.wait = 2 + Math.random() * 4;
          } else if (route.mode === "loop") motion.d = ((motion.d % len) + len) % len;
          if (route.mode === "oneway") {
            const edge = Math.min(motion.d, len - motion.d);
            motion.fade = clamp(edge / Math.max(1, route.speed * 0.4), 0, 1);
            if (motion.wait > 0) motion.fade = 0;
          }
        }
        const at = pointAt(pts, motion.d);
        const dx = at.dx * motion.dir;
        const dy = at.dy * motion.dir;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const face = route.kind === "ped" || !vertical ? route.sprites.lado : dy > 0 ? route.sprites.baixo ?? route.sprites.lado : route.sprites.cima ?? route.sprites.lado;
        const passada = route.kind === "ped" ? 16 : 32;
        const frames = 8;
        const frameN = motion.wait > 0 ? 0 : Math.floor((motion.walked / passada) * frames) % frames;
        let fw = MAP.sizes.car_lado_w;
        let fh = MAP.sizes.car_vertical_h;
        if (route.kind === "ped") fh = MAP.sizes.ped_h;
        else if (!vertical) fw = MAP.sizes.car_lado_w;
        else fh = MAP.sizes.car_vertical_h;
        const src = `${VIDA}${face}`;
        if (motion.face !== src) {
          motion.face = src;
          icon.style.backgroundImage = `url("${src}")`;
        }
        const nat = icon.dataset.nat?.split(",").map(Number) ?? [8, 1];
        const ratio = (nat[1] || 1) / Math.max(1, (nat[0] || 8) / 8);
        if (route.kind === "ped" || vertical) {
          fw = fh / ratio;
        } else fh = fw * ratio;
        el.style.transform = `translate3d(${at.x * cam.s}px,${at.y * cam.s}px,0)`;
        el.style.zIndex = String(Math.round(at.y));
        el.style.opacity = show ? String(motion.fade) : "0";
        icon.style.setProperty("--fw", `${fw * cam.s}px`);
        icon.style.setProperty("--fh", `${fh * cam.s}px`);
        icon.style.setProperty("--f", String(frameN));
        icon.classList.toggle("is-flip", !vertical && dx < 0);
      });
      const spot = here(stateRef.current);
      const goal = destRef.current || spot;
      const fromLot = lotById(spot) ?? lotById("oficina");
      const toLot = lotById(goal) ?? fromLot;
      const key = `${fromLot?.id ?? ""}>${toLot?.id ?? ""}`;
      if (key !== teoKey && fromLot && toLot) {
        teoKey = key;
        teo.pts = fromLot.id === toLot.id ? [fromLot.door, fromLot.door] : routeGraph(fromLot.door, toLot.door);
        teo.len = pathLen(teo.pts);
        teo.d = 0;
      }
      if (teo.len > 1) {
        teo.d = Math.min(teo.len, teo.d + 180 * 0.016);
        teo.acc += 16;
        if (teo.acc > 125) {
          teo.acc = 0;
          teo.frame = (teo.frame + 1) % 4;
        }
      }
      const at = teo.pts.length ? pointAt(teo.pts, teo.d) : { x: fromLot?.door[0] ?? 0, y: fromLot?.door[1] ?? 0, dx: 1, dy: 0 };
      if (at.dx < -0.2) teo.flip = true;
      else if (at.dx > 0.2) teo.flip = false;
      const teoEl = teoRef.current;
      const pin = pinRef.current;
      if (teoEl) {
        teoEl.style.width = `${120 * cam.s}px`;
        teoEl.style.height = "auto";
        teoEl.style.transformOrigin = "50% 100%";
        teoEl.style.transform = `translate3d(${at.x * cam.s}px,${at.y * cam.s}px,0) translate(-50%, -100%) scaleX(${teo.flip ? -1 : 1})`;
        teoEl.style.zIndex = String(Math.round(at.y));
        teoEl.src = art.mapa(`teo_andando_mapa_${teo.len > 1 && teo.d < teo.len - 2 ? teo.frame + 1 : 1}.png`);
      }
      if (pin) {
        pin.style.width = `${36 * cam.s}px`;
        pin.style.height = "auto";
        pin.style.transformOrigin = "50% 100%";
        pin.style.transform = `translate3d(${at.x * cam.s}px,${(at.y - 108) * cam.s}px,0) translate(-50%, -100%)`;
        pin.style.zIndex = String(Math.round(at.y) + 2);
      }
      const dot = miniRef.current?.querySelector("i") as HTMLElement | null;
      if (dot) {
        dot.style.left = `${(at.x / WORLD_W) * 100}%`;
        dot.style.top = `${(at.y / WORLD_H) * 100}%`;
      }
      const target = lotById(destRef.current);
      const arrow = arrowRef.current;
      if (arrow && target) {
        const sx = target.anchor[0] * cam.s + cam.tx;
        const sy = target.anchor[1] * cam.s + cam.ty;
        const inside = sx > 24 && sy > 24 && sx < vw - 24 && sy < vh - 24;
        arrow.hidden = inside;
        if (!inside) {
          const cx = clamp(sx, 28, vw - 28);
          const cy = clamp(sy, 28, vh - 28);
          arrow.style.transform = `translate(${cx}px,${cy}px) rotate(${Math.atan2(sy - vh / 2, sx - vw / 2)}rad)`;
        }
      }
      const orders = [...world.querySelectorAll<HTMLElement>(".mm-drop")];
      (stateRef.current.inbound ?? []).forEach((order, index) => {
        const el = orders[index];
        if (!el) return;
        const from = lotById(order.supplier)?.door ?? MAP.center.anchor;
        const to = lotById("oficina")?.door ?? from;
        const pts = routeGraph(from, to);
        const len = pathLen(pts);
        const arrive = typeof order.arriveT === "number" ? order.arriveT : order.atWeek * WEEK + Math.max(0, order.atDay - 1) * DAY + 8 * 60;
        const start = typeof order.fromT === "number" ? order.fromT : arrive - DAY;
        const p = clamp((stateRef.current.clock.t - start) / Math.max(30, arrive - start), 0, 1);
        const hop = pointAt(pts, p * len);
        el.style.transform = `translate3d(${hop.x * cam.s}px,${hop.y * cam.s}px,0)`;
        el.style.zIndex = String(Math.round(hop.y));
      });
    }

    function boot() {
      vw = frame.clientWidth || 1;
      vh = frame.clientHeight || 1;
      const startLot = lotById(MAP.camera.start) ?? MAP.lots[0]!;
      const view = zoomBounds().def;
      const focus = centerOf(startLot.anchor[0] + 150, startLot.anchor[1] - 200, view);
      cam.tx = focus.tx;
      cam.ty = focus.ty;
      cam.s = view;
      clampCam();
      apply(false);
      onReady?.();
      kick();
      rest();
    }
    document.addEventListener("visibilitychange", onVis);
    boot();
    MAP.routes.forEach((route, index) => {
      const probe = new Image();
      probe.src = `${VIDA}${route.sprites.lado}`;
      probe.onload = () => {
        const icon = world.querySelectorAll<HTMLElement>(".mm-walker i")[index];
        if (icon) icon.dataset.nat = `${probe.naturalWidth},${probe.naturalHeight}`;
      };
    });
    const watch = new ResizeObserver(() => {
      const rect = frame.getBoundingClientRect();
      const wx = (vw / 2 - cam.tx) / cam.s;
      const wy = (vh / 2 - cam.ty) / cam.s;
      vw = rect.width || 1;
      vh = rect.height || 1;
      const next = centerOf(wx, wy, cam.s);
      cam.tx = next.tx;
      cam.ty = next.ty;
      clampCam();
      apply(false);
    });
    watch.observe(frame);

    const stopGesture = (event: Event) => event.preventDefault();
    frame.addEventListener("gesturestart", stopGesture, { passive: false });
    frame.addEventListener("gesturechange", stopGesture, { passive: false });
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      forget();
      const rect = frame.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      let dy = event.deltaY;
      let dx = event.deltaX;
      if (event.deltaMode === 1) {
        dy *= 16;
        dx *= 16;
      } else if (event.deltaMode === 2) {
        dy *= vh;
        dx *= vw;
      }
      if (event.shiftKey || Math.abs(dx) > Math.abs(dy)) {
        cam.tx -= dx || dy;
        cam.ty -= event.shiftKey ? dy : 0;
        clampCam();
        apply(true);
        rest();
        return;
      }
      const factor = Math.exp(-dy * (event.ctrlKey ? 0.01 : 0.0015));
      zoomAt(cx, cy, cam.s * factor);
      rest();
    };
    frame.addEventListener("wheel", onWheel, { passive: false });

    function forget() {
      setHint(false);
      try {
        localStorage.setItem("gf-map-hint", "1");
      } catch {
        /* ignore */
      }
    }
    function onKey(event: KeyboardEvent) {
      if (document.activeElement !== frame && !frame.contains(document.activeElement)) return;
      const { fit } = zoomBounds();
      const debug = new URLSearchParams(location.search).get("debug") === "lotes";
      if ((event.key === "v" || event.key === "V") && debug) {
        validate();
        return;
      }
      if ((event.key === "c" || event.key === "C") && debug) {
        void navigator.clipboard?.writeText(JSON.stringify(MAP));
        return;
      }
      const pan = 0.25;
      if (event.key === "ArrowUp" || event.key === "w") cam.ty += vh * pan;
      else if (event.key === "ArrowDown" || event.key === "s") cam.ty -= vh * pan;
      else if (event.key === "ArrowLeft" || event.key === "a") cam.tx += vw * pan;
      else if (event.key === "ArrowRight" || event.key === "d") cam.tx -= vw * pan;
      else if (event.key === "+" || event.key === "=") zoomAt(vw / 2, vh / 2, cam.s * 1.25);
      else if (event.key === "-" || event.key === "_") zoomAt(vw / 2, vh / 2, cam.s / 1.25);
      else if (event.key === "0") {
        cam.s = fit;
        clampCam();
      } else return;
      event.preventDefault();
      clampCam();
      apply(true);
      kick();
      rest();
    }
    frame.addEventListener("keydown", onKey);

    function down(event: PointerEvent) {
      if ((event.target as HTMLElement).closest("button, a, .mm-mini, .mm-zoom")) return;
      frame.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      cam.vx = 0;
      cam.vy = 0;
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), s: cam.s, tx: cam.tx, ty: cam.ty, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        drag = null;
        return;
      }
      drag = { x: event.clientX, y: event.clientY, tx: cam.tx, ty: cam.ty, moved: false, t: performance.now() };
      samples.length = 0;
      samples.push({ x: event.clientX, y: event.clientY, t: drag.t });
    }
    function move(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const rect = frame.getBoundingClientRect();
        const s2 = clamp(pinch.s * (dist / pinch.dist), zoomBounds().fit, zoomBounds().max);
        const wx = (pinch.mx - rect.left - pinch.tx) / pinch.s;
        const wy = (pinch.my - rect.top - pinch.ty) / pinch.s;
        cam.s = s2;
        cam.tx = mx - rect.left - wx * s2;
        cam.ty = my - rect.top - wy * s2;
        clampCam();
        apply(true);
        forget();
        return;
      }
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      forget();
      cam.tx = drag.tx + dx;
      cam.ty = drag.ty + dy;
      clampCam();
      apply(true);
      const t = performance.now();
      samples.push({ x: event.clientX, y: event.clientY, t });
      while (samples.length && t - samples[0]!.t > 80) samples.shift();
      kick();
    }
    function up(event: PointerEvent) {
      const wasDrag = drag?.moved;
      const start = drag;
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
      if (wasDrag && samples.length >= 2) {
        const a = samples[0]!;
        const b = samples[samples.length - 1]!;
        const dt = Math.max(16, b.t - a.t);
        cam.vx = (b.x - a.x) / dt;
        cam.vy = (b.y - a.y) / dt;
        kick();
      } else if (start && !wasDrag && performance.now() - start.t < 300) {
        const p = worldPoint(event.clientX, event.clientY);
        const now = performance.now();
        if (now - lastTap.t < 300 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 24) {
          const { def, max } = zoomBounds();
          const next = cam.s >= max - 0.02 ? def : Math.min(max, cam.s * 2);
          flyTo(p.x, p.y, next, 250);
          lastTap.t = 0;
        } else {
          lastTap = { t: now, x: event.clientX, y: event.clientY };
          const lot = hitLot(p.x, p.y);
          if (hitLift(p.x, p.y)) return;
          const marco = hypot(p.x, p.y, MAP.center.anchor[0], MAP.center.anchor[1]) < 70;
          if (lot) pick(lot);
          else if (marco) goGoal();
        }
      }
      drag = null;
      if (!wasDrag) rest();
    }
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);
    let hoverLot = "";
    let tipAt = { x: -999, y: -999 };
    const hoverMove = (event: PointerEvent) => {
      if (drag?.moved || pinch) {
        if (hoverLot) {
          hoverLot = "";
          setHover("");
          setTip(null);
        }
        return;
      }
      const p = worldPoint(event.clientX, event.clientY);
      if (hitLift(p.x, p.y)) {
        const rect = frame.getBoundingClientRect();
        const x = clamp(event.clientX - rect.left + 16, 8, Math.max(8, vw - 180));
        const y = clamp(event.clientY - rect.top + 18, 8, Math.max(8, vh - 64));
        if (hoverLot === "lift" && Math.abs(x - tipAt.x) < 12 && Math.abs(y - tipAt.y) < 12) return;
        tipAt = { x, y };
        hoverLot = "lift";
        setHover("");
        setTip({ nome: "Elevador Lunar", horas: "", x, y });
        return;
      }
      const lot = hitLot(p.x, p.y);
      const id = lot?.id ?? "";
      const rect = frame.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left + 16, 8, Math.max(8, vw - 180));
      const y = clamp(event.clientY - rect.top + 18, 8, Math.max(8, vh - 64));
      if (id === hoverLot && Math.abs(x - tipAt.x) < 12 && Math.abs(y - tipAt.y) < 12) return;
      tipAt = { x, y };
      hoverLot = id;
      setHover(id);
      setTip(lot ? { nome: lot.nome, horas: hoursOf(lot, packRef.current), x, y } : null);
    };
    const hoverLeave = () => {
      hoverLot = "";
      setHover("");
      setTip(null);
    };
    frame.addEventListener("pointermove", hoverMove);
    frame.addEventListener("pointerleave", hoverLeave);

    function pick(lot: Lot) {
      setHover(lot.id);
      if (lot.clickable === "toast") {
        setToast(lot.toast || "Em breve!");
        return;
      }
      onOpen(lot.id);
    }
    function goGoal() {
      const lot = lotById(destRef.current);
      if (!lot) return;
      flyTo(lot.anchor[0], lot.anchor[1] - 80, zoomBounds().def);
      if (lot.kind !== "soon") onOpen(lot.id);
    }
    (frame as HTMLDivElement & { goGoal?: () => void }).goGoal = goGoal;
    (frame as HTMLDivElement & { nudge?: (x: number, y: number) => void }).nudge = (x, y) => {
      cam.tx += x;
      cam.ty += y;
      clampCam();
      apply(true);
      rest();
    };
    (frame as HTMLDivElement & { zoomBy?: (k: number) => void }).zoomBy = (k) => {
      zoomAt(vw / 2, vh / 2, k < 0 ? zoomBounds().fit : cam.s * k);
      rest();
    };
    (frame as HTMLDivElement & { jump?: (x: number, y: number) => void }).jump = (x, y) => flyTo(x, y, cam.s);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      watch.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      frame.removeEventListener("gesturestart", stopGesture);
      frame.removeEventListener("gesturechange", stopGesture);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("keydown", onKey);
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", up);
      frame.removeEventListener("pointercancel", up);
      frame.removeEventListener("pointermove", hoverMove);
      frame.removeEventListener("pointerleave", hoverLeave);
    };
  }, [maxZoom]);

  function validate() {
    const errors: string[] = [];
    const canal = MAP.canal.rects;
    const bridge = MAP.canal.bridge;
    const wall = MAP.wall.outer;
    const gates = MAP.wall.gates.filter((gate) => gate.aberto).map((gate) => gate.rect);
    for (const route of MAP.routes) {
      const pts = pathOf(route.pts, route.mode === "loop");
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const blocks = route.kind === "car" ? MAP.lots.map((lot) => lot.rect) : MAP.lots.map((lot) => lot.inner);
        for (const rect of blocks) {
          if (rectsHit(a[0], a[1], b[0], b[1], rect, 4)) errors.push(`${route.id} lote`);
        }
        if (rectsHit(a[0], a[1], b[0], b[1], MAP.center.rect, 4)) errors.push(`${route.id} centro`);
        for (const rect of canal) {
          if (rectsHit(a[0], a[1], b[0], b[1], rect, 3) && !rectsHit(a[0], a[1], b[0], b[1], bridge, 8)) errors.push(`${route.id} canal`);
        }
        if (rectsHit(a[0], a[1], b[0], b[1], wall, 0)) {
          const steps = 6;
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const x = a[0] + (b[0] - a[0]) * u;
            const y = a[1] + (b[1] - a[1]) * u;
            const outside = x < MAP.wall.inner[0]! || y < MAP.wall.inner[1]! || x > MAP.wall.inner[2]! || y > MAP.wall.inner[3]!;
            const gated = gates.some((gate) => inRect(x, y, gate, 6));
            if (outside && !gated) errors.push(`${route.id} muralha`);
          }
        }
      }
    }
    const unique = [...new Set(errors)];
    setDebugText(unique.length ? unique.slice(0, 8).join(" · ") : "V: zero erros");
  }

  const t = state.clock?.t ?? 0;
  const spot = here(state);
  const crowd = clientsAt(pack, t);
  const eventAt = dayEventPlace(state);
  const tourney = state.calendar.week + 1 === 18 || state.calendar.week + 1 === 30 || state.calendar.week + 1 === 44;
  const dawn = hour < 6;
  const night = hour >= 18;
  const oficinaTile = MAP.tiles.find((tile) => inRect(2022, 1700, [tile.x, tile.y, tile.x + tile.w, tile.y + tile.h]));
  const goal = lotById(dest);
  const goalName = goal?.nome ?? "Cidade";

  function api() {
    return frameRef.current as (HTMLDivElement & {
      nudge?: (x: number, y: number) => void;
      zoomBy?: (k: number) => void;
      jump?: (x: number, y: number) => void;
      goGoal?: () => void;
    }) | null;
  }

  return (
    <div
      ref={frameRef}
      className="gf-frame is-roam mm-frame"
      tabIndex={0}
      aria-label="Mapa da cidade"
      onPointerMove={(event) => {
        if (debugOn) {
          const rect = frameRef.current!.getBoundingClientRect();
          const cam = camRef.current;
          const x = Math.round((event.clientX - rect.left - cam.tx) / cam.s);
          const y = Math.round((event.clientY - rect.top - cam.ty) / cam.s);
          setDebugText(`${x}, ${y}  s ${cam.s.toFixed(2)}`);
        }
      }}
    >
      <div ref={worldRef} className={`mm-world${night ? " is-night" : ""}`}>
        <img className={`mm-preview${tilesOn ? " is-gone" : ""}`} src={MAP.preview.src} alt="" draggable={false} />
        {MAP.tiles.map((tile) => (
          <img
            key={tile.id}
            className={`mm-tile${tilesOn ? " is-on" : ""}`}
            src={weak ? tile.half : tile.src}
            alt=""
            draggable={false}
            fetchPriority={tile.id === oficinaTile?.id ? "high" : "low"}
            style={{ left: `${(tile.x / WORLD_W) * 100}%`, top: `${(tile.y / WORLD_H) * 100}%`, width: `${(tile.w / WORLD_W) * 100}%`, height: `${(tile.h / WORLD_H) * 100}%` }}
            onLoad={(event) => {
              const img = event.currentTarget;
              img.decode?.().then(() => {
                const pending = [...(worldRef.current?.querySelectorAll(".mm-tile") ?? [])].every((node) => (node as HTMLImageElement).complete);
                if (pending) setTilesOn(true);
              }).catch(() => undefined);
            }}
          />
        ))}
        <img
          className="mm-lift"
          src="/assets/gf/v2/mapa_mundi/elevador_loop.webp"
          alt=""
          draggable={false}
          style={{
            left: `${(LIFT_X / WORLD_W) * 100}%`,
            top: `${(LIFT_FOOT / WORLD_H) * 100}%`,
            height: `${(LIFT_H / WORLD_H) * 100}%`,
            width: "auto",
            zIndex: Math.round(LIFT_FOOT),
          }}
        />
        {MAP.lots.map((lot) => {
          const place = lot.kind === "place" ? (lot.id as PlaceId) : null;
          const pilot = place ? pilotAt(place) : null;
          const toll = pilot ? !pilotBeaten(state.flags, pilot.id) : false;
          const clients = place ? (crowd.get(place)?.length ?? 0) : 0;
          const face = lot.id === "oficina" ? fachada : null;
          const inset = face ? face.inset : (lot.sprite.baseInset ?? 0);
          return (
            <div key={lot.id}>
              <i className="mm-shadow" style={{ left: `${(lot.anchor[0] / WORLD_W) * 100}%`, top: `${(lot.anchor[1] / WORLD_H) * 100}%`, zIndex: Math.round(lot.anchor[1]) - 1 }} />
              <button
                type="button"
                className={`gf-lot mm-lot${hover === lot.id ? " is-hover" : ""}${dest === lot.id ? " is-goal" : ""}${spot === lot.id ? " is-here" : ""}${face ? ` is-l${face.lv}` : ""}${face && evolve ? " is-evolve" : ""}`}
                data-id={lot.id}
                style={{
                  left: `${(lot.anchor[0] / WORLD_W) * 100}%`,
                  top: `${(lot.anchor[1] / WORLD_H) * 100}%`,
                  zIndex: Math.round(lot.anchor[1]),
                  transform: `translate(-50%, calc(-100% + ${inset * 100}%))`,
                }}
                aria-label={lot.nome}
                onClick={() => {
                  if (lot.clickable === "toast") setToast(lot.toast || "Em breve!");
                  else onOpen(lot.id);
                }}
              >
                <img
                  key={face?.src ?? lot.sprite.src}
                  src={face?.src ?? lot.sprite.src}
                  alt=""
                  draggable={false}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    const plate = face?.plate ?? 0;
                    const k = plate > 0 ? OFICINA_FOOT / plate : Math.min(lot.sprite.box.w / img.naturalWidth, lot.sprite.box.h / img.naturalHeight);
                    const dw = img.naturalWidth * k;
                    const dh = img.naturalHeight * k;
                    const s = camRef.current.s || 1;
                    img.style.width = `${dw * s}px`;
                    img.style.height = `${dh * s}px`;
                    const button = img.parentElement as HTMLElement | null;
                    const holo = button?.querySelector<HTMLImageElement>(".mm-holo");
                    if (holo) {
                      holo.style.width = img.style.width;
                      holo.style.height = img.style.height;
                    }
                    const shadow = button?.previousElementSibling as HTMLElement | null;
                    if (shadow?.classList.contains("mm-shadow")) {
                      shadow.style.width = `${dw * 0.9 * s}px`;
                      shadow.style.height = `${dh * 0.12 * s}px`;
                    }
                    drawn.current.set(lot.id, { w: dw, h: dh });
                    const mask = buildMask(img);
                    if (mask) masks.current.set(lot.id, mask);
                  }}
                />
                {face?.holo ? <img className="mm-holo" src={face.holo} alt="" draggable={false} /> : null}
                {place === "coliseu" && tourney && <img className="gf-mark gf-mark-flag" src={art.mapa("mapa_bandeira_torneio.png?v=10")} alt="" />}
                {place && lockReason(state, place) && <img className="gf-mark gf-mark-lock" src={art.mapa("mapa_icone_cadeado.png?v=10")} alt="" />}
                {toll && <img className="gf-mark gf-mark-toll" src={art.mapa("mapa_placa_pedagio.png?v=10")} alt="" />}
                {clients > 0 && <img className="gf-mark gf-mark-client" src={art.mapa("mapa_icone_cliente.png?v=10")} alt="" />}
                {eventAt === place && <img className="gf-mark gf-mark-event" src={art.mapa("mapa_icone_evento.png?v=10")} alt="" />}
              </button>
            </div>
          );
        })}
        {PILOTS.map((pilot) => {
          if (pilotBeaten(state.flags, pilot.id) || state.flags[`pilotMet_${pilot.id}`] !== true) return null;
          const lot = lotById(pilot.place);
          if (!lot) return null;
          return (
            <img
              key={pilot.id}
              className="mm-pilot"
              src={art.mapa(`piloto_${pilot.id}_mapa.png?v=10`)}
              alt=""
              style={{ left: `${((lot.door[0] + 36) / WORLD_W) * 100}%`, top: `${(lot.door[1] / WORLD_H) * 100}%`, zIndex: Math.round(lot.door[1]) }}
            />
          );
        })}
        {MAP.routes.map((route) => (
          <span key={route.id} className="gf-walker mm-walker">
            <i style={{ backgroundImage: `url("${VIDA}${route.sprites.lado}")` }} data-nat="8,1" />
          </span>
        ))}
        {(state.inbound ?? []).map((order) => (
          <img
            key={order.id}
            className="mm-drop"
            src={order.carrier === "dinodrone" ? "/assets/gf/v2/entrega/dinodrone.png?v=18" : order.carrier === "dinoturbo" ? "/assets/gf/v2/entrega/moto_dinoturbo.png?v=18" : art.mapa("mapa_icone_entrega.png?v=10")}
            alt=""
          />
        ))}
        <img ref={teoRef} className="mm-teo" src={art.mapa("teo_andando_mapa_1.png")} alt="" />
        <img ref={pinRef} className="gf-pin mm-pin" src={art.mapa("mapa_pin_voce.png?v=10")} alt="" />
        {debugOn && (
          <svg className="mm-debug" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} width="100%" height="100%">
            {MAP.lots.map((lot) => (
              <g key={lot.id}>
                <rect x={lot.rect[0]} y={lot.rect[1]} width={lot.rect[2] - lot.rect[0]} height={lot.rect[3] - lot.rect[1]} fill="none" stroke="#ffe14a" strokeWidth={2} />
                <rect x={lot.anchor[0] - lot.sprite.box.w / 2} y={lot.anchor[1] - lot.sprite.box.h} width={lot.sprite.box.w} height={lot.sprite.box.h} fill="none" stroke="#3ff" strokeWidth={2} />
                <circle cx={lot.anchor[0]} cy={lot.anchor[1]} r={6} fill="#f3f" />
                <circle cx={lot.door[0]} cy={lot.door[1]} r={5} fill="#ff0" />
              </g>
            ))}
            <rect x={MAP.center.rect[0]} y={MAP.center.rect[1]} width={MAP.center.rect[2] - MAP.center.rect[0]} height={MAP.center.rect[3] - MAP.center.rect[1]} fill="none" stroke="#ff0" />
            {MAP.routes.map((route) => (
              <polyline key={route.id} points={route.pts.map((pt) => pt.join(",")).join(" ")} fill="none" stroke={route.kind === "car" ? "#f33" : "#3f3"} strokeWidth={3} />
            ))}
            {MAP.graph.edges.map(([a, b]) => {
              const pa = MAP.graph.nodes[a]!;
              const pb = MAP.graph.nodes[b]!;
              return <line key={`${a}-${b}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke="#fff" strokeWidth={1} />;
            })}
          </svg>
        )}
      </div>
      {(dawn || night) && <div className={`mm-tint is-${dawn ? "madrugada" : "noite"}`} />}
      <button type="button" className="mm-goal-chip" ref={chipRef} onClick={() => api()?.goGoal?.()}>
        {goalName}
      </button>
      <i ref={arrowRef} className="mm-arrow" hidden />
      {tip && (
        <p className="mm-hover" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.nome}</b>
          {tip.horas && <small>{tip.horas}</small>}
        </p>
      )}
      {toast && <p className="mm-toast">{toast}</p>}
      {hint && <p className="gf-draghint">Arraste para andar • pinça/roda para zoom</p>}
      <div className="gf-pans">
        <button type="button" className="mm-zoom is-in" aria-label="Aproximar" onClick={() => api()?.zoomBy?.(1.25)}>+</button>
        <button type="button" className="mm-zoom is-out" aria-label="Afastar" onClick={() => api()?.zoomBy?.(0.8)}>−</button>
        <button type="button" className="mm-zoom is-fit" aria-label="Ver tudo" onClick={() => api()?.zoomBy?.(-1)}>Tudo</button>
      </div>
      <div
        ref={miniRef}
        className="gf-minimap mm-mini"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
          const y = ((event.clientY - rect.top) / rect.height) * WORLD_H;
          api()?.jump?.(x, y);
        }}
      >
        <img src={MAP.preview.src} alt="" />
        <b />
        <i />
      </div>
      {debugOn && <p className="mm-debug-hud">{debugText}</p>}
    </div>
  );
}

const DAYN = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const STALLS = new Set<string>(["padaria", "feira", "filtro", "dimas", "sopao"]);

function faceHour(value: string): string {
  if (value === "24:00") return "24h";
  const [h, m] = value.split(":").map((item) => Number(item));
  if (!m) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function daySpan(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length >= 7) return "Todo dia";
  const run = sorted.every((day, index) => index === 0 || day === sorted[index - 1]! + 1);
  if (run && sorted.length > 1) return `${DAYN[sorted[0]!]}–${DAYN[sorted[sorted.length - 1]!]}`;
  return sorted.map((day) => DAYN[day]).join(" ");
}

function hoursOf(lot: Lot, pack: Content): string {
  if (lot.kind === "soon") return "Em breve";
  if (lot.kind === "stall" && STALLS.has(lot.id)) {
    const line = stallHours(lot.id as StallId);
    if (line === "24h") return "Aberto o dia todo";
    const [from, to] = line.split("–");
    return `Todo dia ${faceHour(from ?? "")}–${faceHour(to ?? "")}`;
  }
  const id = lot.id === "faixa" ? "coliseu" : lot.id;
  const windows = pack.time.places?.[id];
  if (!windows?.length) return "";
  if (windows.length === 1 && windows[0]!.de === "00:00" && windows[0]!.ate === "24:00") return "Aberto o dia todo";
  return windows.map((window) => `${daySpan(window.dias)} ${faceHour(window.de)}–${faceHour(window.ate)}`).join(" · ");
}
