import type { StatBlock, Upgrades } from "./data";

export const IDLE = 1100;
export const REDLINE = 9000;
export const STRIP = 470;
export const GEARS = 5;
export const TREE_GREEN = 1.9;
export const TREE_AMBERS = [0.45, 0.95, 1.45];
export const REF_MPH = 232;
export const TRACK_EDGE = 9;
export const WALL_AT = 8.15;
export const LANE_GAP = 2.2;

const BASE_TOP = [30, 46, 64, 84, 104];
const PULL = [1.32, 1.12, 0.96, 0.8, 0.66];

export type Grade = "cedo" | "ok" | "perfeito" | "corte";
export type LaunchGrade = "perfeito" | "patinou" | "morreu" | "queimou";

export type Input = {
  throttle: number;
  steer: number;
  shift: boolean;
  nitro: boolean;
};

export type Bot = {
  reaction: number;
  shiftAt: number;
  jitter: number;
  nitroGear: number;
  launch: number;
};

export type Racer = {
  rpm: number;
  gear: number;
  speed: number;
  dist: number;
  yaw: number;
  lane: number;
  nitroLeft: number;
  nitroMax: number;
  nitroOn: number;
  nitroMul: number;
  nitroUsed: boolean;
  launchMul: number;
  launched: boolean;
  redlight: boolean;
  reaction: number | null;
  launchGrade: LaunchGrade | null;
  shifts: Grade[];
  wheelspin: number;
  launchRpm: number;
  hook: number;
  finished: boolean;
  finishTime: number | null;
  trap: number;
  shiftLock: number;
  shiftTarget: number;
  band: boolean;
  bot: Bot | null;
  power: number;
  accel: number;
};

export type Phase = "staging" | "tree" | "race" | "finish" | "free";

export type Match = {
  mode: "free" | "duel";
  phase: Phase;
  t: number;
  raceTime: number;
  green: boolean;
  player: Racer;
  rival: Racer | null;
  shake: number;
  flash: number;
  flashHot: boolean;
  callout: string;
  calloutT: number;
  events: string[];
  rewarded: boolean;
  rivalId: string | null;
  practiceEt: number | null;
  strip: number;
  pace: number;
  rivalPace: number;
};

function zeroRacer(bot: Bot | null, stats: StatBlock): Racer {
  return {
    rpm: IDLE + 280,
    gear: 1,
    speed: 0,
    dist: 0,
    yaw: 0,
    lane: 0,
    nitroLeft: stats.nitroTime,
    nitroMax: stats.nitroTime,
    nitroOn: 0,
    nitroMul: 1,
    nitroUsed: false,
    launchMul: 1,
    launched: false,
    redlight: false,
    reaction: null,
    launchGrade: null,
    shifts: [],
    wheelspin: 0,
    launchRpm: IDLE,
    hook: 0,
    finished: false,
    finishTime: null,
    trap: 0,
    shiftLock: 0,
    shiftTarget: bot ? bot.shiftAt : 0.93,
    band: false,
    bot,
    power: stats.power,
    accel: stats.accel,
  };
}

export function shiftWindow(up: Upgrades): [number, number] {
  const w = up.gearbox * 0.014;
  return [0.9 - w, 0.968 + w * 0.3];
}

export function launchWindow(up: Upgrades): [number, number] {
  return [0.64 - up.tires * 0.012, 0.86 + up.tires * 0.01];
}

function torque(n: number): number {
  const x = Math.max(0, Math.min(n, 1.08));
  const low = Math.min(1, x / 0.32);
  const peak = Math.exp(-((x - 0.9) ** 2) / 0.02);
  const lim = x >= 1 ? 0.06 : x > 0.978 ? 0.35 : 1;
  return (0.18 + 0.34 * low + 0.85 * peak) * lim;
}

function say(m: Match, text: string) {
  m.callout = text;
  m.calloutT = 0.85;
}

