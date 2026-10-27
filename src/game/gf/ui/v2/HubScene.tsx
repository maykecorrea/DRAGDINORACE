import { useEffect, useRef, useState } from "react";
import { hungerOf, thirstOf, xpOf, readPantry } from "../../../../../gf-engine/body.ts";
import { trophyWeeks } from "../../../../../gf-engine/district.ts";
import type { Content } from "../../../../../gf-engine/content.ts";
import type { GameState } from "../../../../../gf-engine/state.ts";
import { XpBar } from "./OficinaTelas";
import { art, hubLevel, SceneFrame } from "./scene";

type SpotId = "quadro_clientes" | "prateleira" | "caderno" | "telefone" | "elevador" | "mesa_cofre" | "cama" | "fogao" | "portao" | "caixa";

type Spot = {
  id: SpotId;
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tip: string;
  side: "left" | "right";
  deco?: boolean;
};

const SPOTS: Spot[] = [
  { id: "quadro_clientes", file: "hs_quadro_clientes.png", x: 1.5, y: 30, w: 13.9, h: 24, label: "Clientes", tip: "Os pedidos que chegaram.", side: "right" },
  { id: "prateleira", file: "hs_prateleira.png", x: 3.6, y: 59, w: 16.7, h: 29.5, label: "Peças", tip: "A prateleira. Sem peça aqui, o carro não sobe no elevador.", side: "right" },
  { id: "elevador", file: "hs_elevador_vazio.png", x: 27, y: 51, w: 20.4, h: 38.5, label: "Carro", tip: "O elevador. O carro sobe aqui.", side: "right" },
  { id: "caderno", file: "hs_caderno.png", x: 47.5, y: 48.7, w: 8.2, h: 13.7, label: "Caderno", tip: "As anotações do Téo.", side: "right" },
  { id: "mesa_cofre", file: "hs_mesa_cofre.png", x: 49.8, y: 62.5, w: 11.2, h: 25, label: "Cofre", tip: "O caixa da oficina. Boleto é no banco.", side: "left" },
  { id: "cama", file: "hs_cama.png", x: 61, y: 62.4, w: 12.9, h: 19.1, label: "Cama", tip: "Dormir. Escolhe as horas ou vai até as 6h.", side: "left" },
  { id: "fogao", file: "hs_fogao.png", x: 74, y: 60.3, w: 5.6, h: 22.4, label: "Fogão", tip: "Cozinhar e a despensa.", side: "left" },
  { id: "caixa", file: "hs_caixa.png", x: 79.7, y: 70.2, w: 5.8, h: 11.4, label: "Caixa", tip: "O saldo e o que entrou e saiu.", side: "left" },
  { id: "portao", file: "hs_portao.png", x: 85.6, y: 44, w: 12.4, h: 36, label: "Cidade", tip: "O portão. Sai pra rua.", side: "left" },
];

