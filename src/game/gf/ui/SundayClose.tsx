import { useMemo, useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { netWorth } from "../../../../gf-engine/finance.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { breakEvenRevenue, cashCascade } from "../../../../gf-engine/ledger.ts";
import { projection8w } from "../../../../gf-engine/projection.ts";
import type { GameState, WeekSummary } from "../../../../gf-engine/state.ts";
import { GF, Interior, PixelFile } from "./pixel";

export function SundayClose({
  state,
  pack,
  summary,
  onClose,
}: {
  state: GameState;
  pack: Content;
  summary: WeekSummary;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"close" | "forecast">("close");
  const accountant = state.flags.accountant === true;
  const cascade = cashCascade(summary);
  const maxBar = Math.max(1, ...cascade.lines.map((line) => Math.abs(line.signed)), Math.abs(summary.cashEnd));
  const gross = summary.revenue - summary.materials;
  const net = gross - summary.fixed - summary.salaries - summary.interest;
  const worth = netWorth(state, pack);
  const openCredit = state.receivables.some((item) => item.value > 0 && item.status !== "paid" && item.status !== "defaulted");
  const cashDiff = summary.revenue !== summary.received || openCredit;
  const alerts = alarm(state, pack, worth);
  const history = state.history.slice(-8);
  const forecast = useMemo(() => {
    if (!accountant) return null;
    try {
      return projection8w(state, pack);
    } catch {
      return null;
    }
  }, [accountant, pack, state]);

  return (
    <div className="gf-modal gf-sunday" role="dialog" aria-modal="true" aria-label="Fechamento semanal">
      <p className="gf-kicker">DOMINGO</p>
      <Interior file="int_fechamento.png" />
      <h2>Fechamento da semana {summary.week}</h2>
      {accountant && (
        <div className="gf-row" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "close"} className={tab === "close" ? "gf-go" : undefined} onClick={() => setTab("close")}>
            Fechamento
          </button>
          <button type="button" role="tab" aria-selected={tab === "forecast"} className={tab === "forecast" ? "gf-go" : undefined} onClick={() => setTab("forecast")}>
            Projeção 8 semanas
          </button>
        </div>
      )}
      {tab === "forecast" && accountant ? (
        <Forecast rows={forecast} />
      ) : (
        <>
          <section className="gf-panel" aria-label="Fluxo de caixa">
            <h3>Fluxo de caixa</h3>
            {cascade.lines.map((line) => {
              const outflow = line.key !== "open" && line.signed < 0;
              const inflow = line.key !== "open" && line.signed > 0;
              return (
                <div key={line.key} className="gf-fall">
                  <span>
                    {outflow ? "−" : inflow ? "+" : ""}
                    {line.label}
                  </span>
                  <span className="gf-track">
                    <i className={line.tone} style={{ width: `${Math.max(4, Math.round((Math.abs(line.signed) / maxBar) * 100))}%` }} />
                  </span>
                  <span className={line.signed < 0 ? "gf-danger" : line.tone === "in" ? "gf-slime" : "gf-bone"}>{formatF(line.key === "open" ? line.signed : Math.abs(line.signed))}</span>
                </div>
              );
            })}
            <p>
              <strong>= Caixa final {formatF(summary.cashEnd)}</strong>
            </p>
          </section>
          <section className="gf-panel" aria-label="DRE">
            <h3>DRE</h3>
            <p>Faturamento {formatF(summary.revenue)}</p>
            <p>CMV {formatF(summary.materials)}</p>
            <p>
              <strong>Margem bruta {formatF(gross)}</strong>
            </p>
            <p>Despesas fixas {formatF(summary.fixed + summary.salaries)}</p>
            <p>Juros {formatF(summary.interest)}</p>
            <p>
              <strong>Lucro líquido {formatF(net)}</strong>
            </p>
            <p>Perdas de estoque {formatF(summary.stockLoss)}</p>
            {cashDiff && (
              <p className="gf-banner">
                Lucro ≠ Caixa. Vendeu {formatF(summary.revenue)} e entrou {formatF(summary.received)}.
              </p>
            )}
          </section>
          <p>Você precisa faturar {formatF(breakEvenRevenue(summary, pack.balance.taxBps))} por semana só para empatar</p>
          <section className="gf-panel" aria-label="Alertas">
            <h3>
              <PixelFile file={GF.alert} /> Alertas
            </h3>
            {alerts.length === 0 && <p>Nenhum alarme neste domingo.</p>}
            {alerts.map((item) => (
              <p key={item} className="gf-danger">
                {item}
              </p>
            ))}
          </section>
          <section className="gf-panel" aria-label="Gráfico de 8 semanas">
            <h3>Gráfico de 8 semanas</h3>
            {history.length === 0 ? (
              <p>Ainda não há domingo no caderno.</p>
            ) : (
              <>
                <p>Caixa</p>
                <Series values={history.map((row) => row.cashEnd)} tone="yield" />
                <p>Dívida total</p>
                <Series values={history.map((row) => row.totalDebt)} tone="debt" />
                <p>PL</p>
                <Series values={history.map((row) => row.netWorth)} tone="worth" />
              </>
            )}
          </section>
        </>
      )}
      <button type="button" className="gf-go" onClick={onClose}>
        {state.ending ? "A oficina parou" : `Começar Semana ${summary.week + 1}`}
      </button>
    </div>
  );
}

function Series({ values, tone }: { values: number[]; tone: string }) {
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  return (
    <div className="gf-bars" aria-hidden>
      {values.map((value, index) => (
        <i key={index} className={value < 0 ? "debt" : tone} style={{ height: `${Math.max(1, Math.round((Math.abs(value) / max) * 28))}px` }} />
      ))}
    </div>
  );
}

function Forecast({ rows }: { rows: { week: number; cash: number; ended?: string }[] | null }) {
  if (!rows || rows.length === 0) return <p>A projeção não fechou.</p>;
  return (
    <section className="gf-panel">
      <h3>Projeção 8 semanas</h3>
      <p className="gf-dim">Só o que já está no papel: fixo, salário, parcela e o que falta receber. Sem cliente novo.</p>
      <Series values={rows.map((row) => row.cash)} tone="yield" />
      {rows.map((row) => (
        <p key={`${row.week}-${row.cash}`}>
          Semana {row.week}: {formatF(row.cash)}
          {row.ended ? ` · ${row.ended}` : ""}
        </p>
      ))}
    </section>
  );
}

function alarm(state: GameState, pack: Content, worth: number): string[] {
  const notes: string[] = [];
  if (state.failure.redAlertWeeks > 0 || state.ending === "F1_caixa") notes.push("Alerta Vermelho (F1)");
  if (state.debts.some((debt) => debt.missed > 0)) notes.push("Parcelas atrasadas");
  if (worth < pack.balance.failures.insolvencyWarn) notes.push("PL perto do limite");
  if (state.employees.some((person) => person.owedWeeks > 0)) notes.push("Salário devido");
  if (state.flags.negativado === true) notes.push("Nome sujo");
  return notes;
}
