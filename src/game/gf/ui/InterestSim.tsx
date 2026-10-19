import { useMemo, useState } from "react";
import { simulateDebt, simulateYield, type SimPoint } from "../../../../gf-engine/ledger.ts";

function Bars({ points, field, tone }: { points: SimPoint[]; field: "balance" | "paid"; tone: string }) {
  const max = Math.max(1, ...points.map((point) => Math.abs(point[field])));
  return (
    <div className="gf-bars" aria-hidden>
      {points.map((point) => (
        <i key={point.week} className={tone} style={{ height: `${Math.max(1, Math.round((Math.abs(point[field]) / max) * 28))}px` }} />
      ))}
    </div>
  );
}

export function InterestSim({
  mode,
  principal,
  rate,
  payment,
  weeks,
}: {
  mode: "debt" | "yield";
  principal: number;
  rate: number;
  payment: number;
  weeks: number;
}) {
  const [value, setValue] = useState(String(principal));
  const [rateText, setRateText] = useState(String(rate).replace(".", ","));
  const [payText, setPayText] = useState(String(payment));
  const [spanText, setSpanText] = useState(String(weeks));
  const parsed = useMemo(() => {
    const amount = Number(value);
    const weekly = Number(rateText.replace(",", "."));
    const pay = Number(payText);
    const span = Number(spanText);
    if (![amount, weekly, pay, span].every((item) => Number.isFinite(item)) || amount < 0 || weekly < 0 || pay < 0 || span <= 0) return null;
    return mode === "debt" ? simulateDebt(amount, weekly, pay, span) : simulateYield(amount, weekly, pay, span);
  }, [mode, payText, rateText, spanText, value]);
  const points = parsed?.points ?? [];
  return (
    <section className="gf-panel" aria-label={mode === "debt" ? "Simulador de juros" : "Juros a seu favor"}>
      <h3>{mode === "debt" ? "Simulador de juros" : "Juros a seu favor"}</h3>
      <div className="gf-fields">
        <label>
          Valor
          <input inputMode="numeric" value={value} aria-label="Valor" onChange={(event) => setValue(event.target.value)} />
        </label>
        <label>
          Taxa semanal %
          <input inputMode="decimal" value={rateText} aria-label="Taxa semanal" onChange={(event) => setRateText(event.target.value)} />
        </label>
        <label>
          {mode === "debt" ? "Pagamento" : "Aporte"}
          <input inputMode="numeric" value={payText} aria-label={mode === "debt" ? "Pagamento semanal" : "Aporte semanal"} onChange={(event) => setPayText(event.target.value)} />
        </label>
        <label>
          Semanas
          <input inputMode="numeric" value={spanText} aria-label="Semanas" onChange={(event) => setSpanText(event.target.value)} />
        </label>
      </div>
      {parsed ? (
        <>
          <p className={mode === "debt" && "never" in parsed && parsed.never ? "gf-danger" : "gf-slime"}>{parsed.phrase}</p>
          {points.length > 0 && (
            <div className="gf-chart">
              <p className="gf-dim">{mode === "debt" ? "Saldo" : "Saldo"}</p>
              <Bars points={points} field="balance" tone={mode === "debt" ? "debt" : "yield"} />
              <p className="gf-dim">{mode === "debt" ? "Total pago" : "Total aplicado"}</p>
              <Bars points={points} field="paid" tone="worth" />
            </div>
          )}
        </>
      ) : (
        <p>Preencha valor, taxa, pagamento e semanas.</p>
      )}
    </section>
  );
}