function gradeShift(m: Match, r: Racer, up: Upgrades, who: "you" | "ai") {
  if (r.gear >= GEARS) return;
  const n = r.rpm / REDLINE;
  const [lo, hi] = shiftWindow(up);
  let g: Grade;
  if (n >= 1) {
    g = "corte";
    r.speed *= 0.965;
  } else if (n >= lo && n <= hi) {
    g = "perfeito";
    r.speed += 1.6 * (r.bot ? m.rivalPace : m.pace);
  } else if (n >= lo - 0.08) g = "ok";
  else g = "cedo";
  r.shifts.push(g);
  r.gear += 1;
  r.shiftLock = 0.18;
  r.band = false;
  if (r.bot) {
    const j = (Math.random() - 0.5) * r.bot.jitter;
    r.shiftTarget = Math.min(0.99, Math.max(0.72, r.bot.shiftAt + j));
  }
  if (who === "you") {
    m.events.push(`shift:${g}`);
    if (g === "perfeito") {
      say(m, "PERFEITO");
      m.shake = Math.max(m.shake, 0.55);
      m.flash = Math.max(m.flash, 0.4);
      m.flashHot = false;
    } else if (g === "cedo") say(m, "CEDO");
    else if (g === "corte") {
      say(m, "CORTE");
      m.flash = Math.max(m.flash, 0.28);
      m.flashHot = true;
    } else say(m, "OK");
  }
}

function armNitro(m: Match, r: Racer, up: Upgrades, who: "you" | "ai") {
  if (r.nitroUsed || !r.launched || r.nitroLeft <= 0) return;
  r.nitroUsed = true;
  r.nitroOn = r.nitroLeft;
  const n = r.rpm / REDLINE;
  let tag = "ok";
  if (r.gear === 1 || r.wheelspin > 0.35) {
    r.nitroMul = 1.08;
    r.wheelspin = Math.max(r.wheelspin, 0.75);
    tag = "morto";
  } else if (n >= 0.52 && n <= 0.93 && r.gear >= 2) {
    r.nitroMul = 1.58 + up.nitro * 0.045;
    tag = "limpo";
  } else if (n > 0.96) {
    r.nitroMul = 1.1;
    tag = "corte";
  } else r.nitroMul = 1.3;
  if (who === "you") {
    m.events.push(`nitro:${tag}`);
    say(m, tag === "limpo" ? "NITRO" : tag === "morto" ? "MORTO" : tag === "corte" ? "CORTE" : "NITRO");
    m.shake = Math.max(m.shake, tag === "limpo" ? 0.7 : 0.35);
    m.flash = Math.max(m.flash, 0.45);
    m.flashHot = tag !== "limpo";
  }
}

function doLaunch(m: Match, r: Racer, up: Upgrades, green: boolean, since: number, who: "you" | "ai") {
  r.launched = true;
  const n = r.rpm / REDLINE;
  const [lo, hi] = launchWindow(up);
  if (who === "you" && !green) {
    r.redlight = true;
    r.launchGrade = "queimou";
    r.reaction = since;
    r.launchMul = 0.46;
    r.wheelspin = 1;
    r.hook = 0.22;
    m.events.push("redlight");
    say(m, "QUEIMOU");
    m.flash = 0.7;
    m.flashHot = true;
    m.shake = 0.8;
  } else {
    r.reaction = Math.max(0, since);
    if (n >= lo && n <= hi) {
      r.launchMul = 1.18 + up.tires * 0.03;
      r.hook = 0.78;
      r.wheelspin = 0;
      r.launchGrade = "perfeito";
      if (who === "you") {
        m.events.push("launch:perfeito");
        say(m, "LARGA");
        m.flash = 0.3;
        m.flashHot = false;
      }
    } else if (n > hi) {
      r.launchMul = 0.7;
      r.hook = 0.32;
      r.wheelspin = 0.9;
      r.launchGrade = "patinou";
      if (who === "you") {
        m.events.push("launch:patinou");
        say(m, "PATINOU");
      }
    } else {
      r.launchMul = 0.58;
      r.hook = 0.3;
      r.launchGrade = "morreu";
      if (who === "you") {
        m.events.push("launch:morreu");
        say(m, "MORREU");
      }
    }
  }
  r.launchRpm = r.rpm;
}

