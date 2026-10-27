import { useMemo, useState } from "react";
import { simulateDebt, simulateYield, type DebtSim, type SimPoint, type YieldSim } from "../../../../gf-engine/ledger.ts";

const ART = "/assets/gf/v2/simulador";

function money(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  const digits = String(Math.abs(rounded));
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) parts.unshift(digits.slice(Math.max(0, i - 3), i));
  return `${sign}₣ ${parts.join(".")}`;
}

function grouped(points: SimPoint[]): SimPoint[] {
  if (points.length <= 20) return points;
  const size = Math.ceil(points.length / 18);
  const out: SimPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    out.push(slice[slice.length - 1]!);
  }
  return out;
}

function ambarLine(mode: "debt" | "yield", parsed: DebtSim | YieldSim | null): string {
  if (!parsed) return "Juros são como bola de neve: rolam e crescem.";
  if (mode === "debt" && "never" in parsed && parsed.never) return "Pagamento pequeno demais? A dívida nunca para de crescer.";
  if (mode === "debt" && "weeks" in parsed && parsed.weeks > 40) return "Pague um pouco mais por semana e a dívida acaba antes.";
  if (mode === "debt") return "A vermelha é o que falta. A verde, o já pago.";
  return "Juros são como bola de neve: rolam e crescem.";
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
  const points = grouped(parsed?.points ?? []);
  const peak = Math.max(1, ...points.map((point) => Math.max(point.balance, point.paid)));
  const pay = Number(payText);
  const phrase = !parsed
    ? "Preencha valor, juros, pagamento e semanas."
    : mode === "debt" && "never" in parsed && parsed.never
      ? "Assim a dívida nunca acaba. Aumente o pagamento."
      : mode === "debt" && "weeks" in parsed
        ? `Com ${money(pay)} por semana, você termina em ${parsed.weeks} semanas. Total pago: ${money(parsed.totalPaid)}.`
        : parsed.phrase;
  const fields = [
    { id: "valor", icon: "sim_icone_valor.png", label: "Valor", text: value, set: setValue, mode: "numeric" as const, aria: "Valor" },
    { id: "juros", icon: "sim_icone_juros.png", label: "Juros por semana", text: rateText, set: setRateText, mode: "decimal" as const, aria: "Juros por semana", suffix: "%" },
    { id: "pagamento", icon: "sim_icone_pagamento.png", label: mode === "debt" ? "Pagamento por semana" : "Depósito por semana", text: payText, set: setPayText, mode: "numeric" as const, aria: mode === "debt" ? "Pagamento semanal" : "Depósito semanal" },
    { id: "semanas", icon: "sim_icone_semanas.png", label: "Semanas", text: spanText, set: setSpanText, mode: "numeric" as const, aria: "Semanas" },
  ];
  return (
    <section className="gf-sim" aria-label={mode === "debt" ? "Simulador de juros" : "Juros a seu favor"}>
      <img className="gf-sim-skin" src={`${ART}/sim_painel.png`} alt="" />
      <h3 className="gf-sim-title">{mode === "debt" ? "Simulador de juros" : "Juros a seu favor"}</h3>
      <div className="gf-sim-body">
        <div className="gf-sim-fields">
          {fields.map((field) => (
            <label key={field.id} className="gf-sim-line">
              <img className="gf-sim-ico" src={`${ART}/${field.icon}`} alt="" />
              <span className="gf-sim-field">
                <img src={`${ART}/sim_campo.png`} alt="" />
                <b>{field.label}</b>
                <input inputMode={field.mode} value={field.text} aria-label={field.aria} onChange={(event) => field.set(event.target.value)} />
                {field.suffix && <i>{field.suffix}</i>}
              </span>
            </label>
          ))}
        </div>
        <p className="gf-sim-result"><img src={`${ART}/sim_resultado.png`} alt="" /><span>{phrase}</span></p>
        <div className="gf-sim-stage">
          <figure className="gf-sim-ambar">
            <img src={`${ART}/sim_ambar.png`} alt="Dona Âmbar" />
            <figcaption className="gf-sim-say">{ambarLine(mode, parsed)}</figcaption>
          </figure>
          <div className="gf-sim-board">
            <img className="gf-sim-skin" src={`${ART}/sim_grafico.png`} alt="" />
            <div className="gf-sim-plot" key={phrase}>
              {points.map((point, index) => (
                <div className="gf-sim-col" key={point.week}>
                  <i className="gf-sim-fill is-debt" style={{ height: `${Math.max(6, Math.round((point.balance / peak) * 100))}%`, animationDelay: `${index * 20}ms` }}>
                    <img src={`${ART}/sim_barra_divida.png`} alt="" />
                  </i>
                  <i className="gf-sim-fill is-paid" style={{ height: `${Math.max(6, Math.round((point.paid / peak) * 100))}%`, animationDelay: `${index * 20 + 10}ms` }}>
                    <img src={`${ART}/sim_barra_pago.png`} alt="" />
                  </i>
                </div>
              ))}
            </div>
            <p className="gf-sim-legend">
              <span><i className="is-debt" /> {mode === "debt" ? "Falta pagar" : "Saldo"}</span>
              <span><i className="is-paid" /> {mode === "debt" ? "Já pago" : "Guardado"}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
