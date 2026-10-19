import versionInfo from "../../public/version.json";
import { COMBAT, HUD_CHASE } from "./combat";
import { sheetFrame, type RaceArt } from "./raceArt";
import { HUD, RACE_CONFIG, SHIFT_LAMP, type RaceBadge } from "./raceConfig";
import { mph, REDLINE, shiftCall, shiftWord, type Match } from "./sim";

type Air = { x: number; y: number; sp: number };

const RANKS: Record<RaceBadge, keyof RaceArt> = {
  ovo: "ovo",
  filhote: "filhote",
  raptor: "raptor",
  rex: "rex",
  alfa: "alfa",
};

function tile(ctx: CanvasRenderingContext2D, img: HTMLImageElement, y: number, h: number, scroll: number, viewW: number) {
  if (!img.width || !img.height) return;
  const w = h * (img.width / img.height);
  if (w < 8) return;
  let x = -(((scroll % w) + w) % w);
  ctx.imageSmoothingEnabled = false;
  for (; x < viewW; x += w) ctx.drawImage(img, x, y, w, h);
}

export function paintParallax(
  ctx: CanvasRenderingContext2D,
  race: RaceArt,
  dist: number,
  yaw: number,
  viewW: number,
  horizon: number,
) {
  ctx.save();
  const k = 90;
  const skyH = Math.max(80, horizon * 0.72);
  tile(ctx, race.longe, horizon - skyH, skyH, dist * 0.03 * k + yaw * 18, viewW);
  const midH = Math.max(64, horizon * 0.48);
  tile(ctx, race.perto, horizon - midH * 0.62, midH, dist * 0.1 * k + yaw * 36, viewW);
  const boneY = horizon - 36;
  const span = 64;
  const scroll = dist * 0.35 * k + yaw * 70;
  ctx.fillStyle = "#3a2a22";
  for (let i = -1; i < 24; i++) {
    const x = ((i * span - (scroll % span)) % (viewW + span) + viewW + span) % (viewW + span) - 20;
    const h = 18 + ((i * 17) % 22);
    ctx.fillRect(x, boneY - h, 6, h);
    ctx.fillRect(x - 4, boneY - h, 14, 3);
  }
  ctx.restore();
}

export function paintBeira(
  ctx: CanvasRenderingContext2D,
  race: RaceArt,
  dist: number,
  viewW: number,
  horizon: number,
  viewH: number,
) {
  if (!race.beira.width) return;
  const h = Math.min(150, (viewH - horizon) * 0.28);
  ctx.save();
  tile(ctx, race.beira, horizon - 8, h, dist * 1 * 90, viewW);
  ctx.restore();
}

