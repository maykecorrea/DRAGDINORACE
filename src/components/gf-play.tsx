import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { contentV1, type Content } from "../../gf-engine/content.ts";
import { formatF } from "../../gf-engine/format.ts";
import { ENDINGS, ART } from "@/game/gf/stage";
import { sealsFromState } from "@/game/gf/seals";
import { Office } from "@/game/gf/ui/Office";
import { act, dropRun, fetchRun, GfApiError, rememberRev, startRun, type GfRun } from "@/game/gf/ui/api";
import { getBearerToken } from "@/lib/auth/client";
import { Prologue } from "@/components/prologue";

type Past = { ending: string | null; score: number | null; week: number };

export function GfPlay() {
  const [run, setRun] = useState<GfRun | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Téo");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [frame, setFrame] = useState(0);
  const [pack, setPack] = useState<Content>(contentV1);
  const [past, setPast] = useState<Past[]>([]);
  const [showPrologue, setShowPrologue] = useState(() => localStorage.getItem("gf-prologue-seen") !== "1");

  useEffect(() => {
    let live = true;
    void fetchRun()
      .then((loaded) => {
        if (live) setRun(loaded);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setNote(err instanceof GfApiError ? err.message : "A oficina não abriu.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    const key = "gf-content:v1";
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Content;
        if (parsed?.version === "v1") setPack(parsed);
      } catch {
        sessionStorage.removeItem(key);
      }
    }
    void fetch("/api/gf/content")
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as Content;
        if (body?.version !== "v1") return;
        sessionStorage.setItem(key, JSON.stringify(body));
        if (live) setPack(body);
      })
      .catch(() => undefined);
    const token = getBearerToken();
    void fetch("/api/gf/history", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok || !live) return;
        const body = (await res.json()) as { runs?: Past[] };
        if (Array.isArray(body.runs)) setPast(body.runs.slice(0, 5));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function createRun() {
    setBusy(true);
    setNote("");
    try {
      setRun(await startRun(name.trim()));
      setFrame(0);
    } catch (err) {
      if (err instanceof GfApiError) {
        setNote(err.message);
        if (err.run) setRun(err.run);
      } else setNote("Não deu para começar a oficina.");
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge() {
    if (!run) return;
    setBusy(true);
    setNote("");
    try {
      rememberRev(run.rev);
      const result = await act({ type: "ACK", key: "sawPrologue" });
      setRun({
        ...run,
        rev: result.rev,
        week: result.state.calendar.week,
        day: result.state.calendar.day,
        state: result.state,
      });
    } catch (err) {
      if (err instanceof GfApiError) {
        setNote(err.message);
        if (err.run) setRun(err.run);
      } else setNote("Não deu para abrir o caderno.");
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    setBusy(true);
    setRun(null);
    setFrame(0);
    setNote("");
    try {
      await dropRun();
    } catch (err) {
      const message = err instanceof GfApiError ? err.message : "Não deu para recomeçar.";
      if (message !== "Não há campanha ativa.") setNote(message);
    } finally {
      setBusy(false);
    }
  }

  const acked = useRef(false);
  useEffect(() => {
    if (acked.current || !run || run.state.flags.sawPrologue === true) return;
    if (localStorage.getItem("gf-prologue-seen") === "1") {
      acked.current = true;
      void acknowledge();
    }
  }, [run]);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-fg">
        <p className="font-display text-4xl text-primary">A oficina ainda está esfriando…</p>
      </main>
    );
  }

  if (!run && showPrologue) {
    return (
      <main className="relative min-h-dvh bg-black">
        <Prologue
          mode="garage"
          name={name}
          onDone={() => {
            localStorage.setItem("gf-prologue-seen", "1");
            setShowPrologue(false);
          }}
        />
      </main>
    );
  }

  if (!run) {
    return (
      <Scene bg="/game/gf/bg_tela_inicial.webp" variant="title">
        <p className="gf-neon-sign" aria-hidden="true">
          GARAGEM
          <br />
          FALIDA
        </p>
        <div className="gf-titlecard flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10 sm:px-10">
          <p className="font-pixel text-2xl tracking-widest text-ember">PLUS</p>
          <h1 className="gf-title font-display text-6xl leading-none text-fg sm:text-7xl">Garagem Falida</h1>
          <p className="mt-3 max-w-md text-pretty text-fg">Você herdou uma baia, 300 fósseis e uma dívida que cresce sozinha.</p>
          <label className="mt-5 grid max-w-sm gap-1 text-muted">
            Seu nome
            <input value={name} maxLength={16} onChange={(event) => setName(event.target.value)} className="min-h-11 border border-ember bg-bg/90 px-3 text-fg shadow-[3px_3px_0_#090b08] outline-none focus:border-primary" />
          </label>
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={() => void createRun()}
            className="gf-cta mt-3 min-h-11 max-w-sm bg-primary font-display text-3xl leading-none text-ink disabled:opacity-40"
          >
            Começar
          </button>
          <button
            type="button"
            className="mt-3 max-w-sm text-left text-sm text-primary"
            onClick={() => {
              localStorage.removeItem("gf-prologue-seen");
              setShowPrologue(true);
            }}
          >
            Ver de novo
          </button>
          {note && <p className="mt-3 text-danger">{note}</p>}
          {past.length > 0 && (
            <ul className="mt-4 max-w-sm text-sm text-muted">
              {past.map((item, index) => (
                <li key={`${item.week}-${index}`}>
                  Semana {item.week} · {item.ending ? (ENDINGS[item.ending]?.title ?? item.ending) : "sem fim"}
                  {item.score != null ? ` · ${item.score}` : ""}
                </li>
              ))}
            </ul>
          )}
          <Footer />
        </div>
      </Scene>
    );
  }

  const ending = run.state.ending ? ENDINGS[run.state.ending] : null;
  if (ending) {
    const score = typeof run.state.flags.score === "number" ? run.state.flags.score : null;
    const log = [...(run.state.decisionsLog ?? [])];
    const worst = [...log].sort((a, b) => a.impact - b.impact).slice(0, 3);
    const best = [...log].sort((a, b) => b.impact - a.impact).filter((item) => item.impact > 0).slice(0, 3);
    const seals = sealsFromState(run.state);
    const who = run.state.player.name || "Téo";
    const say = (text: string) => text.replaceAll("{nome}", who);
    return (
      <Scene bg={ART.sealed}>
        <div className="gf-titlecard mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-end px-4 py-8">
          <p className="font-pixel text-2xl text-danger">FIM</p>
          <h1 className="gf-title font-display text-6xl leading-none text-fg sm:text-7xl">{say(ending.title)}</h1>
          {run.state.ending === "F5_desistencia" ? (
            <>
              <p className="mt-3 max-w-lg text-pretty text-lg text-fg">O corpo pediu descanso e não teve.</p>
              <p className="max-w-lg text-pretty text-lg text-fg">2 Dias sem tratamentos...</p>
            </>
          ) : (
            <p className="mt-3 max-w-lg whitespace-pre-line text-pretty text-lg text-fg">{say(ending.line)}</p>
          )}
          {score != null && <p className="mt-2 font-display text-4xl text-primary">Pontos {score}</p>}
          {seals.length > 0 && (
            <ul className="mt-3 max-w-lg text-sm text-[#F7C948]">
              {seals.map((seal) => (
                <li key={seal.key}>
                  {seal.title}. {seal.line}
                </li>
              ))}
            </ul>
          )}
          {best.length > 0 && (
            <p className="mt-3 text-sm text-fg">Melhores: {best.map((item) => `${item.label} (${formatF(item.impact)})`).join(" · ")}</p>
          )}
          {worst.some((item) => item.impact < 0) && (
            <p className="mt-1 text-sm text-muted">Piores: {worst.filter((item) => item.impact < 0).map((item) => `${item.label} (${formatF(item.impact)})`).join(" · ")}</p>
          )}
          <button type="button" disabled={busy} onClick={() => void abandon()} className="gf-cta mt-5 min-h-11 max-w-sm bg-primary font-display text-3xl leading-none text-ink disabled:opacity-40">
            Tentar de novo
          </button>
          {note && <p className="mt-3 text-danger">{note}</p>}
          <Footer />
        </div>
      </Scene>
    );
  }

  if (run.state.flags.sawPrologue !== true) {
    if (localStorage.getItem("gf-prologue-seen") !== "1") {
      return (
        <main className="relative min-h-dvh bg-black">
          <Prologue
            mode="garage"
            name={name}
            onDone={() => {
              localStorage.setItem("gf-prologue-seen", "1");
              void acknowledge();
            }}
          />
        </main>
      );
    }
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-fg">
        <p className="font-display text-4xl text-primary">Abrindo o portão…</p>
        {note && <p className="mt-3 text-danger">{note}</p>}
      </main>
    );
  }

  return <Office run={run} pack={pack} onRun={setRun} onLeave={() => void abandon()} />;
}

function Scene({ bg, children, variant }: { bg: string; children: ReactNode; variant?: "title" }) {
  return (
    <main className={`gf-fim relative min-h-dvh overflow-hidden bg-bg text-fg${variant === "title" ? " is-start" : ""}`}>
      <img src={bg} alt="" className="gf-fim-bg pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
      {variant === "title" ? (
        <div className="gf-start-shade pointer-events-none absolute inset-0" />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/10" />
      )}
      <div className="gf-scene-scan pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </main>
  );
}

function Footer() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <p className="max-w-xl text-pretty">Todas as informações contidas neste jogo são apenas para finalidade educativa e de treinamento para a vida real.</p>
      <Link to="/modos" className="font-pixel text-xl text-primary">
        Modos
      </Link>
    </div>
  );
}
