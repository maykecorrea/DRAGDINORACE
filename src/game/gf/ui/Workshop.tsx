import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";

const REP = [0, 0, 30, 45, 60, 75];

export function Workshop({
  state,
  pack,
  busy,
  onAct,
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const now = pack.garageLevels[state.garage.level];
  const next = pack.garageLevels[state.garage.level + 1];
  const need = next ? (REP[next.level] ?? 0) : 0;
  const building = state.garage.upgradingTo != null;
  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <h2 className="gf-kicker">Obra</h2>
      <p>
        {now?.nome ?? "Oficina"} · {state.garage.bays} {state.garage.bays === 1 ? "baia" : "baias"} · fama {state.rep}
      </p>
      {building ? (
        <p>A obra está de pé. No domingo a placa muda e uma baia volta.</p>
      ) : !next || next.cost <= 0 ? (
        <p>Não tem mais parede para subir.</p>
      ) : (
        <article className="gf-panel">
          <h3>
            {next.nome} · {formatF(next.cost)}
          </h3>
          <p>
            Pede fama {need}. Você tem {state.rep}. Durante a semana, uma baia fica interditada.
          </p>
          <div className="gf-fields">
            <button type="button" className="gf-go" disabled={busy || state.rep < need || state.cash < next.cost} onClick={() => onAct({ type: "UPGRADE", mode: "vista" })}>
              À vista
            </button>
            <button type="button" disabled={busy || state.rep < need} onClick={() => onAct({ type: "UPGRADE", mode: "coop" })}>
              Cooperativa
            </button>
            <button type="button" disabled={busy || state.rep < need} onClick={() => onAct({ type: "UPGRADE", mode: "parcelado" })}>
              Parcelado (+17%)
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
