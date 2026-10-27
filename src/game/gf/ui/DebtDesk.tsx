import { useEffect, useState } from "react";
import type { Content, DebtTemplate } from "../../../../gf-engine/content.ts";
import { here } from "../../../../gf-engine/district.ts";
import { bps, formatF } from "../../../../gf-engine/format.ts";
import { debtRateLabel, seesCet } from "../../../../gf-engine/ledger.ts";
import type { Debt, GameState } from "../../../../gf-engine/state.ts";
import { InterestSim } from "./InterestSim";

const GROUPS = ["agiota", "cartao", "banco", "fornecedor", "outras"] as const;
const LABEL: Record<string, string> = {
  agiota: "Agiota",
  cartao: "Cartão",
  banco: "Banco Fóssil",
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
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  phone: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const cet = seesCet(state.flags, state.lessonsTriggered);
  const [pay, setPay] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<number | null>(null);
  const [seed, setSeed] = useState({ principal: 18000, rate: 0.8, payment: 300, weeks: 104, n: 0 });
  const [advanced, setAdvanced] = useState(false);
  const [jump, setJump] = useState<string | null>(null);
  const lesson = state.lessonsTriggered.includes("L06");
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

  const atBank = here(state) === "banco";
  const already = state.flags.renegWeek === state.calendar.week;
  const noDebt = state.debts.every((debt) => debt.balance <= 0);
  const renegWhy = !atBank ? "Venha ao banco." : already ? "Você já renegociou esta semana." : noDebt ? "Não há dívida para renegociar." : null;
  return (
    <section className="gf-screen gf-bank-screen">
      <button type="button" className="gf-back" onClick={onBack}>Voltar</button>
      <div className="gf-bank">
        <img className="gf-bank-bg" src="/assets/gf/v2/interiores/int_banco.png?v=8" alt="" />
        <div className="gf-bank-poster">
          <b>Crédito fácil</b>
          <span>Só 1,9% ao mês!</span>
          <small>Seguro obrigatório. Multa se quitar antes.</small>
        </div>
        <div className="gf-bank-sign">Banco Fóssil</div>
        <img className="gf-bank-boss" src="/assets/gf/npcs/npc_gerente_banco.png?v=8" alt="Sr. Juros-Baixo" />
        <div className="gf-reneg">
          <button
            type="button"
            disabled={busy || !!renegWhy}
            title={renegWhy ?? "Uma vez por semana, em pessoa. Corta 5% da maior dívida e soma uma semana."}
            onClick={() => onAct({ type: "RENEGOCIAR" })}
          >
            Renegociar
          </button>
          {renegWhy && <small>{renegWhy}</small>}
        </div>
        <div className="gf-bank-floor">
          {state.debts.length === 0 && <p className="gf-bank-empty">Nenhuma dívida. O banco ainda lembra do seu pai.</p>}
          {state.debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              template={pack.debtTemplates[debt.template]}
              cet={cet}
              busy={busy}
              cash={state.cash}
              jump={jump === debt.id}
              raw={pay[debt.id] ?? ""}
              onRaw={(text) => setPay((prev) => ({ ...prev, [debt.id]: text }))}
              onPay={(value) => {
                setJump(debt.id);
                onAct({ type: "PAY_DEBT", debtId: debt.id, value });
              }}
            />
          ))}
        </div>
      </div>
      <div className="gf-panel">
        <h3>Ordem de pagamento</h3>
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
                <button type="button" aria-label={`Subir ${LABEL[group] ?? group}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button>
                <button type="button" aria-label={`Descer ${LABEL[group] ?? group}`} disabled={busy || index === full.length - 1} onClick={() => move(index, 1)}>↓</button>
              </span>
            </li>
          ))}
        </ol>
      </div>
      {lesson && (
        <button type="button" onClick={() => { const debt = state.debts[0]; if (debt) simulate(debt); setAdvanced((on) => !on); }}>{advanced ? "Fechar avançado" : "Avançado"}</button>
      )}
      {lesson && advanced && (
        <InterestSim key={seed.n} mode="debt" principal={seed.principal} rate={seed.rate} payment={seed.payment} weeks={seed.weeks} />
      )}
      <div className="gf-panel">
        <h3>Empréstimos</h3>
        {OFFERS.map((id) => (
          <Offer key={id} id={id} template={pack.debtTemplates[id]} state={state} pack={pack} busy={busy} onAct={onAct} />
        ))}
      </div>
    </section>
  );
}

function fossil(n: number): string {
  return `₣ ${formatF(n).replace(" ₣", "")}`;
}

function DebtCard({
  debt,
  template,
  cet,
  busy,
  cash,
  jump,
  raw,
  onRaw,
  onPay,
}: {
  debt: Debt;
  template: DebtTemplate | undefined;
  cet: boolean;
  busy: boolean;
  cash: number;
  jump: boolean;
  raw: string;
  onRaw: (text: string) => void;
  onPay: (value: number) => void;
}) {
  const due = Math.min(debt.balance, dueGuess(debt));
  const extra = Number(raw);
  const ratio = debt.principal > 0 ? Math.max(0, Math.min(1, (debt.principal - debt.balance) / debt.principal)) : 0;
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (!jump) return;
    setPop(true);
    const timer = window.setTimeout(() => setPop(false), 600);
    return () => window.clearTimeout(timer);
  }, [jump, debt.balance]);
  return (
    <article className="gf-debtcard">
      <div className="gf-debtcard-face">
        <b className="gf-debt-name">{debt.creditor}</b>
        <p className="gf-debt-main">
          Falta pagar {fossil(debt.balance)}
          <span>Parcela {fossil(due)}</span>
        </p>
        <p className={`gf-debt-when${debt.missed > 0 ? " is-late" : ""}`}>{debt.missed > 0 ? `Atrasado ${debt.missed}×` : "Vence domingo"}</p>
        <div className={`gf-lack${pop ? " is-jump" : ""}`} aria-label={`Falta ${fossil(debt.balance)} de ${fossil(debt.principal)}`}>
          <span className="gf-lack-slot">
            <span className="gf-lack-fill" style={{ width: `${Math.round(ratio * 100)}%` }}>
              <img src="/assets/gf/v2/banco/banco_barra_falta_preenchimento.png" alt="" />
            </span>
          </span>
          <i className={`gf-lack-lock${pop ? " is-jump" : ""}`} />
        </div>
        <p className="gf-lack-label">Falta {fossil(debt.balance)} de {fossil(Math.max(debt.principal, debt.balance))}</p>
        <p className="gf-debt-rate">{debtRateLabel(debt, template, cet)}</p>
      </div>
      <div className="gf-debt-actions">
        <button type="button" className="is-go" disabled={busy || due <= 0 || cash < due} onClick={() => onPay(due)}>Pagar {due}</button>
        <button type="button" onClick={() => onRaw(raw ? "" : String(Math.min(debt.balance, due * 2)))}>Pagar mais</button>
      </div>
      {raw !== "" && (
        <div className="gf-fields">
          <input inputMode="numeric" aria-label={`Pagar mais para ${debt.creditor}`} value={raw} onChange={(event) => onRaw(event.target.value)} />
          <button type="button" className="is-go" disabled={busy || !Number.isInteger(extra) || extra <= 0 || extra > debt.balance || cash < extra} onClick={() => onPay(extra)}>
            Pagar {Number.isFinite(extra) ? extra : ""}
          </button>
        </div>
      )}
    </article>
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
            Pegar empréstimo
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
