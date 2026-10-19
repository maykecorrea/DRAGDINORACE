import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { FossilWord } from "@/components/fossil-word";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import {
  BONUS,
  CATALOG,
  catalogModelId,
  driverById,
  liveStats,
  resolveStats,
  RIVALS,
  stack,
  stockOf,
  type NftCar,
  type Rarity,
  type StatBlock,
  type Upgrades,
} from "./data";
import { createAudio, type AudioBus } from "./audio";
import { VIEW_H, VIEW_W, cockpitMotion, drawFrame, loadArt, type Art } from "./render";
import { freshSave, loadSave, selectedCar, subscribeGarageReady, subscribeSave, writeSave, type Save } from "./save";
import { carLabel, cockpitKey, cockpitPlate, sideMark } from "./forge";
import { keyLabel, readKeys } from "./hotkeys";
import { raceXp, partById } from "./parts";
import { BOSSES, STORY, grantStoryPart, storyLoadout, storyOpen, storyRivalStats, type StoryPhase } from "./story";
import { createDuel, createFree, createPvp, raceVerdict, raceReason, stepMatch, stripFor, LANE_GAP, armWeapon, armRear, gearsFor, mph, botForLevel, levelForChapter, purse, raceStatsOf, type Grade, type LaunchGrade, type Match } from "./sim";
import { armById, armedDef, armedRear } from "./armory";
import { bumpDaily, missionReady } from "./missions";
import { reportQuestRace } from "@/game/quests.functions";
import { Prep } from "./Prep";
import { P2PRoom } from "@/lib/multiplayer";
import { applyCar, applyShot, asPvpMsg, type PvpMsg } from "./pvp";
import { ownedLoot, rollLoot, streetBuild, streetById, streetNear, bandStats, STREET_PRIZE } from "./street";

type Screen = "menu" | "drive" | "rivals" | "result" | "intro" | "pvp";

const PROLOGUE_KEY = "ddr-prologue-seen";

function prologueSeen(): boolean {
  try {
    return localStorage.getItem(PROLOGUE_KEY) === "1";
  } catch {
    return false;
  }
}

