import { useEffect, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { gfGate } from "@/game/gf.functions";
import type { GameMode } from "@/game/gf";
import { getBearerToken } from "@/lib/auth/client";

export const Route = createFileRoute("/modos")({
  loader: async () => {
    const gate = await gfGate();
    if (!gate.enabled) throw redirect({ to: "/dashboard" });
    return gate;
  },
  head: () => ({ meta: [{ title: "Modos · Dino Drag Race" }] }),
  component: Modos,
});

const BLURB: Record<GameMode["id"], string> = {
  garagem_falida: "Herdou a oficina. Herdou a dívida.",
  dino_drag: "Marcha no osso, nitro na hora.",
};

const ART: Record<GameMode["id"], string> = {
  garagem_falida: "/assets/gf/selector_garagem.png?v=1",
  dino_drag: "/assets/gf/selector_dinodrag.png?v=1",
};

function Modos() {
  const { user, isPending } = useCurrentUserState();
  const [modes, setModes] = useState<GameMode[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seals, setSeals] = useState<{ key: string; title: string; line: string }[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    try {
      setLast(localStorage.getItem("lastMode"));
    } catch {
      /* modo privado */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const token = getBearerToken();
    void fetch("/api/modes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as { modes: GameMode[] };
      })
      .then((body) => {
        if (!stop) setModes(body.modes ?? []);
      })
      .catch(() => {
        if (!stop) setFailed(true);
      });
    void fetch("/api/gf/unlocks", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok || stop) return;
        const body = (await res.json()) as { unlocks?: { key: string; title: string; line: string }[] };
        if (Array.isArray(body.unlocks)) setSeals(body.unlocks);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [user]);

  if (isPending || (user && !modes && !failed)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">Abrindo os modos…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-fg">
      <div className="mx-auto w-full max-w-5xl">
        <p className="font-pixel text-xl tracking-widest text-primary">ESCOLHA O MODO</p>
        <h1 className="font-display text-6xl leading-none sm:text-8xl">Dois caminhos</h1>
        {failed && <p className="mt-3 text-sm text-danger">Não deu para ler os modos. Atualize a página.</p>}
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {(modes ?? []).map((mode) => (
            <li key={mode.id} className="min-h-72">
              <ModeCard mode={mode} last={last === mode.id} coarse={coarse} seals={mode.id === "dino_drag" ? seals : []} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function ModeCard({ mode, last, coarse, seals }: { mode: GameMode; last: boolean; coarse: boolean; seals: { key: string; title: string; line: string }[] }) {
  const [art, setArt] = useState(true);
  const rust = mode.id === "garagem_falida";

  function remember() {
    try {
      localStorage.setItem("lastMode", mode.id);
    } catch {
      /* modo privado */
    }
  }

  function press(e: ReactPointerEvent<HTMLAnchorElement>) {
    if (!coarse) return;
    e.currentTarget.style.transform = "scale(0.98)";
  }

  function release(e: ReactPointerEvent<HTMLAnchorElement>) {
    e.currentTarget.style.transform = "";
  }

  return (
    <Tilt off={coarse}>
      <Link
        to={mode.route}
        aria-label={`${mode.title}. ${BLURB[mode.id]}`}
        onClick={remember}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        className={`relative flex h-full min-h-72 flex-col justify-end overflow-hidden border p-5 outline-none transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${last ? "border-primary" : "border-border"}`}
      >
        <span
          className="absolute inset-0"
          style={{
            background: rust
              ? "linear-gradient(160deg, #6E2F14, #D9772E)"
              : "linear-gradient(160deg, #141806, #3d5a14 55%, #d6ff3f)",
          }}
        />
        {art && (
          <img
            src={ART[mode.id]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
            onError={() => setArt(false)}
          />
        )}
        {rust && (
          <span className="pointer-events-none absolute left-1/2 top-[52%] z-[1] -translate-x-1/2 bg-black/80 px-2 py-1 font-pixel text-sm tracking-[0.14em] text-[#F7C948] sm:text-base">
            FERRUGEM & FILHO
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <span className="relative">
          {mode.badge && (
            <span className="inline-flex border border-[#F7C948] bg-black/50 px-2 py-1 font-pixel text-xl tracking-widest text-[#F7C948]">
              NOVO · Plus
            </span>
          )}
          <span className="mt-3 block font-display text-5xl leading-none text-white sm:text-6xl">{mode.title}</span>
          <span className="mt-2 block max-w-sm text-pretty text-sm text-[#F1E6C8]">{BLURB[mode.id]}</span>
          {mode.progress && (
            <span className="mt-2 block font-pixel text-xl text-[#F7C948]">
              Semana {mode.progress.week} · Dia {mode.progress.day}
            </span>
          )}
          {seals.length > 0 && (
            <span className="mt-2 block text-xs text-[#F7C948]">
              {seals.map((seal) => seal.title).join(" · ")} — em breve nesta corrida
            </span>
          )}
        </span>
      </Link>
    </Tilt>
  );
}

function Tilt({ children, off }: { children: ReactNode; off: boolean }) {
  const [card, setCard] = useState<HTMLDivElement | null>(null);

  function move(e: MouseEvent<HTMLDivElement>) {
    if (off || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    card.style.transform = `rotateX(${(-py * 14).toFixed(2)}deg) rotateY(${(px * 16).toFixed(2)}deg)`;
  }

  function leave() {
    if (card) card.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div className="h-full [perspective:1000px]" onMouseMove={move} onMouseLeave={leave}>
      <div ref={setCard} className="relative h-full transition-transform duration-100 ease-out [transform-style:preserve-3d]">
        {children}
      </div>
    </div>
  );
}
