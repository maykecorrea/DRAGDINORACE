import { useState } from "react";
import type { Content, DebtTemplate } from "../../../../gf-engine/content.ts";
import { bps, formatF } from "../../../../gf-engine/format.ts";
import { debtRateLabel, seesCet } from "../../../../gf-engine/ledger.ts";
import type { Debt, GameState } from "../../../../gf-engine/state.ts";
import { InterestSim } from "./InterestSim";
import { Face } from "./Face";
import { GF, Interior, PixelFile } from "./pixel";

const GROUPS = ["agiota", "cartao", "banco", "fornecedor", "outras"] as const;
const LABEL: Record<string, string> = {
  agiota: "Agiota",
  cartao: "Cartão",
  banco: "Banco",
  fornecedor: "Fornecedor",
  outras: "Outras",
};
const OFFERS = ["coop_ossada", "microcredito"] as const;

export function DebtDesk({
  state,
  pack,
  busy,
  phone,
  onAct,
  onReserve,
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  phone: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onReserve: () => void;
  onBack: () => void;
}) {
  const cet = seesCet(state.flags, state.lessonsTriggered);
  const [pay, setPay] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<number | null>(null);
  const [seed, setSeed] = useState({ principal: 18000, rate: 0.8, payment: 300, weeks: 104, n: 0 });
  const order = state.paymentPriority.filter((group) => GROUPS.includes(group as (typeof GROUPS)[number]));
  const full = [...order, ...GROUPS.filter((group) => !order.includes(group))];

  function move(index: number, dir: number) {
    const next = index + dir;
    if (next < 0 || next >= full.length) return;
    const copy = [...full];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    onAct({ type: "SET_PRIORITY", order: copy });
  }

  function simulate(debt: Debt) {
    const template = pack.debtTemplates[debt.template];
    const real = cet && template?.anunciada && template.bps > debt.weeklyBps ? template.bps : debt.weeklyBps;
    setSeed({ principal: debt.balance, rate: real / 100, payment: dueGuess(debt), weeks: Math.max(12, debt.installmentsLeft ?? 104), n: seed.n + 1 });
  }

  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <Interior file="int_banco.png" />
      <div className="gf-row">
        <Face id="npc_gerente_banco" />
        <h2 className="gf-kicker">Mesa · Banco e dívidas</h2>
        <button type="button" onClick={onReserve}>
          Reserva
        </button>
      </div>
      {state.debts.length === 0 && <p>Nenhuma dívida na mesa. O banco ainda lembra o nome do seu pai.</p>}
      {state.debts.map((debt) => {
        const template = pack.debtTemplates[debt.template];
        const raw = pay[debt.id] ?? "";
        const value = Number(raw);
        const penalty = debt.earlyPenaltyBps && Number.isFinite(value) ? bps(value, debt.earlyPenaltyBps) : 0;
        const valid = Number.isInteger(value) && value > 0 && value <= debt.balance;
        return (
          <article key={debt.id} className="gf-panel">
            <h3>
              <PixelFile file={GF.debt} /> {debt.creditor}
            </h3>
            <p>Saldo {formatF(debt.balance)}</p>
            <p data-cet={cet ? "real" : "anunciada"}>{debtRateLabel(debt, template, cet)}</p>
            <p>Parcela {parcelLabel(debt)}</p>
            <p className={debt.missed > 0 ? "gf-danger" : undefined}>Atraso {debt.missed} sem · já pago {formatF(debt.totalPaid)}</p>
            {debt.earlyPenaltyBps ? <p className="gf-dim">Quitar antes cobra {debt.earlyPenaltyBps / 100}% em cima.</p> : null}
            <div className="gf-fields">
              <label>
                Pagar extra
                <input inputMode="numeric" aria-label={`Pagar extra para ${debt.creditor}`} value={raw} onChange={(event) => setPay((prev) => ({ ...prev, [debt.id]: event.target.value }))} />
              </label>
              <button type="button" className="gf-go" disabled={busy || !valid} onClick={() => onAct({ type: "PAY_DEBT", debtId: debt.id, value })}>
                Pagar extra{penalty > 0 ? ` · sai ${formatF(value + penalty)}` : ""}
              </button>
              <button type="button" disabled={busy} onClick={() => simulate(debt)}>
                Simular esta dívida
              </button>
            </div>
          </article>
        );
      })}
      <div className="gf-panel">
        <h3>Prioridade de débito</h3>
        <p>Pague primeiro a dívida mais cara.</p>
        <ol className="gf-priority">
          {full.map((group, index) => (
            <li
              key={group}
              draggable={!phone}
              onDragStart={() => setDrag(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (drag == null || drag === index) return;
                const copy = [...full];
                const [item] = copy.splice(drag, 1);
                copy.splice(index, 0, item!);
                setDrag(null);
                onAct({ type: "SET_PRIORITY", order: copy });
              }}
            >
              <span>
                {index + 1}. {LABEL[group] ?? group}
                <span className="gf-dim">{cet ? ` · ${groupRate(state, pack, group)}` : ""}</span>
              </span>
              <span className="gf-actions">
                <button type="button" aria-label={`Subir ${LABEL[group] ?? group}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button type="button" aria-label={`Descer ${LABEL[group] ?? group}`} disabled={busy || index === full.length - 1} onClick={() => move(index, 1)}>
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <InterestSim key={seed.n} mode="debt" principal={seed.principal} rate={seed.rate} payment={seed.payment} weeks={seed.weeks} />
      <div className="gf-panel">
        <h3>Crédito na mesa</h3>
        {OFFERS.map((id) => (
          <Offer key={id} id={id} template={pack.debtTemplates[id]} state={state} pack={pack} busy={busy} onAct={onAct} />
        ))}
      </div>
    </section>
  );
}

function Offer({
  id,
  template,
  state,
  pack,
  busy,
  onAct,
}: {
  id: string;
  template: DebtTemplate | undefined;
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState(template?.limit ? String(Math.min(2000, template.limit)) : "1000");
  const [weeks, setWeeks] = useState(String(template?.weeks ?? template?.minWeeks ?? 12));
  if (!template) return null;
  const missing = gaps(state, pack, template);
  const owing = state.debts.some((debt) => debt.template === id && debt.balance > 0);
  const amount = Number(value);
  const span = Number(weeks);
  const weekOk =
    template.weeks != null
      ? span === template.weeks
      : (template.minWeeks == null || span >= template.minWeeks) && (template.maxWeeks == null || span <= template.maxWeeks);
  const amountOk = Number.isInteger(amount) && amount > 0 && (template.limit == null || amount <= template.limit);
  return (
    <article>
      <h3>{template.creditor}</h3>
      <p>{debtRateLabel({ weeklyBps: template.bps }, template, seesCet(state.flags, state.lessonsTriggered))}</p>
      <p>Até {formatF(template.limit ?? 0)}{template.weeks ? ` · ${template.weeks} semanas` : template.minWeeks ? ` · ${template.minWeeks} a ${template.maxWeeks} semanas` : ""}</p>
      {missing.length > 0 && (
        <ul>
          {missing.map((item) => (
            <li key={item}>Falta: {item}</li>
          ))}
        </ul>
      )}
      {owing && <p>Você já deve para esse credor.</p>}
      {missing.length === 0 && !owing && (
        <div className="gf-fields">
          <label>
            Valor
            <input inputMode="numeric" aria-label={`Valor do ${template.creditor}`} value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          {template.weeks == null && (
            <label>
              Semanas
              <input inputMode="numeric" aria-label={`Prazo do ${template.creditor}`} value={weeks} onChange={(event) => setWeeks(event.target.value)} />
            </label>
          )}
          <button
            type="button"
            className="gf-go"
            disabled={busy || !amountOk || !weekOk}
            onClick={() => onAct({ type: "TAKE_LOAN", template: id, value: amount, weeks: template.weeks ?? span })}
          >
            Pegar crédito
          </button>
        </div>
      )}
    </article>
  );
}

function gaps(state: GameState, pack: Content, template: DebtTemplate): string[] {
  const needs = template.requires;
  if (!needs) return [];
  const out: string[] = [];
  if (needs.rep != null && state.rep < needs.rep) out.push(`reputação ${state.rep} de ${needs.rep}`);
  if (needs.clean && state.flags.negativado === true) out.push("nome limpo");
  if (needs.weeksClean != null && Number(state.flags.weeksClean ?? 0) < needs.weeksClean) {
    out.push(`semanas sem atraso (${Number(state.flags.weeksClean ?? 0)} de ${needs.weeksClean})`);
  }
  for (const id of needs.lessons ?? []) {
    if (!state.lessonsTriggered.includes(id)) {
      const title = pack.lessons.find((lesson) => lesson.id === id)?.title ?? id;
      out.push(`lição ${id} (${title})`);
    }
  }
  return out;
}

function parcelLabel(debt: Debt): string {
  if (debt.pricePayment) return formatF(debt.pricePayment);
  if (typeof debt.minPayment === "number" && debt.minPayment > 0) return formatF(debt.minPayment);
  if (debt.minPayment === "interest") return "só os juros";
  if (debt.minPayment === "pct15") return "15% da fatura";
  return "automático";
}

function dueGuess(debt: Debt): number {
  if (debt.pricePayment && debt.pricePayment > 0) return debt.pricePayment;
  if (typeof debt.minPayment === "number" && debt.minPayment > 0) return debt.minPayment;
  if (debt.minPayment === "pct15") return Math.max(1, Math.round(debt.balance * 0.15));
  return Math.max(1, bps(debt.balance, debt.weeklyBps));
}

function groupRate(state: GameState, pack: Content, group: string): string {
  const rows = state.debts.filter((debt) => (pack.debtTemplates[debt.template]?.group ?? "outras") === group);
  if (rows.length === 0) return "sem dívida agora";
  const top = Math.max(...rows.map((debt) => debt.weeklyBps));
  return `${(top / 100).toString().replace(".", ",")}% / sem`;
}
