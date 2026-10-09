import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CarShow, spinForNft } from "@/components/car-show";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { BONUS, MAX_LEVEL, PARTS, UPGRADE_COST, driverById, resolveStats, stack, type Upgrades } from "@/game/data";
import { carArt, carLabel } from "@/game/forge";
import { selectedCar } from "@/game/save";
import { useSave } from "@/game/use-save";

export const Route = createFileRoute("/pecas")({ component: Pecas });

function Pecas() {
  const { save, commit } = useSave();
  const car = selectedCar(save);
  const live = resolveStats(car.driverId, car.rarity, stack(car.upgrades, BONUS[car.driverId]));
  const [spin, setSpin] = useState<ReturnType<typeof spinForNft> | null>(null);

  function buy(part: keyof Upgrades) {
    const level = car.upgrades[part];
    if (level >= MAX_LEVEL) return;
    const cost = UPGRADE_COST[level] ?? 9999;
    if (save.fossil < cost) return;
    const cars = save.cars.map((c) =>
      c.tokenId === car.tokenId ? { ...c, upgrades: { ...c.upgrades, [part]: level + 1 } } : c,
    );
    commit({ ...save, fossil: save.fossil - cost, cars });
  }

  return (
    <PitFrame title="Oficina" kicker={<>{save.fossil} <FossilWord>FÓSSIL</FossilWord></>}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="shrink-0 text-center"
          aria-label={`Ver ${carLabel(car)} girando`}
          onClick={() => setSpin(spinForNft(car))}
        >
          <img src={carArt(car)} alt="" className="size-20 object-contain" />
          <span className="mt-1 block text-xs tracking-widest text-primary">giro</span>
        </button>
        <div>
          <p className="font-display text-4xl leading-none">{carLabel(car)}</p>
          <p className="text-sm text-muted">
            {car.tokenId} · teto {Math.round(live.vmax)} mph · nitro {live.nitroTime.toFixed(1)}s
          </p>
        </div>
      </div>
      <ul className="mt-4 flex gap-2 overflow-x-auto">
        {save.cars.map((nft) => (
          <li key={nft.tokenId}>
            <button
              type="button"
              onClick={() => commit({ ...save, selected: nft.tokenId })}
              className={`min-h-11 px-3 text-sm ${nft.tokenId === car.tokenId ? "bg-primary text-ink" : "border border-border"}`}
            >
              {driverById(nft.driverId).name}
            </button>
          </li>
        ))}
      </ul>
      <ul className="mt-4 grid gap-3">
        {PARTS.map((part) => {
          const level = car.upgrades[part.key];
          const cost = UPGRADE_COST[level];
          const maxed = level >= MAX_LEVEL;
          return (
            <li key={part.key} className="flex items-center justify-between gap-3 border border-border bg-surface p-3">
              <span>
                <span className="block text-fg">{part.name}</span>
                <span className="block text-sm text-muted">{part.blurb}</span>
                <span className="mt-2 flex gap-1">
                  {Array.from({ length: MAX_LEVEL }, (_, i) => (
                    <span key={i} className={`h-2 w-6 ${i < level ? "bg-primary" : "bg-border"}`} />
                  ))}
                </span>
                {level > MAX_LEVEL && <span className="mt-1 block text-xs tracking-widest text-primary">MONSTRO {level}</span>}
              </span>
              <button
                type="button"
                disabled={maxed || save.fossil < (cost ?? 0)}
                onClick={() => buy(part.key)}
                className="min-h-11 shrink-0 bg-primary px-3 font-display text-2xl leading-none text-ink disabled:opacity-40"
              >
                {maxed ? "Max" : <>{cost} <FossilWord lime /></>}
              </button>
            </li>
          );
        })}
      </ul>
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
    </PitFrame>
  );
}
