import { useEffect, useRef, useState } from "react";
import { FossilWord } from "@/components/fossil-word";
import { MINT_COST, driverById, type NftCar } from "@/game/data";
import { claimForgeBatch } from "@/game/forge.functions";
import { RARITY_WHEEL, paintSide, rollMint, specToCar, type ForgeSpec } from "@/game/forge";
import { rollGear, type GearDrop } from "@/game/prize";

const ICONS: Record<string, string> = {
  Comum: "/game/roulette/comum.png?v=2",
  Normal: "/game/roulette/normal.png?v=2",
  Raro: "/game/roulette/raro.png?v=2",
  Épico: "/game/roulette/epico.png?v=2",
  Lendário: "/game/roulette/lendario.png?v=2",
  Fóssil: "/game/fossil-coin.png",
};

const RANK = ["Lendário", "Épico", "Raro", "Normal", "Comum", "Fóssil"];

export type SpinHaul = {
  spins: number;
  fossil: number;
  cars: NftCar[];
  gears: GearDrop[];
  covered?: number;
};

type Ticket = {
  name: string;
  image: string;
  rarity: string;
  kind: string;
  fossil: number;
  count: number;
};

function prizeImage(spec: ForgeSpec): string {
  if (spec.image) return spec.image;
  return `/game/side/car-${driverById(spec.driverId).sprite}.png`;
}

function lootClass(rarity: string): string {
  if (rarity === "Lendário") return "loot-lendario";
  if (rarity === "Épico") return "loot-epico";
  if (rarity === "Raro") return "loot-raro";
  if (rarity === "Normal") return "loot-normal";
  if (rarity === "Fóssil") return "loot-fossil";
  return "loot-comum";
}

function groupTickets(rows: Omit<Ticket, "count">[]): Ticket[] {
  const map = new Map<string, Ticket>();
  for (const row of rows) {
    const key = row.kind === "fossil" ? "fossil" : `${row.kind}:${row.rarity}:${row.name}`;
    const cur = map.get(key);
    if (cur) {
      cur.count += 1;
      cur.fossil += row.fossil;
    } else map.set(key, { ...row, count: 1 });
  }
  return [...map.values()].sort((a, b) => RANK.indexOf(a.rarity) - RANK.indexOf(b.rarity) || b.count - a.count);
}

