import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CarShow, type SpinTarget } from "@/components/car-show";
import { MintRoulette } from "@/components/mint-roulette";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { CATALOG, MINT_COST, driverById, resolveStats, BONUS, stack } from "@/game/data";
import { epicStickers, legendStickers, rareStickers } from "@/game/forge";
import { forgeCar, selectedCar, loadSave } from "@/game/save";
import { useSave } from "@/game/use-save";

export const Route = createFileRoute("/loja")({ component: Loja });

function Loja() {
  const { save, commit } = useSave();
  const owned = selectedCar(save);
  const [spin, setSpin] = useState<SpinTarget | null>(null);
  const [roulette, setRoulette] = useState(false);
  const [ask, setAsk] = useState<(typeof CATALOG)[number] | null>(null);
  const [bought, setBought] = useState<{ tokenId: string; name: string; image: string } | null>(null);

  function confirmBuy() {
    if (!ask || save.fossil < ask.cost) return;
    const nft = forgeCar(save, ask.driverId, ask.rarity);
    const d = driverById(ask.driverId);
    const name = ask.name ?? d.name;
    const image = ask.image ?? `/game/car-${d.sprite}.png`;
    if (ask.image && ask.name) {
      nft.exclusive = {
        signature: `normal.${ask.name}.${nft.tokenId}`,
        prompt: ask.note,
        name: ask.name,
        image: ask.image,
      };
    }
    commit({ ...save, fossil: save.fossil - ask.cost, cars: [...save.cars, nft] });
    setBought({ tokenId: nft.tokenId, name, image });
    setAsk(null);
  }

  function equipBought() {
    if (!bought) return;
    const current = loadSave();
    commit({ ...current, selected: bought.tokenId });
    setBought(null);
  }

  function mint() {
    if (save.fossil < MINT_COST) return;
    setRoulette(true);
  }

  return (
    <PitFrame title="Loja de carros" kicker={<>{save.fossil} <FossilWord>FÓSSIL</FossilWord></>}>
      <p className="max-w-xl text-sm text-pretty text-muted">
        Cada ficha entra na sua garagem. O lendário é o único que encosta no teto de 15784 mph, depois das peças.
        Agora você está no {driverById(owned.driverId).name}.
      </p>
      <h2 className="mt-4 font-display text-4xl leading-none">Normais</h2>
      <p className="mt-1 text-sm text-muted">Os dez de prateleira. O status é Normal.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {CATALOG.map((item) => {
          const d = driverById(item.driverId);
          const title = item.name ?? d.name;
          const stats = resolveStats(item.driverId, item.rarity, stack({ engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 }, BONUS[item.driverId]));
          return (
            <li key={title} className="flex gap-3 border border-border bg-surface p-3">
              <button
                type="button"
                className="shrink-0 text-center"
                aria-label={`Ver ${title}`}
                onClick={() =>
                  item.image
                    ? setSpin({
                        name: title,
                        car: "Normal",
                        poster: item.image,
                        video: `/game/normal/spin-${title.toLowerCase()}.mp4`,
                      })
                    : setSpin({ sprite: d.sprite, name: title, car: d.car })
                }
              >
                {!item.image && <img src={`/game/pilot-${d.sprite}.png`} alt="" className="size-16 object-cover" />}
                <img src={item.image ?? `/game/car-${d.sprite}.png`} alt="" className="size-20 object-contain" />
                <span className="mt-1 block text-xs tracking-widest text-primary">giro</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-3xl leading-none">{title}</p>
                <p className="text-sm text-muted">
                  {item.rarity} · {Math.round(stats.vmax)} mph
                </p>
                <p className="mt-1 text-sm text-pretty text-fg">{item.note}</p>
                <button
                  type="button"
                  disabled={save.fossil < item.cost}
                  onClick={() => setAsk(item)}
                  className="mt-3 min-h-11 bg-primary px-3 font-display text-2xl leading-none text-ink disabled:opacity-40"
                >
                  {item.cost} <FossilWord lime />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border border-border bg-surface p-4">
        <h2 className="font-display text-4xl leading-none">Raros</h2>
        <p className="mt-1 text-sm text-muted">Não vende. Sai no mint, 5%, um entre os quatorze. Sete humanos, sete dinocar. Nenhum repete épico nem lendário.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {rareStickers().map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="w-full border border-border bg-black p-2 text-center"
                aria-label={`Ver ${card.name}`}
                onClick={() =>
                  setSpin({
                    name: card.name,
                    car: `${card.kind === "dinocar" ? "Dinocar" : "Humano"} · figurinha ${card.no}`,
                    poster: card.car,
                    video: card.spin,
                  })
                }
              >
                <img src={card.car} alt="" className="h-28 w-full object-contain" />
                <p className="mt-2 font-display text-2xl leading-none text-primary">{card.no}</p>
                <p className="text-xs tracking-widest text-fg">{card.name}</p>
                <p className="text-xs tracking-widest text-muted">{card.kind}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 border border-border bg-surface p-4">
        <h2 className="font-display text-4xl leading-none">Épicos</h2>
        <p className="mt-1 text-sm text-muted">Não vende. Sai no mint, 1%. Quatro são sucata humana. Três são dinocar: o bicho é o veículo.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {epicStickers().map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="w-full border border-border bg-black p-2 text-center"
                aria-label={`Ver ${card.name}`}
                onClick={() =>
                  setSpin({
                    name: card.name,
                    car: `${card.kind === "dinocar" ? "Dinocar" : "Humano"} · figurinha ${card.no}`,
                    poster: card.car,
                    video: card.spin,
                  })
                }
              >
                <img src={card.car} alt="" className="h-28 w-full object-contain" />
                <p className="mt-2 font-display text-2xl leading-none text-primary">{card.no}</p>
                <p className="text-xs tracking-widest text-fg">{card.name}</p>
                <p className="text-xs tracking-widest text-muted">{card.kind}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 border border-border bg-surface p-4">
        <h2 className="font-display text-4xl leading-none">Lendários</h2>
        <p className="mt-1 text-sm text-muted">Figurinha pronta. Não vende. Só sai no mint, 0,1%, uma entre as oito.</p>
        <a
          href="/lendarios-figurinhas.zip"
          download="lendarios-figurinhas.zip"
          className="mt-3 inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink"
        >
          Baixar as 16 figurinhas
        </a>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {legendStickers().map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="w-full border border-border bg-black p-2 text-center"
                aria-label={`Ver ${card.name} girando`}
                onClick={() =>
                  setSpin({
                    name: card.name,
                    car: `Figurinha ${card.no}`,
                    video: card.spin,
                    poster: card.car,
                  })
                }
              >
                <img src={card.car} alt="" className="h-16 w-full object-contain" />
                <img src={card.pilot} alt="" className="mx-auto mt-1 h-16 w-16 object-contain" />
                <p className="mt-2 font-display text-2xl leading-none text-primary">{card.no}</p>
                <p className="text-xs tracking-widest text-fg">{card.name}</p>
                <span className="mt-1 block text-xs tracking-widest text-primary">giro</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 border border-border bg-surface p-4">
        <h2 className="font-display text-4xl leading-none">Roleta</h2>
        <p className="mt-1 text-sm text-muted">
          Gira e para no prêmio. Lendário 0,1%. Épico 1%. Raro 5%. Comum 70%. Normal 23,9%.
        </p>
        <button
          type="button"
          disabled={save.fossil < MINT_COST}
          onClick={mint}
          className="mt-3 min-h-11 bg-danger px-4 font-display text-3xl leading-none text-fg disabled:opacity-40"
        >
          Girar a roleta · {MINT_COST} <FossilWord />
        </button>
      </div>
      {ask && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md border border-border bg-surface p-5">
            <p className="font-display text-4xl leading-none">Confirmar compra</p>
            <img src={ask.image ?? `/game/car-${driverById(ask.driverId).sprite}.png`} alt="" className="mx-auto mt-4 h-28 object-contain" />
            <p className="mt-3 text-sm text-pretty">
              Comprar {ask.name ?? driverById(ask.driverId).name} por {ask.cost} fóssil? Ele entra na garagem. O carro atual continua equipado.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={confirmBuy} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                Comprar
              </button>
              <button type="button" onClick={() => setAsk(null)} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {bought && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md border border-border bg-surface p-5">
            <p className="font-display text-4xl leading-none text-primary">Comprou</p>
            <img src={bought.image} alt="" className="mx-auto mt-4 h-28 object-contain" />
            <p className="mt-3 text-sm text-pretty">
              {bought.name} está na garagem. Quer equipar esse carro agora?
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={equipBought} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                Equipar
              </button>
              <button type="button" onClick={() => setBought(null)} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">
                Depois
              </button>
            </div>
          </div>
        </div>
      )}
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
      {roulette && (
        <MintRoulette
          fossil={save.fossil}
          blocked={new Set(save.cars.map((car) => car.exclusive?.signature).filter((item): item is string => Boolean(item)))}
          onClose={() => setRoulette(false)}
          onMinted={(nft) => {
            const current = loadSave();
            if (current.fossil < MINT_COST) return;
            if (current.cars.some((c) => c.tokenId === nft.tokenId)) return;
            commit({
              ...current,
              fossil: current.fossil - MINT_COST,
              cars: [...current.cars, nft],
            });
          }}
          onEquip={(tokenId) => {
            const current = loadSave();
            commit({ ...current, selected: tokenId });
            setRoulette(false);
          }}
        />
      )}
    </PitFrame>
  );
}
