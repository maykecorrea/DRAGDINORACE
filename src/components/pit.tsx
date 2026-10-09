import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useSave } from "@/game/use-save";
import { selectedCar } from "@/game/save";
import { carArt, carLabel } from "@/game/forge";
import { FossilWord } from "@/components/fossil-word";

const LINKS = [
  { to: "/dashboard", label: "Painel" },
  { to: "/pista", label: "Pista" },
  { to: "/loja", label: "Loja" },
  { to: "/pecas", label: "Peças" },
  { to: "/conta", label: "Conta" },
] as const;

export function PitFrame({ title, kicker, children }: { title: string; kicker?: ReactNode; children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const { save } = useSave();
  const ride = selectedCar(save);
  if (isPending) {
    return (
      <main className="min-h-dvh bg-bg px-4 py-8 text-fg">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="h-8 w-40 animate-pulse bg-surface" />
          <div className="h-24 animate-pulse bg-surface" />
          <div className="h-40 animate-pulse bg-surface" />
        </div>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-display text-4xl leading-none text-primary">
            SAURSHIFT
          </Link>
          <nav className="flex max-w-full gap-1 overflow-x-auto">
            {LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex min-h-11 items-center px-3 text-sm text-muted"
                activeProps={{ className: "inline-flex min-h-11 items-center px-3 text-sm text-primary" }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="font-display text-3xl leading-none text-primary">
            {save.fossil} <FossilWord />
          </p>
          <div className="flex items-center gap-2">
            <img src={carArt(ride)} alt="" title={carLabel(ride)} className="h-9 w-14 object-contain" />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {kicker && <p className="text-xs font-semibold tracking-widest text-primary">{kicker}</p>}
        <h1 className="font-display text-6xl leading-none">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