function integrate(m: Match, r: Racer, throttle: number, dt: number) {
  const pace = r.bot ? m.rivalPace : m.pace;
  const top = (BASE_TOP[r.gear - 1] ?? BASE_TOP[0]) * pace;
  const wheel = IDLE + (r.speed / top) * (REDLINE - IDLE);
  if (r.gear === 1 && r.hook < 1 && r.launched) {
    const rate = (r.wheelspin > 0.4 ? 0.5 : 1.35) + r.accel * 0.003;
    r.hook = Math.min(1, r.hook + rate * dt);
    r.wheelspin = Math.max(0, r.wheelspin - dt * 0.45);
    r.rpm = r.launchRpm * (1 - r.hook) + Math.max(wheel, IDLE) * r.hook;
  } else if (r.launched) {
    r.hook = 1;
    r.rpm = wheel;
    r.wheelspin = Math.max(0, r.wheelspin - dt);
  }
  r.shiftLock = Math.max(0, r.shiftLock - dt);
  const n = r.rpm / REDLINE;
  let tq = torque(Math.min(n, 1.05));
  const limited = n >= 1 && r.launched;
  if (limited) {
    tq = 0.05;
    r.speed -= 8 * pace * dt;
  }
  if (r.nitroOn > 0) {
    r.nitroOn -= dt;
    r.nitroLeft = Math.max(0, r.nitroOn);
    if (r.nitroOn <= 0) r.nitroMul = 1;
  }
  const spin = r.wheelspin > 0.25 ? 0.58 : 1;
  const launch = r.gear === 1 ? r.launchMul : 1;
  const eng = (0.55 + r.power / 200) * (0.72 + r.accel / 260);
  const thr = r.launched ? 1 : throttle;
  if (r.launched && thr > 0.2 && !limited) {
    const a = tq * (PULL[r.gear - 1] ?? 0.5) * eng * launch * r.nitroMul * spin * 7.1 * Math.pow(pace, 1.025);
    r.speed += a * dt;
  }
  r.speed -= (r.speed * r.speed * 0.00034 * dt) / pace;
  r.speed -= r.speed * 0.018 * dt;
  if (r.speed < 0) r.speed = 0;
  r.dist += r.speed * dt;
  if (!r.finished && r.dist >= m.strip) {
    r.finished = true;
    r.finishTime = m.raceTime;
    r.trap = r.speed;
    if (!r.bot) m.events.push("finish");
  }
}

function sinceGreen(m: Match): number {
  if (m.phase === "tree") return m.t - TREE_GREEN;
  if (m.phase === "race" || m.phase === "finish") return m.raceTime;
  return -99;
}

