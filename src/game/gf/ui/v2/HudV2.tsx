import { useEffect, useState } from "react";
import type { Content } from "../../../../../gf-engine/content.ts";
import { partsOf } from "../../../../../gf-engine/clock.ts";
import { hungerOf, levelOf, nextLevel, thirstOf, xpOf } from "../../../../../gf-engine/body.ts";
import { monthDue, monthResult } from "../../../../../gf-engine/finance.ts";
import type { GameState } from "../../../../../gf-engine/state.ts";
import versionInfo from "../../../../../public/version.json";
import { art } from "./scene";

function short(n: number): string {
  const r = Math.round(n);
  const sign = r < 0 ? "−" : "";
  const a = Math.abs(r);
  if (a >= 10000) return `${sign}${Math.round(a / 1000)}k`;
  return `${sign}${a.toLocaleString("pt-BR")}`;
}

function Tip({ title, text }: { title: string; text: string }) {
  return (
    <span
      className="gf-alert !rounded-2xl !border !border-cyan-300 !bg-[#14081f] !px-3 !py-2 !text-[#f6e9ff] !shadow-[0_0_0_1px_#ff4dcd,0_5px_0_#8a226f,0_0_14px_#22d3ee]"
      role="tooltip"
    >
      <b className="!text-cyan-200">{title}</b>
      {text}
    </span>
  );
}

function Need({
  icon,
  label,
  pct,
  caption,
  tone,
  tip,
  hot,
}: {
  icon: string;
  label: string;
  pct: number;
  caption: string;
  tone: "hunger" | "thirst" | "health";
  tip: string;
  hot?: boolean;
}) {
  const shown = Math.max(0, Math.min(100, pct));
  return (
    <span className={`gf-pill gf-need is-${tone}${hot ? " is-low" : ""}`}>
      <img src={art.hud("hud_pilula_valor.png")} alt="" />
      <img className="gf-pill-ico" src={icon} alt="" />
      <b>{caption}</b>
      <span className="gf-needbar" aria-hidden="true"><i style={{ width: `${shown}%` }} /></span>
      <Tip title={label} text={tip} />
    </span>
  );
}

function Pill({ icon, value, label, tip, hot }: { icon: string; value: string; label: string; tip: string; hot?: boolean }) {
  return (
    <span className={`gf-pill${hot ? " is-hot" : ""}`}>
      <img src={art.hud("hud_pilula_valor.png")} alt="" />
      <img className="gf-pill-ico" src={icon} alt="" />
      <b>{value}</b>
      <Tip title={label} text={tip} />
    </span>
  );
}

const SLOT_X = [12.23, 22.75, 33.29, 43.8, 54.32, 64.83, 75.36, 85.87];
type Mark = "empty" | "dot" | "star" | "shine";

function weekMarks(day: number): Mark[] {
  const d = Math.min(7, Math.max(1, day));
  return SLOT_X.map((_, i) => {
    if (i < 7) {
      const n = i + 1;
      if (n < d) return "star";
      if (n === d) return "shine";
      if (n === d + 1) return "dot";
      return "empty";
    }
    if (d >= 7) return "shine";
    if (d === 6) return "dot";
    return "empty";
  });
}

