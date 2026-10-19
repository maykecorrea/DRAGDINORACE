import { useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";

function fill(state: GameState, text: string): string {
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  return text
    .replaceAll("{nome}", state.player.name)
    .replaceAll("{caixa}", formatF(state.cash))
    .replaceAll("{divida}", formatF(debt));
}

function pace(): string {
  try {
    const raw = localStorage.getItem("gf-type-ms") ?? "16";
    if (raw === "0") return "0";
    if (raw === "48") return "48";
  } catch {
    return "16";
  }
  return "16";
}

export function Notebook({
  state,
  pack,
  busy,
  onAct,
  onBack,
  onLeave,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
  onLeave: () => void;
}) {
  const known = pack.lessons.filter((lesson) => state.lessonsTriggered.includes(lesson.id));
  const popped = typeof state.flags.lessonPop === "string" ? state.flags.lessonPop : "";
  const [pick, setPick] = useState(popped);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem("gf-sound") === "1";
    } catch {
      return false;
    }
  });
  const [tips, setTips] = useState(() => {
    try {
      return localStorage.getItem("gf-tips") !== "0";
    } catch {
      return true;
    }
  });
  const openId = known.some((lesson) => lesson.id === pick) ? pick : popped || known[0]?.id;
  const page = known.find((lesson) => lesson.id === openId) ?? known[0];
  const [speed, setSpeed] = useState(pace);

  function saveSetting(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* segue o padrão */
    }
    window.dispatchEvent(new Event("gf-settings"));
  }

  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <h2 className="gf-kicker">Caderno</h2>
      {known.length === 0 ? (
        <p>Ainda não tem página. O domingo e os recados escrevem sozinhos.</p>
      ) : (
        <div className="gf-fields">
          {known.map((lesson) => (
            <button key={lesson.id} type="button" aria-pressed={page?.id === lesson.id} onClick={() => setPick(lesson.id)}>
              {lesson.id} {lesson.title}
              {state.flags[`read_${lesson.id}`] === true ? "" : " · nova"}
            </button>
          ))}
        </div>
      )}
      {page && (
        <article className="gf-panel">
          <h3>
            {page.id} · {page.title}
          </h3>
          <p>{fill(state, page.happened)}</p>
          <p>{fill(state, page.plain)}</p>
          <p>{fill(state, page.math)}</p>
          <p>{fill(state, page.detect)}</p>
          <p>{fill(state, page.instead)}</p>
          <button type="button" className="gf-go" disabled={busy || state.flags[`read_${page.id}`] === true} onClick={() => onAct({ type: "READ_LESSON", id: page.id })}>
            Entendi
          </button>
        </article>
      )}
      <div className="gf-panel">
        <h3>Luz da carta</h3>
        <div className="gf-fields">
          {(
            [
              ["16", "Normal"],
              ["48", "Devagar"],
              ["0", "De uma vez"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={speed === value}
              onClick={() => {
                saveSetting("gf-type-ms", value);
                setSpeed(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <h3>Som</h3>
        <button
          type="button"
          aria-pressed={sound}
          onClick={() => {
            const next = !sound;
            setSound(next);
            saveSetting("gf-sound", next ? "1" : "0");
          }}
        >
          {sound ? "Ligado" : "Mudo"}
        </button>
        <p className="gf-dim">O tique sai da oficina. A trilha chega com a arte do Flow.</p>
        <h3>Dicas do Pai</h3>
        <button
          type="button"
          aria-pressed={tips}
          onClick={() => {
            const next = !tips;
            setTips(next);
            saveSetting("gf-tips", next ? "1" : "0");
          }}
        >
          {tips ? "Ligadas" : "Caladas"}
        </button>
        <button type="button" disabled={busy} onClick={onLeave}>
          Largar a oficina
        </button>
      </div>
    </section>
  );
}