function stepRacer(
  m: Match,
  r: Racer,
  up: Upgrades,
  input: Input | null,
  dt: number,
  who: "you" | "ai",
) {
  const green = m.green || m.phase === "race" || m.phase === "finish" || m.phase === "free";
  const since = sinceGreen(m);

  if (!r.launched && (m.phase === "staging" || m.phase === "tree" || m.phase === "race")) {
    const thr = who === "you" ? (input?.throttle ?? 0) : 0.8;
    const target = IDLE + thr * (REDLINE - IDLE) * 0.78;
    r.rpm += (target - r.rpm) * (1 - Math.exp(-3.4 * dt));
  }

  if (m.phase === "free") {
    const thr = input?.throttle ?? 0;
    if (!r.launched && thr > 0.25) {
      r.rpm = Math.max(r.rpm, 7000);
      r.launchRpm = 7000;
      r.launched = true;
      r.hook = 0.62;
      r.launchMul = 1.12;
      r.wheelspin = 0;
    }
    if (!r.launched) {
      const target = IDLE + thr * (REDLINE - IDLE) * 0.9;
      r.rpm += (target - r.rpm) * (1 - Math.exp(-3 * dt));
      r.speed = Math.max(0, r.speed + thr * 3.2 * Math.pow(m.pace, 0.9) * dt);
      r.speed *= Math.exp(-dt * (thr > 0 ? 0.2 : 1.4));
      r.dist += r.speed * dt;
    }
  }

  let justLaunched = false;
  if (!r.launched && m.phase !== "free") {
    const want =
      who === "you"
        ? Boolean(input?.shift)
        : Boolean(r.bot && green && since >= (r.bot?.reaction ?? 1));
    if (want) {
      if (who === "ai" && r.bot) r.rpm = IDLE + r.bot.launch * (REDLINE - IDLE);
      doLaunch(m, r, up, green && m.phase !== "staging", since, who);
      justLaunched = true;
      if (who === "you" && !m.green && m.phase !== "race") {
        m.phase = "race";
        m.green = true;
        m.raceTime = 0;
      }
    }
  }

  if (r.launched && m.phase !== "finish") {
    const thr = m.phase === "free" ? (input?.throttle ?? 0) : 1;
    integrate(m, r, thr, dt);
  } else if (m.phase === "finish") {
    r.speed *= Math.exp(-0.35 * dt);
    r.dist += r.speed * dt;
    const wheelTop = (BASE_TOP[r.gear - 1] ?? 40) * (r.bot ? m.rivalPace : m.pace);
    r.rpm = IDLE + (r.speed / wheelTop) * (REDLINE - IDLE);
  }

  if (who === "you" && r.launched && r.gear < GEARS && m.phase !== "finish") {
    const n = r.rpm / REDLINE;
    const [lo, hi] = shiftWindow(up);
    const inside = n >= lo && n <= hi && n < 1;
    if (inside && !r.band) m.events.push("band");
    r.band = inside;
  }

  if (who === "you" && input?.shift && r.launched && !justLaunched && r.shiftLock <= 0 && r.gear < GEARS && m.phase !== "finish") {
    gradeShift(m, r, up, "you");
  }
  if (who === "ai" && r.bot && r.launched && !justLaunched && r.shiftLock <= 0 && r.gear < GEARS) {
    if (r.rpm / REDLINE >= r.shiftTarget) gradeShift(m, r, up, "ai");
  }
  if (who === "you" && input?.nitro) armNitro(m, r, up, "you");
  if (who === "ai" && r.bot && r.launched && !r.nitroUsed && r.gear === r.bot.nitroGear) {
    const n = r.rpm / REDLINE;
    if (n > 0.6 && n < 0.9) armNitro(m, r, up, "ai");
  }
}

export function paceOf(vmax: number): number {
  return Math.max(0.4, vmax / REF_MPH);
}

export function stripFor(stats: StatBlock): number {
  return STRIP * paceOf(stats.vmax) * (0.9 + stats.durability / 480);
}

export function createFree(stats: StatBlock): Match {
  return {
    mode: "free",
    phase: "free",
    t: 0,
    raceTime: 0,
    green: true,
    player: Object.assign(zeroRacer(null, stats), { lane: 0 }),
    rival: null,
    shake: 0,
    flash: 0,
    flashHot: false,
    callout: "",
    calloutT: 0,
    events: [],
    rewarded: false,
    rivalId: null,
    practiceEt: null,
    strip: stripFor(stats),
    pace: paceOf(stats.vmax),
    rivalPace: paceOf(stats.vmax),
  };
}

