import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CarShow, spinForNft } from "@/components/car-show";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { driverById, liveStats, pilotById, type Rarity } from "@/game/data";
import { carArt, carLabel } from "@/game/forge";
import { carRank, xpBar } from "@/game/parts";
import { selectedCar } from "@/game/save";
import { STORY, storyPhase } from "@/game/story";
import { useSave } from "@/game/use-save";
import { useLocale } from "@/lib/locale-context";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const user = useCurrentUser();
  const { save, commit } = useSave();
  const { t, lang } = useLocale();
  const car = selectedCar(save);
  const driver = driverById(car.driverId);
  const live = liveStats(car, save.pilot, save.kit);
  const pilot = pilotById(save.pilot);
  const who = save.callsign || user?.displayName || t("dash.pilot");
  const [spin, setSpin] = useState<ReturnType<typeof spinForNft> | null>(null);
  const [tier, setTier] = useState<Rarity | null>(null);
  const bays: { id: Rarity; image: string; color: string }[] = [
    { id: "Comum", image: "/game/bay/cut-comum.png?v=1", color: "#efe6d2" },
    { id: "Normal", image: "/game/bay/cut-normal.png?v=1", color: "#d6ff3f" },
    { id: "Raro", image: "/game/bay/cut-raro.png?v=1", color: "#7fd7ff" },
    { id: "Épico", image: "/game/bay/cut-epico.png?v=1", color: "#c084fc" },
    { id: "Lendário", image: "/game/bay/cut-lendario.png?v=1", color: "#ffd24a" },
  ];
  const ofTier = tier ? save.cars.filter((nft) => nft.rarity === tier) : [];

  return (
    <PitFrame title={who} kicker={t("dash.kicker")}>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="border border-border bg-surface p-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="shrink-0 text-center"
              aria-label={t("dash.viewSpin", { name: carLabel(car) })}
              onClick={() => setSpin(spinForNft(car))}
            >
              <img src={carArt(car)} alt="" className="h-20 w-24 object-contain sm:h-24 sm:w-28" />
              <span className="mt-1 block text-xs tracking-widest text-primary">{t("dash.spin")}</span>
            </button>
            <div className="min-w-0">
              <p className="break-words font-display text-3xl leading-none sm:text-4xl">{carLabel(car)}</p>
              <p className="text-sm text-muted">
                {car.tokenId} · {car.rarity} · nv {xpBar(car.xp ?? 0).level} {carRank(car)} · {Math.round(live.vmax)} mph
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <img src={pilot.image} alt="" className="h-8 w-8 object-contain" />
                {t("dash.seat")} · {pilot.name} · {pilot.grade}
              </p>
              <p className="mt-1 font-display text-3xl text-primary">
                {save.fossil} <FossilWord />
              </p>
              <p className="mt-1 text-sm text-muted">Fóssil entra no fim de cada corrida, no baú do dia e nas missões da pista. Comum custa 140. Normal, a partir de 160.</p>
              {(save.chest ?? "") !== new Date().toISOString().slice(0, 10) && (
                <button
                  type="button"
                  className="mt-2 min-h-11 bg-primary px-3 font-display text-2xl leading-none text-ink"
                  onClick={() => commit({ ...save, fossil: save.fossil + 60, chest: new Date().toISOString().slice(0, 10) })}
                >
                  Baú do dia · 60
                </button>
              )}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 border border-border bg-bg px-3 py-2">
              <div className="flex items-baseline justify-between">
                <dt className="text-xs tracking-widest text-muted">{t("dash.hp")}</dt>
                <dd className="font-display text-2xl leading-none text-primary">{Math.round(live.durability)}</dd>
              </div>
              <div className="mt-2 h-3 bg-black">
                <div className="h-full bg-primary" style={{ width: `${Math.max(8, Math.min(100, (live.durability / 320) * 100))}%` }} />
              </div>
            </div>
            {[
              [t("dash.vmax"), `${Math.round(live.vmax)} mph`],
              [t("dash.accel"), String(Math.round(live.accel))],
              [t("dash.nitro"), `${live.nitroTime.toFixed(1)}s`],
              [t("dash.power"), String(Math.round(live.power))],
            ].map(([k, v]) => (
              <div key={k} className="border border-border bg-bg px-3 py-2">
                <dt className="text-xs tracking-widest text-muted">{k}</dt>
                <dd className="font-display text-2xl leading-none text-primary">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/pista" search={{ treino: true }} className="inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink">
              {t("dash.train")}
            </Link>
            <Link to="/loja" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none">
              {t("dash.shop")}
            </Link>
            <Link to="/forja" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none">
              {t("dash.forge")}
            </Link>
            <Link to="/pecas" className="inline-flex min-h-11 items-center border border-border px-4 font-display text-3xl leading-none">
              {t("dash.parts")}
            </Link>
          </div>
        </article>
        <aside className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">{t("dash.onAccount")}</p>
          <p className="mt-2 font-display text-5xl leading-none">{t("dash.wins", { n: save.wins })}</p>
          <p className="text-sm text-muted">{t("dash.races", { n: save.races })}</p>
          <p className="mt-4 text-sm text-muted">{user?.primaryEmail}</p>
        </aside>
      </div>
      <section id="garagem" className="relative mt-8 scroll-mt-32 overflow-hidden border border-[#3a4428] bg-black md:aspect-video">
        <video
          src="/game/hangar-loop.mp4?v=3"
          autoPlay
          loop
          muted
          playsInline
          className="block aspect-video w-full object-cover md:absolute md:inset-0 md:h-full md:w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-3 sm:p-4">
          <div>
            <p className="font-pixel text-xs tracking-[0.4em] text-primary">{t("dash.yard")}</p>
            <h2 className="font-display text-4xl leading-none sm:text-6xl">{t("dash.yourGarage")}</h2>
          </div>
          <p className="font-display text-3xl leading-none text-primary sm:text-4xl">{save.cars.length}</p>
        </div>
        <div className="grid grid-cols-5 gap-1 p-2 md:absolute md:inset-x-3 md:bottom-3 md:p-0">
          {bays.map((bay) => {
            const count = save.cars.filter((nft) => nft.rarity === bay.id).length;
            return (
              <button
                key={bay.id}
                type="button"
                onClick={() => setTier(bay.id)}
                className="min-w-0 overflow-hidden border border-white/15 bg-black/55 px-0.5 py-1 backdrop-blur-sm sm:px-2 sm:py-2"
              >
                <img src={bay.image} alt="" className="mx-auto h-8 w-full object-contain sm:h-14" />
                <span className="mt-1 block truncate text-center font-display text-[11px] leading-none sm:text-[clamp(12px,1.6vw,22px)]" style={{ color: bay.color }}>{t(`rarity.${bay.id}`)}</span>
                <span className="block text-center font-display text-[11px] leading-none sm:text-[clamp(11px,1.3vw,18px)]" style={{ color: bay.color }}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>
      <h2 className="mt-8 font-display text-5xl leading-none">{t("dash.story")}</h2>
      <div className="mt-3 flex flex-col items-stretch justify-between gap-3 border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-3xl leading-none">
            {(save.storyClear ?? 0) >= STORY.length
              ? t("dash.clear")
              : t("dash.phase", { n: storyPhase((save.storyClear ?? 0) + 1).chapter, name: driverById(storyPhase((save.storyClear ?? 0) + 1).driver).name })}
          </p>
          <p className="mt-1 text-sm text-muted">{t("dash.storyBlurb")}</p>
        </div>
        <Link to="/pista" search={{ story: true }} className="inline-flex min-h-11 items-center bg-primary px-3 font-display text-2xl leading-none text-ink">
          {t("dash.enter")}
        </Link>
      </div>
      <h2 className="mt-8 font-display text-5xl leading-none">{t("dash.mode2")}</h2>
      <div className="mt-3 border border-border bg-surface p-4">
        <p className="font-pixel text-xs tracking-[0.35em] text-primary">{t("dash.connected")}</p>
        <p className="mt-2 text-sm text-muted">{t("dash.mode2Blurb")}</p>
        <Link to="/cidade" className="mt-4 inline-flex min-h-11 items-center bg-primary px-3 font-display text-2xl leading-none text-ink">
          {t("dash.enter")}
        </Link>
      </div>
      {tier && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/80 p-3 sm:items-center" onClick={() => setTier(null)}>
          <div role="dialog" aria-modal="true" aria-label={tier} className="max-h-[80vh] w-full max-w-lg overflow-y-auto border border-border bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-4xl leading-none">{t(`rarity.${tier}`)}</h3>
              <button type="button" className="min-h-11 border border-border px-3 text-sm" onClick={() => setTier(null)}>
                {t("dash.close")}
              </button>
            </div>
            {ofTier.length === 0 ? (
              <div className="grid place-items-center py-6 text-center">
                <img src="/game/lonely-dragon.gif?v=1" alt="" className="h-56 w-auto object-contain" />
              </div>
            ) : (
              <ul className="mt-4 grid gap-2">
                {ofTier.map((nft) => {
                  const on = nft.tokenId === save.selected;
                  return (
                    <li key={nft.tokenId} className={`flex items-center gap-3 border px-2 py-2 ${on ? "border-primary" : "border-border"}`}>
                      <img src={carArt(nft)} alt="" className="h-14 w-16 object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-2xl leading-none">{carLabel(nft)}</p>
                        <p className="font-pixel text-[10px] tracking-widest text-primary">{on ? t("dash.equipped").toUpperCase() : t(`rarity.${nft.rarity}`)}</p>
                      </div>
                      <button type="button" className="min-h-11 px-2 font-pixel text-[10px] tracking-widest text-primary" onClick={() => setSpin(spinForNft(nft))}>
                        {lang === "en" ? "SPIN" : "GIRO"}
                      </button>
                      <button
                        type="button"
                        className={`min-h-11 border px-3 text-sm ${on ? "border-primary text-primary" : "border-border"}`}
                        disabled={on}
                        onClick={() => commit({ ...save, selected: nft.tokenId })}
                      >
                        {on ? t("dash.equipped") : t("dash.equip")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
    </PitFrame>
  );
}
