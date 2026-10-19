import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { contentV1, type Content } from "../../gf-engine/content.ts";
import { formatF } from "../../gf-engine/format.ts";
import { ENDINGS, ART } from "@/game/gf/stage";
import { sealsFromState } from "@/game/gf/seals";
import { Office } from "@/game/gf/ui/Office";
import { act, dropRun, fetchRun, GfApiError, rememberRev, startRun, type GfRun } from "@/game/gf/ui/api";
import { getBearerToken } from "@/lib/auth/client";

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
      } else setNote("Não deu para herdar a oficina.");
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
      } else setNote("Não deu para pegar o caderno.");
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    setBusy(true);
    try {
      await dropRun();
      setRun(null);
      setFrame(0);
      setNote("");
    } catch (err) {
      setNote(err instanceof GfApiError ? err.message : "Não deu para recomeçar.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-fg">
        <p className="font-display text-4xl text-primary">A oficina ainda está esfriando…</p>
      </main>
    );
  }

  if (!run) {
    return (
      <Scene bg={ART.ashes}>
        <div className="gf-titlecard mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-end px-4 py-8">
          <p className="font-pixel text-2xl tracking-widest text-ember">PLUS</p>
          <h1 className="gf-title font-display text-7xl leading-none text-fg sm:text-8xl">GARAGEM FALIDA</h1>
          <p className="mt-3 max-w-md text-pretty text-fg">Você herda uma baia, 300 fósseis e uma dívida que cresce sozinha.</p>
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
            Herdar a oficina
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
    return (
      <Scene bg={ART.sealed}>
        <div className="gf-titlecard mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-end px-4 py-8">
          <p className="font-pixel text-2xl text-danger">FIM</p>
          <h1 className="gf-title font-display text-6xl leading-none text-fg sm:text-7xl">{ending.title}</h1>
          <p className="mt-3 max-w-lg text-pretty text-lg text-fg">{ending.line}</p>
          {score != null && <p className="mt-2 font-display text-4xl text-primary">Placar {score}</p>}
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
    const frames = [
      { bg: ART.garage, cast: ART.osso, who: "Seu Osvaldo", line: "Rex Navalha pede a contribuição. O pai fecha a porta sem discutir." },
      { bg: ART.fire, cast: ART.rex, who: "", line: "A oficina queima de noite. Ele não saiu." },
      { bg: ART.ashes, cast: ART.ambar, who: "Dona Âmbar", line: "A pasta da herança: 300 no caixa, 18 mil no banco, um boleto de 1.200. O patrimônio é negativo. A baia ainda funciona." },
    ];
    const current = frames[Math.min(frame, frames.length - 1)]!;
    return (
      <Scene bg={current.bg}>
        <section className="mx-auto mt-auto flex w-full max-w-3xl flex-col px-4 pb-4">
          <div className="gf-dialogue flex gap-3 border border-border bg-bg/90 p-3">
            {current.who && <img src={current.cast} alt="" className="h-28 w-20 shrink-0 object-cover object-top" />}
            <div>
              {current.who && <p className="font-pixel text-2xl text-ember">{current.who}</p>}
              <p className="text-pretty text-lg leading-snug">{current.line}</p>
              {note && <p className="mt-2 text-danger">{note}</p>}
            </div>
          </div>
          {frame < 2 ? (
            <button type="button" onClick={() => setFrame(frame + 1)} className="gf-cta mt-2 min-h-11 border border-ember bg-surface px-3 text-left font-display text-2xl leading-none">
              Continuar
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void acknowledge()} className="gf-cta mt-2 min-h-11 border border-ember bg-surface px-3 text-left font-display text-2xl leading-none disabled:opacity-40">
              Pegar o caderno
            </button>
          )}
          <Footer />
        </section>
      </Scene>
    );
  }

  return <Office run={run} pack={pack} onRun={setRun} onLeave={() => void abandon()} />;
}

function Scene({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <main className="gf-scene relative min-h-dvh overflow-hidden bg-bg text-fg">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/10" />
      <div className="gf-scene-scan pointer-events-none absolute inset-0" />
      <div className="relative flex min-h-dvh flex-col">{children}</div>
    </main>
  );
}

function Footer() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <p className="max-w-md text-pretty">Jogo educativo. Personagens, empresas e taxas são fictícios. Não é recomendação financeira.</p>
      <Link to="/modos" className="font-pixel text-xl text-primary">
        Modos
      </Link>
    </div>
  );
}
