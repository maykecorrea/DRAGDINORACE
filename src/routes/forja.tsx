import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PitFrame } from "@/components/pit";
import type { NftCar } from "@/game/data";
import { rarityLabel } from "@/game/data";
import { carArt, carLabel, fuseStep, inventOfTier, specToCar } from "@/game/forge";
import { claimForge } from "@/game/forge.functions";
import { loadSave } from "@/game/save";
import { useSave } from "@/game/use-save";

const TONE: Record<string, string> = {
  Comum: "#efe6d2",
  Normal: "#d6ff3f",
  Raro: "#7fd7ff",
  Épico: "#ff4bd8",
  Lendário: "#ffd24a",
};

const LADDER = [
  { from: "Comum", to: "Normal", chance: 25 },
  { from: "Normal", to: "Raro", chance: 10 },
  { from: "Raro", to: "Épico", chance: 5 },
  { from: "Épico", to: "Lendário", chance: 1 },
];

export const Route = createFileRoute("/forja")({ component: Forja });

function Forja() {
  const { save, commit } = useSave();
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ ok: boolean; car: NftCar } | null>(null);
  const [reel, setReel] = useState(false);
  const [skip, setSkip] = useState(false);
  const pending = useRef(false);

  const picked = slots
    .map((id) => save.cars.find((car) => car.tokenId === id))
    .filter((car): car is NftCar => !!car);
  const rarity = picked[0]?.rarity;
  const step = rarity ? fuseStep(rarity) : undefined;
  const ready = picked.length === 3 && !!step && picked.every((car) => car.rarity === rarity);

  useEffect(() => {
    setSkip(window.localStorage.getItem("dino-skip-forge") === "1");
  }, []);

  function toggleSkip(on: boolean) {
    setSkip(on);
    window.localStorage.setItem("dino-skip-forge", on ? "1" : "0");
    if (on && pending.current) finishReel();
  }

  function toggle(id: string) {
    if (busy) return;
    setResult(null);
    setNote("");
    setSlots((cur) => {
      if (cur.includes(id)) return cur.filter((item) => item !== id);
      if (cur.length >= 3) return cur;
      const car = save.cars.find((item) => item.tokenId === id);
      if (!car || !fuseStep(car.rarity)) return cur;
      const first = save.cars.find((item) => item.tokenId === cur[0]);
      if (first && first.rarity !== car.rarity) return cur;
      return [...cur, id];
    });
  }

  async function melt() {
    if (!ready || !step || busy) return;
    setBusy(true);
    setNote("");
    setResult(null);
    pending.current = true;
    if (skip) {
      finishReel();
      return;
    }
    setReel(true);
  }

  function finishReel() {
    if (!pending.current) return;
    pending.current = false;
    setReel(false);
    void resolveMelt();
  }

  async function resolveMelt() {
    if (!step) {
      setBusy(false);
      return;
    }
    setNote("A forja está fundindo os três…");
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const current = loadSave();
    const shards = current.shards ?? 0;
    const forced = shards >= 3;
    const hit = forced || buf[0]! / 4294967296 < step.chance;
    const gone = new Set(slots);
    if (!hit) {
      const scrap = picked[buf[0]! % picked.length]!;
      const cars = current.cars.filter((car) => car.tokenId !== scrap.tokenId);
      const selected = current.selected === scrap.tokenId ? (cars[0]?.tokenId ?? scrap.tokenId) : current.selected;
      commit({ ...current, cars, selected, shards: shards + 1 });
      setSlots([]);
      setBusy(false);
      setNote(`Fundiu ${carLabel(scrap)}. Fragmentos: ${shards + 1}/3.`);
      setResult({ ok: false, car: scrap });
      return;
    }
    const blocked = new Set(
      current.cars.map((car) => car.exclusive?.signature).filter((signature): signature is string => !!signature),
    );
    const spec = inventOfTier(step.to, blocked);
    if (!spec.image) {
      setBusy(false);
      setNote("A forja não achou um carro dessa classe.");
      return;
    }
    const claimed = await claimForge({
      data: {
        id: spec.id,
        signature: spec.signature,
        prompt: spec.prompt,
        image: spec.image,
        video: spec.reveal ?? "/game/forja.mp4",
        name: spec.name,
        rarity: spec.rarity,
        modelId: spec.modelId,
        driverId: spec.driverId,
      },
    }).catch(() => ({ ok: false as const, reason: "db" as const }));
    if (!claimed.ok) {
      setBusy(false);
      setNote(claimed.reason === "taken" ? "Esse carro já existe. Tente fundir de novo." : "Não deu para salvar. Os três continuam na garagem.");
      return;
    }
    const nft = specToCar(spec);
    const fresh = loadSave();
    commit({
      ...fresh,
      cars: [...fresh.cars.filter((car) => !gone.has(car.tokenId)), nft],
      selected: nft.tokenId,
      shards: forced ? Math.max(0, (fresh.shards ?? shards) - 3) : fresh.shards ?? shards,
    });
    setSlots([]);
    setBusy(false);
    setNote("");
    setResult({ ok: true, car: nft });
  }

  const offer = save.cars.filter((car) => !rarity || car.rarity === rarity || slots.includes(car.tokenId));
  const stock = LADDER.map((item) => ({
    ...item,
    n: save.cars.filter((car) => car.rarity === item.from).length,
  }));

  return (
    <PitFrame bleed title="Forja">
      <video
        src="/game/forja.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
      <section className="absolute inset-0 z-10 overflow-y-auto px-3 pt-32 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end">
          <p className="font-display text-4xl leading-none text-white sm:text-5xl md:text-6xl">Forja</p>
          <p className="mt-1 max-w-xl text-sm text-pretty text-white/80">
            Junte três carros da mesma classe para tentar um da classe acima. Se falhar, um vira sucata.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {LADDER.map((item) => (
              <li
                key={item.from}
                className="border border-white/20 bg-black/55 px-2 py-1 text-[10px] text-white/80"
                style={{ color: rarity === item.from ? TONE[item.to] : undefined }}
              >
                3 {rarityLabel(item.from)} → {item.chance}% {rarityLabel(item.to)}
                <span className="text-white/45"> · garagem {stock.find((row) => row.from === item.from)?.n ?? 0}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid max-w-xl grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => {
              const car = picked[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => car && toggle(car.tokenId)}
                  className="grid min-h-28 place-items-center border border-white/25 bg-black/60 p-2 text-center backdrop-blur-sm"
                >
                  {car ? (
                    <>
                      <img src={carArt(car)} alt="" className="h-14 w-full object-contain" />
                      <span className="mt-1 truncate font-display text-lg leading-none" style={{ color: TONE[car.rarity] }}>
                        {carLabel(car)}
                      </span>
                    </>
                  ) : (
                    <span className="font-pixel text-xs tracking-[0.25em] text-white/50">Vaga {index + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={`mt-3 flex flex-wrap items-center gap-2 ${reel ? "fixed bottom-4 left-4 z-[60]" : ""}`}>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => void melt()}
              className="min-h-11 bg-[#ff5a1f] px-4 font-display text-2xl leading-none text-black disabled:opacity-40"
            >
              {busy ? "Fundindo…" : (save.shards ?? 0) >= 3 ? "Fundir · garantido" : step ? `Fundir · ${Math.round(step.chance * 100)}%` : "Fundir"}
            </button>
            <p className="text-sm text-white">Se falhar, só um carro vira sucata e os outros dois ficam. Cada falha dá 1 fragmento. Com 3, a próxima fusão é garantida. Agora:  {save.shards ?? 0}/3.</p>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 border border-white/40 bg-black/70 px-3 text-sm text-white">
              <input
                type="checkbox"
                checked={skip}
                onChange={(event) => toggleSkip(event.target.checked)}
                className="size-5 shrink-0 accent-[#d6ff3f]"
              />
              Pular vídeo
            </label>
            {note && <p className="text-sm text-white/80">{note}</p>}
          </div>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {offer.map((car) => {
              const on = slots.includes(car.tokenId);
              const locked = !fuseStep(car.rarity);
              return (
                <li key={car.tokenId}>
                  <button
                    type="button"
                    disabled={locked || busy}
                    onClick={() => toggle(car.tokenId)}
                    className={`w-28 border bg-black/70 p-1 text-left disabled:opacity-40 ${on ? "border-[#ff5a1f]" : "border-white/20"}`}
                  >
                    <img src={carArt(car)} alt="" className="h-12 w-full object-contain" />
                    <p className="truncate text-[10px] text-white">{carLabel(car)}</p>
                    <p className="text-[10px]" style={{ color: TONE[car.rarity] ?? "#efe6d2" }}>
                      {locked ? "Topo" : car.rarity}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      {reel && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            src="/game/forja-fundir.mp4?v=1"
            autoPlay
            muted
            playsInline
            onEnded={finishReel}
            className="h-full w-full object-contain"
          />
        </div>
      )}
      {result && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md border border-white/20 bg-black/90 p-4 text-center">
            <p className="font-pixel text-xs tracking-[0.3em]" style={{ color: result.ok ? "#d6ff3f" : "#ff5a1f" }}>
              {result.ok ? "SUBIU!" : "ESCÓRIA"}
            </p>
            <img src={carArt(result.car)} alt="" className="mx-auto mt-3 h-36 w-full object-contain" />
            <p className="mt-2 font-display text-4xl leading-none" style={{ color: TONE[result.car.rarity] }}>
              {carLabel(result.car)}
            </p>
            <p className="mt-1 text-sm text-white/75">
              {result.ok
                ? `${rarityLabel(result.car.rarity)} foi para a garagem e já está equipado.`
                : "A fusão falhou. Um carro virou sucata."}
            </p>
            <button type="button" onClick={() => setResult(null)} className="mt-4 min-h-11 border border-white/30 px-4 font-display text-2xl leading-none text-white">
              Fechar
            </button>
          </div>
        </div>
      )}
    </PitFrame>
  );
}
