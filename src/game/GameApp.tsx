import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { FossilWord } from "@/components/fossil-word";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import {
  BONUS,
  driverById,
  resolveStats,
  stack,
  type NftCar,
  type Upgrades,
} from "./data";
import { createAudio, type AudioBus } from "./audio";
import { VIEW_H, VIEW_W, drawFrame, loadArt, type Art } from "./render";
import { freshSave, loadSave, selectedCar, subscribeSave, writeSave, type Save } from "./save";
import { carLabel, cockpitPlate, sideMark } from "./forge";
import { keyLabel, readKeys } from "./hotkeys";
import { STORY, grantStoryPart, storyOpen, storyRivalStats, type StoryPhase } from "./story";
import { createDuel, createFree, stepMatch, mph, type Grade, type LaunchGrade, type Match } from "./sim";

type Screen = "menu" | "drive" | "rivals" | "result" | "intro";

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

type Result = {
  win: boolean;
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
};

const keys = new Set<string>();
let injected: string[] | null = null;
let steerOverride: number | null = null;

function didWin(m: Match): boolean {
  if (!m.rival) return false;
  if (m.player.redlight) return false;
  const pt = m.player.finishTime;
  const rt = m.rival.finishTime;
  if (pt != null && rt != null) return pt <= rt;
  if (pt != null) return true;
  if (rt != null) return false;
  return m.player.dist >= m.rival.dist;
}

function fossilReward(m: Match, win: boolean): number {
  const perfects = m.player.shifts.filter((g) => g === "perfeito").length;
  if (m.player.redlight) return 18;
  if (!win) return 28 + perfects * 4;
  let n = 80 + perfects * 12;
  if (m.player.reaction != null && m.player.reaction >= 0 && m.player.reaction < 0.12) n += 18;
  return n;
}

function mLoss(winFossil: number): number {
  return Math.max(12, Math.round(winFossil * 0.2));
}

function stacked(car: NftCar): Upgrades {
  return stack(car.upgrades, BONUS[car.driverId]);
}

function statsOf(car: NftCar) {
  return resolveStats(car.driverId, car.rarity, stacked(car));
}

function rivalStats(phase: StoryPhase) {
  return storyRivalStats(phase);
}

function launchLabel(grade: LaunchGrade | null): string {
  if (grade === "perfeito") return "PERFEITO";
  if (grade === "patinou") return "PATINOU";
  if (grade === "morreu") return "MORREU";
  if (grade === "queimou") return "QUEIMOU";
  return "—";
}

function shiftLabel(grade: Grade | undefined): string {
  if (grade === "perfeito") return "PERFEITO";
  if (grade === "corte") return "CORTE";
  if (grade === "cedo") return "CEDO";
  if (grade === "ok") return "OK";
  return "—";
}