function BoneWeek({ day }: { day: number }) {
  const marks = weekMarks(day);
  const egg = day >= 7;
  return (
    <div className={`gf-week2${egg ? " is-egg" : ""}`} aria-label={egg ? `Domingo. O último osso acende o ovo.` : `Dia ${day} da semana`}>
      <img src={art.hud("barra-progresso-vazia.png?v=20261023.4")} alt="" />
      {marks.map((kind, i) => (
        kind === "empty" ? null : (
          <span key={`${i}-${kind}`} className={`gf-slot is-${kind}`} style={{ left: `${SLOT_X[i]}%` }}>
            {kind === "dot" ? <i /> : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 1.8l2.55 6.55h6.85l-5.55 4.25 2.1 6.7L12 16.2 6.05 19.3l2.1-6.7L2.6 8.35h6.85z" />
              </svg>
            )}
          </span>
        )
      ))}
    </div>
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
  onNewGame,
  onGear,
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
  onNewGame?: () => void;
  onGear?: () => void;
}) {
  const [gear, setGear] = useState(false);
  const [more, setMore] = useState(false);
  const [soundOn, setSoundOn] = useState(() => typeof localStorage !== "undefined" && localStorage.getItem("gf-sound") === "1");
  useEffect(() => {
    if (!gear && !more) return;
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".gf-gearbox") || target?.closest("[aria-label='Configurações']")) return;
      if (target?.closest(".gf-pills") || target?.closest("[aria-label='Mais']")) return;
      setGear(false);
      setMore(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [gear, more]);
  const due = monthDue(state, pack);
  const close = monthResult(state, pack);
  const clock = state.clock;
  const energy = clock?.energy ?? pack.time?.energy.max ?? 100;
  const parts = clock ? partsOf(clock.t) : null;
  const face = parts ? `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}` : "06:00";
  const xp = xpOf(state);
  const rank = levelOf(xp);
  const nxt = nextLevel(xp);
  return (
    <header className={`gf-hud2${more ? " is-more" : ""}`}>
      <div className="gf-clock2">
        <img src={art.hud("hud_relogio_frame.png")} alt="" />
        <b>{face}</b>
        <Tip title="Hora" text={parts ? `Semana ${parts.week}. O dia anda com o relógio.` : "A hora da oficina."} />
      </div>
      <BoneWeek day={state.calendar.day} />
      <img className="gf-week-rail" src={art.hud("hud_semana_progresso.png?v=9")} alt="" />
      <div className="gf-pills">
        <Pill icon={art.hud("icon_fosseis.png")} value={short(state.cash)} label="Dinheiro" tip="Os fósseis no bolso. Paga peça, boleto e a rua." />
        <Pill icon={art.hud("icon_energia.png")} value={`${Math.floor(energy / Math.max(1, pack.time.energy.awakePerHour))}h`} label="Fôlego" tip="Cada hora acordado gasta 1 hora. Dormir devolve o corpo por hora." hot={energy <= 25} />
        <Pill icon={art.hud("icon_divida_boleto.png")} value={short(due)} label="Boleto do mês" tip="O que vence no fechamento do mês: a parcela do banco e o salário dos 30 dias. Não é o contrato inteiro." hot={due > 0} />
        <Pill icon={art.hud("icon_saldo_cofre.png")} value={short(close)} label="Fechamento" tip="Fósseis no bolso menos a dívida do mês. É o resultado do fechamento. A semana anda no meio; o pagamento é no mês." hot={close < 0} />
        <Need
          icon={art.hud("icon_saude_coracao.png")}
          label="Saúde"
          pct={(state.morale / Math.max(1, pack.balance.moraleMax)) * 100}
          caption={`${Math.round(state.morale)} de ${pack.balance.moraleMax}`}
          tone="health"
          tip="O corpo do Téo. Baixa demais, ele não rende."
          hot={state.morale < 30}
        />
        <Need
          icon={art.hud("icon_fome.png?v=9")}
          label="Fome"
          pct={Math.max(0, Math.min(100, 100 - hungerOf(state)))}
          caption={`${Math.round(Math.max(0, Math.min(100, 100 - hungerOf(state))))}%`}
          tone="hunger"
          tip={hungerOf(state) >= 100 ? "Está faminto. Sem comer, a saúde cai 1% a cada 15 min." : hungerOf(state) >= 75 ? "Fome baixa." : "A barra desce com o tempo."}
          hot={hungerOf(state) >= 75}
        />
        <Need
          icon={art.hud("icon_sede.png?v=9")}
          label="Sede"
          pct={Math.max(0, Math.min(100, 100 - thirstOf(state)))}
          caption={`${Math.round(Math.max(0, Math.min(100, 100 - thirstOf(state))))}%`}
          tone="thirst"
          tip={thirstOf(state) >= 100 ? "Está com sede. Sem beber, a saúde cai 1% a cada 15 min." : thirstOf(state) >= 75 ? "Sede baixa." : "A barra desce com o tempo."}
          hot={thirstOf(state) >= 75}
        />
        <Pill icon={art.hud("icon_xp_estrela.png")} value={rank.nome} label="Nível" tip={nxt ? `${xp}/${nxt.xp} de xp para ${nxt.nome}. Fama ${state.rep}.` : `Nível máximo. Fama ${state.rep}.`} />
      </div>
      <nav className="gf-round" aria-label="Atalhos">
        <button type="button" onClick={onMap} aria-label="Mapa">
          <img src={art.hud("btn_mapa.png")} alt="" />
          <Tip title="Mapa" text="Abre a cidade." />
        </button>
        <button type="button" onClick={() => onOpen("phone")} aria-label="Telefone">
          <img src={art.hud("btn_telefone.png")} alt="" />
          {state.cardQueue.some((item) => !item.opened) && <img className="gf-selo" src={art.ui("ui_selo_alerta.png")} alt="" />}
          <Tip title="Telefone" text="Recados e ofertas." />
        </button>
        <button type="button" onClick={() => onOpen("notebook")} aria-label="Caderno">
          <img src={art.hud("btn_caderno.png")} alt="" />
          <Tip title="Caderno" text="Anotações, lição e a semana." />
        </button>
        <button type="button" disabled={busy || blocked || !clock} aria-label="Dormir" onClick={() => onAct({ type: "END_DAY" })}>
          <img src={art.hud("btn_dormir.png")} alt="" />
          <Tip title="Dormir" text={blocked ? "Tem um recado que não espera." : "Fecha o dia e acorda às 6h."} />
        </button>
        <button type="button" className="gf-more" aria-label="Mais" aria-expanded={more} onClick={() => setMore((on) => !on)}>⋯</button>
        <button type="button" aria-label="Configurações" aria-expanded={gear} onClick={() => onGear ? onGear() : setGear((on) => !on)}>
          <img src={art.hud("btn_config.png")} alt="" />
          <Tip title="Ajustes" text="Som, dicas e a versão." />
        </button>
      </nav>
      {gear && (
        <div className="gf-gearbox">
          <button type="button" onClick={() => { onDad(!dad); setGear(false); }}>{dad ? "Dicas do Pai: Ligadas" : "Dicas do Pai: Desligadas"}</button>
          <button type="button" onClick={() => { onTips(!tips); setGear(false); }}>{tips ? "Palavras difíceis: explicar" : "Palavras difíceis: não explicar"}</button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              localStorage.setItem("gf-sound", next ? "1" : "0");
              setSoundOn(next);
              setGear(false);
            }}
          >
            {soundOn ? "Som: ligado" : "Som: desligado"}
          </button>
          {onNewGame && <button type="button" onClick={() => { setGear(false); onNewGame(); }}>Novo jogo</button>}
          <p>Versão {versionInfo.version}</p>
        </div>
      )}
    </header>
  );
}