export function goalOf(state: GameState): { say: string; spot: SpotId; pose: "neutro" | "apontando" | "orgulhoso" | "alerta" } {
  const unread = state.cardQueue.some((item) => !item.opened);
  const leads = state.leads.some((lead) => (lead.status ?? "open") === "open" || lead.status === "counter");
  const jobs = state.jobs.filter((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials");
  const energy = state.clock?.energy ?? 100;
  const pantry = Object.values(readPantry(state.flags)).some((qty) => (qty ?? 0) > 0);
  if ((hungerOf(state) >= 70 || thirstOf(state) >= 70) && pantry) return { say: "{nome} tá com fome. Vai no fogão!", spot: "fogao", pose: "alerta" };
  if (energy <= 15) return { say: "{nome} precisa dormir.", spot: "cama", pose: "alerta" };
  if (unread) return { say: "Tem recado no telefone.", spot: "telefone", pose: "apontando" };
  if (leads) return { say: "Tem cliente no quadro.", spot: "quadro_clientes", pose: "apontando" };
  if (jobs.some((job) => job.status === "waiting_materials")) return { say: "Falta peça na prateleira.", spot: "prateleira", pose: "apontando" };
  if (jobs.length > 0) return { say: "O carro está no elevador.", spot: "elevador", pose: "apontando" };
  if (state.debts.some((debt) => debt.balance > 0) && state.cash >= 50) return { say: "O boleto se paga no banco, na cidade.", spot: "portao", pose: "alerta" };
  if (state.jobs.some((job) => job.status === "paid" || job.status === "delivered")) return { say: "Bom trabalho, {nome}!", spot: "mesa_cofre", pose: "orgulhoso" };
  return { say: "A cidade fica depois do portão.", spot: "portao", pose: "neutro" };
}

export function DadGhost({
  state,
  line,
  pose,
}: {
  state: GameState;
  line?: string;
  pose?: "neutro" | "apontando" | "orgulhoso" | "alerta";
}) {
  const goal = goalOf(state);
  const say = (line || goal.say).replaceAll("{nome}", state.player.name || "Téo");
  const face = pose ?? goal.pose;
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(true);
    const timer = window.setTimeout(() => setOn(false), 7000);
    return () => window.clearTimeout(timer);
  }, [say]);
  if (!on) return null;
  return (
    <button type="button" className="gf-dad is-counsel" onClick={() => setOn(false)}>
      <img className={`gf-dad-body is-${face}`} src={art.guia(`guia_pai_fantasma_${face}.png`)} srcSet={`${art.guia(`guia_pai_fantasma_${face}_hd.png?v=9`)} 2x`} alt="" />
      <span className="gf-balloon">
        <img src={art.ui("ui_balao_fala.png")} alt="" />
        <p>{say}</p>
      </span>
    </button>
  );
}

