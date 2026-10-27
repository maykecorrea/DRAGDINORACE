import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { streetOpen } from "@/game/save";
import { useSave } from "@/game/use-save";

export const Route = createFileRoute("/bar")({ component: Bar });

const RUNNERS = [
  { id: "costela", name: "COSTELA", odds: 2.1, weight: 14, image: "/game/normal/car-costela.png" },
  { id: "prato", name: "PRATO", odds: 1.7, weight: 22, image: "/game/rare/car-prato.png" },
  { id: "nave", name: "BROKEN NAVE", odds: 1.35, weight: 28, image: "/game/epic/car-nave.png" },
  { id: "medula", name: "MEDULA", odds: 1.15, weight: 36, image: "/game/legend/car-medula.png?v=2" },
] as const;

const REELS = [
  { id: "rex", name: "REX", pay: 6, icon: "/game/slot-rex.png" },
  { id: "fossil", name: "Fósseis", pay: 4, icon: "/game/fossil-coin.png" },
  { id: "caveira", name: "CRÂNIO", pay: 3, icon: "/game/slot-caveira.png" },
  { id: "gosma", name: "GOSMA", pay: 2, icon: "/game/slot-gosma.png" },
  { id: "osso", name: "OSSO", pay: 1.5, icon: "/game/slot-osso.png" },
] as const;

type Side = "garra" | "cauda";