function blit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, h: number) {
  if (!img?.width || !img.height) return;
  const w = h * (img.width / img.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

export function paintRaceWorld(
  ctx: CanvasRenderingContext2D,
  m: Match,
  race: RaceArt,
  now: number,
  dist: number,
  airAt: (ahead: number, lane: number) => Air,
) {
  for (const hazard of m.hazards) {
    const gap = hazard.dist - dist;
    if (gap < -6 || gap > 110) continue;
    const p = airAt(Math.max(1.4, gap), hazard.lane);
    const img = hazard.kind === "piche" ? race.piche : race.ossada;
    const h = Math.max(18, p.sp * (hazard.kind === "piche" ? 70 : 90));
    ctx.save();
    ctx.globalAlpha = gap > 90 ? Math.max(0, 1 - (gap - 90) / 20) : 1;
    blit(ctx, img, p.x, p.y, h);
    ctx.restore();
  }

  for (const box of m.crates) {
    if (box.taken) continue;
    const gap = box.dist - dist;
    if (gap < -8 || gap > 100) continue;
    const p = airAt(Math.max(1.6, gap), box.lane);
    const img = box.kind === "nitro" ? race.caixaNitro : box.kind === "repair" ? race.caixaReparo : race.caixaMuni;
    blit(ctx, img, p.x, p.y - 6, Math.max(22, p.sp * 78));
  }

  for (const shot of m.shots) {
    if (!shot.live) continue;
    if (shot.weapon === "mine") {
      const gap = shot.dist - dist;
      if (gap < -40 || gap > RACE_CONFIG.mine.see) continue;
      const p = airAt(gap, shot.lane);
      const h = Math.max(42, p.sp * 90);
      blit(ctx, race.minaOsso, p.x, p.y, h);
      const near = gap < RACE_CONFIG.mine.warn && gap > -2;
      const blink = near ? 5 : 2;
      if (shot.arm <= 0 && Math.sin(now * blink * Math.PI * 2) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        blit(ctx, race.minaLuz, p.x, p.y, h);
        ctx.restore();
      }
      continue;
    }
    if (shot.weapon === "mg" || shot.label === "OSSADA") {
      const ahead = shot.dist - dist;
      if (ahead < -30 || ahead > 90) continue;
      const p = airAt(Math.max(0.6, ahead), shot.lane);
      ctx.save();
      ctx.fillStyle = "#efe6d2";
      ctx.fillRect(p.x - 7, p.y - 3, 14, 6);
      ctx.fillStyle = "#d6ff3f";
      ctx.font = "700 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("OSSADA", p.x, p.y - 12);
      ctx.restore();
      continue;
    }
    if (shot.weapon !== "missile" && shot.weapon !== "homing") continue;
    const ahead = shot.dist - dist;
    if (ahead < -8 || ahead > 150) continue;
    const p = airAt(Math.max(0.8, ahead), shot.lane);
    const img = shot.back ? race.missilTras : race.missilFrente;
    const h = Math.max(48, Math.min(96, p.sp * 110));
    ctx.save();
    ctx.globalAlpha = ahead > 120 ? Math.max(0, 1 - (ahead - 120) / 30) : 1;
    blit(ctx, img, p.x, p.y, h);
    ctx.restore();
  }

  for (const hit of m.impacts) {
    const p = airAt(hit.dist - dist, hit.lane);
    const sheet = hit.weapon === "mine" ? race.minaBoom : race.impacto;
    if (!sheet.width) continue;
    const frame = Math.min(3, Math.floor((1 - hit.life / hit.max) * 4));
    const { sx, sy, sw, sh } = sheetFrame(sheet, frame, 4);
    const h = Math.max(36, p.sp * 120);
    const w = h;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, sx, sy, sw, sh, p.x - w / 2, p.y - h / 2, w, h);
    ctx.restore();
  }

  const smokeOf = (who: { hp: number; hpMax: number; dist: number; lane: number } | null, ahead: number) => {
    if (!who || who.hpMax <= 0) return;
    const frac = who.hp / who.hpMax;
    if (frac >= 0.5) return;
    const p = airAt(Math.max(1.2, ahead), who.lane);
    const frame = Math.floor(now * (frac < 0.25 ? 10 : 6)) % 4;
    const { sx, sy, sw, sh } = sheetFrame(race.fumaca, frame, 4);
    const h = Math.max(20, p.sp * (frac < 0.25 ? 90 : 60));
    ctx.save();
    ctx.globalAlpha = frac < 0.25 ? 0.9 : 0.65;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(race.fumaca, sx, sy, sw, sh, p.x - h / 2, p.y - h * 0.8, h, h);
    ctx.restore();
  };
  if (m.rival) smokeOf(m.rival, m.rival.dist - dist);
  if (m.player.hp / m.player.hpMax < 0.5) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    const frame = Math.floor(now * 8) % 4;
    const { sx, sy, sw, sh } = sheetFrame(race.fumaca, frame, 4);
    ctx.drawImage(race.fumaca, sx, sy, sw, sh, 1280 * 0.5 - 48, 720 * 0.78, 96, 96);
    ctx.restore();
  }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, max: number, ghost: number) {
  const frac = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const g = max > 0 ? Math.max(frac, Math.min(1, ghost / max)) : frac;
  ctx.fillStyle = "rgba(7,10,8,0.88)";
  ctx.fillRect(x, y, w, 18);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 2, y + 2, (w - 4) * g, 14);
  ctx.fillStyle = frac > 0.5 ? "#d6ff3f" : frac > 0.25 ? "#ffb020" : "#ff3b1f";
  ctx.fillRect(x + 2, y + 2, (w - 4) * frac, 14);
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frac: number) {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 4;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (frac <= 0) return;
  ctx.beginPath();
  ctx.strokeStyle = "#ffb020";
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
}

