import { useState } from "react";
import type { Content } from "../../../../../gf-engine/content.ts";
import { partsOf } from "../../../../../gf-engine/clock.ts";
import { netWorth } from "../../../../../gf-engine/finance.ts";
import type { GameState } from "../../../../../gf-engine/state.ts";
import { art } from "./scene";

function short(n: number): string {
  const r = Math.round(n);
  const sign = r < 0 ? "−" : "";
  const a = Math.abs(r);
  if (a >= 10000) return `${sign}${Math.round(a / 1000)}k`;
  return `${sign}${a.toLocaleString("pt-BR")}`;
}

function Pill({ icon, value, label, hot }: { icon: string; value: string; label: string; hot?: boolean }) {
  return (
    <span className={`gf-pill${hot ? " is-hot" : ""}`} title={label}>
      <img src={art.hud("hud_pilula_valor.png")} alt="" />
      <img className="gf-pill-ico" src={icon} alt="" />
      <b>{value}</b>
    </span>
  );
}

export function HudV2({
  state,
  pack,
  busy,
  blocked,
  tips,
  dad,
  onTips,
  onDad,
  onAct,
  onMap,
  onOpen,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  blocked: boolean;
  tips: boolean;
  dad: boolean;
  onTips: (on: boolean) => void;
  onDad: (on: boolean) => void;
  onAct: (action: Record<string, unknown>) => void;
  onMap: () => void;
  onOpen: (screen: "phone" | "notebook") => void;
}) {
  const [gear, setGear] = useState(false);
  const [soundOn, setSoundOn] = useState(() => typeof localStorage !== "undefined" && localStorage.getItem("gf-sound") === "1");
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  const worth = netWorth(state, pack);
  const clock = state.clock;
  const energy = clock?.energy ?? pack.time?.energy.max ?? 100;
  const parts = clock ? partsOf(clock.t) : null;
  const face = parts ? `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}` : "06:00";
  const speeds = [
    { id: "pausa", speed: clock?.speed ?? 1, paused: true, file: "hud_btn_velocidade_pausa.png", on: !!clock?.paused },
    { id: "play", speed: 1 as const, paused: false, file: "hud_btn_velocidade_play.png", on: clock?.speed === 1 && !clock.paused },
    { id: "rapido", speed: 2 as const, paused: false, file: "hud_btn_velocidade_rapido.png", on: clock?.speed === 2 && !clock.paused },
    { id: "turbo", speed: 4 as const, paused: false, file: "hud_btn_velocidade_turbo.png", on: clock?.speed === 4 && !clock.paused },
  ];
  return (
    <header className="gf-hud2">
      <div className="gf-clock2" title={parts ? `Semana ${parts.week}` : ""}>
        <img src={art.hud("hud_relogio_frame.png")} alt="" />
        <b>{face}</b>
        <div className="gf-week2" aria-label={`Dia ${state.calendar.day} da semana`}>
          <img src={art.hud("hud_semana_progresso.png")} alt="" />
          <span>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <i key={day} className={day <= state.calendar.day ? "is-on" : ""} />
            ))}
          </span>
        </div>
      </div>
      <div className="gf-speeds">
        {speeds.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.on ? "is-on" : ""}
            disabled={busy || !clock}
            aria-label={item.id === "pausa" ? "Pausar" : item.id === "play" ? "Devagar" : item.id === "rapido" ? "Rápido" : "Turbo"}
            onClick={() => onAct({ type: "SET_SPEED", speed: item.speed, paused: item.id === "pausa" ? !clock?.paused : false })}
          >
            <img src={art.hud(item.file)} alt="" />
          </button>
        ))}
      </div>
      <div className="gf-pills">
        <Pill icon={art.hud("icon_fosseis.png")} value={short(state.cash)} label="Dinheiro" />
        <Pill icon={art.hud("icon_energia.png")} value={short(energy)} label="Energia" hot={energy <= 25} />
        <Pill icon={art.hud("icon_divida_boleto.png")} value={short(debt)} label="Dívida" hot={debt > 0} />
        <Pill icon={art.hud("icon_saldo_cofre.png")} value={short(worth)} label="Saldo" />
        <Pill icon={art.hud("icon_saude_coracao.png")} value={short(state.morale)} label="Saúde" hot={state.morale < 30} />
        <Pill icon={art.hud("icon_xp_estrela.png")} value={short(state.rep)} label="Fama" />
      </div>
      <nav className="gf-round" aria-label="Atalhos">
        <button type="button" onClick={onMap} aria-label="Mapa">
          <img src={art.hud("btn_mapa.png")} alt="" />
        </button>
        <button type="button" onClick={() => onOpen("phone")} aria-label="Telefone">
          <img src={art.hud("btn_telefone.png")} alt="" />
          {state.cardQueue.some((item) => !item.opened) && <img className="gf-selo" src={art.ui("ui_selo_alerta.png")} alt="" />}
        </button>
        <button type="button" onClick={() => onOpen("notebook")} aria-label="Caderno">
          <img src={art.hud("btn_caderno.png")} alt="" />
        </button>
        <button type="button" disabled={busy || blocked || !clock} aria-label="Dormir" title={blocked ? "Tem um recado que não espera." : "Dormir até as 6"} onClick={() => onAct({ type: "END_DAY" })}>
          <img src={art.hud("btn_dormir.png")} alt="" />
        </button>
        <button type="button" aria-label="Configurações" aria-expanded={gear} onClick={() => setGear((on) => !on)}>
          <img src={art.hud("btn_config.png")} alt="" />
        </button>
      </nav>
      {gear && (
        <div className="gf-gearbox">
          <button type="button" onClick={() => onDad(!dad)}>{dad ? "Dicas do pai: ligadas" : "Dicas do pai: desligadas"}</button>
          <button type="button" onClick={() => onTips(!tips)}>{tips ? "Palavras extras: ligadas" : "Palavras extras: desligadas"}</button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              localStorage.setItem("gf-sound", next ? "1" : "0");
              setSoundOn(next);
            }}
          >
            {soundOn ? "Som: ligado" : "Som: desligado"}
          </button>
        </div>
      )}
    </header>
  );
}
