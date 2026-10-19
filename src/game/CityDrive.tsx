import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLocale } from "@/lib/locale-context";
import type { CopyKey } from "@/lib/locale";
import {
  AVENUES,
  MAP_H,
  MAP_W,
  ROUNDABOUTS,
  SIGNS,
  SPOTS,
  STREETS,
  cityRpm,
  cityTopSpeed,
  createCity,
  doorSpot,
  nearestDoor,
  onAsphalt,
  planCityRoute,
  stepCity,
  type Bolt,
  type CityPace,
  type CityState,
  type Door,
  type Rider,
} from "./city";
import { TOP_MODELS } from "./forge";

const VIEW_W = 1280;
const VIEW_H = 720;

const DOOR_KEY: Record<Door, CopyKey> = {
  garagem: "city.garagem",
  loja: "city.loja",
  pecas: "city.pecas",
  forja: "city.forja",
  bar: "city.bar",
  stake: "city.stake",
};

const DOOR_TONE: Record<Door, string> = {
  garagem: "#d6ff3f",
  loja: "#7fd7ff",
  pecas: "#ffb020",
  forja: "#ff5a1f",
  bar: "#ff7ad9",
  stake: "#ffe56a",
};

function paintRadar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: CityState,
  camX: number,
  camY: number,
  labels: Record<Door, string>,
  detailed: boolean,
  ghosts: { x: number; y: number }[],
  viewW = VIEW_W,
  viewH = VIEW_H,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#070a06";
  ctx.fillRect(0, 0, w, h);
  const pad = detailed ? 28 : 10;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const sx = (x: number) => pad + (x / MAP_W) * innerW;
  const sy = (y: number) => pad + (y / MAP_H) * innerH;
  ctx.fillStyle = "#10150d";
  ctx.fillRect(pad, pad, innerW, innerH);

  ctx.strokeStyle = "#24301c";
  ctx.lineWidth = detailed ? 3 : 1.25;
  ctx.beginPath();
  for (const road of AVENUES) {
    const y = sy(road.y + road.h / 2);
    ctx.moveTo(sx(road.x0), y);
    ctx.lineTo(sx(road.x1), y);
  }
  for (const road of STREETS) {
    const x = sx(road.x + road.w / 2);
    ctx.moveTo(x, sy(road.y0));
    ctx.lineTo(x, sy(road.y1));
  }
  ctx.stroke();

  for (const spot of SPOTS) {
    if (!spot.door) continue;
    const x = sx(spot.x + spot.w / 2);
    const y = sy(spot.y + spot.h / 2);
    const tone = DOOR_TONE[spot.door];
    ctx.fillStyle = tone;
    ctx.beginPath();
    const r = detailed ? 7 : 3.5;
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    if (detailed) {
      ctx.font = "700 18px Teko, Impact, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#070a06";
      ctx.strokeText(labels[spot.door].toUpperCase(), x + 12, y);
      ctx.fillStyle = tone;
      ctx.fillText(labels[spot.door].toUpperCase(), x + 12, y);
    }
  }

  ctx.fillStyle = "rgba(255,180,60,0.85)";
  for (const rider of state.riders) {
    ctx.fillStyle = rider.hue;
    ctx.fillRect(sx(rider.x) - 1.5, sy(rider.y) - 1.5, detailed ? 4 : 3, detailed ? 4 : 3);
  }
  ctx.fillStyle = "#7fd7ff";
  for (const ghost of ghosts) {
    ctx.beginPath();
    ctx.arc(sx(ghost.x), sy(ghost.y), detailed ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const vx = (viewW / MAP_W) * innerW;
  const vy = (viewH / MAP_H) * innerH;
  ctx.strokeStyle = "rgba(214,255,63,0.9)";
  ctx.lineWidth = detailed ? 2 : 1;
  ctx.strokeRect(sx(camX), sy(camY), vx, vy);

  ctx.save();
  ctx.translate(sx(state.x), sy(state.y));
  ctx.rotate(state.heading);
  ctx.fillStyle = "#d6ff3f";
  ctx.shadowColor = "#d6ff3f";
  ctx.shadowBlur = detailed ? 12 : 6;
  ctx.beginPath();
  const tip = detailed ? 11 : 6;
  ctx.moveTo(0, -tip);
  ctx.lineTo(tip * 0.62, tip * 0.8);
  ctx.lineTo(0, tip * 0.35);
  ctx.lineTo(-tip * 0.62, tip * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#d6ff3f";
  ctx.lineWidth = 2;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  const tick = detailed ? 16 : 8;
  ctx.beginPath();
  ctx.moveTo(0, tick);
  ctx.lineTo(0, 0);
  ctx.lineTo(tick, 0);
  ctx.moveTo(w, h - tick);
  ctx.lineTo(w, h);
  ctx.lineTo(w - tick, h);
  ctx.stroke();
}

type DoorHit = { door: Door; x: number; y: number; w: number; h: number; wx: number; wy: number };

function mapFit(w: number, h: number) {
  return Math.min((w - 36) / (MAP_W + MAP_H), (h - 36) / ((MAP_W + MAP_H) * 0.5));
}

function mapWorld(
  px: number,
  py: number,
  w: number,
  h: number,
  view: { zoom: number; panX: number; panY: number; anchorX: number; anchorY: number },
) {
  const scale = mapFit(w, h) * view.zoom;
  if (scale <= 0) return null;
  const sx = (px - w / 2 - view.panX) / scale;
  const sy = ((py - h / 2 - view.panY) / scale) * 2;
  const ax = view.anchorX;
  const ay = view.anchorY;
  const xm = sx + (ax - ay);
  const ym = sy + ax + ay;
  return {
    x: Math.max(80, Math.min(MAP_W - 80, (xm + ym) / 2)),
    y: Math.max(80, Math.min(MAP_H - 80, (ym - xm) / 2)),
  };
}

function paintDiorama(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: CityState,
  labels: Record<Door, string>,
  ghosts: { x: number; y: number; heading: number; name: string }[],
  art: Map<string, HTMLImageElement>,
  car: HTMLImageElement | null,
  view: { zoom: number; panX: number; panY: number; anchorX: number; anchorY: number },
  now: number,
  hits: DoorHit[],
) {
  hits.length = 0;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050705";
  ctx.fillRect(0, 0, w, h);
  const scale = mapFit(w, h) * view.zoom;
  const ax = view.anchorX;
  const ay = view.anchorY;
  const project = (x: number, y: number) => ({
    x: w / 2 + ((x - y) - (ax - ay)) * scale + view.panX,
    y: h / 2 + ((x + y - ax - ay) * 0.5) * scale + view.panY,
  });
  const quad = (x: number, y: number, bw: number, bh: number) => {
    const a = project(x, y);
    const b = project(x + bw, y);
    const c = project(x + bw, y + bh);
    const d = project(x, y + bh);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
  };

  ctx.fillStyle = "#0c120b";
  quad(0, 0, MAP_W, MAP_H);
  ctx.fill();
  ctx.strokeStyle = "rgba(214,255,63,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let row = 0; row < AVENUES.length - 1; row++) {
    for (let col = 0; col < STREETS.length - 1; col++) {
      const left = STREETS[col]!.x + STREETS[col]!.w;
      const right = STREETS[col + 1]!.x;
      const top = AVENUES[row]!.y + AVENUES[row]!.h;
      const bottom = AVENUES[row + 1]!.y;
      const mid = project((left + right) / 2, (top + bottom) / 2);
      if (mid.x < -200 || mid.x > w + 200 || mid.y < -200 || mid.y > h + 200) continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? "#172015" : "#10180e";
      quad(left, top, right - left, bottom - top);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#241f16";
  for (const road of AVENUES) {
    quad(road.x0, road.y, road.x1 - road.x0, road.h);
    ctx.fill();
  }
  for (const road of STREETS) {
    quad(road.x, road.y0, road.w, road.y1 - road.y0);
    ctx.fill();
  }
  ctx.fillStyle = "#241f16";
  for (const rb of ROUNDABOUTS) {
    const ring = (radius: number) => {
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const p = project(rb.x + Math.cos(a) * radius, rb.y + Math.sin(a) * radius);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    };
    ctx.fillStyle = "#1c2116";
    ring(rb.r);
    ctx.fill();
    ctx.fillStyle = "#241f16";
    ring(rb.hole);
    ctx.fill();
  }
  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(214,255,63,0.38)";
  ctx.lineWidth = Math.max(1, scale * 22);
  ctx.beginPath();
  for (const road of AVENUES) {
    const a = project(road.x0 + 30, road.y + road.h / 2);
    const b = project(road.x1 - 30, road.y + road.h / 2);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (const road of STREETS) {
    const a = project(road.x + road.w / 2, road.y0 + 30);
    const b = project(road.x + road.w / 2, road.y1 - 30);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();

  const items: { depth: number; draw: () => void }[] = [];
  for (const spot of SPOTS) {
    if (spot.flat) continue;
    const foot = project(spot.x + spot.w / 2, spot.y + spot.h);
    if (foot.x < -240 || foot.x > w + 240 || foot.y < -280 || foot.y > h + 80) continue;
    const right = project(spot.x + spot.w, spot.y + spot.h);
    const wide = Math.hypot(right.x - foot.x, right.y - foot.y) * 2;
    const depth = spot.x + spot.w / 2 + spot.y + spot.h;
    items.push({
      depth,
      draw: () => {
        const img = art.get(spot.sprite);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y + 2, Math.max(6, wide * 0.46), Math.max(3, wide * 0.16), 0, 0, Math.PI * 2);
        ctx.fill();
        if (!img?.width) return;
        const dw = Math.max(10, wide * 1.35);
        const dh = dw * (img.height / img.width);
        ctx.drawImage(img, foot.x - dw / 2, foot.y - dh, dw, dh);
        if (!spot.door) return;
        hits.push({
          door: spot.door,
          x: foot.x - dw / 2,
          y: foot.y - dh,
          w: dw,
          h: dh,
          wx: spot.x + spot.w / 2,
          wy: Math.min(MAP_H - 70, spot.y + spot.h + 86),
        });
      },
    });
  }

  const marker = (x: number, y: number, heading: number, color: string, big: boolean) => {
    const p = project(x, y);
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) return;
    const dx = Math.sin(heading);
    const dy = -Math.cos(heading);
    const ang = Math.atan2((dx + dy) * 0.5, dx - dy);
    items.push({
      depth: x + y + 8,
      draw: () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang + Math.PI / 2);
        if (big && car?.width) {
          const dw = Math.max(18, 120 * scale);
          const dh = dw * (car.height / car.width);
          ctx.shadowColor = "#d6ff3f";
          ctx.shadowBlur = 12;
          ctx.drawImage(car, -dw / 2, -dh * 0.55, dw, dh);
        } else {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          const tip = big ? 12 : 7;
          ctx.moveTo(0, -tip);
          ctx.lineTo(tip * 0.55, tip * 0.8);
          ctx.lineTo(-tip * 0.55, tip * 0.8);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      },
    });
  };
  for (const rider of state.riders) marker(rider.x, rider.y, rider.heading, rider.hue, false);
  for (const ghost of ghosts) marker(ghost.x, ghost.y, ghost.heading, "#7fd7ff", false);
  marker(state.x, state.y, state.heading, "#d6ff3f", true);
  items.sort((a, b) => a.depth - b.depth);
  ctx.imageSmoothingEnabled = true;
  for (const item of items) item.draw();

  ctx.font = "700 18px Teko, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const hit of hits) {
    const text = labels[hit.door].toUpperCase();
    const x = hit.x + hit.w / 2;
    const y = hit.y - 14;
    const pulse = Math.sin(now / 180) > 0.82 ? 2 : 0;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#070a06";
    ctx.strokeText(text, x + pulse, y);
    ctx.fillStyle = DOOR_TONE[hit.door];
    ctx.fillText(text, x, y);
  }
}

const DOOR_TO = {
  garagem: { to: "/dashboard" as const, hash: "garagem" },
  loja: { to: "/loja" as const },
  pecas: { to: "/pecas" as const },
  forja: { to: "/forja" as const },
  bar: { to: "/bar" as const },
  stake: { to: "/stake" as const },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

function dirt(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (!g) return c;
  g.fillStyle = "#12140e";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    g.fillStyle = i % 5 === 0 ? "#243018" : "#1a1d14";
    g.fillRect(x, y, i % 7 === 0 ? 6 : 2, i % 7 === 0 ? 3 : 2);
  }
  return c;
}

function wrapDelta(a: number, b: number, size: number) {
  let d = a - b;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

function loopShifts(camX: number, camY: number, viewW: number, viewH: number) {
  const seeWest = camX < 0;
  const seeEast = camX + viewW > MAP_W;
  const seeNorth = camY < 0;
  const seeSouth = camY + viewH > MAP_H;
  const shifts = [{ x: 0, y: 0 }];
  if (seeWest) shifts.push({ x: MAP_W, y: 0 });
  if (seeEast) shifts.push({ x: -MAP_W, y: 0 });
  if (seeNorth) shifts.push({ x: 0, y: MAP_H });
  if (seeSouth) shifts.push({ x: 0, y: -MAP_H });
  if (seeWest && seeNorth) shifts.push({ x: MAP_W, y: MAP_H });
  if (seeWest && seeSouth) shifts.push({ x: MAP_W, y: -MAP_H });
  if (seeEast && seeNorth) shifts.push({ x: -MAP_W, y: MAP_H });
  if (seeEast && seeSouth) shifts.push({ x: -MAP_W, y: -MAP_H });
  return shifts;
}

function paintMe(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.font = "700 28px Teko, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#14080c";
  ctx.strokeText("EU", x, y);
  ctx.fillStyle = "#eaff6a";
  ctx.fillText("EU", x, y);
  ctx.restore();
}

function paintRoads(ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number) {
  const draw = (x: number, y: number, w: number, h: number) => {
    if (x > viewW || y > viewH || x + w < 0 || y + h < 0) return;
    ctx.fillRect(x, y, w, h);
  };
  ctx.fillStyle = "#1c2116";
  for (const road of AVENUES) draw(road.x0 - camX, road.y - camY, road.x1 - road.x0, road.h);
  for (const road of STREETS) draw(road.x - camX, road.y0 - camY, road.w, road.y1 - road.y0);
  for (const rb of ROUNDABOUTS) {
    if (Math.abs(rb.x - camX - viewW / 2) > viewW || Math.abs(rb.y - camY - viewH / 2) > viewH) continue;
    ctx.beginPath();
    ctx.arc(rb.x - camX, rb.y - camY, rb.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#3c4430";
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (const road of AVENUES) {
    const x = road.x0 - camX;
    const y = road.y - camY;
    const w = road.x1 - road.x0;
    if (y > viewH || y + road.h < 0) continue;
    ctx.strokeRect(x, y, w, road.h);
  }
  for (const road of STREETS) {
    const x = road.x - camX;
    const y = road.y0 - camY;
    const h = road.y1 - road.y0;
    if (x > viewW || x + road.w < 0) continue;
    ctx.strokeRect(x, y, road.w, h);
  }
  ctx.save();
  ctx.setLineDash([28, 32]);
  ctx.strokeStyle = "rgba(239,230,210,0.5)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const road of AVENUES) {
    const y = road.y + road.h / 2 - camY;
    if (y < -20 || y > viewH + 20) continue;
    ctx.moveTo(road.x0 - camX, y);
    ctx.lineTo(road.x1 - camX, y);
  }
  for (const road of STREETS) {
    const x = road.x + road.w / 2 - camX;
    if (x < -20 || x > viewW + 20) continue;
    ctx.moveTo(x, road.y0 - camY);
    ctx.lineTo(x, road.y1 - camY);
  }
  ctx.stroke();
  ctx.restore();
  for (const rb of ROUNDABOUTS) {
    const x = rb.x - camX;
    const y = rb.y - camY;
    if (x < -rb.r || y < -rb.r || x > viewW + rb.r || y > viewH + rb.r) continue;
    ctx.fillStyle = "#241f16";
    ctx.beginPath();
    ctx.arc(x, y, rb.hole, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d6ff3f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, rb.hole - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#efe6d2";
    ctx.fillRect(x - 6, y - rb.hole * 0.42, 12, rb.hole * 0.84);
    ctx.beginPath();
    ctx.arc(x, y - rb.hole * 0.4, 14, 0, Math.PI * 2);
    ctx.arc(x, y + rb.hole * 0.4, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.setLineDash([20, 18]);
    ctx.strokeStyle = "rgba(239,230,210,0.72)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, (rb.r + rb.hole) / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function nearestMid<T>(list: readonly T[], at: number, mid: (item: T) => number): T {
  let best = list[0] as T;
  let bestD = Infinity;
  for (const item of list) {
    const d = Math.abs(mid(item) - at);
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

function paintStops(ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number) {
  ctx.save();
  ctx.font = "700 108px Teko, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "butt";
  for (const sign of SIGNS) {
    if (sign.kind !== "pare") continue;
    const street = nearestMid(STREETS, sign.x, (item) => item.x + item.w / 2);
    const avenue = nearestMid(AVENUES, sign.y, (item) => item.y + item.h / 2);
    const west = sign.x < street.x + street.w / 2;
    const north = sign.y < avenue.y + avenue.h / 2;
    const gap = 28;
    const word = 86;
    let x0: number;
    let y0: number;
    let x1: number;
    let y1: number;
    let tx: number;
    let ty: number;
    let rot: number;
    if (north && west) {
      x0 = street.x;
      x1 = street.x + street.w;
      y0 = y1 = avenue.y - gap;
      tx = (x0 + x1) / 2;
      ty = y0 - word;
      rot = Math.PI;
    } else if (!west && north) {
      y0 = avenue.y;
      y1 = avenue.y + avenue.h;
      x0 = x1 = street.x + street.w + gap;
      tx = x0 + word;
      ty = (y0 + y1) / 2;
      rot = -Math.PI / 2;
    } else if (west) {
      y0 = avenue.y;
      y1 = avenue.y + avenue.h;
      x0 = x1 = street.x - gap;
      tx = x0 - word;
      ty = (y0 + y1) / 2;
      rot = Math.PI / 2;
    } else {
      x0 = street.x;
      x1 = street.x + street.w;
      y0 = y1 = avenue.y + avenue.h + gap;
      tx = (x0 + x1) / 2;
      ty = y0 + word;
      rot = 0;
    }
    const minX = Math.min(x0, x1, tx) - 20;
    const maxX = Math.max(x0, x1, tx) + 20;
    const minY = Math.min(y0, y1, ty) - 20;
    const maxY = Math.max(y0, y1, ty) + 20;
    if (maxX < camX || minX > camX + viewW || maxY < camY || minY > camY + viewH) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.94)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(x0 - camX, y0 - camY);
    ctx.lineTo(x1 - camX, y1 - camY);
    ctx.stroke();
    ctx.save();
    ctx.translate(tx - camX, ty - camY);
    ctx.rotate(rot);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(20,16,12,0.82)";
    ctx.strokeText("STOP", 0, 0);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("STOP", 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function paintPosts(ctx: CanvasRenderingContext2D, camX: number, camY: number, signs: Map<string, HTMLImageElement>, viewW: number, viewH: number) {
  for (const sign of SIGNS) {
    const x = sign.x - camX;
    const y = sign.y - camY;
    if (x < -80 || y < -140 || x > viewW + 80 || y > viewH + 40) continue;
    const img = signs.get(sign.kind);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!img?.width) continue;
    const w = 78;
    const h = w * (img.height / img.width);
    ctx.drawImage(img, x - w / 2, y - h + 8, w, h);
  }
}

function paintCar(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, heading: number, wide: number) {
  if (!img?.width) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  const h = wide * (img.height / img.width);
  ctx.drawImage(img, -wide / 2, -h / 2, wide, h);
  ctx.restore();
}

function paintSign(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, now: number) {
  const text = label.toUpperCase();
  ctx.save();
  ctx.font = "700 28px Teko, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = Math.max(78, ctx.measureText(text).width + 26);
  const h = 30;
  const glitch = Math.sin(now / 120) > 0.9 ? 2 : 0;
  ctx.fillStyle = "rgba(6,4,10,0.86)";
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = "#d6ff3f";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#ff3df2";
  ctx.strokeRect(x - w / 2 - 2, y - h / 2 + glitch, w, h);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#120014";
  ctx.strokeText(text, x + glitch, y + 1);
  ctx.fillStyle = "#ff4ad8";
  ctx.globalAlpha = 0.65;
  ctx.fillText(text, x + 2, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#eaff6a";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function paintBolt(ctx: CanvasRenderingContext2D, bolt: Bolt, camX: number, camY: number) {
  const x = bolt.x - camX;
  const y = bolt.y - camY;
  const len = 36;
  const ang = Math.atan2(bolt.vy, bolt.vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = "#d6ff3f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(8, 0);
  ctx.stroke();
  ctx.fillStyle = "#f4ffe0";
  ctx.beginPath();
  ctx.arc(8, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

type Ghost = {
  id: string;
  name: string;
  x: number;
  y: number;
  heading: number;
  tx: number;
  ty: number;
  th: number;
};

export function CityDrive({
  selfId,
  selfName,
  topSrc,
  pace,
}: {
  selfId: string;
  selfName: string;
  topSrc: string;
  pace: CityPace;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const bigRef = useRef<HTMLCanvasElement>(null);
  const mapOpenRef = useRef(false);
  const [mapOpen, setMapOpen] = useState(false);
  mapOpenRef.current = mapOpen;
  const mapView = useRef({ zoom: 5, panX: 0, panY: 0, anchorX: 7200, anchorY: 5400 });
  const doorHits = useRef<DoorHit[]>([]);
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0 });
  const stateRef = useRef<CityState>(createCity());
  const keys = useRef({ throttle: false, brake: false, left: false, right: false, beam: false });
  const beamEdge = useRef(false);
  const art = useRef<{ car: HTMLImageElement | null; spots: Map<string, HTMLImageElement>; ground: HTMLCanvasElement | null; pool: Map<string, HTMLImageElement>; signs: Map<string, HTMLImageElement> }>({
    car: null,
    spots: new Map(),
    ground: null,
    pool: new Map(),
    signs: new Map(),
  });
  const doorNow = useRef<Door | null>(null);
  const porchNow = useRef<Door | null>(null);
  const enterRef = useRef<() => void>(() => {});
  const dareRef = useRef<() => void>(() => {});
  const hitNow = useRef<string | null>(null);
  const mphNow = useRef(0);
  const boxNow = useRef({ gear: 1, rpm: 0, cut: false });
  const [door, setDoor] = useState<Door | null>(null);
  const [porch, setPorch] = useState<Door | null>(null);
  const [hit, setHit] = useState<Rider | null>(null);
  const [mph, setMph] = useState(0);
  const [box, setBox] = useState(boxNow.current);
  const [pilotOn, setPilotOn] = useState(false);
  const [online, setOnline] = useState(1);
  const [invite, setInvite] = useState<{ id: string; name: string } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const ghosts = useRef<Ghost[]>([]);
  const aimRef = useRef("");
  const liveRef = useRef("");
  const raced = useRef("");
  const ignore = useRef(new Set<string>());
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const shownOnce = useRef(false);
  const paceRef = useRef(pace);
  paceRef.current = pace;
  const wheelZoom = useRef(1);
  const viewZoom = useRef(1);
  const pilotFlag = useRef(false);
  const pilot = useRef<{ points: { x: number; y: number }[]; i: number; follow: boolean; stuck: number } | null>(null);
  const navigate = useNavigate();
  const { t } = useLocale();
  enterRef.current = () => {
    const state = stateRef.current;
    const cap = cityTopSpeed(paceRef.current.vmax, true);
    const near = nearestDoor(state.x, state.y, Math.abs(state.speed), cap);
    if (!near?.door || state.hit) return;
    const dest = DOOR_TO[near.door];
    if ("hash" in dest) void navigate({ to: dest.to, hash: dest.hash });
    else void navigate({ to: dest.to });
  };
  dareRef.current = () => {
    if (liveRef.current) return;
    const state = stateRef.current;
    let best: Rider | null = null;
    let bestD = 640;
    for (const rider of state.riders) {
      const d = Math.hypot(wrapDelta(rider.x, state.x, MAP_W), wrapDelta(rider.y, state.y, MAP_H));
      if (d < bestD) {
        best = rider;
        bestD = d;
      }
    }
    if (!best) return;
    void navigate({ to: "/pista", search: { racha: best.model || best.rival } });
  };
  const labels = useRef<Record<Door, string>>({
    garagem: "Garagem",
    loja: "Loja",
    pecas: "Peças",
    forja: "Forja",
    bar: "Bar",
    stake: "Stake",
  });
  labels.current = {
    garagem: t("city.garagem"),
    loja: t("city.loja"),
    pecas: t("city.pecas"),
    forja: t("city.forja"),
    bar: t("city.bar"),
    stake: t("city.stake"),
  };

  useEffect(() => {
    let stop = false;
    art.current.ground = dirt();
    art.current.car = null;
    const sprites = [...new Set(SPOTS.map((spot) => spot.sprite))];
    void loadImage(topSrc.includes("?") ? topSrc : `${topSrc}?v=top4`).then((img) => {
      if (stop) return;
      if (img.width) {
        art.current.car = img;
        setReady(true);
        return;
      }
      void loadImage("/game/top/vex.png?v=top4").then((fallback) => {
        if (stop) return;
        if (fallback.width) art.current.car = fallback;
        setReady(true);
      });
    });
    void Promise.all(sprites.map((src) => loadImage(src))).then((imgs) => {
      if (stop) return;
      sprites.forEach((src, index) => {
        const img = imgs[index];
        if (img?.width) art.current.spots.set(src, img);
      });
    });
    void Promise.all(TOP_MODELS.map((id) => loadImage(`/game/top/${id}.png?v=top4`))).then((imgs) => {
      if (stop) return;
      imgs.forEach((img, index) => {
        const id = TOP_MODELS[index];
        if (img?.width && id) art.current.pool.set(id, img);
      });
    });
    const kinds = [...new Set(SIGNS.map((sign) => sign.kind))];
    void Promise.all(kinds.map((kind) => loadImage(`/game/signs/${kind}.png${kind === "pare" ? "?v=stop" : ""}`))).then((imgs) => {
      if (stop) return;
      kinds.forEach((kind, index) => {
        const img = imgs[index];
        if (img?.width) art.current.signs.set(kind, img);
      });
    });
    return () => {
      stop = true;
    };
  }, [topSrc]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "w" || e.key === "ArrowUp") keys.current.throttle = true;
      if (k === "s" || e.key === "ArrowDown") keys.current.brake = true;
      if (k === "a" || e.key === "ArrowLeft") keys.current.left = true;
      if (k === "d" || e.key === "ArrowRight") keys.current.right = true;
      if (k === "f") {
        e.preventDefault();
        dareRef.current();
      }
      if (k === "m") {
        e.preventDefault();
        setMapOpen((open) => {
          if (open) return false;
          const here = stateRef.current;
          mapView.current = { zoom: 5, panX: 0, panY: 0, anchorX: here.x, anchorY: here.y };
          return true;
        });
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || e.key === "ArrowUp") keys.current.throttle = false;
      if (k === "s" || e.key === "ArrowDown") keys.current.brake = false;
      if (k === "a" || e.key === "ArrowLeft") keys.current.left = false;
      if (k === "d" || e.key === "ArrowRight") keys.current.right = false;
      if (k === "f") keys.current.beam = false;
      if (k === "e") enterRef.current();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [navigate]);

  useEffect(() => {
    if (!selfId) return;
    let stop = false;
    let timer = 0;
    const beat = async () => {
      if (stop) return;
      const state = stateRef.current;
      try {
        const res = await fetch("/api/rtc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "city",
            peer: selfId,
            name: selfName || "Piloto",
            x: state.x,
            y: state.y,
            heading: state.heading,
            speed: state.speed,
            aim: aimRef.current,
          }),
        });
        const data = (await res.json()) as {
          pilots?: { id: string; name: string; x: number; y: number; heading: number }[];
          online?: number;
          invite?: { id: string; name: string } | null;
          race?: string | null;
        };
        if (stop) return;
        const next = new Map((data.pilots ?? []).map((pilot) => [pilot.id, pilot]));
        const kept: Ghost[] = [];
        for (const ghost of ghosts.current) {
          const pilot = next.get(ghost.id);
          if (!pilot) continue;
          ghost.tx = pilot.x;
          ghost.ty = pilot.y;
          ghost.th = pilot.heading;
          ghost.name = pilot.name;
          kept.push(ghost);
          next.delete(ghost.id);
        }
        for (const pilot of next.values()) {
          kept.push({ id: pilot.id, name: pilot.name, x: pilot.x, y: pilot.y, heading: pilot.heading, tx: pilot.x, ty: pilot.y, th: pilot.heading });
        }
        ghosts.current = kept;
        setOnline(data.online ?? 1);
        const nextInvite = data.invite && !ignore.current.has(data.invite.id) ? data.invite : null;
        setInvite((current) => (current?.id === nextInvite?.id ? current : nextInvite));
        if (data.race && raced.current !== data.race) {
          raced.current = data.race;
          void navigate({ to: "/pista", search: { duel: data.race } });
        }
      } catch {
        // The next beat retries. A dropped packet must not kick the driver out.
      }
      timer = window.setTimeout(() => void beat(), 120);
    };
    void beat();
    return () => {
      stop = true;
      window.clearTimeout(timer);
      void fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "city-leave", peer: selfId }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [navigate, selfId, selfName]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      const wantBeam = keys.current.beam && !beamEdge.current;
      beamEdge.current = keys.current.beam;
      const user = keys.current;
      if (pilot.current && (user.throttle || user.brake || user.left || user.right)) pilot.current = null;
      let drive = { ...user, beam: wantBeam };
      const route = pilot.current;
      if (route) {
        while (route.i < route.points.length - 1 && Math.hypot(state.x - route.points[route.i]!.x, state.y - route.points[route.i]!.y) < 110) {
          route.i += 1;
        }
        const wp = route.points[route.i]!;
        const dx = wp.x - state.x;
        const dy = wp.y - state.y;
        const dist = Math.hypot(dx, dy);
        const last = route.i >= route.points.length - 1;
        if (last && dist < 64) {
          pilot.current = null;
          state.speed = 0;
        } else {
          let want = Math.atan2(dx, -dy);
          let diff = want - state.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const roadCap = cityTopSpeed(paceRef.current.vmax, true);
          const sharp = Math.abs(diff) > 0.85;
          const close = last && dist < 140;
          const slowing = last && dist < 420;
          drive = {
            throttle: !sharp && !(close && state.speed > roadCap * 0.22) && !(slowing && state.speed > roadCap * 0.55),
            brake: sharp || (close && state.speed > roadCap * 0.28) || (slowing && state.speed > roadCap * 0.7),
            left: diff < -0.06,
            right: diff > 0.06,
            beam: false,
          };
          if (state.speed < roadCap * 0.06 && drive.throttle) route.stuck += dt;
          else route.stuck = 0;
          if (route.stuck > 1.5) {
            route.stuck = 0;
            if (!last) route.i += 1;
            else pilot.current = null;
          }
        }
      }
      stepCity(state, drive, dt, paceRef.current);
      for (const ghost of ghosts.current) {
        const k = 1 - Math.exp(-dt * 12);
        ghost.x += (ghost.tx - ghost.x) * k;
        ghost.y += (ghost.ty - ghost.y) * k;
        let turn = ghost.th - ghost.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        ghost.heading += turn * k;
        const dx = state.x - ghost.x;
        const dy = state.y - ghost.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 64 && dist > 0.01) {
          state.x += (dx / dist) * (64 - dist);
          state.y += (dy / dist) * (64 - dist);
          state.speed *= 0.55;
        }
        if (state.bolt && Math.hypot(state.bolt.x - ghost.x, state.bolt.y - ghost.y) < 46) {
          state.bolt = null;
          liveRef.current = ghost.id;
          state.hit = {
            id: ghost.id,
            name: ghost.name,
            rival: "geck",
            model: "",
            rarity: "Normal",
            x: ghost.x,
            y: ghost.y,
            heading: ghost.heading,
            speed: 0,
            axis: "h",
            dir: 1,
            road: 0,
            hue: "#7fd7ff",
            stun: 0,
            lap: 0,
            skin: 0,
          };
        }
      }
      const roadCap = cityTopSpeed(paceRef.current.vmax, true);
      const near = nearestDoor(state.x, state.y, Math.abs(state.speed), roadCap);
      const nextDoor = near?.door ?? null;
      const nextPorch = doorSpot(state.x, state.y)?.door ?? null;
      if (doorNow.current !== nextDoor) {
        doorNow.current = nextDoor;
        setDoor(nextDoor);
      }
      if (porchNow.current !== nextPorch) {
        porchNow.current = nextPorch;
        setPorch(nextPorch);
      }
      if (state.hit && !liveRef.current) {
        const id = state.hit.model || state.hit.rival;
        state.hit = null;
        hitNow.current = null;
        setHit(null);
        if (id) void navigate({ to: "/pista", search: { racha: id } });
      }
      const nextHit = state.hit?.id ?? null;
      if (hitNow.current !== nextHit) {
        hitNow.current = nextHit;
        setHit(state.hit);
      }
      const shownMph = Math.round((paceRef.current.vmax * Math.abs(state.speed)) / Math.max(1, roadCap));
      if (shownMph !== mphNow.current) {
        mphNow.current = shownMph;
        setMph(shownMph);
      }
      const gears = Math.max(1, paceRef.current.gears ?? 5);
      const rpmBucket = Math.round(cityRpm(state.speed, state.gear || 1, gears, roadCap) * 10);
      const cut = state.shift > 0.04;
      if (boxNow.current.gear !== state.gear || boxNow.current.rpm !== rpmBucket || boxNow.current.cut !== cut) {
        boxNow.current = { gear: state.gear || 1, rpm: rpmBucket, cut };
        setBox(boxNow.current);
      }
      const driving = !!pilot.current;
      if (driving !== pilotFlag.current) {
        pilotFlag.current = driving;
        setPilotOn(driving);
      }

      const cap = cityTopSpeed(paceRef.current.vmax, onAsphalt(state.x, state.y));
      const rush = Math.min(1, state.speed / Math.max(40, cap));
      const targetZoom = (1 - rush * 0.18) * wheelZoom.current;
      viewZoom.current += (targetZoom - viewZoom.current) * (1 - Math.exp(-dt * 2.6));
      const zoom = Math.max(0.34, viewZoom.current);
      const viewW = VIEW_W / zoom;
      const viewH = VIEW_H / zoom;
      const camX = state.x - viewW / 2;
      const camY = state.y - viewH / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (art.current.ground) {
        const pat = ctx.createPattern(art.current.ground, "repeat");
        if (pat) {
          ctx.save();
          ctx.translate(-camX, -camY);
          ctx.fillStyle = pat;
          ctx.fillRect(camX - 4, camY - 4, viewW + 8, viewH + 8);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = "#12140e";
        ctx.fillRect(0, 0, viewW, viewH);
      }
      paintRoads(ctx, camX, camY, viewW, viewH);
      const shifts = loopShifts(camX, camY, viewW, viewH);
      for (const shift of shifts) {
        const cx = camX + shift.x;
        const cy = camY + shift.y;
        if (shift.x !== 0 || shift.y !== 0) paintRoads(ctx, cx, cy, viewW, viewH);
        paintStops(ctx, cx, cy, viewW, viewH);
        for (const spot of SPOTS) {
          const x = spot.x - cx;
          const top = spot.y - cy;
          if (x > viewW + 80 || x + spot.w < -80 || top > viewH + 40 || top + spot.h < -520) continue;
          const img = art.current.spots.get(spot.sprite);
          const base = spot.y + spot.h - cy;
          let drawnTop = spot.y - cy;
          if (img?.width && spot.flat) {
            ctx.drawImage(img, x, drawnTop, spot.w, spot.h);
          } else if (img?.width) {
            const maxW = spot.w * 1.25;
            const maxH = spot.h * 2.1;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            drawnTop = base - h;
            ctx.drawImage(img, x + (spot.w - w) / 2, drawnTop, w, h);
          }
          if (spot.door && img?.width) {
            paintSign(ctx, labels.current[spot.door], x + spot.w / 2, drawnTop - 22, now);
            ctx.fillStyle = "rgba(214,255,63,0.85)";
            ctx.fillRect(x + spot.w / 2 - 10, base - 6, 20, 6);
          }
        }
        paintPosts(ctx, cx, cy, art.current.signs, viewW, viewH);
        const cars = [
          ...state.riders.map((rider) => ({
            x: rider.x,
            y: rider.y,
            heading: rider.heading,
            wide: 100,
            img: art.current.pool.get(rider.model) ?? null,
            name: Math.hypot(wrapDelta(rider.x, state.x, MAP_W), wrapDelta(rider.y, state.y, MAP_H)) < 700 ? `${rider.name} · ${rider.rarity}` : "",
          })),
          ...ghosts.current.map((ghost) => ({
            x: ghost.x,
            y: ghost.y,
            heading: ghost.heading,
            wide: 100,
            img: art.current.pool.get(TOP_MODELS[ghost.name.length % TOP_MODELS.length]!) ?? art.current.car,
            name: ghost.name,
          })),
          { x: state.x, y: state.y, heading: state.heading, wide: 100, img: art.current.car, name: "" },
        ].sort((a, b) => a.y - b.y);
        for (const car of cars) {
          paintCar(ctx, car.img, car.x - cx, car.y - cy, car.heading, car.wide);
          if (car.name) paintSign(ctx, car.name, car.x - cx, car.y - cy - 58, now);
        }
        if (pilot.current) {
          const goal = pilot.current.points[pilot.current.points.length - 1]!;
          ctx.save();
          ctx.strokeStyle = "#d6ff3f";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(goal.x - cx, goal.y - cy, 26 + Math.sin(now / 180) * 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if (state.bolt) paintBolt(ctx, state.bolt, cx, cy);
      }
      const carImg = art.current.car;
      const carH = carImg?.width ? 100 * (carImg.height / carImg.width) : 160;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      paintMe(ctx, VIEW_W / 2, VIEW_H / 2 - (carH / 2) * zoom - 8);
      ctx.restore();

      const mini = miniRef.current?.getContext("2d");
      const radarX = Math.max(0, Math.min(MAP_W - viewW, state.x - viewW / 2));
      const radarY = Math.max(0, Math.min(MAP_H - viewH, state.y - viewH / 2));
      if (mini && miniRef.current) paintRadar(mini, miniRef.current.width, miniRef.current.height, state, radarX, radarY, labels.current, false, ghosts.current, viewW, viewH);
      if (mapOpenRef.current && pilot.current?.follow && !drag.current.on) {
        const view = mapView.current;
        const glide = 1 - Math.exp(-dt * 1.7);
        view.anchorX += (state.x - view.anchorX) * glide;
        view.anchorY += (state.y - view.anchorY) * glide;
        view.panX += (0 - view.panX) * glide;
        view.panY += (0 - view.panY) * glide;
      }
      if (mapOpenRef.current) {
        const big = bigRef.current?.getContext("2d");
        if (big && bigRef.current) {
          paintDiorama(
            big,
            bigRef.current.width,
            bigRef.current.height,
            state,
            labels.current,
            ghosts.current,
            art.current.spots,
            art.current.car,
            mapView.current,
            now,
            doorHits.current,
          );
        }
      }
      if (!shownOnce.current) {
        shownOnce.current = true;
        setShown(true);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const hold = (key: "throttle" | "brake" | "left" | "right" | "beam", on: boolean) => {
    keys.current[key] = on;
  };

  const openWorld = () => {
    const here = stateRef.current;
    mapView.current = { zoom: 5, panX: 0, panY: 0, anchorX: here.x, anchorY: here.y };
    setMapOpen(true);
  };

  const mapPoint = (event: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number }) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  useEffect(() => {
    const canvas = bigRef.current;
    if (!mapOpen || !canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
      const view = mapView.current;
      const next = Math.min(8, Math.max(0.85, view.zoom * (event.deltaY > 0 ? 0.9 : 1.12)));
      const oldS = mapFit(canvas.width, canvas.height) * view.zoom;
      const newS = mapFit(canvas.width, canvas.height) * next;
      const relX = (px - canvas.width / 2 - view.panX) / oldS;
      const relY = (py - canvas.height / 2 - view.panY) / oldS;
      view.panX = px - canvas.width / 2 - relX * newS;
      view.panY = py - canvas.height / 2 - relY * newS;
      view.zoom = next;
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [mapOpen]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (mapOpenRef.current) return;
      event.preventDefault();
      const next = wheelZoom.current * (event.deltaY > 0 ? 0.9 : 1.1);
      wheelZoom.current = Math.min(1.55, Math.max(0.42, next));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-fg">
      {!shown && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black">
          <p className="font-display text-6xl leading-none text-primary">{t("dash.mode2")}</p>
        </div>
      )}
      <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className={`absolute inset-0 h-full w-full object-contain ${shown ? "" : "invisible"}`} aria-label={t("dash.mode2")} />
      {shown && (
        <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <Link
          to="/dashboard"
          className="pointer-events-auto inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink shadow-[3px_3px_0_#6d8a14]"
        >
          {t("city.back")}
        </Link>
        <div className="bg-black/75 px-3 py-2 text-right shadow-[0_0_18px_rgba(214,255,63,0.18)]">
          <p className="font-display text-3xl leading-none text-primary">{t("dash.mode2")}</p>
          <p className={`font-pixel text-sm tracking-widest ${box.cut ? "text-[#f7c948]" : "text-fg"}`}>
            {box.gear}ª · {mph} mph
          </p>
          <div className="ml-auto mt-1 h-1.5 w-28 bg-white/15" aria-hidden>
            <div className={`h-full ${box.cut ? "bg-[#f7c948]" : "bg-primary"}`} style={{ width: `${box.rpm * 10}%` }} />
          </div>
          <p className="font-pixel text-sm tracking-widest text-primary">{t("city.online", { n: online })}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={openWorld}
        className="absolute bottom-24 left-3 z-20 border border-primary/70 bg-black/80 p-1 shadow-[0_0_16px_rgba(214,255,63,0.22)] sm:bottom-4"
        aria-label={t("city.map")}
      >
        <canvas ref={miniRef} width={280} height={210} className="block h-[104px] w-[140px] sm:h-[132px] sm:w-[176px]" />
        <span className="pointer-events-none absolute left-2 top-1 font-pixel text-[11px] tracking-[0.28em] text-primary">{t("city.map")}</span>
      </button>
      {mapOpen && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/80 p-4" onClick={() => setMapOpen(false)}>
          <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-4xl leading-none text-primary sm:text-5xl">{t("city.world")}</p>
                <p className="mt-1 font-pixel text-[11px] tracking-widest text-primary/80">{t("city.mapHint")}</p>
              </div>
              <button type="button" onClick={() => setMapOpen(false)} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                {t("city.close")}
              </button>
            </div>
            <canvas
              ref={bigRef}
              width={1440}
              height={900}
              className="block h-[72vh] w-full cursor-grab touch-none border border-primary/80 bg-black shadow-[0_0_28px_rgba(214,255,63,0.2)] active:cursor-grabbing"
              onPointerDown={(event) => {
                const point = mapPoint(event);
                drag.current = { on: true, x: point.x, y: point.y, moved: 0 };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current.on) return;
                const point = mapPoint(event);
                mapView.current.panX += point.x - drag.current.x;
                mapView.current.panY += point.y - drag.current.y;
                drag.current.moved += Math.abs(point.x - drag.current.x) + Math.abs(point.y - drag.current.y);
                drag.current.x = point.x;
                drag.current.y = point.y;
                if (drag.current.moved > 8 && pilot.current) pilot.current.follow = false;
              }}
              onPointerUp={(event) => {
                const moved = drag.current.moved;
                drag.current.on = false;
                if (moved > 8) return;
                const point = mapPoint(event);
                const hit = [...doorHits.current]
                  .reverse()
                  .find((item) => point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);
                const world = hit ? { x: hit.wx, y: hit.wy } : mapWorld(point.x, point.y, event.currentTarget.width, event.currentTarget.height, mapView.current);
                if (!world) return;
                const here = stateRef.current;
                here.hit = null;
                pilot.current = { points: planCityRoute(here.x, here.y, world.x, world.y), i: 0, follow: true, stuck: 0 };
              }}
            />
          </div>
        </div>
      )}
      <p className="pointer-events-none absolute inset-x-0 bottom-28 text-center font-pixel text-xs tracking-widest text-primary sm:bottom-4 sm:left-56">{t("city.hint")}</p>
      <div className="absolute bottom-3 left-3 z-20 grid touch-none grid-cols-3 gap-1 sm:hidden">
        <span />
        <button type="button" className="grid h-14 w-14 place-items-center bg-black/80 font-display text-2xl text-primary" onPointerDown={() => { keys.current.throttle = true; }} onPointerUp={() => { keys.current.throttle = false; }} onPointerCancel={() => { keys.current.throttle = false; }}>W</button>
        <span />
        <button type="button" className="grid h-14 w-14 place-items-center bg-black/80 font-display text-2xl text-primary" onPointerDown={() => { keys.current.left = true; }} onPointerUp={() => { keys.current.left = false; }} onPointerCancel={() => { keys.current.left = false; }}>A</button>
        <button type="button" className="grid h-14 w-14 place-items-center bg-black/80 font-display text-2xl text-primary" onPointerDown={() => { keys.current.brake = true; }} onPointerUp={() => { keys.current.brake = false; }} onPointerCancel={() => { keys.current.brake = false; }}>S</button>
        <button type="button" className="grid h-14 w-14 place-items-center bg-black/80 font-display text-2xl text-primary" onPointerDown={() => { keys.current.right = true; }} onPointerUp={() => { keys.current.right = false; }} onPointerCancel={() => { keys.current.right = false; }}>D</button>
      </div>
      <button type="button" className="absolute right-3 bottom-3 z-20 min-h-14 bg-primary px-4 font-display text-3xl leading-none text-ink sm:hidden" onClick={() => dareRef.current()}>F</button>
      {pilotOn && (
        <p className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 bg-black/75 px-4 py-2 font-display text-3xl text-primary">{t("city.pilot")}</p>
      )}
      {porch && !hit && (
        <button
          type="button"
          onClick={() => enterRef.current()}
          className="absolute left-1/2 top-[18%] z-20 min-h-11 -translate-x-1/2 bg-black/80 px-4 font-display text-3xl text-primary"
        >
          {door ? t("city.near", { name: t(DOOR_KEY[porch]) }) : `Freia · ${t(DOOR_KEY[porch])}`}
        </button>
      )}
      {hit && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md border border-primary bg-bg p-5 text-center">
            <p className="font-display text-5xl leading-none text-primary">
              {waiting ? t("city.wait", { name: hit.name }) : t("city.challenge", { name: hit.name })}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {!waiting && (
                <button
                  type="button"
                  className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink"
                  onClick={() => {
                    if (liveRef.current) {
                      aimRef.current = liveRef.current;
                      setWaiting(true);
                      return;
                    }
                    void navigate({ to: "/pista", search: { racha: hit.rival } });
                  }}
                >
                  {t("city.yes")}
                </button>
              )}
              <button
                type="button"
                className="min-h-11 border border-border px-4 font-display text-3xl leading-none"
                onClick={() => {
                  stateRef.current.hit = null;
                  liveRef.current = "";
                  aimRef.current = "";
                  setWaiting(false);
                  setHit(null);
                }}
              >
                {t("city.no")}
              </button>
            </div>
          </div>
        </div>
      )}
      {invite && !hit && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md border border-primary bg-bg p-5 text-center">
            <p className="font-display text-5xl leading-none text-primary">{t("city.called", { name: invite.name })}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink"
                onClick={() => {
                  aimRef.current = invite.id;
                }}
              >
                {t("city.yes")}
              </button>
              <button
                type="button"
                className="min-h-11 border border-border px-4 font-display text-3xl leading-none"
                onClick={() => {
                  if (invite) ignore.current.add(invite.id);
                  setInvite(null);
                }}
              >
                {t("city.no")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-3 flex items-end justify-between px-3 sm:hidden">
        <div className="grid grid-cols-3 gap-1">
          <span />
          <Pad label="W" on={hold} k="throttle" />
          <span />
          <Pad label="A" on={hold} k="left" />
          <Pad label="S" on={hold} k="brake" />
          <Pad label="D" on={hold} k="right" />
        </div>
        <button
          type="button"
          className="min-h-14 min-w-14 border border-primary bg-black/80 font-display text-2xl text-primary"
          onPointerDown={() => hold("beam", true)}
          onPointerUp={() => hold("beam", false)}
          onPointerLeave={() => hold("beam", false)}
        >
          F
        </button>
      </div>
        </>
      )}
    </main>
  );
}

function Pad({ label, k, on }: { label: string; k: "throttle" | "brake" | "left" | "right"; on: (key: "throttle" | "brake" | "left" | "right" | "beam", down: boolean) => void }) {
  return (
    <button
      type="button"
      className="min-h-12 min-w-12 border border-white/20 bg-black/80 font-display text-xl text-primary"
      onPointerDown={() => on(k, true)}
      onPointerUp={() => on(k, false)}
      onPointerLeave={() => on(k, false)}
    >
      {label}
    </button>
  );
}
