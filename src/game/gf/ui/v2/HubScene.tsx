import { useEffect, useState } from "react";
import type { GameState } from "../../../../../gf-engine/state.ts";
import { art, hubLevel, SceneFrame } from "./scene";

type SpotId = "quadro_clientes" | "prateleira" | "caderno" | "telefone" | "elevador" | "mesa_cofre" | "cama_fogareiro" | "portao";

type Spot = {
  id: SpotId;
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

const SPOTS: Spot[] = [
  { id: "quadro_clientes", file: "hs_quadro_clientes.png", x: 1.8, y: 30.1, w: 17.3, h: 29.9, label: "Clientes" },
  { id: "prateleira", file: "hs_prateleira.png", x: 26.5, y: 36.1, w: 17, h: 29.9, label: "Peças" },
  { id: "elevador", file: "hs_elevador_vazio.png", x: 19.3, y: 39.1, w: 28.3, h: 50, label: "Carro" },
  { id: "caderno", file: "hs_caderno.png", x: 50.5, y: 55.6, w: 4.9, h: 7.9, label: "Caderno" },
  { id: "telefone", file: "hs_telefone.png", x: 70.6, y: 47, w: 6.4, h: 13, label: "Telefone" },
  { id: "mesa_cofre", file: "hs_mesa_cofre.png", x: 52.3, y: 65.1, w: 13.5, h: 24, label: "Cofre" },
  { id: "cama_fogareiro", file: "hs_cama_fogareiro.png", x: 66.9, y: 79.9, w: 21.2, h: 19, label: "Cama" },
  { id: "portao", file: "hs_portao.png", x: 80, y: 25, w: 23.9, h: 68, label: "Cidade" },
];

export function goalOf(state: GameState): { say: string; spot: SpotId; pose: "neutro" | "apontando" | "orgulhoso" | "alerta" } {
  const unread = state.cardQueue.some((item) => !item.opened);
  const leads = state.leads.some((lead) => (lead.status ?? "open") === "open" || lead.status === "counter");
  const jobs = state.jobs.filter((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials");
  const energy = state.clock?.energy ?? 100;
  if (energy <= 15) return { say: "O Téo precisa dormir.", spot: "cama_fogareiro", pose: "alerta" };
  if (unread) return { say: "Tem recado no telefone.", spot: "telefone", pose: "apontando" };
  if (leads) return { say: "Tem cliente no quadro.", spot: "quadro_clientes", pose: "apontando" };
  if (jobs.some((job) => job.status === "waiting_materials")) return { say: "Falta peça na prateleira.", spot: "prateleira", pose: "apontando" };
  if (jobs.length > 0) return { say: "O carro está no elevador.", spot: "elevador", pose: "apontando" };
  if (state.debts.some((debt) => debt.balance > 0) && state.cash >= 50) return { say: "Pague um pouco do boleto.", spot: "mesa_cofre", pose: "alerta" };
  if (state.jobs.some((job) => job.status === "paid" || job.status === "delivered")) return { say: "Bom trabalho, Téo.", spot: "mesa_cofre", pose: "orgulhoso" };
  return { say: "A cidade fica no portão.", spot: "portao", pose: "neutro" };
}

export function HubScene({
  state,
  busy,
  dad,
  onOpen,
  onAct,
}: {
  state: GameState;
  busy: boolean;
  dad: boolean;
  onOpen: (screen: "clients" | "bays" | "stock" | "bank" | "phone" | "notebook" | "map") => void;
  onAct: (action: Record<string, unknown>) => void;
}) {
  const goal = goalOf(state);
  const [bed, setBed] = useState(false);
  const [ghost, setGhost] = useState(true);
  const car = state.jobs.some((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials");
  const badges: Partial<Record<SpotId, number>> = {
    quadro_clientes: state.leads.filter((lead) => (lead.status ?? "open") === "open" || lead.status === "counter").length,
    telefone: state.cardQueue.filter((item) => !item.opened).length,
    elevador: state.jobs.filter((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials").length,
    prateleira: state.jobs.filter((job) => job.status === "waiting_materials").length,
  };
  useEffect(() => {
    setGhost(true);
    const timer = window.setTimeout(() => setGhost(false), 7000);
    return () => window.clearTimeout(timer);
  }, [goal.say]);

  function open(id: SpotId) {
    if (id === "cama_fogareiro") {
      setBed((on) => !on);
      return;
    }
    setBed(false);
    if (id === "quadro_clientes") onOpen("clients");
    else if (id === "prateleira") onOpen("stock");
    else if (id === "elevador") onOpen("bays");
    else if (id === "telefone") onOpen("phone");
    else if (id === "caderno") onOpen("notebook");
    else if (id === "mesa_cofre") onOpen("bank");
    else onOpen("map");
  }

  return (
    <SceneFrame src={art.hub(`hub_bg_nivel${hubLevel(state.garage.level)}.png`)} label="Oficina do Téo">
      {SPOTS.map((spot) => {
        const file = spot.id === "elevador" && car ? "hs_elevador_carro.png" : spot.file;
        const badge = badges[spot.id] ?? 0;
        return (
          <button
            key={spot.id}
            type="button"
            className={`gf-hs${goal.spot === spot.id ? " is-next" : ""}${spot.id === "caderno" ? " is-tiny" : ""}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
            aria-label={spot.label}
            onClick={() => open(spot.id)}
          >
            <img src={art.hub(file)} alt="" draggable={false} />
            {badge > 0 && (
              <span className="gf-hs-badge">
                <img src={art.ui("ui_selo_alerta.png")} alt="" />
                <b>{badge}</b>
              </span>
            )}
            {goal.spot === spot.id && <img className="gf-arrow" src={art.ui("ui_seta_tutorial.png")} alt="" />}
          </button>
        );
      })}
      <div className="gf-goal">
        <img src={art.ui("ui_banner_objetivo.png")} alt="" />
        <p>{goal.say}</p>
      </div>
      {bed && (
        <div className="gf-bed">
          <button type="button" disabled={busy} onClick={() => onAct({ type: "REST" })}>Descansar</button>
          <button type="button" className="is-go" disabled={busy} onClick={() => onAct({ type: "END_DAY" })}>Dormir</button>
        </div>
      )}
      {dad && ghost && (
        <button type="button" className="gf-dad" onClick={() => setGhost(false)}>
          <img className={`gf-dad-body is-${goal.pose}`} src={art.guia(`guia_pai_fantasma_${goal.pose}.png`)} alt="" />
          <span className="gf-balloon">
            <img src={art.ui("ui_balao_fala.png")} alt="" />
            <p>{goal.say}</p>
          </span>
        </button>
      )}
    </SceneFrame>
  );
}