function markPrologue() {
  try {
    localStorage.setItem(PROLOGUE_KEY, "1");
  } catch {
    /* navegador bloqueou o armazenamento */
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}

type Again =
  | { kind: "free" }
  | { kind: "story"; chapter: number }
  | { kind: "racha"; id: string }
  | { kind: "pvp"; stake: number };

type Result = {
  win: boolean;
  draw: boolean;
  et: number | null;
  rivalEt: number | null;
  reaction: number | null;
  launch: LaunchGrade | null;
  trap: number;
  grades: Grade[];
  fossil: number;
  part: string | null;
  redlight: boolean;
  rivalName: string;
  rivalId: string;
  rivalReaction: number | null;
  rivalLaunch: LaunchGrade | null;
  rivalTrap: number;
  rivalGrades: Grade[];
  youPlace: 1 | 2;
  rivalPlace: 1 | 2;
  hp: number;
  hpMax: number;
  wrecked: boolean;
  gears: number;
  rivalGears: number;
  rivalHp?: number;
  rivalHpMax?: number;
  stars: [boolean, boolean, boolean];
  note?: string;
  mission?: string | null;
  bonusPct?: number;
  bonusLines?: string[];
  baseFossil?: number;
  hits?: number;
  fired?: number;
  crates?: number;
  nitroPerfect?: number;
  nitroUsed?: boolean;
  dodged?: number;
  draftTime?: number;
  reason?: string;
};

const keys = new Set<string>();
const keyClock = { brakeUp: 0, gasDown: 0 };
const pending = { fire: false, rear: false, nitro: false, shield: false };
let injected: string[] | null = null;
let steerOverride: number | null = null;

function didWin(m: Match): boolean {
  return raceVerdict(m) === "win";
}

const STAKES = [50, 100, 250, 500, 1000];

function potOf(stake: number) {
  const pot = Math.max(0, Math.round(stake)) * 2;
  const fee = Math.floor(pot * 0.05);
  return { pot, fee, payout: pot - fee };
}

function fossilReward(m: Match, win: boolean): number {
  const perfects = m.player.shifts.filter((g) => g === "perfeito").length;
  if (m.player.redlight) return 24;
  if (!win) return 48 + perfects * 6;
  let n = 96 + perfects * 12;
  if (m.player.reaction != null && m.player.reaction >= 0 && m.player.reaction < 0.12) n += 18;
  return n;
}

function mLoss(winFossil: number): number {
  return Math.max(12, Math.round(winFossil * 0.2));
}

function stacked(car: NftCar): Upgrades {
  return stack(car.upgrades, BONUS[car.driverId]);
}

function rollPvp(): { stats: StatBlock; sprite: number; name: string; rarity: Rarity } {
  const row = CATALOG[Math.floor(Math.random() * CATALOG.length)] ?? CATALOG[0]!;
  return {
    stats: stockOf(row.driverId, row.rarity, catalogModelId(row)),
    sprite: driverById(row.driverId).sprite,
    name: row.name ?? "Pista",
    rarity: row.rarity,
  };
}

function statsOf(car: NftCar, pilot?: string, kit?: Save["kit"]) {
  return liveStats(car, pilot, kit);
}

function rivalStats(phase: StoryPhase) {
  return storyRivalStats(phase);
}

function rivalUpgrades(sim: Match): Upgrades {
  const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
  if (phase) return storyLoadout(phase).upgrades;
  const streetId = sim.rivalId?.startsWith("racha-") ? sim.rivalId.slice(6) : "";
  const streetCar = streetId ? streetById(streetId) : undefined;
  if (streetCar) return streetBuild(streetCar.rarity);
  const old = streetId ? RIVALS.find((item) => item.id === streetId) : undefined;
  if (old) return old.build;
  return { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };
}

function launchLabel(grade: LaunchGrade | null | undefined): string {
  if (grade === "perfeito") return "PERFEITO";
  if (grade === "ok") return "OK";
  if (grade === "patinou") return "PATINOU";
  if (grade === "morreu") return "MORREU";
  if (grade === "queimou") return "QUEIMOU";
  return "—";
}

function shiftLabel(grade: Grade | undefined): string {
  if (grade === "perfeito") return "PERFEITO";
  if (grade === "corte") return "CORTE";
  if (grade === "cedo") return "CEDO";
  if (grade === "tarde") return "TARDE";
  if (grade === "ok") return "BOM";
  return "—";
}

function cellTone(grade: string | null | undefined): string {
  if (grade === "perfeito") return "bg-primary text-ink";
  if (grade === "ok") return "bg-fg text-ink";
  if (grade === "queimou" || grade === "corte") return "bg-danger text-fg";
  if (grade === "patinou" || grade === "cedo") return "bg-[#ffb020] text-ink";
  if (grade === "morreu" || grade === "ok") return "bg-fg text-ink";
  return "bg-surface text-muted";
}

function ResultCard({
  place,
  name,
  car,
  et,
  reaction,
  trap,
  launch,
  grades,
  hp,
  hpMax,
  wrecked,
  gears,
}: {
  place: 1 | 2;
  name: string;
  car: string;
  et: number | null;
  reaction: number | null;
  trap: number | null;
  launch: LaunchGrade | null;
  grades: Grade[];
  hp?: number;
  hpMax?: number;
  wrecked?: boolean;
  gears?: number;
}) {
  const boxes = Math.max(1, (gears ?? 5) - 1);
  return (
    <article className="border border-border bg-surface p-3">
      <p className={`font-display text-5xl leading-none ${place === 1 ? "text-primary" : "text-muted"}`}>{place}º</p>
      <h2 className="mt-1 font-display text-4xl leading-none">{name}</h2>
      <p className="text-sm text-muted">{car}</p>
      <p className="mt-2 font-display text-4xl leading-none">{et != null ? `${et.toFixed(3)}s` : wrecked ? "QUEBRADO" : "DNF"}</p>
      {wrecked && et == null && <p className="mt-1 text-xs text-danger">Parou antes da linha. Sem tempo.</p>}
      {hpMax != null && hp != null && (
        <div className="mt-2">
          <div className="h-3 bg-black">
            <div className="h-full" style={{ width: `${Math.round((hp / hpMax) * 100)}%`, background: hp / hpMax > 0.45 ? "#d6ff3f" : "#ff3b1f" }} />
          </div>
          <p className="mt-1 text-xs text-muted">Vida {Math.round(hp)}/{Math.round(hpMax)}</p>
        </div>
      )}
      <p className="mt-1 text-sm text-muted">
        reação {reaction == null || reaction > 6 ? (launch === "queimou" ? "QUEIMOU" : "—") : `${Math.round(reaction * 1000)} ms`} · trap {trap == null ? "—" : `${Math.round(mph(trap))} mph`}
      </p>
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${boxes + 1}, minmax(0, 1fr))` }}>
        <div className={`px-1 py-2 text-center ${cellTone(launch)}`}>
          <p className="font-display text-lg leading-none">LARG</p>
          <p className="mt-1 text-[10px] font-semibold tracking-widest">{launchLabel(launch)}</p>
        </div>
        {Array.from({ length: boxes }, (_, i) => (
          <div key={i} className={`px-1 py-2 text-center ${cellTone(grades[i])}`}>
            <p className="font-display text-lg leading-none">{i + 2}ª</p>
            <p className="mt-1 text-[10px] font-semibold tracking-widest">{shiftLabel(grades[i])}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function GameApp({ rivalId, story, treino, racha, duel, selfKey }: { rivalId?: string; story?: boolean; treino?: boolean; racha?: string; duel?: string; selfKey?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [save, setSave] = useState<Save>(freshSave);
  const [screen, setScreen] = useState<Screen>("menu");
  const [result, setResult] = useState<Result | null>(null);
  const [ready, setReady] = useState(false);
  const saveRef = useRef(save);
  const screenRef = useRef<Screen>("menu");
  const simRef = useRef<Match | null>(null);
  const artRef = useRef<Art | null>(null);
  const audioRef = useRef<AudioBus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const treeBox = useRef<HTMLDivElement>(null);
  const hold = useRef({ gas: false, left: false, right: false, shift: false, nitro: false, fire: false, rear: false, brake: false });
  const prev = useRef({ shift: false, nitro: false, fire: false, rear: false });
  const edges = useRef({ shield: false, ram: 0, tapL: 0, tapR: 0, spaceHeld: false });
  const debugOn = useRef(false);
  const resultLock = useRef(false);
  const youArt = useRef<CanvasImageSource | null>(null);
  const roomRef = useRef<P2PRoom | null>(null);
  const inboxRef = useRef<PvpMsg[]>([]);
  const selfId = useRef(`p${Math.random().toString(36).slice(2, 10)}`);
  const netRef = useRef({
    started: false,
    rivalId: "",
    name: "Rival",
    sprite: 2,
    seen: new Set<number>(),
    sent: new Set<number>(),
    acc: 0,
    roll: null as { stats: StatBlock; sprite: number; name: string; rarity: Rarity } | null,
    stake: 0,
    paid: false,
  });
  const bootRef = useRef<(strip: number) => void>(() => undefined);
  const queueTicket = useRef(0);
  const [pvpPeer, setPvpPeer] = useState("");
  const [pvpLink, setPvpLink] = useState("escolhe a aposta");
  const [pvpHunt, setPvpHunt] = useState(false);
  const [pvpStake, setPvpStake] = useState(100);
  const [pvpBet, setPvpBet] = useState(false);
  const [again, setAgain] = useState<Again>({ kind: "free" });
  const [tables, setTables] = useState<{ id: string; name: string; stake: number }[]>([]);

  useEffect(() => {
    const unsub = subscribeSave((next) => {
      saveRef.current = next;
      setSave(next);
    });
    const unready = subscribeGarageReady(() => {
      const next = loadSave();
      saveRef.current = next;
      setSave(next);
    });
    return () => {
      unsub();
      unready();
    };
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.isTrusted) injected = null;
      if (e.code === "F3") {
        e.preventDefault();
        debugOn.current = !debugOn.current;
      }
      if (e.code === "KeyV" && screenRef.current === "drive") {
        e.preventDefault();
        const camera = (saveRef.current.camera ?? "perseguicao") === "perseguicao" ? "cockpit" : "perseguicao";
        const next = { ...saveRef.current, camera } as Save;
        saveRef.current = next;
        writeSave(next);
        setSave(next);
      }
      if (e.code === "KeyE" || (e.key.length === 1 && e.key.toLowerCase() === "e")) {
        edges.current.shield = true;
        pending.shield = true;
      }
      const letter = e.key.length === 1 ? e.key.toLowerCase() : "";
      if (e.code === "KeyF" || letter === "f") pending.fire = true;
      if (e.code === "KeyG" || letter === "g") pending.rear = true;
      if (e.code === "KeyN" || letter === "n") pending.nitro = true;
      if ((e.code === "KeyA" || e.code === "ArrowLeft") && e.timeStamp - edges.current.tapL <= 250) edges.current.ram = -1;
      if (e.code === "KeyA" || e.code === "ArrowLeft") edges.current.tapL = e.timeStamp;
      if ((e.code === "KeyD" || e.code === "ArrowRight") && e.timeStamp - edges.current.tapR <= 250) edges.current.ram = 1;
      if (e.code === "KeyD" || e.code === "ArrowRight") edges.current.tapR = e.timeStamp;
      const bind = readKeys(saveRef.current);
      if (!keys.has(e.code) && (e.code === bind.gas || e.code === "KeyW" || e.code === "ArrowUp")) keyClock.gasDown = performance.now();
      if (screenRef.current === "drive" && (e.code === "KeyF" || e.code === "KeyG" || e.code === "KeyN" || e.code === "KeyE" || e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight")) e.preventDefault();
      if (bind && Object.values(bind).includes(e.code)) e.preventDefault();
      keys.add(e.code);
      if (letter === "f") keys.add("KeyF");
      if (letter === "g") keys.add("KeyG");
      if (letter === "n") keys.add("KeyN");
      if (letter === "e") keys.add("KeyE");
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") keyClock.brakeUp = performance.now();
      keys.delete(e.code);
      const letter = e.key.length === 1 ? e.key.toLowerCase() : "";
      if (e.code === "KeyF" || letter === "f") keys.delete("KeyF");
      if (e.code === "KeyG" || letter === "g") keys.delete("KeyG");
      if (e.code === "KeyN" || letter === "n") keys.delete("KeyN");
      if (e.code === "KeyE" || letter === "e") keys.delete("KeyE");
    };
    const onBlur = () => {
      keys.clear();
      pending.fire = false;
      pending.rear = false;
      pending.nitro = false;
      pending.shield = false;
    };
    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const audio = createAudio();
    audioRef.current = audio;
    audio.setMuted(saveRef.current.muted);
    let stop = false;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const acc = { v: 0 };
    const events: string[] = [];

    const sample = () => {
      const bind = readKeys(saveRef.current);
      const down = (code: string) => keys.has(code) || Boolean(injected?.length && injected.includes(code));
      let steer = steerOverride ?? 0;
      if (steerOverride == null) {
        if (down(bind.left) || (injected?.includes("KeyA") ?? false) || (injected?.includes("ArrowLeft") ?? false) || hold.current.left) {
          steer += 1;
        }
        if (down(bind.right) || (injected?.includes("KeyD") ?? false) || (injected?.includes("ArrowRight") ?? false) || hold.current.right) {
          steer -= 1;
        }
      }
      const throttle = down(bind.gas) || (injected?.includes("KeyW") ?? false) || hold.current.gas ? 1 : 0;
      const shiftDown =
        down(bind.shift) ||
        down("ShiftLeft") ||
        down("ShiftRight") ||
        (injected?.includes("ShiftLeft") ?? false) ||
        (injected?.includes("ShiftRight") ?? false) ||
        (injected?.includes("ArrowUp") ?? false) ||
        hold.current.shift;
      const nitroDown = down(bind.nitro) || down("KeyN") || (injected?.includes("KeyN") ?? false) || hold.current.nitro || pending.nitro;
      const fireDown = down(bind.fire) || down("KeyF") || hold.current.fire || pending.fire;
      const rearDown = down(bind.rear) || down("KeyG") || hold.current.rear || pending.rear;
      const shift = shiftDown && !prev.current.shift;
      const nitro = (nitroDown && !prev.current.nitro) || pending.nitro;
      const fireEdge = (fireDown && !prev.current.fire) || pending.fire;
      const rearEdge = (rearDown && !prev.current.rear) || pending.rear;
      pending.fire = false;
      pending.rear = false;
      pending.nitro = false;
      const shield = edges.current.shield || pending.shield;
      pending.shield = false;
      edges.current.shield = false;
      prev.current.shift = shiftDown;
      prev.current.nitro = nitroDown;
      prev.current.fire = fireDown;
      prev.current.rear = rearDown;
      hold.current.shift = false;
      hold.current.nitro = false;
      const launched = !!simRef.current && simRef.current.player.launched && (simRef.current.phase === "race" || simRef.current.phase === "free");
      const space = down("Space") || (injected?.includes("Space") ?? false) || hold.current.brake;
      if (!launched && space) edges.current.spaceHeld = true;
      if (!space) edges.current.spaceHeld = false;
      const ram = edges.current.ram;
      edges.current.ram = 0;
      return {
        throttle,
        steer: Math.max(-1, Math.min(1, steer)),
        shift,
        nitro,
        fire: fireDown,
        rear: rearDown,
        brake: !launched && space,
        cuspe: launched && space && !edges.current.spaceHeld,
        fireEdge,
        rearEdge,
        shield,
        ram,
        brakeUpMs: keyClock.brakeUp || null,
        gasDownMs: keyClock.gasDown || null,
      };
    };

    window.__controlsTest = {
      getYaw: () => simRef.current?.player.yaw ?? 0,
      getSpeed: () => simRef.current?.player.speed ?? 0,
      setKeys: (codes) => {
        injected = codes.slice();
      },
      setSteer: (v) => {
        steerOverride = v;
      },
    };

    const onVis = () => audio.resume();
    document.addEventListener("visibilitychange", onVis);

    void loadArt()
      .then(
        (art) =>
          new Promise<Art>((resolve) => {
            let done = false;
            let unsub = () => {};
            unsub = subscribeGarageReady(() => {
              if (done) return;
              done = true;
              queueMicrotask(() => unsub());
              const next = loadSave();
              saveRef.current = next;
              setSave(next);
              resolve(art);
            });
          }),
      )
      .then((art) => {
        if (stop) return;
        artRef.current = art;
        simRef.current = createFree(statsOf(selectedCar(saveRef.current), saveRef.current.pilot, saveRef.current.kit), gearsFor(selectedCar(saveRef.current).rarity));
        setReady(true);
        let last = performance.now();
        const bootPvp = (strip: number) => {
          if (netRef.current.started) return;
          netRef.current.started = true;
          const stake = netRef.current.stake;
          if (stake > 0 && !netRef.current.paid) {
            netRef.current.paid = true;
            const prev = saveRef.current;
            const locked: Save = { ...prev, fossil: Math.max(0, prev.fossil - stake) };
            saveRef.current = locked;
            writeSave(locked);
            setSave(locked);
          }
          const carNow = selectedCar(saveRef.current);
          const roll = netRef.current.roll;
          const stats = roll?.stats ?? statsOf(carNow, saveRef.current.pilot, saveRef.current.kit);
          const gears = gearsFor(roll?.rarity ?? carNow.rarity);
          const match = createPvp(stats, stats, gears, gears);
          match.strip = strip;
          const right = selfId.current > netRef.current.rivalId;
          match.player.lane = right ? LANE_GAP : 0;
          if (match.rival) match.rival.lane = right ? 0 : LANE_GAP;
          armWeapon(match.player, armedDef(saveRef.current.arm, saveRef.current.frontal).id, armedDef(saveRef.current.arm, saveRef.current.frontal));
          armRear(match.player, armedRear(saveRef.current.rearArm, saveRef.current.rear).id, armedRear(saveRef.current.rearArm, saveRef.current.rear));
          simRef.current = match;
          resultLock.current = false;
          setAgain({ kind: "pvp", stake });
          screenRef.current = "drive";
          setScreen("drive");
        };
        bootRef.current = bootPvp;
        const loop = (now: number) => {
          if (stop) return;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          for (const msg of inboxRef.current.splice(0)) {
            if (msg.t === "hello") {
              netRef.current.name = msg.name || "Rival";
              netRef.current.sprite = msg.sprite;
              setPvpPeer(netRef.current.name);
            } else if (msg.t === "go") bootPvp(msg.strip);
            else if (msg.t === "car" && simRef.current?.pvp) applyCar(simRef.current, msg);
            else if (msg.t === "shot" && simRef.current?.pvp) applyShot(simRef.current, msg, netRef.current.seen);
          }
          const sim = simRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (sim && ctx && artRef.current) {
            events.length = 0;
            if (screenRef.current === "drive") {
              acc.v += dt;
              sim.view = (saveRef.current.camera ?? "perseguicao") === "cockpit" ? "cockpit" : "perseguicao";
              sim.debug = debugOn.current;
              const input = sample();
              let first = true;
              let guard = 0;
              let stepI = 0;
              const car = selectedCar(saveRef.current);
              const up = stacked(car);
              const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
              const rivalUp = sim.mode === "duel" ? rivalUpgrades(sim) : null;
              while (acc.v >= 1 / 60 && guard < 5) {
                const stepIn = {
                  ...(first ? input : { ...input, shift: false, nitro: false, fireEdge: false, rearEdge: false, shield: false, ram: 0 }),
                  nowMs: now + stepI * (1000 / 60),
                };
                stepI += 1;
                const worn = armedDef(saveRef.current.arm, saveRef.current.frontal);
                const tail = armedRear(saveRef.current.rearArm, saveRef.current.rear);
                armWeapon(sim.player, worn.id, worn);
                armRear(sim.player, tail.id, tail);
                stepMatch(sim, stepIn, 1 / 60, up, rivalUp);
                events.push(...sim.events);
                first = false;
                acc.v -= 1 / 60;
                guard += 1;
              }
              for (const ev of events) {
                if (ev.startsWith("shift:perfeito") || ev === "launch:perfeito") audio.blip("good");
                else if (ev.startsWith("shift:") || ev.startsWith("launch:")) audio.blip("shift");
                if (ev.startsWith("nitro")) audio.blip(ev.endsWith("limpo") ? "nitro" : "bad");
                if (ev === "redlight" || ev === "wall" || ev === "hurt") audio.blip("bad");
                if (ev === "hit" || ev === "ammo") audio.blip("good");
                if (ev === "band" || ev === "lamp") audio.blip("tick");
                if (ev === "green") audio.blip("nitro");
                if (ev === "lock" || ev === "shot" || ev === "agora" || ev === "shield" || ev === "ram") audio.blip("good");
                if (ev === "cuspe") audio.blip("tick");
                if (ev === "mine" || ev === "heat") audio.blip("bad");
              }
              audio.engineRpm(sim.player.rpm, sim.player.launched || sim.phase !== "free", sim.player.nitroOn > 0);
              if (sim.pvp && roomRef.current) {
                netRef.current.acc += dt;
                if (netRef.current.acc > 0.05) {
                  netRef.current.acc = 0;
                  const racer = sim.player;
                  roomRef.current.broadcast({
                    t: "car",
                    dist: racer.dist,
                    lane: racer.lane,
                    speed: racer.speed,
                    yaw: racer.yaw,
                    nitro: racer.nitroOn,
                    hp: racer.hp,
                    hpMax: racer.hpMax,
                    wrecked: racer.wrecked,
                    finished: racer.finished,
                    et: racer.finishTime,
                    gear: racer.gear,
                    rpm: racer.rpm,
                    launched: racer.launched,
                    poison: racer.poison,
                    freeze: racer.freeze,
                    slow: racer.slow,
                    slowT: racer.slowT,
                    aim: sim.aimLock ? 1 : sim.aim,
                  });
                }
                for (const shot of sim.shots) {
                  if (shot.owner !== "you" || netRef.current.sent.has(shot.id)) continue;
                  netRef.current.sent.add(shot.id);
                  roomRef.current.send({
                    t: "shot",
                    id: shot.id,
                    weapon: shot.weapon,
                    dist: shot.dist,
                    lane: shot.lane,
                    speed: shot.speed,
                    life: shot.life,
                    lock: shot.lock,
                    hit: shot.hit,
                    sure: !!shot.sure,
                    back: !!shot.back,
                    dmg: shot.dmg,
                  });
                }
              }
              if (sim.phase === "finish" && !resultLock.current && (sim.mode === "duel" || sim.mode === "free")) {
                resultLock.current = true;
                const verdict = raceVerdict(sim);
                const win = verdict === "win";
                const draw = verdict === "draw";
                const chapter = phase?.chapter ?? 0;
                const firstClear = win && chapter === (saveRef.current.storyClear ?? 0) + 1;
                const stake = sim.pvp ? netRef.current.stake : 0;
                const bet = sim.pvp && stake > 0;
                const table = potOf(stake);
                const finished = sim.player.finishTime != null;
                const stars: [boolean, boolean, boolean] = [
                  sim.player.launchGrade === "perfeito",
                  !!sim.rival?.wrecked,
                  !sim.player.wrecked && sim.player.hp >= sim.player.hpMax - 0.5,
                ];
                const boss = phase ? BOSSES[phase.chapter] : undefined;
                const streetKey = sim.rivalId?.startsWith("racha-") ? sim.rivalId.slice(6) : "";
                const streetCar = streetKey ? streetById(streetKey) : undefined;
                const youNow = selectedCar(saveRef.current);
                let gainedId: string | null = null;
                let stolen: ReturnType<typeof ownedLoot> = null;
                if (streetCar && !bet) {
                  const drop = rollLoot(win ? streetCar.rarity : youNow.rarity);
                  if (drop && win) gainedId = drop;
                  else if (drop && !win) stolen = ownedLoot(saveRef.current);
                }
                const baseWin = bet ? 0 : phase ? phase.fossil : streetCar ? STREET_PRIZE[streetCar.rarity] : 100;
                const pay = bet ? null : purse(baseWin, draw ? "draw" : win ? "win" : "loss", sim);
                const paid = bet ? (draw ? stake : win ? table.payout : 0) : (pay?.total ?? 0);
                if (pay) {
                  const stats = raceStatsOf(sim, paid, win, pay.base, pay.cap);
                  window.dispatchEvent(new CustomEvent("raceStats", { detail: stats }));
                }
                const lootNote = stolen ? `Ele levou ${stolen.name}.` : undefined;
                const burnedNote = sim.player.redlight
                  ? "Queimou a largada: 0,6 s parado depois do VAI. O lugar é pelo tempo, não pela queima."
                  : "";
                const note = draw
                  ? "EMPATE / DNF DUPLO"
                  : bet
                  ? win
                    ? `Pote ${table.pot}. A casa ficou com ${table.fee}.`
                    : `A aposta de ${stake} ficou na mesa.`
                  : lootNote
                    ? lootNote
                    : sim.pvp
                      ? win
                        ? "Sem aposta. O fóssil é o da corrida."
                        : "Sem aposta. A derrota paga menos."
                      : boss
                        ? win
                          ? boss.win
                          : !finished && sim.player.dist < 40
                            ? "Você não saiu da largada. Segura o espaço e solta no VAI."
                            : (sim.player.taken.mine ?? 0) > 0
                              ? boss.loss
                              : sim.player.wrecked
                                ? boss.loss
                                : "Ele chegou primeiro."
                        : undefined;
                const shownNote = [burnedNote, note].filter(Boolean).join(" ");
                const oldRival = !streetCar && streetKey ? RIVALS.find((item) => item.id === streetKey) : undefined;
                const rivalName = sim.pvp
                  ? netRef.current.name
                  : sim.mode === "free"
                    ? "Treino"
                    : streetCar
                      ? `${streetCar.name} · ${streetCar.rarity}`
                      : driverById((oldRival?.driver ?? phase?.driver ?? "geck")).name;
                const daily = bumpDaily(saveRef.current, {
                  finish: 1,
                  win: win ? 1 : 0,
                  shift: sim.player.shifts.filter((grade) => grade === "perfeito").length,
                });
                const snap: Result = {
                  win,
                  draw,
                  et: sim.player.finishTime,
                  rivalEt: sim.rival?.finishTime ?? null,
                  reaction: sim.player.reaction,
                  launch: sim.player.launchGrade,
                  trap: sim.player.trap,
                  grades: sim.player.shifts.slice(),
                  fossil: paid,
                  part: firstClear ? phase!.part.name : gainedId ? (partById(gainedId)?.name ?? gainedId) : null,
                  redlight: sim.player.redlight,
                  rivalName,
                  rivalId: sim.rivalId ?? "fase-1",
                  rivalReaction: sim.rival?.reaction ?? null,
                  rivalLaunch: sim.rival?.launchGrade ?? null,
                  rivalTrap: sim.rival?.trap ?? 0,
                  rivalGrades: sim.rival?.shifts.slice() ?? [],
                  youPlace: win || draw ? 1 : 2,
                  rivalPlace: draw || !win ? 1 : 2,
                  hp: sim.player.hp,
                  hpMax: sim.player.hpMax,
                  wrecked: sim.player.wrecked,
                  gears: sim.player.gears,
                  rivalGears: sim.rival?.gears ?? 5,
                  rivalHp: sim.rival?.hp,
                  rivalHpMax: sim.rival?.hpMax,
                  stars,
                  note: shownNote || undefined,
                  mission: missionReady({ ...saveRef.current, daily }) ? "Missão do dia pronta. Recolhe o fóssil na preparação." : null,
                  bonusPct: pay?.cap ?? 0,
                  bonusLines: pay?.lines.map((line) => line.label) ?? [],
                  baseFossil: pay?.base ?? paid,
                  hits: sim.player.hits,
                  fired: sim.player.fired,
                  crates: sim.player.crates,
                  nitroPerfect: sim.player.nitroPerfect,
                  nitroUsed: sim.player.nitroUsed,
                  dodged: sim.player.dodged,
                  draftTime: sim.player.draftTime,
                  reason: raceReason(sim),
                };
                setResult(snap);
                void reportQuestRace({ data: { won: win } }).catch(() => undefined);
                setScreen("result");
                screenRef.current = "result";
                setSave((prevSave) => {
                  const next: Save = {
                    ...prevSave,
                    fossil: prevSave.fossil + paid,
                    races: prevSave.races + 1,
                    wins: prevSave.wins + (win ? 1 : 0),
                    best: { ...prevSave.best },
                    daily,
                  };
                  if (win && snap.et != null) {
                    const old = next.best[snap.rivalId];
                    if (old == null || snap.et < old) next.best[snap.rivalId] = snap.et;
                  }
                  if (firstClear && phase) next.storyClear = chapter;
                  if (gainedId) next.bin = { ...(next.bin ?? {}), [gainedId]: (next.bin?.[gainedId] ?? 0) + 1 };
                  if (stolen && !stolen.slot) {
                    const have = next.bin?.[stolen.id] ?? 0;
                    if (have > 0) {
                      const bin = { ...(next.bin ?? {}) };
                      if (have <= 1) delete bin[stolen.id];
                      else bin[stolen.id] = have - 1;
                      next.bin = bin;
                    }
                  }
                  next.cars = next.cars.map((car) => {
                    if (car.tokenId !== next.selected) return car;
                    let gear = car.gear;
                    if (stolen?.slot && gear?.[stolen.slot] === stolen.id) {
                      gear = { ...gear };
                      delete gear[stolen.slot];
                    }
                    return {
                      ...car,
                      gear,
                      xp: (car.xp ?? 0) + raceXp(win),
                      upgrades: firstClear && phase ? grantStoryPart(car.upgrades, phase.part) : car.upgrades,
                      hull: { hp: sim.player.hp, max: sim.player.hpMax, wrecked: sim.player.wrecked, at: Date.now() },
                    };
                  });
                  saveRef.current = next;
                  writeSave(next);
                  return next;
                });
              }
            } else if (screenRef.current === "intro" || screenRef.current === "pvp") {
              audio.engineRpm(0, false, false);
            } else {
              sim.player.rpm = 1400 + Math.sin(now / 280) * 180;
              sim.shake = 0;
              audio.engineRpm(sim.player.rpm, false, false);
            }
            const car = selectedCar(saveRef.current);
            if (screenRef.current === "intro") {
              ctx.fillStyle = "#000";
              ctx.fillRect(0, 0, VIEW_W, VIEW_H);
            } else if (screenRef.current !== "pvp") {
              const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
              const streetId = sim.rivalId?.startsWith("racha-") ? sim.rivalId.slice(6) : "";
              const streetCar = streetId ? streetById(streetId) : undefined;
              const street = !streetCar && streetId ? RIVALS.find((item) => item.id === streetId) : undefined;
              const sprite = sim.pvp ? netRef.current.sprite : phase ? driverById(phase.driver).sprite : streetCar ? driverById(streetCar.driver).sprite : street ? driverById(street.driver).sprite : 2;
              const cockpitId = cockpitPlate(car, artRef.current);
              const plateKey = cockpitKey(car, artRef.current);
              const named = car.exclusive?.name?.toLowerCase() === "babado" ? "babado" : undefined;
              const clipId = car.exclusive?.modelId ?? named ?? plateKey;
              const motion = cockpitMotion(clipId) ?? cockpitMotion(plateKey);
              const gaugeKey = clipId === "babado" || clipId === "pescoco" ? clipId : plateKey;
              const digital = saveRef.current.gauge === "digital";
              const strip = saveRef.current.strip === "fade" || saveRef.current.strip === "off" ? saveRef.current.strip : "solid";
              const you = youArt.current ?? artRef.current.sides[driverById(car.driverId).sprite] ?? artRef.current.cars[0];
              try {
                if (sim.presentHold > 0) sim.presentHold = Math.max(0, sim.presentHold - dt);
                else drawFrame(ctx, sim, artRef.current, stacked(car), car.neon, sprite, events, now / 1000, reduce || !!saveRef.current.reduceFx, cockpitId, you, gaugeKey, motion, digital, strip);
              } catch {
                /* um quadro ruim não pode matar o giro */
              }
              const box = treeBox.current;
              if (box) {
                const lamps = box.querySelectorAll<HTMLElement>("[data-lamp]");
                const grade = box.querySelector<HTMLElement>("[data-grade]");
                const onTrack = screenRef.current === "drive" && sim.mode === "duel";
                const prep = onTrack && (sim.phase === "staging" || sim.phase === "tree" || (sim.phase === "race" && !sim.player.launched && sim.raceTime < 1.6));
                const word =
                  sim.phase === "race"
                    ? sim.player.launched
                      ? sim.player.launchGrade === "perfeito"
                        ? "BOA"
                        : sim.player.launchGrade === "ok"
                          ? "FOI"
                          : sim.player.launchGrade === "patinou"
                            ? "PATINOU"
                            : sim.player.launchGrade === "morreu"
                              ? "MORREU"
                              : sim.player.launchGrade === "queimou"
                                ? "QUEIMOU"
                                : "VAI"
                      : "SOLTA"
                    : sim.phase === "tree"
                      ? sim.t < 1
                        ? "3"
                        : sim.t < 2
                          ? "2"
                          : "1"
                      : "SEGURA ESPAÇO + W";
                const chaseView = sim.view !== "cockpit";
                box.style.display = prep && !chaseView ? "block" : "none";
                box.style.visibility = prep && !chaseView ? "visible" : "hidden";
                lamps.forEach((lamp, index) => {
                  const on = sim.phase === "tree" && sim.t >= index + 0.05;
                  const color = index === 0 ? "#ff2a2a" : index === 1 ? "#ffb020" : "#d6ff3f";
                  lamp.style.visibility = sim.phase === "race" ? "hidden" : "visible";
                  lamp.style.background = on ? color : "#070806";
                  lamp.style.color = on ? "#070806" : "rgba(255,255,255,0.28)";
                  lamp.style.boxShadow = on ? `0 0 22px ${color}` : "none";
                });
                if (grade) {
                  grade.style.visibility = prep ? "visible" : "hidden";
                  grade.textContent = word;
                  grade.style.color = word === "QUEIMOU" ? "#ff3b1f" : "#d6ff3f";
                }
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const car = selectedCar(save);

  useEffect(() => {
    const mark = sideMark(car);
    const img = new Image();
    img.onload = () => {
      const punch = (source: CanvasImageSource) => {
        const w = (source as { width?: number }).width ?? 0;
        const h = (source as { height?: number }).height ?? 0;
        if (w < 2 || h < 2) return source;
        const board = document.createElement("canvas");
        board.width = w;
        board.height = h;
        const g = board.getContext("2d", { willReadFrequently: true });
        if (!g) return source;
        g.drawImage(source, 0, 0);
        const frame = g.getImageData(0, 0, w, h);
        const px = frame.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i] ?? 0;
          const gg = px[i + 1] ?? 0;
          const b = px[i + 2] ?? 0;
          const a = px[i + 3] ?? 0;
          if (a < 20) continue;
          if (r > 170 && b > 170 && gg < 150 && Math.abs(r - b) < 80) px[i + 3] = 0;
        }
        g.putImageData(frame, 0, 0);
        return board;
      };
      if (!mark.flip) {
        youArt.current = punch(img);
        return;
      }
      const board = document.createElement("canvas");
      board.width = img.width;
      board.height = img.height;
      const g = board.getContext("2d");
      if (!g) {
        youArt.current = punch(img);
        return;
      }
      g.translate(board.width, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0);
      youArt.current = punch(board);
    };
    img.src = mark.src;
  }, [car]);

  function commit(next: Save) {
    writeSave(next);
    setSave(next);
  }

  function unlock() {
    audioRef.current?.unlock();
    audioRef.current?.setMuted(saveRef.current.muted);
  }

  function arm(sim: Match) {
    const worn = armedDef(saveRef.current.arm, saveRef.current.frontal);
    const tail = armedRear(saveRef.current.rearArm, saveRef.current.rear);
    armWeapon(sim.player, worn.id, worn);
    armRear(sim.player, tail.id, tail);
    const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
    if (phase && sim.rival) {
      const piece = armById(storyLoadout(phase).arm);
      if (piece) armWeapon(sim.rival, piece.kind, piece.weapon);
      const boss = BOSSES[phase.chapter];
      const rear = boss ? armById(boss.rear) : undefined;
      if (rear) armRear(sim.rival, rear.kind, rear.weapon);
      if (boss) {
        sim.callout = boss.before;
        sim.calloutT = 2.8;
      }
    } else if (sim.rival && sim.mode === "duel") {
      const front = armedDef(undefined, "missile");
      const back = armedRear(undefined, "mine");
      armWeapon(sim.rival, front.id, front);
      armRear(sim.rival, back.id, back);
    }
    return sim;
  }

  function goFree() {
    if (!ready || !artRef.current) return;
    unlock();
    const c = selectedCar(saveRef.current);
    simRef.current = arm(createFree(statsOf(c, saveRef.current.pilot, saveRef.current.kit), gearsFor(c.rarity)));
    resultLock.current = false;
    setAgain({ kind: "free" });
    screenRef.current = "drive";
    setScreen("drive");
  }

  function goStory(phase: StoryPhase) {
    if (!ready || !artRef.current) return;
    if (!storyOpen(saveRef.current.storyClear ?? 0, phase.chapter)) return;
    unlock();
    const c = selectedCar(saveRef.current);
    const load = storyLoadout(phase);
    const bot = botForLevel(levelForChapter(phase.chapter));
    bot.aim = Math.max(bot.aim ?? 0, load.aim);
    simRef.current = arm(
      createDuel(
        `fase-${phase.chapter}`,
        bot,
        statsOf(c, saveRef.current.pilot, saveRef.current.kit),
        rivalStats(phase),
        gearsFor(c.rarity),
        gearsFor(phase.rarity),
      ),
    );
    resultLock.current = false;
    screenRef.current = "drive";
    setAgain({ kind: "story", chapter: phase.chapter });
    setScreen("drive");
  }

  function goStreet(car: NonNullable<ReturnType<typeof streetById>>) {
    if (!ready || !artRef.current) return;
    unlock();
    const c = selectedCar(saveRef.current);
    const you = statsOf(c, saveRef.current.pilot, saveRef.current.kit);
    const picked = saveRef.current.ai === "medio" || saveRef.current.ai === "dificil" ? saveRef.current.ai : "facil";
    const bot = botForLevel(picked);
    const them = bandStats(you, resolveStats(car.driver, car.rarity, streetBuild(car.rarity), car.id));
    const gears = gearsFor(c.rarity);
    simRef.current = arm(
      createDuel(
        `racha-${car.id}`,
        bot,
        you,
        them,
        gears,
        gears,
      ),
    );
    resultLock.current = false;
    setAgain({ kind: "racha", id: car.id });
    screenRef.current = "drive";
    setScreen("drive");
  }

  function goRacha(rival: (typeof RIVALS)[number]) {
    if (!ready || !artRef.current) return;
    unlock();
    const c = selectedCar(saveRef.current);
    const you = statsOf(c, saveRef.current.pilot, saveRef.current.kit);
    const them = resolveStats(rival.driver, "Normal", rival.build);
    simRef.current = arm(
      createDuel(
        `racha-${rival.id}`,
        botForLevel(saveRef.current.ai === "medio" || saveRef.current.ai === "dificil" ? saveRef.current.ai : "facil"),
        you,
        them,
        gearsFor(c.rarity),
        gearsFor("Normal"),
      ),
    );
    resultLock.current = false;
    setAgain({ kind: "racha", id: rival.id });
    screenRef.current = "drive";
    setScreen("drive");
  }

  function finishIntro() {
    markPrologue();
    videoRef.current?.pause();
    screenRef.current = "rivals";
    setScreen("rivals");
  }

  function openStory() {
    unlock();
    if (prologueSeen()) {
      screenRef.current = "rivals";
      setScreen("rivals");
      return;
    }
    screenRef.current = "intro";
    setScreen("intro");
  }

  useEffect(() => {
    if (screen !== "pvp") return;
    const timer = window.setInterval(() => {
      const room = roomRef.current;
      if (!room || netRef.current.started) return;
      const peer = room.peerList().find((item) => item.connectionState === "connected");
      if (!peer) {
        setPvpLink("procurando o outro piloto");
        return;
      }
      netRef.current.rivalId = peer.id;
      setPvpPeer(peer.name || "Piloto");
      room.send({
        t: "hello",
        name: netRef.current.roll?.name || saveRef.current.callsign || "Piloto",
        sprite: netRef.current.roll?.sprite ?? driverById(selectedCar(saveRef.current).driverId).sprite,
      });
      if (selfId.current < peer.id) {
        const strip = stripFor(netRef.current.roll?.stats ?? statsOf(selectedCar(saveRef.current), saveRef.current.pilot, saveRef.current.kit));
        room.send({ t: "go", strip });
        bootRef.current(strip);
        setPvpLink("largada");
      } else {
        setPvpLink("conectado · esperando a largada");
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [screen]);

  function openPvp() {
    setPvpBet(false);
    unlock();
    screenRef.current = "pvp";
    setScreen("pvp");
    stakeIn(0);
  }

  function openBet() {
    queueTicket.current += 1;
    roomRef.current?.close();
    roomRef.current = null;
    netRef.current.started = false;
    netRef.current.paid = false;
    netRef.current.stake = 0;
    setPvpBet(true);
    setPvpStake((current) => (STAKES.includes(current) ? current : 100));
    setPvpHunt(false);
    setPvpPeer("");
    setPvpLink("escolhe a aposta");
    unlock();
    screenRef.current = "pvp";
    setScreen("pvp");
  }

  function enterRoom(roomId: string, stake: number) {
    roomRef.current?.close();
    netRef.current.stake = stake;
    setPvpBet(stake > 0);
    if (!netRef.current.roll) netRef.current.roll = rollPvp();
    setPvpStake(stake);
    setPvpHunt(true);
    const room = new P2PRoom({
      room: roomId,
      selfId: selfId.current,
      name: netRef.current.roll?.name || "Piloto",
      onMessage: (_from, data) => {
        const msg = asPvpMsg(data);
        if (msg) inboxRef.current.push(msg);
      },
    });
    roomRef.current = room;
    void room.join();
    setPvpLink(stake > 0 ? "aposta aceita" : "piloto encontrado");
  }

  const enterRef = useRef(enterRoom);
  enterRef.current = enterRoom;
  useEffect(() => {
    if (!duel || !selfKey) return;
    selfId.current = selfKey;
    enterRef.current(duel, 0);
    unlock();
    screenRef.current = "pvp";
    setScreen("pvp");
  }, [duel, selfKey]);

  function stakeIn(stake: number) {
    if (saveRef.current.fossil < stake) return;
    roomRef.current?.close();
    roomRef.current = null;
    const ticket = queueTicket.current + 1;
    queueTicket.current = ticket;
    netRef.current.started = false;
    netRef.current.paid = false;
    netRef.current.seen.clear();
    netRef.current.sent.clear();
    netRef.current.rivalId = "";
    netRef.current.stake = stake;
    netRef.current.roll = rollPvp();
    setPvpStake(stake);
    setPvpHunt(true);
    setPvpPeer("");
    setPvpLink(stake > 0 ? `procurando aposta de ${stake}` : "procurando piloto");
    const hunt = async () => {
      while (queueTicket.current === ticket && !netRef.current.started) {
        try {
          const res = await fetch("/api/rtc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op: "queue",
              peer: selfId.current,
              name: netRef.current.roll?.name || "Piloto",
              stake,
            }),
          });
          const body = (await res.json()) as { room?: string };
          if (queueTicket.current !== ticket || netRef.current.started) return;
          if (body.room) {
            enterRoom(body.room, stake);
            return;
          }
        } catch {
          // tenta de novo
        }
        await new Promise((r) => setTimeout(r, 280));
      }
    };
    void hunt();
  }

  async function sit(table: { id: string; name: string; stake: number }) {
    if (saveRef.current.fossil < table.stake) return;
    queueTicket.current += 1;
    roomRef.current?.close();
    roomRef.current = null;
    netRef.current.started = false;
    netRef.current.paid = false;
    netRef.current.seen.clear();
    netRef.current.sent.clear();
    netRef.current.rivalId = "";
    netRef.current.roll = rollPvp();
    setPvpPeer(table.name);
    setPvpLink(`entrando na mesa de ${table.stake}`);
    try {
      const res = await fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "sit",
          peer: selfId.current,
          name: netRef.current.roll.name,
          table: table.id,
        }),
      });
      const body = (await res.json()) as { room?: string; stake?: number };
      if (body.room) {
        enterRoom(body.room, body.stake ?? table.stake);
        return;
      }
    } catch {
      // mesa caiu
    }
    setPvpLink("essa mesa fechou");
  }

  useEffect(() => {
    if (screen !== "pvp" || pvpHunt) return;
    let stop = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/rtc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "tables", peer: selfId.current }),
        });
        const body = (await res.json()) as { tables?: { id: string; name: string; stake: number }[] };
        if (!stop) setTables(body.tables ?? []);
      } catch {
        if (!stop) setTables([]);
      }
    };
    void pull();
    const timer = window.setInterval(pull, 1000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [screen, pvpHunt]);

  useEffect(() => {
    if (screen !== "intro") return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = saveRef.current.muted;
    void v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => undefined);
    });
  }, [screen]);

  function backMenu() {
    queueTicket.current += 1;
    setPvpHunt(false);
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "unqueue", peer: selfId.current }),
    }).catch(() => undefined);
    roomRef.current?.close();
    roomRef.current = null;
    netRef.current.started = false;
    screenRef.current = "menu";
    setScreen("menu");
    const c = selectedCar(saveRef.current);
    simRef.current = arm(createFree(statsOf(c, saveRef.current.pilot, saveRef.current.kit), gearsFor(c.rarity)));
    resultLock.current = false;
  }

  const storyBoot = useRef(false);
  useEffect(() => {
    if (!ready || !story || storyBoot.current) return;
    if (screenRef.current === "drive" || screenRef.current === "result") return;
    storyBoot.current = true;
    openStory();
  }, [ready, story]);

  useEffect(() => {
    if (!ready || !racha) return;
    const street = streetById(racha);
    if (street) {
      goStreet(street);
      return;
    }
    const rival = RIVALS.find((item) => item.id === racha);
    if (rival) goRacha(rival);
  }, [ready, racha]);

  useEffect(() => {
    if (!ready || !rivalId || story) return;
    const phase = STORY.find((item) => item.driver === rivalId);
    if (phase && storyOpen(saveRef.current.storyClear ?? 0, phase.chapter)) goStory(phase);
  }, [ready, rivalId, story]);

  function replay() {
    if (again.kind === "story") {
      const phase = STORY.find((item) => item.chapter === again.chapter);
      if (phase) {
        goStory(phase);
        return;
      }
    }
    if (again.kind === "racha") {
      const street = streetById(again.id);
      if (street) {
        goStreet(street);
        return;
      }
      const rival = RIVALS.find((item) => item.id === again.id);
      if (rival) {
        goRacha(rival);
        return;
      }
    }
    if (again.kind === "pvp") {
      if (again.stake > 0) {
        openBet();
        stakeIn(again.stake);
        return;
      }
      openPvp();
      return;
    }
    goFree();
  }

  const press = (key: "gas" | "left" | "right" | "fire" | "rear" | "brake") => ({
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      hold.current[key] = true;
    },
    onPointerUp: () => {
      if (key === "brake") keyClock.brakeUp = performance.now();
      hold.current[key] = false;
    },
    onPointerCancel: () => {
      hold.current[key] = false;
    },
  });

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        className={`absolute inset-0 h-full w-full bg-bg object-contain ${screen === "intro" ? "invisible" : ""}`}
        aria-label="Pista Dino Drag Race"
      />
      <div
        ref={treeBox}
        className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2"
        style={{ display: "none" }}
      >
        <div className="flex items-center justify-center gap-2">
          {["3", "2", "1"].map((num, index) => (
            <span
              key={num}
              data-lamp={index}
              className="grid h-16 w-16 place-items-center border border-white/30 bg-black font-display text-5xl leading-none"
            >
              {num}
            </span>
          ))}
        </div>
        <p data-grade className="mt-2 text-center font-display text-4xl leading-none" />
      </div>
      {!ready && (
        <p className="absolute bottom-6 left-6 font-display text-4xl text-primary">Acendendo o giro…</p>
      )}

      {screen === "intro" && (
        <section className="absolute inset-0 z-40 bg-black">
          <video
            ref={videoRef}
            src="/game/prologue-cave.mp4?v=3"
            className="h-full w-full object-contain"
            playsInline
            onEnded={finishIntro}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <p className="text-xs font-semibold tracking-widest text-primary">PRÓLOGO · A ARMA VIVA</p>
            <button
              type="button"
              className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink"
              onClick={finishIntro}
            >
              Pular
            </button>
          </div>
        </section>
      )}

      {screen === "menu" && ready && (
        <Prep save={save} ready={ready} treino={treino} onCommit={commit} onRun={treino ? goFree : () => {
          const c = selectedCar(saveRef.current);
          goStreet(streetNear(c.rarity, saveRef.current.races ?? 0));
        }} onStory={openStory} onPvp={openPvp} onBet={openBet} />
      )}

      {screen === "pvp" && (
        <section className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg/92 p-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary">{pvpBet ? "PVP · APOSTA" : "PVP"}</p>
          {pvpHunt && !pvpBet ? (
            <>
              <h2 className="mt-3 font-display text-6xl leading-none text-fg sm:text-8xl">Procurando</h2>
              <p className="mt-4 font-display text-3xl text-primary">{pvpLink}{pvpPeer ? ` · ${pvpPeer}` : ""}</p>
              <p className="mt-3 max-w-md text-pretty text-muted">
                Corrida contra outro piloto. Sem mesa e sem pote. Quem chega primeiro leva o fóssil da corrida.
              </p>
            </>
          ) : pvpHunt ? (
            <>
              <h2 className="mt-3 font-display text-6xl leading-none text-fg sm:text-8xl">Procurando</h2>
              <p className="mt-4 font-display text-3xl text-primary">{pvpLink}{pvpPeer ? ` · ${pvpPeer}` : ""}</p>
              <p className="mt-3 max-w-md text-pretty text-muted">
                Mesa de {pvpStake} fóssil. O outro entra com o mesmo valor. O carro da vez é {netRef.current.roll?.name ?? "aleatório"}.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-3 font-display text-6xl leading-none text-fg sm:text-8xl">Aposta</h2>
              <p className="mt-3 max-w-md text-pretty text-muted">
                Escolhe o valor e abre uma mesa, ou entra numa que já está aberta. Quem ganha leva o pote. A casa fica com 5%.
              </p>
              <div className="mt-5 w-full max-w-md text-left">
                <p className="text-xs font-semibold tracking-widest text-primary">MESAS ABERTAS</p>
                {tables.filter((table) => table.stake > 0).length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Nenhuma mesa aberta agora.</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {tables.filter((table) => table.stake > 0).map((table) => {
                      const short = save.fossil < table.stake;
                      return (
                        <li key={table.id}>
                          <button
                            type="button"
                            disabled={short}
                            onClick={() => void sit(table)}
                            className="flex min-h-11 w-full items-center justify-between border border-border bg-black/45 px-3 text-left disabled:opacity-40"
                          >
                            <span className="text-sm text-fg">{table.name}</span>
                            <span className="font-display text-2xl text-primary">{table.stake} fóssil</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STAKES.map((stake) => {
                  const table = potOf(stake);
                  const short = save.fossil < stake;
                  const on = pvpStake === stake;
                  return (
                    <button
                      key={stake}
                      type="button"
                      disabled={short}
                      onClick={() => setPvpStake(stake)}
                      className="min-h-11 border px-3 text-left disabled:opacity-40"
                      style={{ borderColor: on ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.45)" }}
                    >
                      <span className="block font-display text-3xl leading-none text-primary">{stake}</span>
                      <span className="block text-[10px] text-muted">leva {table.payout}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={pvpStake <= 0 || save.fossil < pvpStake}
                className="mt-6 min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink disabled:opacity-40"
                onClick={() => stakeIn(pvpStake)}
              >
                Apostar {pvpStake}
              </button>
            </>
          )}
          <p className="mt-4 text-sm text-muted">Na conta {Math.round(save.fossil).toLocaleString("pt-BR")} fóssil</p>
          <button type="button" className="mt-6 inline-flex min-h-11 items-center gap-2 border border-border px-4 text-fg" onClick={backMenu}>
            <ChevronLeft className="size-5" />
            Cancelar
          </button>
        </section>
      )}

      {screen === "rivals" && (
        <section className="absolute inset-0 z-40 overflow-y-auto bg-bg p-4 md:p-10">
          <button type="button" className="mb-4 inline-flex min-h-11 items-center gap-2 text-fg" onClick={() => setScreen("menu")}>
            <ChevronLeft className="size-5" />
            Voltar
          </button>
          <h2 className="font-display text-5xl leading-none">Modo história</h2>
          <p className="mt-2 max-w-xl text-sm text-pretty text-muted">
            A arma não era pedra. Era osso, samambaia e gosma. Os líderes não sentaram de terno: vestiram sucata de nave, vigia, antena e visor rachado. A guerra virou corrida numa faixa larga. Você troca de faixa. O rival fica na dele.
          </p>
          <button type="button" className="mt-3 text-sm text-primary" onClick={openStory}>
            Ver o prólogo de novo
          </button>
          <ul className="mt-4 grid max-w-3xl gap-3">
            {STORY.map((phase) => {
              const d = driverById(phase.driver);
              const open = storyOpen(save.storyClear ?? 0, phase.chapter);
              const done = (save.storyClear ?? 0) >= phase.chapter;
              return (
                <li key={phase.chapter} className={`flex flex-wrap items-center gap-3 border bg-surface p-3 ${open ? "border-border" : "border-border opacity-50"}`}>
                  <img src={`/game/pilot-${d.sprite}.png`} alt="" className="size-14 object-cover sm:size-16" />
                  <img src={`/game/car-${d.sprite}.png`} alt="" className="size-12 object-contain sm:size-14" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-display text-2xl leading-none sm:text-3xl">
                      Fase {phase.chapter} · {d.name}
                    </p>
                    <p className="text-sm text-muted">
                      {d.line}
                    </p>
                    <p className="text-sm text-muted">
                      {done ? "Limpa" : open ? "Aberta" : "Bloqueada"} · {phase.fossil} fóssil · {phase.part.grade === "monstro" ? "peça monstro" : "peça normal"} {phase.part.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!open}
                    className="min-h-11 bg-primary px-3 font-display text-2xl leading-none text-ink disabled:opacity-40"
                    onClick={() => goStory(phase)}
                  >
                    {open ? "Correr" : "Travada"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {screen === "drive" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
          {save.races === 0 && (
            <p className="pointer-events-none absolute left-1/2 top-44 z-20 max-w-sm -translate-x-1/2 bg-bg/80 px-3 py-2 text-center text-sm text-primary">
              {again.kind === "free"
                ? "Segura o gás. Shift sobe a marcha quando aparecer TROCA. F atira na frente. G atira atrás."
                : "Segura ESPAÇO e W até o giro ficar verde (GIRO CERTO). Solta o ESPAÇO no VAI. W sozinho passa de 5500 e patina. Shift só quando aparecer AGORA. F míssil. G mina."}
            </p>
          )}
          <div className="pointer-events-auto flex items-center justify-between">
            <button type="button" className="inline-flex min-h-11 items-center gap-1 bg-bg/80 px-3 text-fg" onClick={backMenu}>
              <ChevronLeft className="size-5" />
              Pits
            </button>
            <button
              type="button"
              className={`inline-flex min-h-11 items-center bg-bg/80 px-3 text-sm ${save.reduceFx ? "text-primary" : "text-fg"}`}
              aria-pressed={!!save.reduceFx}
              onClick={() => commit({ ...save, reduceFx: !save.reduceFx })}
            >
              {save.reduceFx ? "Efeitos reduzidos" : "Reduzir efeitos"}
            </button>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center bg-bg/80 text-fg"
              aria-label={save.muted ? "Ligar som" : "Mutar"}
              onClick={() => {
                const next = { ...save, muted: !save.muted };
                audioRef.current?.setMuted(next.muted);
                commit(next);
              }}
            >
              {save.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          </div>
          <div className="pointer-events-auto grid grid-cols-5 gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("left")} aria-label="Faixa esquerda">
              <span className="block text-xs">Esq</span>
              <span className="font-display text-sm leading-none">{keyLabel(readKeys(save).left)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("gas")}>
              <span className="block font-display text-sm leading-none">Gás</span>
              <span className="text-xs">{keyLabel(readKeys(save).gas)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("brake")}>
              <span className="block font-display text-sm leading-none">Freio</span>
              <span className="text-xs">Espaço</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("fire")}>
              <span className="block font-display text-sm leading-none">Frente</span>
              <span className="text-xs">{keyLabel(readKeys(save).fire)}</span>
            </button>
            <button
              type="button"
              className="min-h-14 bg-danger text-fg"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                hold.current.nitro = true;
                pending.nitro = true;
              }}
            >
              <span className="block font-display text-sm leading-none">Nitro</span>
              <span className="text-xs">{keyLabel(readKeys(save).nitro)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("right")} aria-label="Faixa direita">
              <span className="block text-xs">Dir</span>
              <span className="font-display text-sm leading-none">{keyLabel(readKeys(save).right)}</span>
            </button>
            <button
              type="button"
              className="min-h-14 bg-primary text-ink"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                hold.current.shift = true;
              }}
            >
              <span className="block font-display text-sm leading-none">Marcha</span>
              <span className="text-xs">{keyLabel(readKeys(save).shift)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("rear")}>
              <span className="block font-display text-sm leading-none">Trás</span>
              <span className="text-xs">{keyLabel(readKeys(save).rear)}</span>
            </button>
            <button
              type="button"
              className="min-h-14 bg-surface text-fg"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                edges.current.shield = true;
                pending.shield = true;
              }}
            >
              <span className="block font-display text-sm leading-none">Escudo</span>
              <span className="text-xs">E</span>
            </button>
          </div>
          <p className="pointer-events-none pb-1 text-right text-xs text-muted">
            {again.kind === "free"
              ? "Segura o gás · Shift sobe a marcha · N nitro · F frente · G traseira · A e D na faixa"
              : "ESPAÇO + W até GIRO CERTO · solta o ESPAÇO no VAI · W sozinho patina · Shift quando disser AGORA · N nitro · F míssil · G mina · E escudo · A/D faixa · V câmera"}
          </p>
        </div>
      )}

      {screen === "result" && result && (
        <section className="absolute inset-0 flex items-end overflow-y-auto bg-bg/70 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 md:items-center md:justify-center">
          <div className="w-full max-w-3xl border border-border bg-bg p-5">
            <p className="text-xs tracking-widest text-primary">{result.draw ? "EMPATE" : result.win ? "VOCÊ GANHOU" : "VOCÊ PERDEU"}</p>
            {result.reason ? <p className="mt-1 text-sm text-fg">{result.reason}</p> : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ResultCard
                place={result.youPlace}
                name="Você"
                car={carLabel(car)}
                et={result.et}
                reaction={result.reaction}
                trap={result.et != null ? result.trap : null}
                launch={result.launch}
                grades={result.grades}
                gears={result.gears}
                hp={result.hp}
                hpMax={result.hpMax}
                wrecked={result.wrecked}
              />
              <ResultCard
                place={result.rivalPlace}
                name={result.rivalName}
                car="Rival"
                et={result.rivalEt}
                reaction={result.rivalReaction}
                trap={result.rivalEt != null ? result.rivalTrap : null}
                launch={result.rivalLaunch}
                grades={result.rivalGrades}
                gears={result.rivalGears}
                hp={result.rivalHp}
                hpMax={result.rivalHpMax}
                wrecked={result.stars[1]}
              />
            </div>
            <p className="mt-3 font-display text-3xl text-primary">
              {result.win ? "+" : ""}
              {result.fossil} <FossilWord />
              <span className="ml-3 text-fg">+{raceXp(result.win)} XP · {result.youPlace}º</span>
            </p>
            {result.baseFossil != null && (
              <p className="mt-1 text-sm text-muted">
                Base {result.baseFossil} + {Math.round((result.bonusPct ?? 0) * 100)}% desempenho (teto 50%)
                {result.bonusLines && result.bonusLines.length > 0 ? ` · ${result.bonusLines.join(", ")}` : ""}
              </p>
            )}
            <p className="mt-1 text-sm text-fg">
              {result.hits ?? 0} acertos / {result.fired ?? 0} tiros · {result.crates ?? 0} caixas · vácuo {(result.draftTime ?? 0).toFixed(1)}s · nitro {result.nitroUsed ? "saiu" : "não saiu"} · nitro perfeito {result.nitroPerfect ?? 0} · desvios {result.dodged ?? 0}
            </p>
            {result.mission && <p className="mt-1 text-sm text-primary">{result.mission}</p>}
            <p className="mt-2 text-sm text-fg">
              {["Largada limpa", "Rival zerado", "Sem dano"].map((label, i) => (
                <span key={label} className={result.stars[i] ? "mr-3 text-primary" : "mr-3 text-muted"}>
                  {result.stars[i] ? "★" : "☆"} {label}
                </span>
              ))}
            </p>
            {result.note && <p className="mt-1 text-sm text-muted">{result.note}</p>}
            {result.part && <p className="mt-1 text-sm text-fg">Peça nova no carro: {result.part}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.win && again.kind === "story" && STORY.find((item) => item.chapter === again.chapter + 1) && (
                <button
                  type="button"
                  className="min-h-11 border border-primary bg-ink px-4 font-display text-3xl leading-none"
                  onClick={() => {
                    const next = STORY.find((item) => item.chapter === again.chapter + 1);
                    if (next) goStory(next);
                  }}
                >
                  <span className="text-primary">Próxima missão</span>
                </button>
              )}
              <button type="button" className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink" onClick={replay}>
                De novo
              </button>
              <Link to="/loja" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none text-fg">
                Loja
              </Link>
              <button type="button" className="min-h-11 border border-border px-4 font-display text-3xl leading-none text-fg" onClick={backMenu}>
                Pits
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