export function paintRaceHud(ctx: CanvasRenderingContext2D, m: Match, race: RaceArt, now: number) {
  paintVersion(ctx);
  const W = 1280;
  const hp = HUD.hp!;
  const rivalBox = HUD.hpRival!;
  bar(ctx, hp.x, hp.y, hp.w, m.player.hp, m.player.hpMax, m.player.hpGhost);
  ctx.fillStyle = "#efe6d2";
  ctx.font = "600 14px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.round(m.player.hp)}`, hp.x + 8, hp.y + 14);
  if (m.rival) {
    bar(ctx, rivalBox.x, rivalBox.y, rivalBox.w, m.rival.hp, m.rival.hpMax, m.rival.hpGhost);
    ctx.textAlign = "right";
    ctx.fillText(m.rival.wrecked ? "DNF" : `${Math.round(m.rival.hp)}`, rivalBox.x + rivalBox.w - 8, rivalBox.y + 14);
    const tag = m.ghost ? "FANTASMA" : m.rival.bot?.level === "dificil" ? "DIFICIL" : m.rival.bot?.level === "medio" ? "MEDIO" : m.rival.bot?.level === "facil" ? "FACIL" : "";
    if (tag) {
      ctx.textAlign = "right";
      ctx.font = "600 14px ui-monospace, monospace";
      ctx.fillStyle = "#efe6d2";
      ctx.fillText(tag, rivalBox.x + rivalBox.w, rivalBox.y + rivalBox.h + 16);
    }
    const badge = race[RANKS[m.badge]];
    if (badge?.width) ctx.drawImage(badge, rivalBox.x - 36, rivalBox.y - 6, 32, 32);
  }

  const prog = HUD.progress!;
  const left = Math.max(0, m.strip - m.player.dist);
  const youF = Math.max(0, Math.min(1, m.player.dist / m.strip));
  const foeF = m.rival ? Math.max(0, Math.min(1, m.rival.dist / m.strip)) : 0;
  ctx.fillStyle = "rgba(7,10,8,0.75)";
  ctx.fillRect(prog.x, prog.y, prog.w, prog.h);
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(prog.x + 2, prog.y + 6, (prog.w - 4) * youF, 4);
  if (m.rival) {
    ctx.fillStyle = "#ffb020";
    ctx.fillRect(prog.x + (prog.w - 4) * foeF, prog.y + 2, 4, 12);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#141806";
  ctx.font = "700 12px ui-monospace, monospace";
  ctx.fillText(`${Math.max(0, Math.round(left))} M`, prog.x + prog.w / 2, prog.y + 13);

  const box = HUD.tacho!;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dia = Math.min(box.w, box.h);
  if (race.taco.width) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(race.taco, cx - dia / 2, cy - dia / 2, dia, dia);
  }
  const n = Math.max(0, Math.min(1, m.player.rpm / REDLINE));
  const a0 = Math.PI * 0.78;
  const a1 = Math.PI * 2.22;
  const pre = !m.player.launched && m.mode === "duel";
  const gear = Math.max(1, m.player.gear);
  const row = RACE_CONFIG.shift[Math.min(RACE_CONFIG.shift.length - 1, gear - 1)] ?? RACE_CONFIG.shift[0];
  const lo = pre ? RACE_CONFIG.launch.green[0] / REDLINE : row.lo / REDLINE;
  const hi = pre ? RACE_CONFIG.launch.green[1] / REDLINE : row.hi / REDLINE;
  const pLo = pre ? RACE_CONFIG.launch.perfect[0] / REDLINE : row.pLo / REDLINE;
  const pHi = pre ? RACE_CONFIG.launch.perfect[1] / REDLINE : row.pHi / REDLINE;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.strokeStyle = "#3f8f3a";
  ctx.arc(cx, cy, 78, a0 + (a1 - a0) * lo, a0 + (a1 - a0) * hi);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = "#e6c15a";
  ctx.lineWidth = 5;
  ctx.arc(cx, cy, 70, a0 + (a1 - a0) * pLo, a0 + (a1 - a0) * pHi);
  ctx.stroke();
  const ang = a0 + (a1 - a0) * n;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = n > 0.98 ? "#ff3b1f" : "#efe6d2";
  ctx.fillRect(16, -3, 70, 6);
  ctx.restore();
  ctx.fillStyle = "#141806";
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#efe6d2";
  ctx.font = "700 42px ui-monospace, monospace";
  ctx.fillText(String(m.player.gear), cx, cy + 8);
  ctx.font = "700 18px ui-monospace, monospace";
  ctx.fillText(String(Math.round(mph(m.player.speed))), cx, cy + 32);
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.fillStyle = "#9aa18c";
  ctx.fillText("MPH", cx, cy + 46);

  const lights = 5;
  const span = n < lo ? 0 : n > hi ? 5 : ((n - lo) / Math.max(0.001, hi - lo)) * 5;
  const perfect = n >= pLo && n <= pHi;
  const leds = HUD.leds!;
  for (let i = 0; i < lights; i++) {
    const on = span > i;
    const x = leds.x + i * (leds.w / lights);
    ctx.fillStyle = !on ? "#1c2214" : perfect ? (Math.floor(now * 10) % 2 === 0 ? "#7fd7ff" : "#d6ff3f") : i < 2 ? "#3f8f3a" : i < 4 ? "#e6c15a" : "#7fd7ff";
    ctx.fillRect(x, leds.y, 22, leds.h - 4);
  }

  if (m.note && m.noteT > 0) {
    const noteBox = HUD.note!;
    ctx.font = "700 22px ui-monospace, monospace";
    ctx.fillStyle = m.note === "QUEIMOU" || m.note === "ENGASGOU" ? "#ffb020" : "#efe6d2";
    ctx.textAlign = "center";
    ctx.fillText(m.note, noteBox.x + noteBox.w / 2, noteBox.y + 22);
  }

  const charges = Math.max(0, Math.round(m.player.nitroLeft / RACE_CONFIG.nitro.burn));
  const nitro = HUD.nitro!;
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < charges ? (m.player.nitroOn > 0 ? "#7fd7ff" : "#d6ff3f") : "#1c2214";
    ctx.fillRect(nitro.x, nitro.y + nitro.h - 22 - i * 28, nitro.w, 22);
  }

  const widget = (x: number, y: number, ammo: number, ammoMax: number, cool: number, cd: number, blocked: boolean) => {
    ctx.save();
    if (blocked) ctx.translate((Math.sin(now * 40) * 3), 0);
    ctx.fillStyle = "rgba(7,10,8,0.8)";
    ctx.fillRect(x, y, 64, 64);
    const pips = Math.min(8, ammoMax);
    for (let i = 0; i < pips; i++) {
      ctx.fillStyle = i < Math.min(pips, ammo) ? "#d6ff3f" : "#2a261c";
      ctx.fillRect(x + 4 + (i % 4) * 14, y + 68 + Math.floor(i / 4) * 8, 10, 5);
    }
    ring(ctx, x + 32, y + 32, 28, cool > 0 ? cool / cd : 0);
    if (blocked && race.bloqueado.width) ctx.drawImage(race.bloqueado, x, y, 64, 64);
    ctx.restore();
  };
  const frontCd = m.player.weapon === "missile" || m.player.weapon === "homing" ? RACE_CONFIG.missile.cd : Math.max(0.2, m.player.load.cooldown);
  const rearCd = m.player.rear === "mine" ? RACE_CONFIG.mine.cd : Math.max(0.2, m.player.rearLoad.cooldown);
  widget(HUD.front!.x, HUD.front!.y, m.player.ammo, Math.min(8, m.player.ammoMax), m.player.cool, frontCd, m.blockFront > 0);
  widget(HUD.rear!.x, HUD.rear!.y, m.player.rearAmmo, Math.min(8, m.player.rearAmmoMax), m.player.rearCool, rearCd, m.blockRear > 0);

  const alerts = HUD.alerts!;
  let ax = alerts.x;
  const ay = alerts.y;
  const icons: HTMLImageElement[] = [];
  if (m.alertMissile > 0) icons.push(race.alertaMissil);
  if (m.alertMine > 0) icons.push(race.alertaMina);
  if (m.player.draft > 0.2) icons.push(race.alertaVacuo);
  for (const icon of icons) {
    if (!icon.width) continue;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(now * 10) * 0.45;
    ctx.drawImage(icon, ax, ay, 48, 48);
    ctx.restore();
    ax += 52;
  }

  if (m.aim > 0.02 && m.rival && m.rival.dist > m.player.dist) {
    const aim = HUD.aim!;
    const k = m.aimLock ? 1 : m.aim;
    const frame = k > 0.98 ? 1 : 0;
    const { sx, sy, sw, sh } = sheetFrame(race.mira, frame, 2);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.imageSmoothingEnabled = false;
    const y = Math.min(aim.y, 520 - aim.h);
    ctx.drawImage(race.mira, sx, sy, sw, sh, aim.x, y, aim.w, aim.h);
    ctx.restore();
  }
}

