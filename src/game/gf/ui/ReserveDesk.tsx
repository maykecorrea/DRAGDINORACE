import { useEffect, useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { formatWeeks } from "../../../../gf-engine/ledger.ts";
import { fixedTotal } from "../../../../gf-engine/weeklyClose.ts";
import type { GameState } from "../../../../gf-engine/state.ts";
import { InterestSim } from "./InterestSim";
import { GF, PixelFile } from "./pixel";

function flagNum(flags: GameState["flags"], key: string): number {
  const value = flags[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function ReserveDesk({
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
  const [cofrinho, setCofrinho] = useState("100");
  const [tesouro, setTesouro] = useState("100");
  const [fundo, setFundo] = useState("100");
  const [pct, setPct] = useState(state.savings.autoDepositPct);
  useEffect(() => setPct(state.savings.autoDepositPct), [state.savings.autoDepositPct]);
  const payroll = state.employees.reduce((sum, person) => sum + person.salary, 0);
  const weekly = fixedTotal(state.garage.level, pack, state.fixedRecurring, state.calendar.week) + payroll;
  const saved = state.savings.cofrinho + state.savings.tesouro + state.savings.fundo;
  const weeks = weekly > 0 ? saved / weekly : saved > 0 ? Infinity : 0;
  const goal = pack.balance.freedom.reserveWeeks;
  const width = Math.max(0, Math.min(100, Number.isFinite(weeks) ? (weeks / goal) * 100 : 100));
  const fundoOpen = state.garage.level >= 3 && state.calendar.act >= 3;
  const products = pack.savingsProducts.filter((item) => item.enabled && (item.id !== "fundo" || fundoOpen));
  const tesouroRate = products.find((item) => item.id === "tesouro")?.bps ?? 20;

  function commit(next: number) {
    if (next !== state.savings.autoDepositPct) onAct({ type: "SET_AUTODEPOSIT", pct: next });
  }

  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar
      </button>
      <h2 className="gf-kicker">Cofre</h2>
      <p>Caixa da oficina. Guardar e tirar fica aqui. O banco, com boleto e empréstimo, é o prédio escrito BANCO na cidade.</p>
      {products.map((product) => {
        const balance = state.savings[product.id];
        const yieldWeek = flagNum(state.flags, product.id === "cofrinho" ? "yieldCofrinho" : product.id === "fundo" ? "yieldFundo" : "yieldTesouro");
        const draft = product.id === "cofrinho" ? cofrinho : product.id === "fundo" ? fundo : tesouro;
        const setDraft = product.id === "cofrinho" ? setCofrinho : product.id === "fundo" ? setFundo : setTesouro;
        const amount = Number(draft);
        const whole = Number.isInteger(amount) && amount > 0;
        return (
          <article key={product.id} className="gf-panel">
            <h3>
              <PixelFile file={product.id === "cofrinho" ? GF.fossil : GF.lock} /> {product.nome}
            </h3>
            <p>Saldo {formatF(balance)}</p>
            <p>Rendimento da última semana:  {formatF(yieldWeek)}</p>
            <p>{product.liquidity === "imediato" ? "Resgate na hora." : "O resgate cai no domingo."}</p>
            <div className="gf-fields">
              <label>
                Valor
                <input inputMode="numeric" aria-label={`Valor no ${product.nome}`} value={draft} onChange={(event) => setDraft(event.target.value)} />
              </label>
              <button type="button" className="gf-go" disabled={busy || !whole || state.cash < amount} onClick={() => onAct({ type: "SAVE", product: product.id, value: amount })}>
                Guardar
              </button>
              <button type="button" disabled={busy || !whole || balance < amount} onClick={() => onAct({ type: "WITHDRAW", product: product.id, value: amount })}>
                Tirar
              </button>
            </div>
          </article>
        );
      })}
      {state.savings.pendingWithdraw.length > 0 && (
        <p>Tesouro chegando:  {formatF(state.savings.pendingWithdraw.reduce((sum, item) => sum + item.value, 0))} no próximo domingo.</p>
      )}
      <div className="gf-panel">
        <h3>Meta do cofre</h3>
        <p>
          Você tem {formatWeeks(weeks)} de {goal}  semanas de contas fixas guardadas
        </p>
        <div className="gf-meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, Number.isFinite(weeks) ? weeks : goal)} aria-label="Semanas guardadas">
          <span style={{ width: `${width}%` }} />
        </div>
        <p className="gf-dim">A conta usa contas fixas + salários ({formatF(weekly)} por semana).</p>
        <label>
          Depósito automático {pct}%
          <input
            type="range"
            min={0}
            max={pack.balance.savingsAutoMax}
            step={5}
            value={pct}
            aria-label="Depósito automático"
            onChange={(event) => setPct(Number(event.target.value))}
            onPointerUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
            onKeyUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
            onBlur={(event) => commit(Number(event.target.value))}
          />
        </label>
        <p className="gf-dim">A cada pagamento recebido, essa parte vai sozinha para o cofre.</p>
      </div>
      <InterestSim mode="yield" principal={1000} rate={tesouroRate / 100} payment={100} weeks={52} />
    </section>
  );
}
