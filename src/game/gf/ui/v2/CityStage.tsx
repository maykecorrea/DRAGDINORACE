import { useEffect, useState } from "react";
import type { Content } from "../../../../../gf-engine/content.ts";
import { nextOpenLabel, partsOf, placeOpen } from "../../../../../gf-engine/clock.ts";
import { here, PLACES, supplierAt, travelCost, type PlaceId } from "../../../../../gf-engine/district.ts";
import type { GameState, MaterialId } from "../../../../../gf-engine/state.ts";
import { art, SceneFrame, skyFile } from "./scene";

type VisitId = "hospital" | "farmacia" | "posto" | "tenda";
type PickId = PlaceId | VisitId;

type Lot = {
  id: PickId;
  nome: string;
  src: string;
  cx: number;
  base: number;
  w: number;
  hours: string;
};

const LOTS: Lot[] = [
  { id: "oficina", nome: "Oficina", src: art.mapa("mapa_predio_oficina.png"), cx: 29.5, base: 79.5, w: 21, hours: "sua casa" },
  { id: "hospital", nome: "Hospital", src: art.mapa("mapa_predio_hospital.png"), cx: 30.5, base: 41.5, w: 21, hours: "o dia todo" },
  { id: "banco", nome: "Banco", src: art.mapa("mapa_predio_banco.png"), cx: 72, base: 41.5, w: 21, hours: "" },
  { id: "megaosso", nome: "Megaosso", src: art.mapa("mapa_predio_megaosso.png"), cx: 71, base: 79.5, w: 21, hours: "" },
  { id: "casco_tech", nome: "Casco-Tech", src: art.mapa("mapa_predio_casco_tech.png"), cx: 50, base: 17.5, w: 15, hours: "" },
  { id: "ferro_velho", nome: "Ferro-Velho", src: art.mapa("mapa_predio_ferro_velho.png"), cx: 21.5, base: 17, w: 13, hours: "" },
  { id: "leilao", nome: "Leilão", src: art.mapa("mapa_predio_leilao.png"), cx: 78.5, base: 17, w: 13, hours: "" },
  { id: "rato", nome: "Beco", src: art.mapa("mapa_predio_beco.png"), cx: 96, base: 40, w: 9, hours: "" },
  { id: "farmacia", nome: "Farmácia", src: art.predio("b_farmacia.png"), cx: 4.5, base: 79, w: 12, hours: "08–20" },
  { id: "posto", nome: "Posto", src: art.predio("b_posto_saude.png"), cx: 96.5, base: 79, w: 12, hours: "07–17" },
  { id: "tenda", nome: "Raizão", src: art.predio("p_tenda_raizao.png"), cx: 88, base: 64, w: 9, hours: "10–18" },
];

const CARS = ["picape", "fusca", "taxi", "van"] as const;
const MEDS = ["rx_sal_trilobita", "rx_xarope_samambaia", "rx_curativo_cascofix", "rx_soro_oral", "rx_vitamina_laranja", "rx_cha_calmaria"];
const ILLS = ["dz_resfriado", "dz_dor_barriga", "dz_gripe_ptero", "dz_tosse_escapamento", "dz_ferida_inflamada", "dz_enxaqueca"];
const PLANS = ["plano_carapaca", "plano_bronze_lustre", "plano_ouro_vital", "plano_diamante"];

function visitOpen(id: VisitId, hour: number): boolean {
  if (id === "hospital") return true;
  if (id === "farmacia") return hour >= 8 && hour < 20;
  if (id === "posto") return hour >= 7 && hour < 17;
  return hour >= 10 && hour < 18;
}

function isVisit(id: PickId): id is VisitId {
  return id === "hospital" || id === "farmacia" || id === "posto" || id === "tenda";
}

