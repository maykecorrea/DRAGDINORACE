import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CarShow, type SpinTarget } from "@/components/car-show";
import { MintRoulette, type SpinHaul } from "@/components/mint-roulette";
import { BoughtModal } from "@/components/bought-modal";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { CATALOG, DRIVERS, MINT_COST, PILOTS, catalogModelId, driverById, pilotById, resolveStats, type DriverId, type Pilot, type PilotId, type Rarity, type StatBlock, type Upgrades } from "@/game/data";
import { epicStickers, legendStickers, rareStickers } from "@/game/forge";
import { kitById } from "@/game/armory";
import { forgeCar, loadSave, selectedCar } from "@/game/save";
import { useSave } from "@/game/use-save";
import { questSpins, useQuestSpin } from "@/game/quests.functions";

const STOCK: Upgrades = { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 };

function shelfStats(modelId: string, driver: DriverId, rarity: Rarity) {
  return resolveStats(driver, rarity, STOCK, modelId);
}

function bonusLine(value: number, suffix = "") {
  const pct = Math.round((value - 1) * 100);
  return pct > 0 ? `+${pct}%${suffix}` : "—";
}

function StatSheet({ stats }: { stats: StatBlock }) {
  const vida = Math.round(stats.durability);
  const rows = [
    ["Velocidade", `${Math.round(stats.vmax)} mph`],
    ["Aceleração", String(Math.round(stats.accel))],
    ["Nitro", `${stats.nitroTime.toFixed(1)}s`],
    ["Potência", String(Math.round(stats.power))],
  ] as const;
  return (
    <dl className="mt-2 grid grid-cols-1 gap-0.5 text-left text-xs">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Vida</dt>
          <dd className="text-primary">{vida}</dd>
        </div>
        <div className="mt-1 h-2 bg-black">
          <div className="h-full bg-primary" style={{ width: `${Math.max(8, Math.min(100, (vida / 320) * 100))}%` }} />
        </div>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">{label}</dt>
          <dd className="text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BarrilPlate({
  card,
  tone,
  onSpin,
}: {
  card: {
    name: string;
    tag: string;
    note: string;
    image: string;
    rear?: string;
    stats: StatBlock;
    spin?: SpinTarget;
  };
  tone: string;
  onSpin: () => void;
}) {
  const specs = [
    ["Vida", String(Math.round(card.stats.durability))],
    ["Velocidade", `${Math.round(card.stats.vmax)} mph`],
    ["Aceleração", String(Math.round(card.stats.accel))],
    ["Nitro", `${card.stats.nitroTime.toFixed(1)}s`],
    ["Potência", String(Math.round(card.stats.power))],
  ] as const;
  return (
    <article className="border border-[#4d8dff] bg-black">
      <div className="flex items-end justify-between gap-3 border-b border-[#4d8dff]/50 px-3 py-2">
        <div>
          <p className="font-display text-4xl leading-none text-white sm:text-5xl">{card.name}</p>
          <p className="font-pixel text-[11px] tracking-[0.28em]" style={{ color: tone }}>{card.tag}</p>
        </div>
        <p className="font-pixel text-[10px] tracking-[0.22em] text-white/45">018 · SEM RODA</p>
      </div>
      <div className="grid bg-[#4d8dff]/40 md:grid-cols-2 md:gap-px">
        <figure className="bg-black">
          <figcaption className="border-b border-white/10 px-3 py-1.5 font-pixel text-[10px] tracking-[0.28em] text-[#ffb020]">VISÃO TRASEIRA</figcaption>
          <img src={card.rear} alt="Barril visto de trás, canos e chama" className="aspect-square w-full bg-[#070806] object-contain" style={{ imageRendering: "pixelated" }} />
        </figure>
        <figure className="border-t border-[#4d8dff]/40 bg-black md:border-t-0">
          <figcaption className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
            <span className="font-pixel text-[10px] tracking-[0.28em] text-[#ffb020]">GIRO</span>
            <button type="button" onClick={onSpin} className="min-h-11 px-1 font-pixel text-[10px] tracking-[0.2em] text-white/80">ABRIR</button>
          </figcaption>
          <video
            src={card.spin?.video}
            poster={card.image}
            autoPlay
            loop
            muted
            playsInline
            className="aspect-square w-full bg-[#070806] object-contain"
          />
        </figure>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[#4d8dff]/50 px-3 py-2 sm:grid-cols-5">
        {specs.map(([label, value]) => (
          <div key={label}>
            <dt className="font-pixel text-[9px] tracking-[0.18em] text-white/45">{label}</dt>
            <dd className="font-display text-2xl leading-none text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-white/10 px-3 py-2 text-xs text-white/55">{card.note}</p>
    </article>
  );
}

const TIERS = [
  { id: "Comum", image: "/game/roulette/comum.png", tone: "#d6ff3f", line: "A rua. O casco que abre a ficha." },
  { id: "Normal", image: "/game/roulette/normal.png", tone: "#7af0ff", line: "Prateleira. Compra e equipa." },
  { id: "Raro", image: "/game/roulette/raro.png", tone: "#4d8dff", line: "5%. Não vende. Sai na roleta." },
  { id: "Épico", image: "/game/roulette/epico.png", tone: "#ff3bd4", line: "1%. O bicho vira o carro." },
  { id: "Lendário", image: "/game/roulette/lendario.png", tone: "#ffb020", line: "0,1%. Só no mint." },
] as const;

type TierId = (typeof TIERS)[number]["id"];

function glitchMove(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  event.currentTarget.style.setProperty("--gx", `${(x * 12).toFixed(1)}px`);
  event.currentTarget.style.setProperty("--gy", `${(y * 8).toFixed(1)}px`);
}

function shelfOf(tier: TierId) {
  if (tier === "Comum") {
    return DRIVERS.map((d) => ({
      key: d.id,
      name: d.car,
      image: `/game/car-${d.sprite}.png`,
      tag: d.name,
      note: d.line,
      stats: shelfStats(d.id, d.id, "Comum"),
      buy: { driverId: d.id, rarity: "Comum" as const, cost: 140, note: d.line, name: d.car, image: `/game/car-${d.sprite}.png` },
      spin: { sprite: d.sprite, name: d.car, car: d.name, poster: `/game/car-${d.sprite}.png`, video: `/game/spin-${d.sprite}.mp4?v=4` } as SpinTarget,
      rear: undefined as string | undefined,
    }));
  }
  if (tier === "Normal") {
    return CATALOG.map((item) => {
      const d = driverById(item.driverId);
      const title = item.name ?? d.name;
      const modelId = catalogModelId(item);
      return {
        key: modelId,
        name: title,
        image: item.image ?? `/game/car-${d.sprite}.png`,
        tag: "Normal",
        note: item.note,
        stats: shelfStats(modelId, item.driverId, "Normal"),
        buy: item,
        spin: (item.image
          ? { name: title, car: "Normal", poster: item.image, video: `/game/normal/spin-${title.toLowerCase()}.mp4?v=${title.toLowerCase() === "fenda" || title.toLowerCase() === "valvula" ? 8 : title.toLowerCase() === "gancho" ? 10 : title.toLowerCase() === "tambor" ? 11 : title.toLowerCase() === "escora" ? 7 : ["calha", "broca", "pino"].includes(title.toLowerCase()) ? 6 : 5}` }
          : { sprite: d.sprite, name: title, car: d.car }) as SpinTarget,
        rear: undefined as string | undefined,
      };
    });
  }
  const pack = tier === "Raro" ? rareStickers() : tier === "Épico" ? epicStickers() : legendStickers();
  return pack.map((card) => ({
    key: card.id,
    name: card.name,
    image: card.car,
    tag: "kind" in card ? `${tier} · ${card.kind}` : tier,
    note: "Só sai na roleta.",
    stats: shelfStats(card.id, card.driver, tier),
    rear: card.rear,
    buy: undefined as (typeof CATALOG)[number] | undefined,
    spin: {
      name: card.name,
      car: `${tier} · ${Math.round(shelfStats(card.id, card.driver, tier).vmax)} mph`,
      poster: card.car,
      video: card.spin,
    } as SpinTarget,
  }));
}

export const Route = createFileRoute("/loja")({ component: Loja });

function Loja() {
  const { save, commit } = useSave();
  const owned = selectedCar(save);
  const [spin, setSpin] = useState<SpinTarget | null>(null);
  const [tier, setTier] = useState<TierId | null>(null);
  const [crewOpen, setCrewOpen] = useState(false);
  const [roulette, setRoulette] = useState<null | "car" | "pilot" | "part">(null);
  const [ask, setAsk] = useState<(typeof CATALOG)[number] | null>(null);
  const [bought, setBought] = useState<{ tokenId: string; name: string; image: string; pilotId?: PilotId } | null>(null);
  const [hire, setHire] = useState<Pilot | null>(null);
  const [freeSpins, setFreeSpins] = useState(0);
  const crew: PilotId[] = save.pilots?.length ? save.pilots : ["vex"];
  const seated = crew.includes(save.pilot ?? "vex") ? (save.pilot ?? "vex") : "vex";

  useEffect(() => {
    void questSpins().then((n) => setFreeSpins(Number(n) || 0)).catch(() => undefined);
  }, []);

  function confirmBuy() {
    if (!ask || (ask.rarity !== "Comum" && ask.rarity !== "Normal") || save.fossil < ask.cost) return;
    const nft = forgeCar(save, ask.driverId, ask.rarity);
    const modelId = catalogModelId(ask);
    const d = driverById(ask.driverId);
    const name = ask.name ?? d.name;
    const image = ask.image ?? `/game/car-${d.sprite}.png`;
    nft.exclusive = {
      signature: `normal.${modelId}.${nft.tokenId}`,
      prompt: ask.note,
      name: ask.name ?? "",
      image: ask.image ?? "",
      modelId,
    };
    commit({ ...save, fossil: save.fossil - ask.cost, cars: [...save.cars, nft] });
    setBought({ tokenId: nft.tokenId, name, image });
    setAsk(null);
  }

  function equipBought() {
    if (!bought) return;
    const current = loadSave();
    if (bought.pilotId) commit({ ...current, pilot: bought.pilotId });
    else commit({ ...current, selected: bought.tokenId });
    setBought(null);
  }

  function confirmHire() {
    if (!hire) return;
    const ownedPilot = crew.includes(hire.id);
    if (!ownedPilot) {
      if (hire.grade === "Lendário" || save.fossil < hire.cost) return;
      commit({ ...save, fossil: save.fossil - hire.cost, pilots: [...crew, hire.id] });
      setBought({ tokenId: "", name: hire.name, image: hire.image, pilotId: hire.id });
      setHire(null);
      return;
    }
    commit({ ...save, pilot: hire.id });
    setHire(null);
  }

  function mint(kind: "car" | "pilot" | "part") {
    setRoulette(kind);
  }

  function applyHaul(haul: SpinHaul) {
    const current = loadSave();
    const covered = Math.min(haul.covered ?? 0, freeSpins);
    const cost = (haul.spins - covered) * MINT_COST;
    if (current.fossil < cost) return;
    const pilots = current.pilots?.length ? [...current.pilots] : (["vex"] as PilotId[]);
    const bin = { ...(current.bin ?? {}) };
    for (const drop of haul.gears) {
      if (drop.kind === "pilot") {
        const id = drop.id as PilotId;
        if (!pilots.includes(id)) pilots.push(id);
      } else {
        bin[drop.id] = (bin[drop.id] ?? 0) + 1;
      }
    }
    const known = new Set(current.cars.map((car) => car.tokenId));
    const cars = [...current.cars, ...haul.cars.filter((car) => !known.has(car.tokenId))];
    commit({ ...current, fossil: current.fossil - cost + haul.fossil, cars, pilots, bin });
    if (covered > 0) {
      setFreeSpins((n) => Math.max(0, n - covered));
      void useQuestSpin({ data: { n: covered } })
        .then((res) => {
          if (res.ok) setFreeSpins(res.left);
        })
        .catch(() => undefined);
    }
  }

  const openTier = TIERS.find((item) => item.id === tier);
  const cards = tier ? shelfOf(tier) : [];
  const hero = cards.find((card) => card.key === "barril" && card.rear);
  const grid = hero ? cards.filter((card) => card.key !== hero.key) : cards;

  return (
    <PitFrame bleed title="Loja">
      <video src="/game/loja.mp4" autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/30" />
      <section className="relative z-10 flex min-h-dvh flex-col justify-end px-3 pt-32 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-display text-4xl leading-none text-white sm:text-5xl md:text-6xl">Loja</p>
          <p className="mt-1 max-w-xl text-sm text-pretty text-white/80">
            No banco: {pilotById(seated).name}. Equipado: {driverById(owned.driverId).name}. Comum custa 140. Normal, a partir de 160. Raro, épico e lendário de carro só saem na roleta de carros. Piloto lendário só sai na roleta de pilotos. A pista paga fóssil.
          </p>
          <ul className="mx-auto mt-3 grid w-full max-w-6xl grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
            {TIERS.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setTier(item.id)} onMouseMove={glitchMove} className="shop-glitch group relative w-full overflow-hidden border border-white/20 bg-black/55 p-1 text-left backdrop-blur-sm">
                  <img src={item.image} alt="" className="mx-auto h-12 w-full object-contain" />
                  <p className="mt-0.5 font-display text-lg leading-none" style={{ color: item.tone }}>{item.id}</p>
                  <p className="text-[10px] leading-tight text-pretty text-white/70">{item.line}</p>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => mint("car")} onMouseMove={glitchMove} className="shop-glitch relative w-full overflow-hidden border border-white/20 bg-black/55 p-1 text-left backdrop-blur-sm">
                <img src="/game/loja-wheel.png" alt="" className="mx-auto h-12 w-full object-contain" />
                <p className="mt-0.5 font-display text-lg leading-none text-[#ff5a3c]">Roleta carros</p>
                <p className="text-[10px] leading-tight text-white/70">{freeSpins > 0 ? `Giro das missões: ${freeSpins}` : `${MINT_COST} fóssil. Gira o prêmio.`}</p>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => mint("part")} onMouseMove={glitchMove} className="shop-glitch relative w-full overflow-hidden border border-white/20 bg-black/55 p-1 text-left backdrop-blur-sm">
                <img src="/game/roulette/raro.png" alt="" className="mx-auto h-12 w-full object-contain" />
                <p className="mt-0.5 font-display text-lg leading-none text-[#7fd7ff]">Roleta itens</p>
                <p className="text-[10px] leading-tight text-white/70">{freeSpins > 0 ? `Giro das missões: ${freeSpins}` : `${MINT_COST} fóssil. Peças e armas.`}</p>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => mint("pilot")} onMouseMove={glitchMove} className="shop-glitch relative w-full overflow-hidden border border-white/20 bg-black/55 p-1 text-left backdrop-blur-sm">
                <img src="/game/pilot-badge.png" alt="" className="mx-auto h-12 w-full object-contain" />
                <p className="mt-0.5 font-display text-lg leading-none text-[#ff7ad9]">Roleta pilotos</p>
                <p className="text-[10px] leading-tight text-white/70">{freeSpins > 0 ? `Giro das missões: ${freeSpins}` : `${MINT_COST} fóssil. Lendário só aqui.`}</p>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setCrewOpen(true)} onMouseMove={glitchMove} className="shop-glitch relative w-full overflow-hidden border border-white/20 bg-black/55 p-1 text-left backdrop-blur-sm">
                <img src="/game/pilot-badge.png" alt="" className="mx-auto h-12 w-full object-contain" />
                <p className="mt-0.5 font-display text-lg leading-none text-primary">Pilotos</p>
                <p className="text-[10px] leading-tight text-white/70">No banco: {pilotById(seated).name}.</p>
              </button>
            </li>
          </ul>
        </div>
      </section>
      {openTier && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={() => setTier(null)}>
          <div role="dialog" aria-label={openTier.id} onClick={(e) => e.stopPropagation()} onMouseMove={glitchMove} className="shop-glitch relative max-h-[86dvh] w-full max-w-6xl overflow-hidden border border-white/15 bg-black/80 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="font-display text-4xl leading-none" style={{ color: openTier.tone }}>{openTier.id}</p>
                <p className="text-xs text-white/70">{openTier.line}</p>
              </div>
              <button type="button" onClick={() => setTier(null)} className="min-h-11 border border-white/20 px-3 font-display text-2xl leading-none text-white">Fechar</button>
            </div>
            <ul className="grid max-h-[72dvh] grid-cols-2 gap-3 overflow-y-auto p-3 md:grid-cols-3 xl:grid-cols-4">
              {hero && openTier && (
                <li className="col-span-2 md:col-span-3 xl:col-span-4">
                  <BarrilPlate card={hero} tone={openTier.tone} onSpin={() => hero.spin && setSpin(hero.spin)} />
                </li>
              )}
              {grid.map((card, i) => (
                <li key={card.key} className="shop-cascade" style={{ "--i": i } as CSSProperties}>
                  <article onMouseMove={glitchMove} className="shop-glitch relative flex h-full flex-col border border-white/10 bg-black/70 p-2">
                    <button type="button" className="text-left" onClick={() => card.spin && setSpin(card.spin)} aria-label={`Ver ${card.name}`}>
                      <img src={card.image} alt="" className="aspect-square w-full bg-black object-contain" />
                      <p className="mt-2 font-display text-2xl leading-none text-white">{card.name}</p>
                      <p className="text-xs tracking-widest" style={{ color: openTier.tone }}>{card.tag}</p>
                    </button>
                    <StatSheet stats={card.stats} />
                    <p className="mt-1 flex-1 text-xs text-pretty text-white/60">{card.note}</p>
                    {card.buy ? (
                      <button type="button" disabled={save.fossil < card.buy.cost} onClick={() => setAsk(card.buy ?? null)} className="mt-2 min-h-11 bg-primary px-2 font-display text-2xl leading-none text-ink disabled:opacity-40">
                        {save.fossil < card.buy.cost ? "Falta fóssil" : <>{card.buy.cost} <FossilWord lime /></>}
                      </button>
                    ) : (
                      <p className="mt-2 text-xs tracking-widest text-white/50">{tier === "Comum" ? "Base da ficha" : "Roleta"}</p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {crewOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={() => setCrewOpen(false)}>
          <div role="dialog" aria-label="Pilotos" onClick={(e) => e.stopPropagation()} onMouseMove={glitchMove} className="shop-glitch relative max-h-[86dvh] w-full max-w-6xl overflow-hidden border border-white/15 bg-black/80 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="font-display text-4xl leading-none text-primary">Pilotos</p>
                <p className="text-xs text-white/70">Rua se compra, a partir de 120. Piloto lendário só sai na roleta de pilotos.</p>
              </div>
              <button type="button" onClick={() => setCrewOpen(false)} className="min-h-11 border border-white/20 px-3 font-display text-2xl leading-none text-white">Fechar</button>
            </div>
            <ul className="grid max-h-[72dvh] grid-cols-2 gap-3 overflow-y-auto p-3 md:grid-cols-4">
              {PILOTS.map((pilot, i) => {
                const ownedPilot = crew.includes(pilot.id);
                const on = seated === pilot.id;
                const rouletteOnly = pilot.grade === "Lendário" && !ownedPilot;
                return (
                  <li key={pilot.id} className="shop-cascade" style={{ "--i": i } as CSSProperties}>
                    <article className={`flex h-full flex-col border bg-black/70 p-2 text-center ${on ? "border-primary" : "border-white/10"}`}>
                      <img src={pilot.image} alt="" className="mx-auto h-28 w-24 object-contain" />
                      <p className="mt-2 font-display text-2xl leading-none">{pilot.name}</p>
                      <p className="text-xs tracking-widest text-primary">{on ? "No banco" : pilot.grade}</p>
                      <dl className="mt-2 grid grid-cols-1 gap-0.5 text-left text-xs">
                        {(
                          [
                            ["Durabilidade", bonusLine(pilot.bonus.durability)],
                            ["Velocidade", bonusLine(pilot.bonus.vmax)],
                            ["Aceleração", bonusLine(pilot.bonus.accel)],
                            ["Nitro", bonusLine(pilot.bonus.nitroTime)],
                            ["Potência", bonusLine(pilot.bonus.power)],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label} className="flex items-baseline justify-between gap-2">
                            <dt className="text-white/50">{label}</dt>
                            <dd className="text-primary">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <button
                        type="button"
                        disabled={on || rouletteOnly || (!ownedPilot && save.fossil < pilot.cost)}
                        onClick={() => setHire(pilot)}
                        className="mt-3 min-h-11 w-full bg-primary px-2 font-display text-2xl leading-none text-ink disabled:opacity-40"
                      >
                        {on ? "Equipado" : rouletteOnly ? "Só na roleta" : ownedPilot ? "Equipar" : `${pilot.cost} fóssil`}
                      </button>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {ask && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md border border-border bg-surface p-5">
            <p className="font-display text-4xl leading-none">Confirmar compra</p>
            <img src={ask.image ?? `/game/car-${driverById(ask.driverId).sprite}.png`} alt="" className="mx-auto mt-4 h-28 object-contain" />
            <p className="mt-3 text-sm text-pretty">Comprar {ask.name ?? driverById(ask.driverId).name} por {ask.cost} fóssil?</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={confirmBuy} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">Comprar</button>
              <button type="button" onClick={() => setAsk(null)} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {hire && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md border border-border bg-surface p-5">
            <p className="font-display text-4xl leading-none">{crew.includes(hire.id) ? "Equipar piloto" : "Contratar piloto"}</p>
            <img src={hire.image} alt="" className="mx-auto mt-4 h-36 object-contain" />
            <p className="mt-3 text-sm text-pretty">
              {crew.includes(hire.id) ? `${hire.name} já está na sua bancada. Sentar no banco?` : `Comprar ${hire.name} por ${hire.cost} fóssil?`}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={confirmHire} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">{crew.includes(hire.id) ? "Equipar" : "Comprar"}</button>
              <button type="button" onClick={() => setHire(null)} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {bought && <BoughtModal name={bought.name} image={bought.image} onEquip={equipBought} onLater={() => setBought(null)} />}
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
      {roulette && (
        <MintRoulette
          mode={roulette}
          fossil={save.fossil}
          credit={freeSpins}
          ownedPilots={crew}
          blocked={new Set(save.cars.map((car) => car.exclusive?.signature).filter((item): item is string => Boolean(item)))}
          onClose={() => setRoulette(null)}
          onHaul={applyHaul}
          onEquip={(tokenId) => {
            const current = loadSave();
            commit({ ...current, selected: tokenId });
            setRoulette(null);
          }}
          onEquipGear={(drop) => {
            const current = loadSave();
            if (drop.kind === "pilot") {
              commit({ ...current, pilot: drop.id as PilotId });
              setRoulette(null);
              return;
            }
            const piece = kitById(drop.id);
            if (!piece) return;
            const nextBin = { ...(current.bin ?? {}) };
            nextBin[drop.id] = Math.max(0, (nextBin[drop.id] ?? 1) - 1);
            const prev = current.kit?.[piece.slot];
            if (prev) nextBin[prev] = (nextBin[prev] ?? 0) + 1;
            commit({ ...current, bin: nextBin, kit: { ...current.kit, [piece.slot]: drop.id } });
            setRoulette(null);
          }}
        />
      )}
    </PitFrame>
  );
}
