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
  { id: "fossil", name: "FÓSSIL", pay: 4, icon: "/game/fossil-coin.png" },
  { id: "caveira", name: "CAVEIRA", pay: 3, icon: "/game/slot-caveira.png" },
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
  const [faces, setFaces] = useState<string[]>(["OSSO", "GOSMA", "CAVEIRA"]);
  const [slotNote, setSlotNote] = useState("");
  const [mesa, setMesa] = useState<"moeda" | "pista" | "cova" | null>(null);

  useEffect(() => {
    const ledger = save.ledger ?? [];
    if (!ledger.some((line) => line.kind === "bar")) return;
    commit({ ...save, ledger: ledger.filter((line) => line.kind !== "bar") });
  }, [save, commit]);

  useEffect(() => {
    if (!coinSpin) return;
    const id = window.setInterval(() => {
      setCoinFace((face) => (face === "garra" ? "cauda" : "garra"));
    }, 80);
    return () => window.clearInterval(id);
  }, [coinSpin]);

  function take(bet: number) {
    return Math.floor(bet) >= 1 && Math.floor(bet) <= save.fossil && !busy;
  }

  function settle(bet: number, payout: number) {
    commit({
      ...save,
      fossil: save.fossil - bet + payout,
      ledger: (save.ledger ?? []).filter((line) => line.kind !== "bar"),
    });
  }

  function jogarMoeda() {
    const bet = Math.floor(Number(coinBet));
    if (!take(bet)) return;
    setBusy(true);
    setCoinNote("");
    setCoinSpin(true);
    const face: Side = Math.random() < 0.3 ? coinPick : coinPick === "garra" ? "cauda" : "garra";
    window.setTimeout(() => {
      setCoinSpin(false);
      setCoinFace(face);
      const won = face === coinPick;
      const payout = won ? Math.floor(bet * 1.45) : 0;
      setCoinNote(won ? `Caiu ${face}. +${fmt(payout)}` : `Caiu ${face}. A casa ficou.`);
      settle(bet, payout);
      setBusy(false);
    }, 1100);
  }

  function jogarPista() {
    const bet = Math.floor(Number(raceBet));
    if (!take(bet)) return;
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
        const picked = RUNNERS.find((runner) => runner.id === racePick) ?? RUNNERS[0];
        const won = winner.id === picked.id;
        const payout = won ? Math.floor(bet * picked.odds) : 0;
        setRaceNote(won ? `${winner.name} cruzou. +${fmt(payout)}` : `${winner.name} cruzou. A casa ficou.`);
        setParty(Date.now());
        settle(bet, payout);
        setBusy(false);
      }
    };
    requestAnimationFrame(tick);
  }

  function jogarCova() {
    const bet = Math.floor(Number(slotBet));
    if (!take(bet)) return;
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
        const pay = best >= 3 ? 5 : best === 2 ? 1.1 : 0;
        const payout = Math.round(bet * pay);
        setSlotNote(payout ? `${names.join(" · ")} · +${fmt(payout)}` : `${names.join(" · ")} · a casa ficou`);
        settle(bet, payout);
        setBusy(false);
      }
    }, 90);
  }

  if (!streetOpen(save)) {
    return (
      <PitFrame title="Bar">
        <p className="max-w-xl text-sm text-muted">O bar abre depois de 4 corridas. A pista paga fóssil. Corre primeiro.</p>
        <Link to="/pista" className="mt-4 inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink">Pista</Link>
      </PitFrame>
    );
  }

  return (
    <PitFrame title="Bar" bleed hideHeading>
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
            <span>GARRA OU CAUDA</span>
          </button>
          <button type="button" className="bar-table" data-on={mesa === "pista" ? "1" : undefined} style={{ left: "35.5%", top: "58%", width: "29%", height: "34%" }} onClick={() => setMesa("pista")}>
            <span>ARRANCADA</span>
          </button>
          <button type="button" className="bar-table" data-on={mesa === "cova" ? "1" : undefined} style={{ left: "67.5%", top: "62%", width: "29%", height: "32%" }} onClick={() => setMesa("cova")}>
            <span>COVA</span>
          </button>
        </div>

        {mesa && (
          <section className="bar-felt mx-auto mt-4 w-full max-w-7xl p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-pixel text-3xl text-primary">
                  {mesa === "moeda" ? "Garra ou cauda" : mesa === "pista" ? "Arrancada fantasma" : "Cova"}
                </p>
                <p className="text-sm text-muted">
                  Na conta <span className="text-primary">{fmt(save.fossil)}</span> <FossilWord />. A casa fica com uma fatia.
                </p>
              </div>
              <button type="button" onClick={() => setMesa(null)} className="min-h-11 border border-border px-3 font-pixel text-2xl text-muted">
                Fechar
              </button>
            </div>

            {mesa === "moeda" && (
              <div className="mt-4">
                <p className="text-sm text-muted">Cara ou coroa do pátio. Paga 1,45x.</p>
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
                <BetRow value={coinBet} onChange={setCoinBet} disabled={busy} label="Jogar" onPlay={jogarMoeda} />
                {coinNote && <p className="mt-2 text-sm text-primary">{coinNote}</p>}
              </div>
            )}

            {mesa === "pista" && (
              <div className="relative mt-4">
                <p className="text-sm text-muted">Quem cruzar a faixa ganha. O favorito paga pouco. O azarão paga alto.</p>
                <p className="mt-3 text-right font-pixel text-sm tracking-widest text-primary">CHEGADA</p>
                <div className="mt-1 grid gap-2">
                  {RUNNERS.map((runner, index) => (
                    <button key={runner.id} type="button" onClick={() => setRacePick(runner.id)} className={`relative h-20 overflow-hidden border bg-black/50 text-left ${racePick === runner.id ? "border-primary" : "border-border"}`}>
                      <span className="bar-finish absolute top-0 right-0 bottom-0 z-10 w-3" />
                      <img src={runner.image} alt="" className="absolute bottom-1 z-20 h-14 w-24 object-contain" style={{ left: `calc(${lanes[index]} * (100% - 6.5rem))` }} />
                      <span className="absolute top-1 left-2 z-20 font-pixel text-xl tracking-widest">{runner.name}</span>
                      <span className="absolute top-1 right-6 z-20 font-display text-3xl text-primary">{runner.odds.toFixed(2)}x</span>
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
                <BetRow value={raceBet} onChange={setRaceBet} disabled={busy} label="Apostar" onPlay={jogarPista} />
                {raceNote && <p className="mt-2 text-sm text-primary">{raceNote}</p>}
              </div>
            )}

            {mesa === "cova" && (
              <div className="mt-4">
                <p className="text-sm text-muted">Dois iguais pagam 1,1x. Três iguais pagam 5x.</p>
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
                <BetRow value={slotBet} onChange={setSlotBet} disabled={busy} label="Girar" onPlay={jogarCova} />
                {slotNote && <p className="mt-2 text-sm text-primary">{slotNote}</p>}
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