export function CityStage({
  state,
  pack,
  busy,
  focus,
  onAct,
  onBack,
  onCounter,
  onEnter,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  focus: { material: MaterialId; qty: number } | null;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
  onCounter: () => void;
  onEnter: (screen: "auction" | "bank" | "stock") => void;
}) {
  const spot = here(state);
  const t = state.clock?.t ?? pack.time?.startT ?? 360;
  const hour = partsOf(t).hour;
  const night = hour >= 18 || hour < 6;
  const [picked, setPicked] = useState<PickId>(spot);
  const [visit, setVisit] = useState<VisitId | null>(null);
  const [frame, setFrame] = useState(0);
  const [smoke, setSmoke] = useState(0);
  const [neon, setNeon] = useState(true);
  const [teo, setTeo] = useState({ x: 29.5, y: 72, flip: false });
  useEffect(() => {
    const walk = window.setInterval(() => setFrame((n) => (n + 1) % 4), 125);
    const puff = window.setInterval(() => setSmoke((n) => (n + 1) % 4), 160);
    const glow = window.setInterval(() => setNeon((on) => (on ? Math.random() > 0.2 : Math.random() > 0.35)), 280);
    return () => {
      window.clearInterval(walk);
      window.clearInterval(puff);
      window.clearInterval(glow);
    };
  }, []);
  useEffect(() => {
    const lot = LOTS.find((item) => item.id === picked) ?? LOTS[0]!;
    const from = { ...teo };
    const midY = 54;
    const steps = [
      { x: from.x, y: midY },
      { x: lot.cx, y: midY },
      { x: lot.cx, y: Math.min(86, lot.base - 6) },
    ];
    let i = 0;
    let tick = 0;
    const timer = window.setInterval(() => {
      const goal = steps[Math.min(i, steps.length - 1)]!;
      setTeo((now) => {
        const dx = goal.x - now.x;
        const dy = goal.y - now.y;
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
          i += 1;
          return now;
        }
        return { x: now.x + dx * 0.18, y: now.y + dy * 0.18, flip: dx < -0.05 };
      });
      tick += 1;
      if (i >= steps.length || tick > 80) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
    // teo is the start of this walk; including it would restart every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const lot = LOTS.find((item) => item.id === picked) ?? LOTS[0]!;
  const place = PLACES.find((item) => item.id === picked);
  const open = isVisit(picked) ? visitOpen(picked, hour) : placeOpen(pack, picked, t);
  const cost = isVisit(picked) ? 0 : travelCost(spot, picked);
  const ap = state.calendar.apLeft;
  const when = !open && place ? nextOpenLabel(pack, picked, t) : lot.hours;

  return (
    <div className="gf-city2">
      <SceneFrame src={art.mapa(skyFile(hour))} label="Cidade">
        {CARS.map((car, index) => (
          <img
            key={car}
            className={`gf-traffic gf-traffic-${index}${index % 2 ? " is-back" : ""}`}
            src={art.mapa(`mapa_vida_carros_${car}.png`)}
            alt=""
          />
        ))}
        {[0, 1].map((index) => (
          <img key={index} className={`gf-folk gf-folk-${index}`} src={art.mapa(`mapa_vida_pedestres_${(frame + index) % 4 + 1}.png`)} alt="" />
        ))}
        <img className="gf-smoke gf-smoke-a" src={art.mapa(`mapa_vida_fumaca_${smoke + 1}.png`)} alt="" />
        <img className="gf-smoke gf-smoke-b" src={art.mapa(`mapa_vida_fumaca_${((smoke + 2) % 4) + 1}.png`)} alt="" />
        {night && <img className="gf-neon" src={art.mapa(neon ? "mapa_vida_neon_on.png" : "mapa_vida_neon_off.png")} alt="" />}
        {LOTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`gf-lot${picked === item.id ? " is-pick" : ""}${spot === item.id ? " is-here" : ""}`}
            style={{ left: `${item.cx}%`, top: `${item.base}%`, width: `${item.w}%` }}
            aria-pressed={picked === item.id}
            onClick={() => setPicked(item.id)}
          >
            <img src={item.src} alt="" draggable={false} />
          </button>
        ))}
        <img
          className={`gf-teo${teo.flip ? " is-flip" : ""}`}
          src={art.mapa(`teo_andando_mapa_${frame + 1}.png`)}
          alt=""
          style={{ left: `${teo.x}%`, top: `${teo.y}%` }}
        />
        <div className="gf-sign" style={{ left: `${lot.cx}%`, top: `${Math.max(8, lot.base - lot.w * 1.55)}%` }}>
          <span className="gf-sign-name">
            <img src={art.mapa("mapa_placa_nome.png")} alt="" />
            <b>{lot.nome}</b>
          </span>
          <span className={`gf-sign-tag${open ? " is-open" : ""}`}>
            <img src={art.mapa(open ? "mapa_tag_horario_verde.png" : "mapa_tag_horario_vermelho.png")} alt="" />
            <b>{open ? "ABERTO" : "FECHADO"}</b>
            <small>{when}</small>
          </span>
        </div>
      </SceneFrame>
      <button type="button" className="gf-city-back" onClick={onBack}>Oficina</button>
      <div className="gf-city-card">
        <p>
          <strong>{place?.nome ?? lot.nome}</strong>
          {place ? (cost === 0 ? " · você está aqui" : ` · gasta ${cost} de energia`) : " · dá para olhar"}
        </p>
        {focus && <p>Falta uma peça. Escolha uma loja aberta.</p>}
        <div className="gf-city-actions">
          {place && cost > 0 && (
            <button type="button" className="is-go" disabled={busy || ap < cost || !open} onClick={() => onAct({ type: "TRAVEL", place: picked })}>
              Ir
            </button>
          )}
          {place && cost === 0 && supplierAt(picked as PlaceId) && (
            <button type="button" className="is-go" onClick={onCounter}>Entrar</button>
          )}
          {place && cost === 0 && picked === "leilao" && (
            <button type="button" className="is-go" onClick={() => onEnter("auction")}>Entrar</button>
          )}
          {place && cost === 0 && picked === "banco" && (
            <button type="button" className="is-go" onClick={() => onEnter("bank")}>Entrar</button>
          )}
          {place && cost === 0 && picked === "oficina" && (
            <button type="button" className="is-go" onClick={() => onEnter("stock")}>Prateleira</button>
          )}
          {isVisit(picked) && (
            <button type="button" className="is-go" disabled={!open} onClick={() => setVisit(picked)}>Olhar</button>
          )}
        </div>
      </div>
      {visit && <Visit id={visit} onClose={() => setVisit(null)} />}
    </div>
  );
}