function roll<T extends { weight?: number }>(items: readonly T[]) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight ?? 1;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function fmt(n: number) {
  return Math.floor(n).toLocaleString("pt-BR");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function fichas(save: { arcadeDay?: string; arcadeLeft?: number }) {
  if (save.arcadeDay !== todayKey()) return 3;
  return save.arcadeLeft ?? 3;
}

function Bar() {
  const { save, commit } = useSave();
  const [busy, setBusy] = useState(false);
  const [coinBet, setCoinBet] = useState("50");
  const [coinPick, setCoinPick] = useState<Side>("garra");
  const [coinFace, setCoinFace] = useState<Side>("garra");
  const [coinSpin, setCoinSpin] = useState(false);
  const [coinNote, setCoinNote] = useState("");
  const [raceBet, setRaceBet] = useState("50");
  const [racePick, setRacePick] = useState<(typeof RUNNERS)[number]["id"]>("medula");
  const [lanes, setLanes] = useState<number[]>([0, 0, 0, 0]);
  const [raceNote, setRaceNote] = useState("");
  const [party, setParty] = useState(0);
  const [slotBet, setSlotBet] = useState("25");
  const [faces, setFaces] = useState<string[]>(["OSSO", "GOSMA", "CRÂNIO"]);
  const [slotNote, setSlotNote] = useState("");
  const [mesa, setMesa] = useState<"moeda" | "pista" | "cova" | null>(null);
  const left = fichas(save);

  useEffect(() => {
    if (!coinSpin) return;
    const id = window.setInterval(() => {
      setCoinFace((face) => (face === "garra" ? "cauda" : "garra"));
    }, 80);
    return () => window.clearInterval(id);
  }, [coinSpin]);

  function pay(prize: number) {
    const nextLeft = Math.max(0, left - 1);
    commit({
      ...save,
      fossil: save.fossil + prize,
      arcadeDay: todayKey(),
      arcadeLeft: nextLeft,
      ledger: (save.ledger ?? []).filter((line) => line.kind !== "bar"),
    });
  }

  function jogarMoeda() {
    if (left < 1 || busy) return;
    setBusy(true);
    setCoinNote("");
    setCoinSpin(true);
    const face: Side = Math.random() < 0.5 ? "garra" : "cauda";
    window.setTimeout(() => {
      setCoinSpin(false);
      setCoinFace(face);
      const won = face === coinPick;
      const caiu = face === "garra" ? "GARRA" : "CAUDA";
      setCoinNote(won ? `Caiu ${caiu}. Você ganhou 10 fósseis.` : `Caiu ${caiu}. Você errou. Não ganhou nada.`);
      pay(won ? 10 : 0);
      setBusy(false);
    }, 1100);
  }

  function jogarPista() {
    if (left < 1 || busy) return;
    setBusy(true);
    setRaceNote("");
    setParty(0);
    setLanes([0, 0, 0, 0]);
    const winner = roll(RUNNERS);
    const targets = RUNNERS.map((runner) => (runner.id === winner.id ? 1 : 0.46 + Math.random() * 0.28));
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 2200);
      const eased = 1 - (1 - t) ** 3;
      setLanes(targets.map((target) => target * eased));
      if (t < 1) requestAnimationFrame(tick);
      else {
        const won = winner.id === racePick;
        setRaceNote(won ? `${winner.name} chegou primeiro. Você ganhou 15 fósseis.` : `${winner.name} chegou primeiro. Não era o seu palpite. Não ganhou nada.`);
        setParty(Date.now());
        pay(won ? 15 : 0);
        setBusy(false);
      }
    };
    requestAnimationFrame(tick);
  }

  function jogarCova() {
    if (left < 1 || busy) return;
    setBusy(true);
    setSlotNote("");
    const landed = [0, 1, 2].map(() => roll(REELS.map((item) => ({ ...item, weight: 10 }))));
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setFaces([0, 1, 2].map((index) => (step > 8 + index * 3 ? landed[index].name : REELS[Math.floor(Math.random() * REELS.length)].name)));
      if (step > 16) {
        window.clearInterval(id);
        const names = landed.map((item) => item.name);
        setFaces(names);
        const best = Math.max(...names.map((name) => names.filter((item) => item === name).length));
        const same = names.find((name) => names.filter((item) => item === name).length === best) ?? names[0];
        const prize = best >= 3 ? 30 : best === 2 ? 5 : 0;
        setSlotNote(
          best >= 3
            ? `Três ${same}. Você ganhou 30 fósseis.`
            : best === 2
              ? `Dois ${same}. Você ganhou 5 fósseis.`
              : "Os três são diferentes. Não ganhou nada.",
        );
        pay(prize);
        setBusy(false);
      }
    }, 90);
  }

  if (!streetOpen(save)) {
    return (
      <PitFrame title="Fliperama">
        <p className="max-w-xl text-sm text-muted">O fliperama abre depois de 4 corridas. São 3 fichas grátis por dia.</p>
        <Link to="/pista" className="mt-4 inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink">Pista</Link>
      </PitFrame>
    );
  }

  return (
    <PitFrame title="Fliperama" bleed hideHeading>
      <div className="px-3 pb-10 pt-28 sm:px-4">
        <div className="relative mx-auto aspect-video w-full max-w-7xl overflow-hidden border border-[#3d4a2c]">
          <video
            src="/game/bar-salao.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button type="button" className="bar-table" data-on={mesa === "moeda" ? "1" : undefined} style={{ left: "3.5%", top: "62%", width: "29%", height: "32%" }} onClick={() => setMesa("moeda")}>
            <span>Garra ou cauda</span>
          </button>
          <button type="button" className="bar-table" data-on={mesa === "pista" ? "1" : undefined} style={{ left: "35.5%", top: "58%", width: "29%", height: "34%" }} onClick={() => setMesa("pista")}>
            <span>Palpite</span>
          </button>
          <button type="button" className="bar-table" data-on={mesa === "cova" ? "1" : undefined} style={{ left: "67.5%", top: "62%", width: "29%", height: "32%" }} onClick={() => setMesa("cova")}>
            <span>Escavação</span>
          </button>
        </div>

        {mesa && (
          <section className="bar-felt mx-auto mt-4 w-full max-w-7xl p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-pixel text-3xl text-primary">
                  {mesa === "moeda" ? "Garra ou cauda" : mesa === "pista" ? "Palpite da arrancada" : "Escavação"}
                </p>
                <p className="text-sm text-muted">
                  Fichas de hoje: <span className="text-primary">{left}</span>. Acertar ganha fóssil. Errar não tira nada.
                </p>
              </div>
              <button type="button" onClick={() => setMesa(null)} className="min-h-11 border border-border px-3 font-pixel text-2xl text-muted">
                Fechar
              </button>
            </div>

            {mesa === "moeda" && (
              <div className="mt-4">
                <p className="text-sm text-muted">Garra ou cauda? Acertou, ganha 10 fósseis. Errou, não perde nada.</p>
                <div className={`bar-coin mx-auto mt-4 w-40 text-center ${coinSpin ? "bar-coin-spin" : ""}`}>
                  <img src={coinFace === "garra" ? "/game/slot-garra.png" : "/game/slot-cauda.png"} alt="" className="mx-auto h-36 w-full object-contain" />
                  <p className="mt-1 font-pixel text-2xl tracking-widest text-primary">{coinFace === "garra" ? "GARRA" : "CAUDA"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["garra", "cauda"] as const).map((side) => (
                    <button key={side} type="button" onClick={() => setCoinPick(side)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 border px-3 text-sm uppercase ${coinPick === side ? "border-primary text-primary" : "border-border text-muted"}`}>
                      <img src={side === "garra" ? "/game/slot-garra.png" : "/game/slot-cauda.png"} alt="" className="h-8 w-8 object-contain" />
                      {side}
                    </button>
                  ))}
                </div>
                <button type="button" disabled={busy || left < 1} onClick={jogarMoeda} className="mt-4 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Jogar a moeda</button>
                {coinNote && <p className="mt-3 text-base text-primary">{coinNote}</p>}
              </div>
            )}

            {mesa === "pista" && (
              <div className="relative mt-4">
                <p className="text-sm text-muted">Quem chega primeiro? Acertou, ganha 15 fósseis. Errou, não perde nada.</p>
                <p className="mt-3 text-right font-pixel text-sm tracking-widest text-primary">Chegada</p>
                <div className="mt-1 grid gap-2">
                  {RUNNERS.map((runner, index) => (
                    <button key={runner.id} type="button" onClick={() => setRacePick(runner.id)} className={`relative h-20 overflow-hidden border bg-black/50 text-left ${racePick === runner.id ? "border-primary" : "border-border"}`}>
                      <span className="bar-finish absolute top-0 right-0 bottom-0 z-10 w-3" />
                      <img src={runner.image} alt="" className="absolute bottom-1 z-20 h-14 w-24 object-contain" style={{ left: `calc(${lanes[index]} * (100% - 6.5rem))` }} />
                      <span className="absolute top-1 left-2 z-20 font-pixel text-xl tracking-widest">{runner.name}</span>
                    </button>
                  ))}
                </div>
                {party > 0 && (
                  <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" key={party}>
                    {Array.from({ length: 32 }, (_, i) => (
                      <span key={i} className={`dino-confetti dino-confetti-${i % 5}`} style={{ left: `${(i * 31) % 100}%`, animationDelay: `${(i % 8) * 0.06}s` }} />
                    ))}
                  </div>
                )}
                <button type="button" disabled={busy || left < 1} onClick={jogarPista} className="mt-4 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Ver quem ganha</button>
                {raceNote && <p className="mt-3 text-base text-primary">{raceNote}</p>}
              </div>
            )}

            {mesa === "cova" && (
              <div className="mt-4">
                <p className="text-sm text-muted">Três figuras iguais: 30 fósseis. Duas iguais: 5 fósseis. Tudo diferente: não ganha nada.</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {faces.map((face, index) => {
                    const reel = REELS.find((item) => item.name === face) ?? REELS[0];
                    return (
                      <div key={index} className="border border-primary bg-black/60 px-2 py-3 text-center">
                        <img src={reel.icon} alt="" className="mx-auto h-28 w-full object-contain" />
                        <p className="mt-1 font-pixel text-2xl tracking-widest text-primary">{reel.name}</p>
                      </div>
                    );
                  })}
                </div>
                <button type="button" disabled={busy || left < 1} onClick={jogarCova} className="mt-4 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Cavar</button>
                {slotNote && <p className="mt-3 text-base text-primary">{slotNote}</p>}
              </div>
            )}
          </section>
        )}
      </div>
    </PitFrame>
  );
}

function BetRow({ value, onChange, disabled, label, onPlay }: { value: string; onChange: (value: string) => void; disabled: boolean; label: string; onPlay: () => void }) {
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onPlay();
      }}
    >
      <input
        inputMode="numeric"
        value={value ? fmt(Number(value)) : ""}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="min-h-11 w-36 border border-border bg-bg px-3 text-sm"
      />
      <button type="submit" disabled={disabled} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">
        {label}
      </button>
    </form>
  );
}
