import { useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { availableHires, produces, TRAIN_COST, TRAIN_WEEKS } from "../../../../gf-engine/staff.ts";
import type { EmployeeId, GameState } from "../../../../gf-engine/state.ts";
import { Face } from "./Face";

export function CrewDesk({
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
  const [confirm, setConfirm] = useState<string | null>(null);
  const open = availableHires(state, pack);
  const payroll = state.employees.reduce((sum, person) => sum + person.salary, 0);
  const waiting = pack.employees.filter((def) => def.enabled && !state.employees.some((person) => person.id === def.id));
  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <h2 className="gf-kicker">Equipe</h2>
      {state.employees.length === 0 && <p>{state.player.name || "Téo"} ainda trabalha sozinho. 3 de energia por dia.</p>}
      {state.employees.map((person) => {
        const def = pack.employees.find((item) => item.id === person.id);
        const training = person.id === "tico" && typeof state.flags.ticoReadyWeek === "number" ? state.flags.ticoReadyWeek : null;
        return (
          <article key={person.id} className="gf-panel gf-card">
            <Face id={person.id} />
            <div>
              <h3>{def?.nome ?? person.id}</h3>
              <p>
                {def?.funcao ?? "oficina"} · {formatF(person.salary)} / sem · {person.apPerDay}  ⚡/dia · habilidade  {person.skill}
              </p>
              {person.owedWeeks > 0 && <p className="gf-danger">{person.owedWeeks} sem devidas</p>}
              {person.sickUntilWeek != null && person.sickUntilWeek > state.calendar.week && <p>Doente. O salário continua.</p>}
              {training != null && <p>Curso até a semana {training}.</p>}
              <div className="gf-actions">
                {person.owedWeeks > 0 && (
                  <button type="button" disabled={busy} onClick={() => onAct({ type: "PAY_WAGES", employeeId: person.id })}>
                    Pagar atrasado ({formatF(person.salary * person.owedWeeks)})
                  </button>
                )}
                {person.id === "tico" && person.skill < 2 && training == null && (
                  <button type="button" disabled={busy} onClick={() => onAct({ type: "TRAIN", employeeId: "tico" })}>
                    Treinar ({formatF(TRAIN_COST)}, skill 2 em {TRAIN_WEEKS} sem)
                  </button>
                )}
                {confirm === person.id ? (
                  <button type="button" className="gf-danger" disabled={busy} onClick={() => onAct({ type: "FIRE", employeeId: person.id })}>
                    Confirmar demissão  {formatF(person.salary * 2)}
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirm(person.id)}>
                    Demitir · custo  {formatF(person.salary * 2)}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
      <h3>Na porta</h3>
      {waiting.length === 0 && <p>Ninguém apareceu esta semana.</p>}
      {waiting.map((def) => {
        const ready = open.some((item) => item.id === def.id);
        const reason = ready ? null : blocked(def, state);
        return (
          <article key={def.id} className="gf-panel gf-card">
            <Face id={def.id} />
            <div>
              <h3>{def.nome}</h3>
              <p className="gf-quote">“{def.fala ?? def.funcao}”</p>
              <p>
                {def.funcao} · salário {formatF(def.salary)}
                {def.apPerDay ? ` · ${def.apPerDay} de energia/dia` : ""} · skill {def.skill ?? 0}
              </p>
              <p>Custo para contratar:  {formatF(def.salary)} (1 salário)</p>
              {reason && <p className="gf-dim">{reason}</p>}
              <button type="button" className="gf-go" disabled={busy || !ready} onClick={() => onAct({ type: "HIRE", employeeId: def.id as EmployeeId })}>
                Contratar
              </button>
            </div>
          </article>
        );
      })}
      <p className="gf-foot">Salários da semana:  {formatF(payroll)}. Isso sai todo domingo, com ou sem cliente.</p>
    </section>
  );
}

function blocked(def: Content["employees"][number], state: GameState): string {
  if ((def.week ?? 0) > state.calendar.week) return `Chega na semana ${def.week}.`;
  if ((def.rep ?? 0) > state.rep) return `Precisa de fama ${def.rep}. Você tem ${state.rep}.`;
  if ((def.level ?? 0) > state.garage.level) return `Precisa da oficina nível ${def.level}.`;
  if (produces(def) && state.employees.filter((person) => person.apPerDay > 0).length >= state.garage.bays) return "Nenhuma baia livre.";
  return "Ainda não dá.";
}
