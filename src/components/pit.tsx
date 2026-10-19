import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { streetOpen, selectedCar } from "@/game/save";
import { useSave } from "@/game/use-save";
import { carArt, carLabel } from "@/game/forge";
import { FossilWord } from "@/components/fossil-word";
import { useLocale } from "@/lib/locale-context";
import type { CopyKey } from "@/lib/locale";

const LINKS: { to: "/dashboard" | "/pista" | "/loja" | "/forja" | "/pecas" | "/bar" | "/stake" | "/conta" | "/cidade" | "/quests"; hash?: "garagem"; key: CopyKey }[] = [
  { to: "/dashboard", key: "nav.panel" },
  { to: "/dashboard", hash: "garagem", key: "nav.garage" },
  { to: "/cidade", key: "nav.map" },
  { to: "/pista", key: "nav.track" },
  { to: "/loja", key: "nav.shop" },
  { to: "/forja", key: "nav.forge" },
  { to: "/pecas", key: "nav.parts" },
  { to: "/bar", key: "nav.bar" },
  { to: "/stake", key: "nav.stake" },
  { to: "/conta", key: "nav.account" },
  { to: "/quests", key: "nav.quests" },
];

function PitBar({ saveFossil, rideArt, rideLabel, street }: { saveFossil: number; rideArt: string; rideLabel: string; street: boolean }) {
  const { t, lang, choose } = useLocale();
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-4" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="shrink-0 font-display text-2xl leading-none text-primary sm:text-4xl">
          DINO DRAG RACE
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <p className="font-display text-xl leading-none text-primary sm:text-3xl">
            {saveFossil.toLocaleString("pt-BR")} <FossilWord />
          </p>
          <img src={rideArt} alt="" title={rideLabel} className="h-8 w-12 object-contain sm:h-9 sm:w-14" />
          <button
            type="button"
            onClick={() => choose(lang === "pt" ? "en" : "pt")}
            className="min-h-11 border border-border px-2 font-pixel text-sm tracking-widest text-primary"
          >
            {lang === "pt" ? "EN" : "PT"}
          </button>
          <UserButton />
        </div>
      </div>
      <nav className="mt-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {LINKS.map((item) => {
          const locked = !street && (item.to === "/bar" || item.to === "/stake");
          if (locked) {
            return (
              <span key={item.key} title="Abre depois de 4 corridas" className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-xs text-muted/40 sm:px-3">
                {t(item.key)} · 4
              </span>
            );
          }
          return (
          <Link
            key={item.key + (item.hash ?? "")}
            to={item.to}
            hash={item.hash}
            preload="render"
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-xs text-muted outline-none sm:px-3 sm:text-sm"
            activeProps={{ className: "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-xs text-primary shadow-[inset_0_-3px_0_#d6ff3f] outline-none sm:px-3 sm:text-sm" }}
            activeOptions={{ exact: true }}
          >
            {t(item.key)}
          </Link>
          );
        })}
      </nav>
    </div>
  );
}
export function PitFrame({ title, kicker, children, bleed, hideHeading }: { title: string; kicker?: ReactNode; children: ReactNode; bleed?: boolean; hideHeading?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const { save, ready } = useSave();
  const ride = selectedCar(save);
  if (isPending || (user && !ready)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black">
        <p className="font-display text-5xl text-primary">...</p>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const bar = <PitBar saveFossil={save.fossil} rideArt={carArt(ride)} rideLabel={carLabel(ride)} street={streetOpen(save)} />;
  if (bleed) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-black text-fg">
        <header className="absolute inset-x-0 top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-sm">
          {bar}
        </header>
        {children}
      </div>
    );
  }
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border bg-surface">{bar}</header>
      <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 xl:max-w-6xl 2xl:max-w-7xl">
        {!hideHeading && kicker && <p className="text-xs font-semibold tracking-widest text-primary">{kicker}</p>}
        {!hideHeading && <h1 className="break-words font-display text-4xl leading-none sm:text-6xl">{title}</h1>}
        <div className={hideHeading ? "" : "mt-6"}>{children}</div>
      </main>
    </div>
  );
}