export function paintRadar(ctx: CanvasRenderingContext2D, m: Match) {
  const b = HUD_CHASE.radar!;
  const front = COMBAT.radar.frenteM;
  const back = COMBAT.radar.trasM;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "rgba(214,255,63,0.35)";
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  const yOf = (delta: number) => b.y + ((front - delta) / (front + back)) * b.h;
  const xOf = (lane: number) => b.x + 10 + (lane < -1 ? 0 : lane > 1 ? 2 : 1) * 14;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(b.x + 4, yOf(0));
  ctx.lineTo(b.x + b.w - 4, yOf(0));
  ctx.stroke();
  const you = yOf(0);
  ctx.fillStyle = "#efe6d2";
  ctx.beginPath();
  ctx.moveTo(xOf(m.player.lane), you - 6);
  ctx.lineTo(xOf(m.player.lane) - 5, you + 5);
  ctx.lineTo(xOf(m.player.lane) + 5, you + 5);
  ctx.closePath();
  ctx.fill();
  if (m.rival) {
    const dy = m.rival.dist - m.player.dist;
    if (dy < front && dy > -back) {
      ctx.fillStyle = "#ffb020";
      const x = xOf(m.rival.lane);
      const y = yOf(dy);
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const shot of m.shots) {
    if (!shot.live) continue;
    const dy = shot.dist - m.player.dist;
    if (dy > front || dy < -back) continue;
    const x = xOf(shot.lane);
    const y = yOf(dy);
    if (shot.kind === "mina") {
      ctx.fillStyle = Math.sin(m.raceTime * 10) > 0 ? "#ff3b1f" : "#7a1408";
      ctx.fillRect(x - 3, y - 3, 6, 6);
    } else if (shot.kind === "rastro") {
      ctx.fillStyle = "#b14cff";
      ctx.fillRect(x - 2, y - 8, 4, 16);
    } else if (shot.kind === "missil" || shot.kind === "emp" || shot.kind === "tiroTras") {
      ctx.fillStyle = shot.sure ? "#ff2a2a" : "#ff8a1f";
      ctx.fillRect(x - 2, y - 5, 4, 8);
    }
  }
  ctx.restore();
}

function launchCoach(rpm: number): { say: string; color: string } {
  const [lo, hi] = RACE_CONFIG.launch.green;
  const [pLo, pHi] = RACE_CONFIG.launch.perfect;
  if (rpm > hi) return { say: "GIRO ALTO — SOLTA O W", color: "#ff3b1f" };
  if (rpm >= pLo && rpm <= pHi) return { say: "GIRO CERTO — SOLTA O ESPAÇO", color: "#d6ff3f" };
  if (rpm >= lo) return { say: "GIRO BOM — SOLTA NO VAI", color: "#e6c15a" };
  return { say: "W — SOBE ATÉ O VERDE", color: "#efe6d2" };
}

function paintVersion(ctx: CanvasRenderingContext2D) {
  const label = versionInfo.version;
  ctx.save();
  ctx.font = "600 14px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const w = ctx.measureText(label).width + 12;
  ctx.fillStyle = "rgba(7,10,8,0.82)";
  ctx.fillRect(12, 96, w, 20);
  ctx.fillStyle = "#efe6d2";
  ctx.fillText(label, 18, 99);
  ctx.restore();
}

export function paintChaseHud(ctx: CanvasRenderingContext2D, m: Match, now: number) {
  paintVersion(ctx);
  const hp = HUD_CHASE.hp!;
  const foe = HUD_CHASE.hpRival!;
  ctx.save();
  ctx.fillStyle = "rgba(7,10,8,0.8)";
  ctx.fillRect(hp.x, hp.y, hp.w, hp.h);
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(hp.x, hp.y, hp.w * Math.max(0, m.player.hp / Math.max(1, m.player.hpMax)), hp.h);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(hp.x, hp.y, hp.w * Math.max(0, m.player.hpGhost / Math.max(1, m.player.hpMax)), 3);
  ctx.fillStyle = "#efe6d2";
  ctx.font = "700 14px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(String(Math.round(m.player.hp)), hp.x + 6, hp.y + 14);
  if (m.rival) {
    ctx.fillStyle = "rgba(7,10,8,0.8)";
    ctx.fillRect(foe.x, foe.y, foe.w, foe.h);
    ctx.fillStyle = "#ff8a1f";
    ctx.fillRect(foe.x, foe.y, foe.w * Math.max(0, m.rival.hp / Math.max(1, m.rival.hpMax)), foe.h);
    ctx.textAlign = "right";
    ctx.fillStyle = "#efe6d2";
    const lvl = m.ghost ? "FANTASMA" : m.pvp ? "PvP" : m.rival.bot?.level === "dificil" ? "DIFÍCIL" : m.rival.bot?.level === "medio" ? "MÉDIO" : "FÁCIL";
    ctx.fillText(`${m.rival.wrecked ? "DNF" : Math.round(m.rival.hp)} ${lvl}`, foe.x + foe.w - 4, foe.y + 14);
  }
  const prog = HUD_CHASE.progress!;
  ctx.fillStyle = "rgba(7,10,8,0.75)";
  ctx.fillRect(prog.x, prog.y, prog.w, prog.h);
  ctx.fillStyle = "#d6ff3f";
  ctx.fillRect(prog.x, prog.y + 6, prog.w * Math.max(0, Math.min(1, m.player.dist / m.strip)), 4);
  const feed = HUD_CHASE.feed!;
  ctx.textAlign = "center";
  ctx.font = "700 16px ui-monospace, monospace";
  m.feed.slice(0, 2).forEach((row, i) => {
    ctx.globalAlpha = Math.max(0.3, Math.min(1, row.life));
    ctx.fillStyle = "#efe6d2";
    ctx.fillText(row.text, feed.x + feed.w / 2, feed.y + 16 + i * 16);
  });
  ctx.globalAlpha = 1;
  if (m.banner) {
    const slot = HUD_CHASE.banner!;
    const big = ["3", "2", "1", "VAI", "QUEIMOU", "QUEBRADO"].includes(m.banner);
    ctx.fillStyle = m.banner === "QUEIMOU" || m.banner === "QUEBRADO" ? "#ff3b1f" : "#d6ff3f";
    ctx.font = big ? "900 84px ui-monospace, monospace" : "900 22px ui-monospace, monospace";
    ctx.fillText(m.banner, big ? 640 : slot.x + slot.w / 2, big ? 220 : slot.y + 24);
  }
  if (m.mode === "duel" && !m.player.launched && m.phase !== "finish") {
    const y0 = 250;
    for (let i = 0; i < 3; i++) {
      const on = m.phase === "race" || (m.phase === "tree" && m.t >= i + 0.05);
      const green = m.phase === "race";
      ctx.fillStyle = on ? (green ? "#d6ff3f" : i === 2 ? "#ffb020" : "#ff3b1f") : "#1a140c";
      ctx.beginPath();
      ctx.arc(560 + i * 80, y0, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    const coach = launchCoach(m.player.rpm);
    const [loRpm, hiRpm] = RACE_CONFIG.launch.green;
    const line =
      m.phase === "race"
        ? m.player.rpm > hiRpm
          ? "GIRO ALTO — SOLTA O W"
          : m.player.rpm < loRpm
            ? "W — SOBE ATÉ O VERDE"
            : "SOLTA O ESPAÇO AGORA"
        : coach.say;
    ctx.font = "900 22px ui-monospace, monospace";
    ctx.fillStyle = m.phase === "race" && m.player.rpm >= loRpm && m.player.rpm <= hiRpm ? "#d6ff3f" : coach.color;
    ctx.fillText(line, 640, y0 + 64);
  }
  const w = HUD_CHASE.weapons!;
  ctx.textAlign = "left";
  ctx.font = "700 13px ui-monospace, monospace";
  ctx.fillStyle = "#efe6d2";
  ctx.fillText(`F ${m.player.ammo}`, w.x, w.y + 16);
  ctx.fillText(`G ${m.player.rearAmmo}`, w.x + 70, w.y + 16);
  ctx.fillText("CALOR", w.x, w.y + 36);
  ctx.fillStyle = "#24160f";
  ctx.fillRect(w.x + 52, w.y + 26, 120, 8);
  ctx.fillStyle = m.player.heatLock > 0 ? "#ff3b1f" : "#ffb020";
  ctx.fillRect(w.x + 52, w.y + 26, 120 * Math.max(0, Math.min(1, m.player.heat / 100)), 8);
  ctx.fillStyle = "#efe6d2";
  ctx.fillText("CARGA", w.x, w.y + 56);
  ctx.fillStyle = "#24160f";
  ctx.fillRect(w.x + 52, w.y + 46, 120, 8);
  ctx.fillStyle = "#d4ff3a";
  ctx.fillRect(w.x + 52, w.y + 46, 120 * Math.max(0, Math.min(1, m.player.charge / 100)), 8);
  const pips = Math.max(1, Math.round(m.player.nitroMax / Math.max(0.4, RACE_CONFIG.nitro.burn)));
  for (let i = 0; i < Math.min(4, pips); i++) {
    const on = m.player.nitroLeft > i * RACE_CONFIG.nitro.burn;
    ctx.fillStyle = on ? (m.player.nitroOn > 0 ? "#7fd7ff" : "#d6ff3f") : "#2a261c";
    ctx.fillRect(w.x + 190 + i * 16, w.y + 40, 12, 18);
  }
  const box = HUD_CHASE.tacho!;
  const cx = box.x + box.w / 2;
  const cy = box.y + 78;
  const n = Math.max(0, Math.min(1, m.player.rpm / REDLINE));
  const pre = !m.player.launched && m.mode === "duel";
  const gear = Math.max(1, m.player.gear);
  const row = RACE_CONFIG.shift[Math.min(RACE_CONFIG.shift.length - 1, gear - 1)] ?? RACE_CONFIG.shift[0];
  const lo = pre ? RACE_CONFIG.launch.green[0] / REDLINE : row.lo / REDLINE;
  const hi = pre ? RACE_CONFIG.launch.green[1] / REDLINE : row.hi / REDLINE;
  const pLo = pre ? RACE_CONFIG.launch.perfect[0] / REDLINE : row.pLo / REDLINE;
  const pHi = pre ? RACE_CONFIG.launch.perfect[1] / REDLINE : row.pHi / REDLINE;
  const a0 = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.strokeStyle = "#3f8f3a";
  ctx.arc(cx, cy, 78, a0 + sweep * lo, a0 + sweep * hi);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = "#e6c15a";
  ctx.lineWidth = 5;
  ctx.arc(cx, cy, 70, a0 + sweep * pLo, a0 + sweep * pHi);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = n >= pLo && n <= pHi ? "#d6ff3f" : "#efe6d2";
  ctx.lineWidth = 8;
  ctx.arc(cx, cy, 70, a0, a0 + sweep * n);
  ctx.stroke();
  ctx.fillStyle = "#efe6d2";
  ctx.textAlign = "center";
  ctx.font = "700 42px ui-monospace, monospace";
  ctx.fillText(String(m.player.gear), cx, cy + 8);
  ctx.font = "700 16px ui-monospace, monospace";
  ctx.fillText(`${Math.round(mph(m.player.speed))} MPH`, cx, cy + 36);
  const meterX = SHIFT_LAMP.x;
  const meterY = SHIFT_LAMP.y + 34;
  const meterW = SHIFT_LAMP.w;
  const live = Math.max(0, Math.min(1, m.player.rpm / REDLINE));
  const coach = !m.player.launched && m.mode === "duel" ? launchCoach(m.player.rpm) : null;
  const liveCall = m.player.launched ? shiftCall(m.player.rpm, m.player.gear) : null;
  const call = m.player.gear < m.player.gears ? liveCall : null;
  const zone = m.player.wrecked ? "QUEBRADO" : call ? shiftWord(call) : "";
  ctx.fillStyle = zone === "PERFEITO" ? "rgba(42,32,8,0.92)" : "rgba(7,10,8,0.88)";
  ctx.fillRect(SHIFT_LAMP.x, SHIFT_LAMP.y, SHIFT_LAMP.w, SHIFT_LAMP.h);
  ctx.fillStyle = "#3f8f3a";
  ctx.fillRect(meterX + 8 + (meterW - 16) * lo, meterY, (meterW - 16) * Math.max(0, hi - lo), 22);
  ctx.fillStyle = "#e6c15a";
  ctx.fillRect(meterX + 8 + (meterW - 16) * pLo, meterY - 4, (meterW - 16) * Math.max(0, pHi - pLo), 30);
  ctx.fillStyle = zone === "PERFEITO" ? "#e6c15a" : zone === "BOM" ? "#d6ff3f" : "#efe6d2";
  ctx.fillRect(meterX + 8 + (meterW - 16) * live - 2, meterY - 4, 4, 30);
  if (coach) {
    ctx.font = "900 16px ui-monospace, monospace";
    ctx.fillStyle = coach.color;
    ctx.textAlign = "left";
    ctx.fillText(coach.say, meterX + 8, SHIFT_LAMP.y + 20);
    ctx.textAlign = "center";
  } else if (zone) {
    const near = call === "cedo" && m.player.rpm / REDLINE > (RACE_CONFIG.shift[Math.min(RACE_CONFIG.shift.length - 1, Math.max(0, m.player.gear - 1))]?.lo ?? 5400) / REDLINE - 0.08;
    const shiftNote = !call && m.noteT > 0.12 && ["PERFEITO", "BOM", "CEDO", "TARDE", "CORTE"].includes(m.note);
    const say = shiftNote
      ? m.note
      : zone === "QUEBRADO"
        ? "QUEBRADO"
        : zone === "PERFEITO"
          ? "AGORA — PERFEITO"
          : zone === "BOM"
            ? "BOM"
            : zone === "TARDE"
              ? "TARDE"
              : zone === "CORTE"
                ? "CORTE"
                : near
                  ? "QUASE — SEGURA"
                  : "SOBE O GIRO";
    ctx.font = zone === "PERFEITO" ? "900 22px ui-monospace, monospace" : "900 18px ui-monospace, monospace";
    ctx.fillStyle =
      zone === "QUEBRADO" || zone === "CORTE" ? "#ff3b1f" : zone === "PERFEITO" ? "#e6c15a" : zone === "BOM" ? "#d6ff3f" : zone === "TARDE" ? "#ffb020" : near ? "#ffb020" : "#efe6d2";
    ctx.textAlign = "left";
    ctx.fillText(say, meterX + 8, SHIFT_LAMP.y + 20);
    ctx.textAlign = "center";
  }
  const liveWord =
    call === "perfeito" ? "PERFEITO" : call === "ok" ? "BOM" : call === "cedo" ? "CEDO" : call === "tarde" ? "TARDE" : call === "corte" ? "CORTE" : "";
  const shiftWordNote = ["PERFEITO", "BOM", "CEDO", "TARDE", "CORTE"].includes(m.note);
  if (m.noteT > 0 && m.note && m.note !== m.banner && !(shiftWordNote && liveWord)) {
    const note = HUD_CHASE.note!;
    ctx.font = "700 18px ui-monospace, monospace";
    ctx.fillStyle = "#d6ff3f";
    ctx.fillText(m.note, note.x + note.w / 2, note.y + 20);
  }
  if (m.alertMissile > 0 || m.alertMine > 0) {
    const alerts = HUD_CHASE.alerts!;
    ctx.font = "700 13px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffb020";
    const bits = [m.alertMissile > 0 ? "MÍSSIL" : "", m.alertMine > 0 ? "MINA" : ""].filter(Boolean);
    ctx.fillText(bits.join("  "), alerts.x, alerts.y + 16);
  }
  paintRadar(ctx, m);
  for (const shot of m.shots) {
    if (!shot.live || shot.owner !== "ai" || (shot.kind !== "missil" && shot.kind !== "emp")) continue;
    const ahead = shot.dist - m.player.dist;
    const closing = (ahead > 0 && shot.speed < m.player.speed) || (ahead < 0 && shot.speed > m.player.speed);
    if (!closing || Math.abs(ahead) > 40 || Math.abs(ahead) < 0.4) continue;
    const x = shot.lane < -1 ? 420 : shot.lane > 1 ? 860 : 640;
    ctx.textAlign = "center";
    ctx.fillStyle = shot.sure ? "#ff2a2a" : "#ff8a1f";
    ctx.font = "900 18px ui-monospace, monospace";
    ctx.fillText(shot.agora ? "AGORA!" : `${ahead > 0 ? "▼" : "▲"} ${Math.round(Math.abs(ahead))} m`, x, 688);
  }
  if (m.debug) paintDebug(ctx, m, now);
  if (m.player.hurt > 0.05) {
    ctx.strokeStyle = `rgba(255,59,31,${Math.min(0.55, m.player.hurt * 0.65)})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 1252, 692);
  }
  if (m.player.shield > 0) {
    ctx.strokeStyle = "#d4ff3a";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 1244, 684);
  }
  ctx.restore();
}

export function paintDebug(ctx: CanvasRenderingContext2D, m: Match, now: number) {
  const boxes = m.view === "cockpit" ? HUD : HUD_CHASE;
  ctx.save();
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 1;
  for (const box of Object.values(boxes)) ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(16, 96, 360, 220);
  ctx.fillStyle = "#d6ff3f";
  ctx.textAlign = "left";
  ctx.font = "600 13px ui-monospace, monospace";
  const fps = m.flashAt > 0 ? "" : "";
  const lag = m.feedback[m.feedback.length - 1];
  const lines = [
    `F3  tick ${m.tick}  ${now.toFixed(1)}s`,
    `feedback ${lag ? lag.action + " " + lag.ms + "ms" : "—"}`,
    `tiros ${m.shotsMade} acert ${m.shotsHit} err ${m.shotsMiss} queb ${m.shotsBroke}`,
    `soma ${m.shotsHit + m.shotsMiss + m.shotsBroke}`,
    ...m.dmgLog.slice(-6).map((row) => `${row.who === "you" ? "VOCÊ" : "RIVAL"} -${row.dmg} ${row.source} hp ${row.hp}`),
  ];
  lines.forEach((line, i) => ctx.fillText(line, 24, 116 + i * 16));
  void fps;
  ctx.restore();
}