function Visit({ id, onClose }: { id: VisitId; onClose: () => void }) {
  const scene =
    id === "hospital"
      ? { bg: "int_hospital_recepcao.png", who: "npc_dr_braquio_neutro.png", line: "O doutor cuida. Mostre onde dói." }
      : id === "farmacia"
        ? { bg: "int_farmacia.png", who: "npc_solange_neutro.png", line: "A Solange guarda o remédio na prateleira." }
        : id === "posto"
          ? { bg: "int_posto_saude.png", who: "npc_solange_rindo.png", line: "O posto é para coisa leve. Entra e sai." }
          : { bg: "int_quarto_nico.png", who: "npc_mestre_raizao.png", line: "O Raizão tem chá. Não substitui o doutor." };
  const row = id === "farmacia" || id === "tenda" ? MEDS : ILLS;
  return (
    <div className="gf-visit" role="dialog" aria-label={id}>
      <img className="gf-visit-bg" src={art.interior(scene.bg)} alt="" />
      <img className="gf-visit-npc" src={art.npc(scene.who)} alt="" />
      <div className="gf-visit-say">
        <img src={art.ui("ui_balao_fala.png")} alt="" />
        <p>{scene.line}</p>
      </div>
      <div className="gf-visit-row">
        {row.map((item) => (
          <img key={item} src={id === "farmacia" || id === "tenda" ? art.saude(`${item}.png`) : art.doenca(`${item}.png`)} alt="" />
        ))}
      </div>
      {id === "hospital" && (
        <div className="gf-visit-plans">
          {PLANS.map((item) => (
            <img key={item} src={art.plano(`${item}.png`)} alt="" />
          ))}
        </div>
      )}
      <button type="button" className="is-go" onClick={onClose}>Voltar</button>
    </div>
  );
}