export function HubScene({
  state,
  pack,
  busy,
  dad,
  onOpen,
  onAct,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  dad: boolean;
  onOpen: (screen: "clients" | "bays" | "stock" | "bank" | "phone" | "notebook" | "map" | "reserve" | "quarto" | "fogao" | "caixa") => void;
  onAct: (action: Record<string, unknown>) => void;
}) {
  const goal = goalOf(state);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 3/4)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const file of ["bg_quadro_clientes", "bg_prateleira", "bg_elevador", "bg_caderno", "bg_cofre", "bg_quarto", "bg_fogao"]) {
        const img = new Image();
        img.src = `/assets/gf/v2/telas/${file}.png?v=17`;
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);
  const car = state.jobs.some((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials");
  const hungry = (hungerOf(state) >= 70 || thirstOf(state) >= 70) && Object.values(readPantry(state.flags)).some((qty) => (qty ?? 0) > 0);
  const badges: Partial<Record<SpotId, number>> = {
    quadro_clientes: state.leads.filter((lead) => (lead.status ?? "open") === "open" || lead.status === "counter").length,
    elevador: state.jobs.filter((job) => job.status === "in_progress" || job.status === "queued" || job.status === "waiting_materials").length,
    prateleira: state.jobs.filter((job) => job.status === "waiting_materials").length,
    fogao: hungry ? 1 : 0,
    cama: (state.clock?.energy ?? 100) <= 15 ? 1 : 0,
  };

  const masks = useRef(new Map<string, ImageData>());
  useEffect(() => {
    let cancel = false;
    const files = [...new Set(SPOTS.map((spot) => spot.file).concat("hs_elevador_carro.png"))];
    for (const file of files) {
      const img = new Image();
      img.src = art.hub(file);
      img.onload = () => {
        if (cancel) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || canvas.width === 0) return;
        ctx.drawImage(img, 0, 0);
        masks.current.set(file, ctx.getImageData(0, 0, canvas.width, canvas.height));
      };
    }
    return () => {
      cancel = true;
    };
  }, []);

  function hit(file: string, event: { detail: number; clientX: number; clientY: number; currentTarget: HTMLButtonElement }) {
    if (event.detail === 0) return true;
    const data = masks.current.get(file);
    if (!data) return true;
    const img = event.currentTarget.querySelector("img");
    if (!img) return true;
    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / data.width, rect.height / data.height);
    if (scale <= 0) return true;
    const drawnW = data.width * scale;
    const drawnH = data.height * scale;
    const x = Math.floor((event.clientX - (rect.left + (rect.width - drawnW) / 2)) / scale);
    const y = Math.floor((event.clientY - (rect.top + (rect.height - drawnH) / 2)) / scale);
    if (x < 0 || y < 0 || x >= data.width || y >= data.height) return false;
    return (data.data[(y * data.width + x) * 4 + 3] ?? 0) > 40;
  }

  function open(id: SpotId) {
    if (id === "caixa") {
      onOpen("caixa");
      return;
    }
    if (id === "cama") onOpen("quarto");
    else if (id === "fogao") onOpen("fogao");
    else if (id === "quadro_clientes") onOpen("clients");
    else if (id === "prateleira") onOpen("stock");
    else if (id === "elevador") onOpen("bays");
    else if (id === "caderno") onOpen("notebook");
    else if (id === "mesa_cofre") onOpen("reserve");
    else onOpen("map");
  }

  return (
    <SceneFrame src={art.hub(narrow ? `hub_bg_mobile_nivel${hubLevel(state.garage.level)}.png?v=9` : `hub_bg_nivel${hubLevel(state.garage.level)}.png`)} label={`Oficina do ${state.player.name || "Téo"}`}>
      {SPOTS.map((spot) => {
        const file = spot.id === "elevador" && car ? "hs_elevador_carro.png" : spot.file;
        const badge = badges[spot.id] ?? 0;
        return (
          <button
            key={spot.id}
            type="button"
            className={`gf-hs${goal.spot === spot.id ? " is-next" : ""}${spot.id === "caderno" ? " is-tiny" : ""}${spot.deco ? " is-deco" : ""}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
            aria-label={spot.label}
            tabIndex={spot.deco ? -1 : 0}
            onClick={(event) => {
              if (spot.deco || !hit(file, event)) return;
              open(spot.id);
            }}
          >
            <img src={art.hub(file)} alt="" draggable={false} />
            {!spot.deco && (
              <span className={`gf-tip is-${spot.side}`} role="tooltip">
                <b>{spot.label}</b>
                {spot.tip}
              </span>
            )}
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
      {Number(state.flags.agentDue) > 0 && (
        <div className="gf-agente">
          <b>Agente do banco</b>
          <p>
            O salário de {String(state.flags.agentNames || "funcionário")} venceu. Ele quer {Number(state.flags.agentDue)} ₣ à vista, senão leva um equipamento da oficina.
          </p>
          <div>
            <button type="button" disabled={busy || state.cash < Number(state.flags.agentDue)} onClick={() => onAct({ type: "AGENT_PAY" })}>Pagar à vista</button>
            <button type="button" disabled={busy} onClick={() => onAct({ type: "AGENT_LOAN" })}>Empréstimo, 20% em 4 semanas</button>
            <button type="button" disabled={busy} onClick={() => onAct({ type: "AGENT_SEIZE" })}>Não tenho. Ele vende um bem.</button>
          </div>
        </div>
      )}
      {trophyWeeks(state.flags).length > 0 && (
        <div className="gf-hub-trophy" aria-label="Troféu do Coliseu">
          <img src="/assets/gf/v2/coliseu/coliseu_trofeu.png" alt="" />
          <b>Semana {trophyWeeks(state.flags).at(-1)}</b>
        </div>
      )}
      <div className="gf-hub-xp" aria-label="Nível do cozinheiro">
        <XpBar xp={xpOf(state)} />
      </div>
    </SceneFrame>
  );
}