export function createDuel(rivalId: string, bot: Bot, player: StatBlock, rival: StatBlock): Match {
  const lead = {
    ...player,
    vmax: Math.max(player.vmax, rival.vmax),
    durability: Math.max(player.durability, rival.durability),
  };
  return {
    mode: "duel",
    phase: "staging",
    t: 0,
    raceTime: 0,
    green: false,
    player: Object.assign(zeroRacer(null, player), { lane: 0 }),
    rival: Object.assign(zeroRacer(bot, rival), { lane: LANE_GAP }),
    shake: 0,
    flash: 0,
    flashHot: false,
    callout: "GAS",
    calloutT: 1.2,
    events: [],
    rewarded: false,
    rivalId,
    practiceEt: null,
    strip: stripFor(lead),
    pace: paceOf(player.vmax),
    rivalPace: paceOf(rival.vmax),
  };
}

export function stepMatch(m: Match, input: Input, dt: number, playerUp: Upgrades, rivalUp: Upgrades | null) {
  m.events = [];
  const h = Math.min(dt, 0.05);
  if (m.phase === "staging") {
    m.t += h;
    if (m.t >= 1.25) {
      m.phase = "tree";
      m.t = 0;
    }
  } else if (m.phase === "tree") {
    m.t += h;
    if (m.t >= TREE_GREEN) {
      m.phase = "race";
      m.green = true;
      m.raceTime = 0;
      m.t = 0;
    }
  } else if (m.phase === "race" || m.phase === "free") {
    if (m.phase === "race") m.raceTime += h;
    else if (m.player.launched) m.raceTime += h;
  }

  const sp = m.player.speed;
  const grip = 0.55 + Math.min(1.15, sp / (8 * Math.max(0.35, m.pace)));
  m.player.lane += input.steer * 8.4 * grip * h;
  m.player.yaw += (input.steer * 0.28 - m.player.yaw) * Math.min(1, 10 * h);
  m.player.lane = Math.max(-TRACK_EDGE, Math.min(TRACK_EDGE, m.player.lane));
  if (Math.abs(m.player.lane) > WALL_AT && m.player.speed > 8 * m.pace) {
    m.player.speed *= 1 - 0.65 * h;
    const back = Math.sign(m.player.lane) * Math.max(WALL_AT, Math.abs(m.player.lane) - 1.4 * h);
    m.player.lane = back;
    if (m.calloutT <= 0) say(m, "PAREDE");
    m.shake = Math.max(m.shake, 0.4);
    m.events.push("wall");
  }
  if (m.rival && m.mode === "duel") {
    const gap = Math.abs(m.player.dist - m.rival.dist);
    const lat = m.player.lane - m.rival.lane;
    if (gap < 4.5 && Math.abs(lat) < 0.72) {
      const dir = Math.abs(lat) < 0.04 ? (input.steer >= 0 ? 1 : -1) : Math.sign(lat);
      m.player.lane = Math.max(-TRACK_EDGE, Math.min(TRACK_EDGE, m.player.lane + dir * 5.5 * h));
      m.player.speed *= 1 - 0.08 * h;
      if (m.calloutT <= 0) say(m, "TOQUE");
      m.events.push("wall");
    }
  }

  stepRacer(m, m.player, playerUp, input, h, "you");
  if (m.rival && rivalUp && m.mode === "duel") {
    stepRacer(m, m.rival, rivalUp, null, h, "ai");
  }

  if (m.mode === "free" && m.player.dist >= m.strip && m.practiceEt == null && m.player.launched) {
    m.practiceEt = m.raceTime;
    say(m, "FEITO");
    m.events.push("practice");
  }

  if (m.mode === "duel" && m.phase === "race") {
    const pDone = m.player.finished;
    const rDone = m.rival?.finished ?? false;
    const waited =
      (pDone || rDone) &&
      m.raceTime > Math.max(m.player.finishTime ?? 0, m.rival?.finishTime ?? 0) + 5;
    if ((pDone && rDone) || m.raceTime > 26 || waited) m.phase = "finish";
  }

  m.shake = Math.max(0, m.shake - h * 1.8);
  m.flash = Math.max(0, m.flash - h * 1.6);
  m.calloutT = Math.max(0, m.calloutT - h);
}

export function kmh(speed: number): number {
  return speed * 3.6;
}

export function mph(speed: number): number {
  return speed * 2.236936;
}
