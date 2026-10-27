import { buildAgenda, type AgendaItem, type AgendaKind } from "../../../../gf-engine/agenda.ts";
import { clockLabel } from "../../../../gf-engine/clock.ts";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";

const KIND: Record<AgendaKind, string> = {
  boleto: "Boleto",
  entrega: "Entrega",
  pagamento: "Recebimento",
  cliente: "Cliente",
  peca: "Peças",
  cidade: "Cidade",
  conta: "Contas",
  recado: "Recado",
};

const DAY = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

function when(state: GameState, item: AgendaItem): string {
  if (item.late) return "Atrasado";
  const week = state.calendar.week;
  const day = state.calendar.day;
  const hour = `${String(item.hour).padStart(2, "0")}:00`;
  if (item.week === week && item.day === day) return `Hoje · ${hour}`;
  if (item.week === week && item.day === day + 1) return `Amanhã · ${hour}`;
  const name = DAY[item.day] ?? "dia";
  if (item.week === week) return `${name} · ${hour}`;
  return `${name} · semana ${item.week + 1}`;
}

export function AgendaPhone({ state, pack }: { state: GameState; pack: Content }) {
  const items = buildAgenda(state, pack);
  const t = state.clock?.t ?? pack.time.startT;
  return (
    <div className="gf-phone-note gf-agenda">
      <h3>Agenda</h3>
      <p>{clockLabel(t)}</p>
      {items.length === 0 && <p>Nada marcado. O domingo ainda cobra a oficina.</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.late ? "is-late" : undefined}>
            <b>{KIND[item.kind]} · {when(state, item)}</b>
            <strong>{item.title}</strong>
            <span>
              {item.detail}
              {item.amount != null && item.amount > 0 ? ` · ${formatF(item.amount)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