function cellTone(grade: string | null | undefined): string {
  if (grade === "perfeito") return "bg-primary text-ink";
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
}: {
  place: 1 | 2;
  name: string;
  car: string;
  et: number | null;
  reaction: number | null;
  trap: number | null;
  launch: LaunchGrade | null;
  grades: Grade[];
}) {
  return (
    <article className="border border-border bg-surface p-3">
      <p className={`font-display text-5xl leading-none ${place === 1 ? "text-primary" : "text-muted"}`}>{place}º</p>
      <h2 className="mt-1 font-display text-4xl leading-none">{name}</h2>
      <p className="text-sm text-muted">{car}</p>
      <p className="mt-2 font-display text-4xl leading-none">{et != null ? `${et.toFixed(3)}s` : "DNF"}</p>
      <p className="mt-1 text-sm text-muted">
        reação {reaction == null ? "—" : `${Math.round(reaction * 1000)} ms`} · trap {trap == null ? "—" : `${Math.round(mph(trap))} mph`}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1">
        <div className={`px-1 py-2 text-center ${cellTone(launch)}`}>
          <p className="font-display text-lg leading-none">LARG</p>
          <p className="mt-1 text-[10px] font-semibold tracking-widest">{launchLabel(launch)}</p>
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`px-1 py-2 text-center ${cellTone(grades[i])}`}>
            <p className="font-display text-lg leading-none">{i + 2}ª</p>
            <p className="mt-1 text-[10px] font-semibold tracking-widest">{shiftLabel(grades[i])}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function GameApp({ rivalId, story }: { rivalId?: string; story?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [save, setSave] = useState<Save>(freshSave);
  const [screen, setScreen] = useState<Screen>("menu");
  const [result, setResult] = useState<Result | null>(null);
  const [ready, setReady] = useState(false);
  const [pick, setPick] = useState<StoryPhase>(STORY[0]!);
  const saveRef = useRef(save);
  const screenRef = useRef<Screen>("menu");
  const simRef = useRef<Match | null>(null);
  const artRef = useRef<Art | null>(null);
  const audioRef = useRef<AudioBus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hold = useRef({ gas: false, left: false, right: false, shift: false, nitro: false });
  const prev = useRef({ shift: false, nitro: false });
  const resultLock = useRef(false);
  const youArt = useRef<CanvasImageSource | null>(null);

  useEffect(() => {
    setSave(loadSave());
    return subscribeSave(setSave);
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
      const bound = Object.values(readKeys(saveRef.current));
      if (bound.includes(e.code)) e.preventDefault();
      keys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
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
      const throttle =
        down(bind.gas) || (injected?.includes("KeyW") ?? false) || (injected?.includes("Space") ?? false) || hold.current.gas
          ? 1
          : 0;
      const shiftDown =
        down(bind.shift) ||
        (injected?.includes("ShiftLeft") ?? false) ||
        (injected?.includes("ShiftRight") ?? false) ||
        (injected?.includes("ArrowUp") ?? false) ||
        hold.current.shift;
      const nitroDown = down(bind.nitro) || (injected?.includes("KeyN") ?? false) || hold.current.nitro;
      const shift = shiftDown && !prev.current.shift;
      const nitro = nitroDown && !prev.current.nitro;
      prev.current.shift = shiftDown;
      prev.current.nitro = nitroDown;
      hold.current.shift = false;
      hold.current.nitro = false;
      return { throttle, steer: Math.max(-1, Math.min(1, steer)), shift, nitro };
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
      .then((art) => {
        if (stop) return;
        artRef.current = art;
        simRef.current = createFree(statsOf(selectedCar(saveRef.current)));
        setReady(true);
        let last = performance.now();
        const loop = (now: number) => {
          if (stop) return;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          const sim = simRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (sim && ctx && artRef.current) {
            events.length = 0;
            if (screenRef.current === "drive") {
              acc.v += dt;
              const input = sample();
              let first = true;
              let guard = 0;
              const car = selectedCar(saveRef.current);
              const up = stacked(car);
              const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
              const rivalUp = phase
                ? (phase.driver === "vex"
                  ? { engine: 2, gearbox: 2, nitro: 2, tires: 2, chassis: 2 }
                  : { engine: 1, gearbox: 1, nitro: 1, tires: 1, chassis: 1 })
                : null;
              while (acc.v >= 1 / 60 && guard < 5) {
                const stepIn = first ? input : { ...input, shift: false, nitro: false };
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
                if (ev === "redlight" || ev === "wall") audio.blip("bad");
                if (ev === "band") audio.blip("tick");
              }
              audio.engineRpm(sim.player.rpm, sim.player.launched || sim.phase !== "free", sim.player.nitroOn > 0);
              if (sim.phase === "finish" && !resultLock.current && sim.mode === "duel") {
                resultLock.current = true;
                const win = didWin(sim);
                const chapter = phase?.chapter ?? 0;
                const firstClear = win && chapter === (saveRef.current.storyClear ?? 0) + 1;
                const fossil = phase ? (win ? phase.fossil : mLoss(phase.fossil)) : fossilReward(sim, win);
                const rivalName = driverById(phase?.driver ?? "geck").name;
                const snap: Result = {
                  win,
                  et: sim.player.finishTime,
                  rivalEt: sim.rival?.finishTime ?? null,
                  reaction: sim.player.reaction,
                  launch: sim.player.launchGrade,
                  trap: sim.player.trap,
                  grades: sim.player.shifts.slice(),
                  fossil,
                  part: firstClear ? phase!.part.name : null,
                  redlight: sim.player.redlight,
                  rivalName,
                  rivalId: sim.rivalId ?? "fase-1",
                  rivalReaction: sim.rival?.reaction ?? null,
                  rivalLaunch: sim.rival?.launchGrade ?? null,
                  rivalTrap: sim.rival?.trap ?? 0,
                  rivalGrades: sim.rival?.shifts.slice() ?? [],
                  youPlace: win ? 1 : 2,
                  rivalPlace: win ? 2 : 1,
                };
                setResult(snap);
                setScreen("result");
                screenRef.current = "result";
                setSave((prevSave) => {
                  const next: Save = {
                    ...prevSave,
                    fossil: prevSave.fossil + fossil,
                    races: prevSave.races + 1,
                    wins: prevSave.wins + (win ? 1 : 0),
                    best: { ...prevSave.best },
                  };
                  if (win && snap.et != null) {
                    const old = next.best[snap.rivalId];
                    if (old == null || snap.et < old) next.best[snap.rivalId] = snap.et;
                  }
                  if (firstClear && phase) {
                    next.storyClear = chapter;
                    next.cars = next.cars.map((car) =>
                      car.tokenId === next.selected ? { ...car, upgrades: grantStoryPart(car.upgrades, phase.part) } : car,
                    );
                  }
                  writeSave(next);
                  return next;
                });
              }
            } else if (screenRef.current === "intro") {
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
            } else {
              const phase = STORY.find((item) => `fase-${item.chapter}` === sim.rivalId);
              const sprite = phase ? driverById(phase.driver).sprite : 2;
              const cockpitId = cockpitPlate(car, artRef.current);
              const you = youArt.current ?? artRef.current.sides[driverById(car.driverId).sprite] ?? artRef.current.cars[0];
              drawFrame(ctx, sim, artRef.current, stacked(car), car.neon, sprite, events, now / 1000, reduce, cockpitId, you);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => setReady(true));

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const car = selectedCar(save);
  const driver = driverById(car.driverId);
  const live = statsOf(car);

  useEffect(() => {
    const mark = sideMark(car);
    const img = new Image();
    img.onload = () => {
      if (!mark.flip) {
        youArt.current = img;
        return;
      }
      const board = document.createElement("canvas");
      board.width = img.width;
      board.height = img.height;
      const g = board.getContext("2d");
      if (!g) {
        youArt.current = img;
        return;
      }
      g.translate(board.width, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0);
      youArt.current = board;
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

  function goFree() {
    unlock();
    const c = selectedCar(saveRef.current);
    simRef.current = createFree(statsOf(c));
    resultLock.current = false;
    screenRef.current = "drive";
    setScreen("drive");
  }

  function goStory(phase: StoryPhase) {
    if (!storyOpen(saveRef.current.storyClear ?? 0, phase.chapter)) return;
    unlock();
    const c = selectedCar(saveRef.current);
    const bot = {
      reaction: phase.reaction,
      shiftAt: phase.shiftAt,
      jitter: phase.jitter,
      nitroGear: phase.nitroGear,
      launch: phase.launch,
    };
    simRef.current = createDuel(`fase-${phase.chapter}`, bot, statsOf(c), rivalStats(phase));
    resultLock.current = false;
    screenRef.current = "drive";
    setPick(phase);
    setScreen("drive");
  }

  function openStory() {
    unlock();
    screenRef.current = "intro";
    setScreen("intro");
  }

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
    screenRef.current = "menu";
    setScreen("menu");
    const c = selectedCar(saveRef.current);
    simRef.current = createFree(statsOf(c));
    resultLock.current = false;
  }

  useEffect(() => {
    if (!ready || !story) return;
    openStory();
  }, [ready, story]);

  useEffect(() => {
    if (!ready || !rivalId || story) return;
    const phase = STORY.find((item) => item.driver === rivalId);
    if (phase && storyOpen(saveRef.current.storyClear ?? 0, phase.chapter)) goStory(phase);
  }, [ready, rivalId, story]);

  const press = (key: "gas" | "left" | "right") => ({
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      hold.current[key] = true;
    },
    onPointerUp: () => {
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
        aria-label="Pista SAURSHIFT"
      />
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
            onEnded={() => {
              screenRef.current = "rivals";
              setScreen("rivals");
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <p className="text-xs font-semibold tracking-widest text-primary">PRÓLOGO · A ARMA VIVA</p>
            <button
              type="button"
              className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink"
              onClick={() => {
                videoRef.current?.pause();
                screenRef.current = "rivals";
                setScreen("rivals");
              }}
            >
              Pular
            </button>
          </div>
        </section>
      )}

      {screen === "menu" && (
        <section className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 md:justify-end md:p-8">
          <div className="pointer-events-auto max-w-lg bg-bg/80 p-4">
            <p className="text-xs font-semibold tracking-widest text-primary">RONIN STRIP · 1v1</p>
            <h1 className="font-display text-7xl leading-none text-fg md:text-8xl">SAURSHIFT</h1>
            <p className="mt-2 max-w-sm text-pretty text-muted">
              Drag de cockpit. Pixel denso, neon de ácido e mandíbula de rex. Acerta a marcha e solta o nitro
              antes do rival.
            </p>
            <p className="mt-3 text-sm text-fg">
              {carLabel(car)} · {car.tokenId} · {car.rarity} · {Math.round(live.vmax)} mph
            </p>
            <p className="mt-1 text-sm text-muted">
              {keyLabel(readKeys(save).gas)} gás · {keyLabel(readKeys(save).shift)} marcha · {keyLabel(readKeys(save).nitro)} nitro ·{" "}
              {keyLabel(readKeys(save).left)}/{keyLabel(readKeys(save).right)} faixa
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="min-h-11 bg-primary px-5 font-display text-4xl leading-none text-ink" onClick={goFree}>
                Start
              </button>
              <button
                type="button"
                className="min-h-11 border border-border bg-surface px-4 font-display text-3xl leading-none text-fg"
                onClick={openStory}
              >
                Modo história
              </button>
              <Link to="/dashboard" className="inline-flex min-h-11 items-center border border-border bg-surface px-4 font-display text-3xl leading-none text-fg">
                Painel
              </Link>
            </div>
            <p className="mt-4 max-w-md text-sm text-pretty text-muted">
              Segura o gás na largada. Marcha no verde, com o ponteiro na faixa ácida. Nitro no miolo da marcha,
              nunca no corte. A e D corrigem a faixa.
            </p>
            <p className="mt-3 font-display text-2xl text-primary">
              {save.fossil} <FossilWord />
            </p>
          </div>
        </section>
      )}

      {screen === "rivals" && (
        <section className="absolute inset-0 overflow-y-auto bg-bg/80 p-4 md:p-10">
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
                <li key={phase.chapter} className={`flex items-center gap-3 border bg-surface p-3 ${open ? "border-border" : "border-border opacity-50"}`}>
                  <img src={`/game/pilot-${d.sprite}.png`} alt="" className="size-16 object-cover" />
                  <img src={`/game/car-${d.sprite}.png`} alt="" className="size-14 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-3xl leading-none">
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
          <div className="pointer-events-auto flex items-center justify-between">
            <button type="button" className="inline-flex min-h-11 items-center gap-1 bg-bg/80 px-3 text-fg" onClick={backMenu}>
              <ChevronLeft className="size-5" />
              Pits
            </button>
            <p className="bg-bg/80 px-3 font-display text-3xl leading-none text-primary">
              {save.fossil} <FossilWord />
            </p>
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
          <div className="pointer-events-auto grid grid-cols-5 gap-2 pb-1 md:hidden">
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("left")} aria-label="Faixa esquerda">
              <span className="block text-xs">Esq</span>
              <span className="font-display text-xl leading-none">{keyLabel(readKeys(save).left)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("gas")}>
              <span className="block font-display text-xl leading-none">Gás</span>
              <span className="text-xs">{keyLabel(readKeys(save).gas)}</span>
            </button>
            <button
              type="button"
              className="min-h-14 bg-primary text-ink"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                hold.current.shift = true;
              }}
            >
              <span className="block font-display text-xl leading-none">Marcha</span>
              <span className="text-xs">{keyLabel(readKeys(save).shift)}</span>
            </button>
            <button
              type="button"
              className="min-h-14 bg-danger text-fg"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                hold.current.nitro = true;
              }}
            >
              <span className="block font-display text-xl leading-none">Nitro</span>
              <span className="text-xs">{keyLabel(readKeys(save).nitro)}</span>
            </button>
            <button type="button" className="min-h-14 bg-surface text-fg" {...press("right")} aria-label="Faixa direita">
              <span className="block text-xs">Dir</span>
              <span className="font-display text-xl leading-none">{keyLabel(readKeys(save).right)}</span>
            </button>
          </div>
          <p className="pointer-events-none hidden pb-3 text-right text-sm text-fg md:block">
            W gás · Shift marcha · N nitro · A e D na faixa
          </p>
        </div>
      )}

      {screen === "result" && result && (
        <section className="absolute inset-0 flex items-end overflow-y-auto bg-bg/70 p-4 md:items-center md:justify-center">
          <div className="w-full max-w-3xl border border-border bg-bg p-5">
            <p className="text-xs tracking-widest text-primary">{result.redlight ? "QUEIMA DE LARGADA" : result.win ? "FAIXA SUA" : "FAIXA DELE"}</p>
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
              />
            </div>
            <p className="mt-3 font-display text-3xl text-primary">
              +{result.fossil} <FossilWord />
            </p>
            {result.part && <p className="mt-1 text-sm text-fg">Peça nova no carro: {result.part}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink" onClick={() => goStory(pick)}>
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
