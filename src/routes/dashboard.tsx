import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CarShow, spinForNft } from "@/components/car-show";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { BONUS, driverById, resolveStats, stack } from "@/game/data";
import { carArt, carLabel, legendOf } from "@/game/forge";
import { selectedCar } from "@/game/save";
import { STORY, storyPhase } from "@/game/story";
import { useSave } from "@/game/use-save";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const user = useCurrentUser();
  const { save, commit } = useSave();
  const car = selectedCar(save);
  const driver = driverById(car.driverId);
  const live = resolveStats(car.driverId, car.rarity, stack(car.upgrades, BONUS[car.driverId]));
  const who = save.callsign || user?.displayName || "Piloto";
  const [spin, setSpin] = useState<ReturnType<typeof spinForNft> | null>(null);

  return (
    <PitFrame title={who} kicker="PAINEL">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="border border-border bg-surface p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="shrink-0 text-center"
              aria-label={`Ver ${carLabel(car)} girando`}
              onClick={() => setSpin(spinForNft(car))}
            >
              <img src={carArt(car)} alt="" className="h-24 w-28 object-contain" />
              <span className="mt-1 block text-xs tracking-widest text-primary">giro</span>
            </button>
            <div>
              <p className="font-display text-4xl leading-none">{carLabel(car)}</p>
              <p className="text-sm text-muted">
                {car.tokenId} · {car.rarity} · {Math.round(live.vmax)} mph
              </p>
              <p className="mt-1 font-display text-3xl text-primary">
                {save.fossil} <FossilWord />
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Durabilidade", String(Math.round(live.durability))],
              ["Velocidade max", `${Math.round(live.vmax)} mph`],
              ["Aceleração", String(Math.round(live.accel))],
              ["Nitro", `${live.nitroTime.toFixed(1)}s`],
              ["Potência", String(Math.round(live.power))],
            ].map(([k, v]) => (
              <div key={k} className="border border-border bg-bg px-3 py-2">
                <dt className="text-xs tracking-widest text-muted">{k}</dt>
                <dd className="font-display text-2xl leading-none text-primary">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/pista" className="inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink">
              Treino
            </Link>
            <Link to="/loja" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none">
              Loja
            </Link>
            <Link to="/pecas" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none">
              Peças
            </Link>
          </div>
        </article>
        <aside className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">NA CONTA</p>
          <p className="mt-2 font-display text-5xl leading-none">{save.wins} vitórias</p>
          <p className="text-sm text-muted">{save.races} corridas</p>
          <p className="mt-4 text-sm text-muted">{user?.primaryEmail}</p>
        </aside>
      </div>
      <h2 className="mt-8 font-display text-5xl leading-none">Sua grade</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {save.cars.map((nft) => {
          const d = driverById(nft.driverId);
          const on = nft.tokenId === save.selected;
          return (
            <li key={nft.tokenId} className={`flex items-center gap-3 border p-3 ${on ? "border-primary bg-surface-2" : "border-border bg-surface"}`}>
              <button
                type="button"
                aria-label={`Ver ${carLabel(nft)} girando`}
                onClick={() => setSpin(spinForNft(nft))}
              >
                <img src={legendOf(nft.exclusive?.image)?.pilot ?? `/game/pilot-${d.sprite}.png`} alt="" className="size-16 object-contain" />
                <img src={carArt(nft)} alt="" className="size-16 object-contain" />
              </button>
              <button
                type="button"
                onClick={() => commit({ ...save, selected: nft.tokenId })}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block font-display text-3xl leading-none">{carLabel(nft)}</span>
                <span className="block text-sm text-muted">
                  {nft.tokenId} · {nft.rarity}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-8 font-display text-5xl leading-none">Modo história</h2>
      <div className="mt-3 flex items-center justify-between gap-3 border border-border bg-surface p-4">
        <div>
          <p className="font-display text-3xl leading-none">
            {(save.storyClear ?? 0) >= STORY.length
              ? "Faixa limpa"
              : `Fase ${storyPhase((save.storyClear ?? 0) + 1).chapter} · ${driverById(storyPhase((save.storyClear ?? 0) + 1).driver).name}`}
          </p>
          <p className="mt-1 text-sm text-muted">Uma arma viva cobriu a Terra. A guerra entre humanos e draconianos parou na mesa, e virou corrida.</p>
        </div>
        <Link to="/pista" search={{ story: true }} className="inline-flex min-h-11 items-center bg-primary px-3 font-display text-2xl leading-none text-ink">
          Entrar
        </Link>
      </div>
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
    </PitFrame>
  );
}