export function MintRoulette({
  fossil,
  blocked,
  mode = "car",
  ownedPilots = [],
  onClose,
  onHaul,
  onEquip,
  onEquipGear,
  credit = 0,
}: {
  fossil: number;
  blocked: Set<string>;
  mode?: "car" | "part" | "pilot";
  ownedPilots?: string[];
  onClose: () => void;
  onHaul: (haul: SpinHaul) => void;
  onEquip: (tokenId: string) => void;
  onEquipGear?: (drop: GearDrop) => void;
  credit?: number;
}) {
  const [phase, setPhase] = useState<"idle" | "spin" | "reveal" | "won" | "haul">("idle");
  const [prize, setPrize] = useState<ForgeSpec | null>(null);
  const [gear, setGear] = useState<GearDrop | null>(null);
  const [payout, setPayout] = useState(0);
  const [under, setUnder] = useState("Comum");
  const [fault, setFault] = useState("");
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [spun, setSpun] = useState(1);
  const clip = useRef<HTMLVideoElement>(null);
  const showClip = !skip && (phase === "idle" || phase === "spin" || phase === "reveal");

  useEffect(() => {
    setSkip(window.localStorage.getItem("dino-skip-roulette") === "1");
  }, []);

  function toggleSkip(on: boolean) {
    setSkip(on);
    window.localStorage.setItem("dino-skip-roulette", on ? "1" : "0");
    if (on && (phase === "spin" || phase === "reveal")) setPhase(prize || gear || payout > 0 ? "won" : "idle");
  }

  useEffect(() => {
    const node = clip.current;
    if (!node || skip) return;
    if (phase === "idle") {
      node.pause();
      try {
        node.currentTime = 0;
      } catch {
        /* the file is still opening */
      }
      return;
    }
    if (phase !== "spin" && phase !== "reveal") return;
    node.muted = true;
    void node.play().catch(() => undefined);
  }, [phase, prize, skip]);

  function price(times: number) {
    const covered = Math.min(times, Math.max(0, credit));
    return { covered, bill: (times - covered) * MINT_COST };
  }

  async function spin(times = 1) {
    const { covered, bill } = price(times);
    if ((phase !== "idle" && phase !== "won" && phase !== "haul") || busy || fossil < bill) return;
    setFault("");
    setBusy(true);
    const owned = new Set(ownedPilots);
    const blockedNow = new Set(blocked);
    const cars: NftCar[] = [];
    const gears: GearDrop[] = [];
    const claims: { id: string; signature: string; prompt: string; image: string; video: string; name: string; rarity: string; modelId: string; driverId: string }[] = [];
    const rows: Omit<Ticket, "count">[] = [];
    let fossilGain = 0;
    let lastSpec: ForgeSpec | null = null;
    let lastGear: GearDrop | null = null;

    for (let i = 0; i < times; i++) {
      if (mode !== "car") {
        const hit = rollGear(mode, owned);
        if (hit.kind === "fossil") {
          fossilGain += hit.amount;
          rows.push({ name: "Fóssil", image: ICONS.Fóssil, rarity: "Fóssil", kind: "fossil", fossil: hit.amount });
          continue;
        }
        if (hit.drop.kind === "pilot") owned.add(hit.drop.id);
        gears.push(hit.drop);
        lastGear = hit.drop;
        rows.push({ name: hit.drop.name, image: hit.drop.image || ICONS[hit.drop.rarity] || ICONS.Comum, rarity: hit.drop.rarity, kind: hit.drop.kind, fossil: 0 });
        continue;
      }
      const hit = rollMint(blockedNow);
      if (hit.kind === "fossil") {
        fossilGain += hit.amount;
        rows.push({ name: "Fóssil", image: ICONS.Fóssil, rarity: "Fóssil", kind: "fossil", fossil: hit.amount });
        continue;
      }
      const spec = hit.spec;
      if (!spec.image) spec.image = paintSide(spec);
      blockedNow.add(spec.signature);
      claims.push({
        id: spec.id,
        signature: spec.signature,
        prompt: spec.prompt,
        image: spec.image,
        video: spec.reveal?.startsWith("/game/") ? spec.reveal : "/game/roulette/spin.mp4",
        name: spec.name,
        rarity: spec.rarity,
        modelId: spec.modelId ?? "",
        driverId: spec.driverId,
      });
      cars.push(specToCar(spec));
      lastSpec = spec;
      rows.push({ name: spec.name, image: prizeImage(spec), rarity: spec.rarity, kind: "car", fossil: 0 });
    }

    if (claims.length) {
      const claimed = await claimForgeBatch({ data: { items: claims } }).catch(() => ({ ok: false as const, saved: 0 }));
      if (!claimed.ok) {
        setBusy(false);
        setFault("O banco não gravou o lote. Nada foi cobrado.");
        return;
      }
    }

    onHaul({ spins: times, fossil: fossilGain, cars, gears, covered });
    setTickets(groupTickets(rows));
    setSpun(times);
    setPayout(fossilGain);
    setPrize(times === 1 ? lastSpec : null);
    setGear(times === 1 ? lastGear : null);
    setUnder(times === 1 ? (lastGear?.rarity ?? lastSpec?.rarity ?? (fossilGain > 0 ? "Fóssil" : "Comum")) : "Fóssil");
    setBusy(false);
    if (times > 1 || skip) setPhase(times > 1 ? "haul" : "won");
    else setPhase("spin");
  }

  const liveSlice = RARITY_WHEEL.find((slice) => slice.rarity === under) ?? RARITY_WHEEL[0]!;
  const title = mode === "part" ? "Roleta de itens" : mode === "pilot" ? "Roleta de pilotos" : "Roleta de carros";
  const tally = RANK.map((rarity) => ({ rarity, n: tickets.filter((row) => row.rarity === rarity).reduce((sum, row) => sum + row.count, 0) })).filter((row) => row.n > 0);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/85 p-3 sm:p-6">
      <div className={`hatch-bay w-full max-w-3xl ${prize?.rarity === "Lendário" && phase === "won" ? "shadow-[0_0_48px_rgba(255,210,74,0.25)]" : ""}`}>
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="font-pixel text-sm tracking-[0.35em] text-primary">{phase === "reveal" ? "INCUBADORA" : mode === "part" ? "ITENS" : mode === "pilot" ? "PILOTOS" : "LINHAGEM"}</p>
            <h2 className="font-display text-5xl leading-none sm:text-6xl">{title}</h2>
            <p className="text-[10px] tracking-widest text-[#d6ff3f]">10% fóssil · 100 a 10.000 · igual nas três</p>
          </div>
          <p className="font-display text-4xl leading-none sm:text-5xl" style={{ color: liveSlice.color }}>
            {phase === "idle" ? "Pronto" : phase === "haul" ? `${spun}x` : under}
          </p>
        </div>
        {showClip && (
          <div className="hatch-stage mt-3 flex w-full justify-center overflow-hidden bg-black">
            <video
              ref={clip}
              key={phase === "reveal" ? prize?.reveal : "roulette-spin"}
              src={phase === "reveal" ? prize?.reveal : "/game/roulette/spin.mp4?v=2"}
              playsInline
              muted
              preload="auto"
              className="w-full bg-black"
              onEnded={() => {
                if (phase === "spin") setPhase(!skip && prize?.reveal ? "reveal" : "won");
                else if (phase === "reveal") setPhase("won");
              }}
            />
          </div>
        )}
        <ul className="mt-3 grid w-full grid-cols-3 gap-1.5 sm:grid-cols-6">
          {RARITY_WHEEL.map((slice) => {
            const hot = under === slice.rarity && phase !== "idle" && phase !== "haul";
            return (
              <li key={slice.rarity} className="hatch-card px-1 py-2 text-center" style={{ borderColor: hot ? slice.color : undefined, boxShadow: hot ? `inset 0 0 18px ${slice.color}33` : undefined }}>
                <img src={ICONS[slice.rarity]} alt="" className="mx-auto size-12 object-contain" />
                <p className="mt-1 font-pixel text-sm leading-none tracking-wide" style={{ color: slice.color }}>{slice.rarity}</p>
                <p className="font-display text-2xl leading-none">{slice.pct}%</p>
                {slice.rarity === "Fóssil" && <p className="text-[10px] leading-tight text-muted">100 a 10.000</p>}
              </li>
            );
          })}
        </ul>
        {phase === "haul" && (
          <div className="loot-board relative mt-3 p-3">
            <div className="loot-scan" />
            <div className="relative flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-pixel text-[10px] tracking-[0.35em] text-[#d6ff3f]">LOOT</p>
                <p className="font-display text-4xl leading-none text-white">{spun} giros</p>
              </div>
              <p className="font-display text-3xl leading-none text-[#d6ff3f]">+{payout.toLocaleString("pt-BR")} fóssil</p>
            </div>
            <ul className="relative mt-3 flex flex-wrap gap-1.5">
              {tally.map((row) => (
                <li key={row.rarity} className="border border-white/15 bg-black/50 px-2 py-1 font-pixel text-[10px] tracking-widest" style={{ color: ICONS[row.rarity] ? RARITY_WHEEL.find((slice) => slice.rarity === row.rarity)?.color : "#fff" }}>
                  {row.rarity} · {row.n}
                </li>
              ))}
            </ul>
            <ul className="relative mt-3 grid max-h-[42dvh] gap-1.5 overflow-y-auto pr-1">
              {tickets.map((row, index) => (
                <li key={`${row.kind}-${row.rarity}-${row.name}`} className={`loot-row flex items-center gap-3 border border-white/10 px-2 py-1.5 ${lootClass(row.rarity)}`} style={{ animationDelay: `${Math.min(index, 18) * 35}ms` }}>
                  <img src={row.image} alt="" className="size-12 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(214,255,63,0.35)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-2xl leading-none text-white">{row.name}</span>
                    <span className="font-pixel text-[10px] tracking-[0.28em]" style={{ color: RARITY_WHEEL.find((slice) => slice.rarity === row.rarity)?.color }}>{row.rarity}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-3xl leading-none text-white">×{row.count}</span>
                    {row.fossil > 0 && <span className="block font-pixel text-[10px] text-[#d6ff3f]">+{row.fossil.toLocaleString("pt-BR")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {phase === "won" && payout > 0 && !prize && !gear && (
          <div className="hatch-card mt-3 p-3 text-center" style={{ borderColor: liveSlice.color }}>
            <p className="font-pixel text-sm tracking-[0.3em]" style={{ color: liveSlice.color }}>FÓSSIL</p>
            <img src={ICONS.Fóssil} alt="" className="mx-auto mt-2 size-16 object-contain" />
            <p className="mt-2 font-display text-5xl leading-none text-primary">+{payout.toLocaleString("pt-BR")}</p>
            <p className="text-sm text-muted">Caiu na conta. O giro custou {MINT_COST}.</p>
          </div>
        )}
        {phase === "won" && (prize || gear) && (
          <div className="hatch-card mt-3 p-3 text-center" style={{ borderColor: liveSlice.color }}>
            <p className="font-pixel text-sm tracking-[0.3em]" style={{ color: liveSlice.color }}>{(gear ?? prize)!.rarity}</p>
            <img src={gear ? gear.image : prizeImage(prize!)} alt="" className="mx-auto mt-2 h-28 object-contain" />
            <p className="mt-2 font-display text-4xl leading-none">{gear ? gear.name : prize!.name}</p>
            <p className="text-sm text-muted">{gear?.kind === "pilot" ? "Entrou na bancada." : gear ? "Caiu na caixa." : "Entrou na garagem. O carro atual continua equipado."}</p>
            <p className="mt-1 text-sm">Gostaria de equipar?</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => (gear ? onEquipGear?.(gear) : prize && onEquip(prize.id))} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                Equipar
              </button>
            </div>
          </div>
        )}
        {fault && <p className="mt-3 text-center text-sm text-danger">{fault}</p>}
        <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
          {([1, 10, 100, 1000] as const).map((times) => {
            const { covered, bill } = price(times);
            return (
            <button
              key={times}
              type="button"
              disabled={(phase !== "idle" && phase !== "won" && phase !== "haul") || busy || fossil < bill}
              onClick={() => void spin(times)}
              className={`min-h-11 px-3 font-display text-2xl leading-none disabled:opacity-40 ${times === 1 ? "bg-danger text-fg" : "border border-[#d6ff3f]/50 bg-black text-[#d6ff3f] shadow-[0_0_16px_rgba(214,255,63,0.15)]"}`}
            >
              {times === 1 ? "Girar" : `${times}×`}
              {covered > 0 && bill === 0 ? " · missão" : covered > 0 ? ` · ${covered} missão + ${bill}` : ` · ${bill}`}
              {bill > 0 && <> <FossilWord /></>}
            </button>
            );
          })}
          <button type="button" onClick={onClose} disabled={phase === "reveal" || phase === "spin"} className="min-h-11 border border-border px-4 font-display text-2xl leading-none disabled:opacity-40">
            Fechar
          </button>
        </div>
        <button
          type="button"
          onClick={() => toggleSkip(!skip)}
          className={`mt-3 min-h-11 w-full border px-3 font-display text-2xl leading-none ${skip ? "border-[#d6ff3f] bg-[#d6ff3f] text-black shadow-[0_0_22px_rgba(214,255,63,0.45)]" : "border-white/20 text-white"}`}
        >
          {skip ? "Prêmio direto · ligado" : "Pular animação do prêmio"}
        </button>
      </div>
    </div>
  );
}
