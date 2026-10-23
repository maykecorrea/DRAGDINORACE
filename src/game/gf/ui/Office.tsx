import { useEffect, useRef, useState } from "react";
import { cardById } from "../../../../gf-engine/cards.ts";
import { clockLabel, partsOf } from "../../../../gf-engine/clock.ts";
import type { Content } from "../../../../gf-engine/content.ts";
import { leadVisible, quotePreview, workIndex } from "../../../../gf-engine/contracts.ts";
import { netWorth } from "../../../../gf-engine/finance.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { missingMaterials } from "../../../../gf-engine/production.ts";
import { here, supplierAt } from "../../../../gf-engine/district.ts";
import type { GameState, Job, Lead, MaterialId, Receivable, WeekSummary } from "../../../../gf-engine/state.ts";
import { act, GfApiError, rememberRev, type GfRun } from "./api";
import { CrewDesk } from "./CrewDesk";
import { DebtDesk } from "./DebtDesk";
import { Face } from "./Face";
import { CardModal, PhoneDesk } from "./Phone";
import { GF } from "./pixel";
import { AuctionDesk } from "./AuctionDesk";
import { CityStage } from "./v2/CityStage";
import { HubScene } from "./v2/HubScene";
import { HudV2 } from "./v2/HudV2";
import { Notebook } from "./Notebook";
import { ReserveDesk } from "./ReserveDesk";
import { StockDesk } from "./StockDesk";
import { SundayClose } from "./SundayClose";
import { GLOSS, dayShort, describeEvents, priceFromPct } from "./text";
import { blip } from "./sound";
import { Workshop } from "./Workshop";
import "./v2/v2.css";

type Screen = "hub" | "clients" | "bays" | "stock" | "crew" | "bank" | "reserve" | "phone" | "notebook" | "obra" | "auction" | "map" | "shop";
type FeedLine = { icon: string; text: string };
const DEPOSITS = [0, 30, 50, 100] as const;

function layoutNow(): { phone: boolean } {
  if (typeof window === "undefined") return { phone: false };
  return { phone: window.matchMedia("(max-width: 767px)").matches };
}

function flagNum(flags: GameState["flags"], key: string): number {
  const value = flags[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clientNome(pack: Content, id: string): string {
  return pack.clients.find((item) => item.id === id)?.nome ?? "Cliente";
}

function serviceNome(pack: Content, id: string): string {
  return pack.services.find((item) => item.id === id)?.nome ?? "Serviço";
}

function materialNome(pack: Content, id: string): string {
  return pack.materials.find((item) => item.id === id)?.nome ?? "peça";
}

function workerNome(pack: Content, id: string): string {
  if (id === "teo") return "Téo";
  return pack.employees.find((item) => item.id === id)?.nome ?? "Oficina";
}

function quotePrice(ref: number, pct: number, priceMin: number, priceMax: number): number {
  const min = Math.round(ref * priceMin);
  const max = Math.round(ref * priceMax);
  return Math.min(max, Math.max(min, priceFromPct(ref, pct)));
}

function pctLabel(ratio: number): string {
  const n = Math.round(ratio * 100);
  return n < 0 ? `−${Math.abs(n)}%` : `${n}%`;
}

function daysLeft(state: GameState, lead: Lead): string {
  const left = lead.expiresDay - workIndex(state.calendar.week, state.calendar.day);
  if (left <= 0) return "expira hoje";
  if (left === 1) return "expira em 1 dia";
  return `expira em ${left} dias`;
}

function dueLabel(week: number, day: number): string {
  return `${dayShort(day)} · sem ${week}`;
}

function isLate(state: GameState, week: number, day: number): boolean {
  return workIndex(state.calendar.week, state.calendar.day) > workIndex(week, day);
}

function Money({ n, gold = true }: { n: number; gold?: boolean }) {
  const tone = n < 0 ? "gf-danger" : gold ? "gf-gold" : "gf-bone";
  return <span className={tone}>{formatF(n)}</span>;
}

function Bone({ on }: { on: boolean }) {
  return (
    <svg className={on ? "gf-bone" : "gf-dim"} width="16" height="8" viewBox="0 0 16 8" aria-hidden>
      <rect x="4" y="3" width="8" height="2" fill="currentColor" />
      <rect x="1" y="1" width="4" height="3" fill="currentColor" />
      <rect x="1" y="4" width="4" height="3" fill="currentColor" />
      <rect x="11" y="1" width="4" height="3" fill="currentColor" />
      <rect x="11" y="4" width="4" height="3" fill="currentColor" />
    </svg>
  );
}

function Tooth() {
  return (
    <svg className="gf-gold" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <polygon fill="currentColor" points="6,0 7.5,4.2 12,4.6 8.5,7.5 9.6,12 6,9.6 2.4,12 3.5,7.5 0,4.6 4.5,4.2" />
    </svg>
  );
}

function Heart({ dim }: { dim: boolean }) {
  return (
    <svg className={dim ? "gf-dim" : "gf-danger"} width="12" height="11" viewBox="0 0 12 11" aria-hidden>
      <path fill="currentColor" d="M2 1h2v1h1v1h2V2h1V1h2v1h1v3H10v1H9v1H8v1H7v1H5V8H4V7H3V6H2V4H1V2h1z" />
    </svg>
  );
}

function Yard({ level, bays }: { level: number; bays: number }) {
  const file = `bg_level_${level}.png`;
  const [ok, setOk] = useState(true);
  return (
    <div className="gf-yard">
      {ok && <img src={`/assets/gf/${file}`} alt="" onError={() => setOk(false)} />}
      <div className="gf-bayrow" aria-hidden>
        {Array.from({ length: Math.max(1, bays) }, (_, index) => (
          <span key={index} className="gf-baybox" />
        ))}
      </div>
      <p className="gf-file">{file}</p>
    </div>
  );
}

export function Office({ run, pack, onRun, onLeave }: { run: GfRun; pack: Content; onRun: (run: GfRun) => void; onLeave: () => void }) {
  const state = run.state;
  const [screen, setScreen] = useState<Screen>("hub");
  const [mapOpen, setMapOpen] = useState(false);
  const [layout, setLayout] = useState(layoutNow);
  const [toast, setToast] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [pct, setPct] = useState(100);
  const [deposit, setDeposit] = useState<(typeof DEPOSITS)[number]>(0);
  const [deadline, setDeadline] = useState(pack.balance.contracts.deadlineMin);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [need, setNeed] = useState<{ material: MaterialId; qty: number } | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [tips, setTips] = useState(true);
  const [dad, setDad] = useState(true);
  const lock = useRef(false);
  const openedSent = useRef(new Set<string>());

  useEffect(() => {
    rememberRev(run.rev);
  }, [run.rev]);

  useEffect(() => {
    const read = () => {
      try {
        setTips(localStorage.getItem("gf-tips") !== "0");
      } catch {
        setTips(true);
      }
    };
    read();
    window.addEventListener("gf-settings", read);
    return () => window.removeEventListener("gf-settings", read);
  }, []);

  useEffect(() => {
    if (typeof state.flags.lessonPop === "string") setScreen("notebook");
  }, [state.flags.lessonPop]);

  useEffect(() => {
    const apply = () => setLayout(layoutNow());
    apply();
    const media = window.matchMedia("(max-width: 767px)");
    media.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!proposalId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProposalId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proposalId]);

  const blockingId = state.cardQueue.find((item) => cardById(pack, item.cardId)?.blocking)?.cardId ?? null;

  useEffect(() => {
    if (blockingId) setOpenCard(blockingId);
  }, [blockingId, state.calendar.week, state.calendar.day]);

  useEffect(() => {
    if (screen !== "hub" && screen !== "map" && !mapOpen) return;
    if (openCard || blockingId || state.clock?.paused || state.ending) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      if (document.hidden || lock.current) {
        last = performance.now();
        return;
      }
      const now = performance.now();
      const elapsed = Math.min(15000, Math.floor(now - last));
      last = now;
      if (elapsed < 9000) return;
      void go({ type: "TICK", elapsedMs: elapsed });
    }, 10000);
    const onVis = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [screen, mapOpen, openCard, blockingId, state.clock?.paused, state.ending, run.rev]);

  useEffect(() => {
    if (!openCard) return;
    const item = state.cardQueue.find((row) => row.cardId === openCard);
    if (!item || item.opened) return;
    const key = `${run.id}:${openCard}:${item.week}:${item.day}`;
    if (openedSent.current.has(key)) return;
    openedSent.current.add(key);
    void go({ type: "CARD_OPEN", cardId: openCard }).then((ok) => {
      if (!ok) openedSent.current.delete(key);
    });
  }, [openCard, run.id, state.cardQueue]);

  async function go(action: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await act(action);
      onRun({
        ...run,
        rev: result.rev,
        week: result.state.calendar.week,
        day: result.state.calendar.day,
        state: result.state,
      });
      const lines = describeEvents(result.events, result.state, pack);
      if (lines.length > 0) setFeed((prev) => [...lines, ...prev].slice(0, 8));
      if (result.unlocks[0]) {
        setToast(`${result.unlocks[0].title}. ${result.unlocks[0].line}`);
        blip("coin");
      } else if (result.events.some((event) => event.type === "CARD" || event.type === "PAID")) {
        blip(result.events.some((event) => event.type === "PAID") ? "coin" : "note");
      }
      const closed = result.events.find((event) => event.type === "WEEK_CLOSED" && event.summary);
      if (closed?.summary) setWeek(closed.summary);
      if (action.type === "SEND_PROPOSAL") setProposalId(null);
      if (action.type === "CARD_CHOICE") setOpenCard(null);
      return true;
    } catch (err) {
      if (action.type !== "TICK" && err instanceof GfApiError) {
        setToast(err.message);
        if (err.run) onRun(err.run);
      } else {
        setToast("Não deu para fazer isso.");
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function focusStat(text: string) {
    return {
      onMouseEnter: () => setHint(text),
      onMouseLeave: () => setHint((current) => (current === text ? null : current)),
      onFocus: () => setHint(text),
      onBlur: () => setHint(null),
    };
  }

  function openProposal(lead: Lead) {
    const rule = pack.balance.contracts;
    setPct(100);
    setDeposit(0);
    setDeadline(Math.min(rule.deadlineMax, Math.max(rule.deadlineMin, lead.deadlineDays)));
    setProposalId(lead.id);
  }

  const proposal = proposalId ? state.leads.find((lead) => lead.id === proposalId && (lead.status ?? "open") === "open") : undefined;
  const phone = layout.phone;
  const body = (
    <>
      <HudV2
        state={state}
        pack={pack}
        busy={busy}
        blocked={Boolean(blockingId)}
        tips={tips}
        dad={dad}
        onTips={setTips}
        onDad={setDad}
        onAct={(action) => void go(action)}
        onMap={() => setMapOpen(true)}
        onOpen={(next) => setScreen(next)}
      />
      <div className="gf-body">
        {screen === "hub" && (
          <HubScene
            state={state}
            busy={busy}
            dad={dad}
            onAct={(action) => void go(action)}
            onOpen={(next) => {
              if (next === "map") {
                setMapOpen(true);
                return;
              }
              if (next === "stock") setNeed(null);
              setScreen(next);
            }}
          />
        )}
        {screen === "clients" && (
          <Clients state={state} pack={pack} busy={busy} phone={phone} onAct={(action) => void go(action)} onProposal={openProposal} onBack={() => setScreen("hub")} />
        )}
        {screen === "bays" && (
          <Bays
            state={state}
            pack={pack}
            busy={busy}
            phone={phone}
            onAct={(action) => void go(action)}
            onBuy={(material, qty) => {
              setNeed({ material, qty });
              setMapOpen(true);
            }}
            onMap={() => setMapOpen(true)}
            onBack={() => setScreen("hub")}
          />
        )}
        {screen === "stock" && (
          <StockDesk
            state={state}
            pack={pack}
            busy={busy}
            focus={need}
            mode="shelf"
            onAct={(action) => void go(action)}
            onBack={() => setScreen("hub")}
            onClearFocus={() => setNeed(null)}
            onMap={() => setMapOpen(true)}
          />
        )}
        {screen === "shop" &&
          (supplierAt(here(state)) ? (
            <StockDesk
              state={state}
              pack={pack}
              busy={busy}
              focus={need}
              mode="counter"
              lockSupplier={supplierAt(here(state)) ?? undefined}
              backLabel="Voltar ao mapa"
              onAct={(action) => void go(action)}
              onBack={() => {
                setScreen("hub");
                setMapOpen(true);
              }}
              onClearFocus={() => setNeed(null)}
            />
          ) : (
            <section className="gf-screen">
              <button type="button" onClick={() => setMapOpen(true)}>
                Voltar ao mapa
              </button>
              <p>O balcão só abre se você estiver na loja.</p>
            </section>
          ))}
        {screen === "crew" && <CrewDesk state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
        {screen === "bank" && (
          <DebtDesk state={state} pack={pack} busy={busy} phone={phone} onAct={(action) => void go(action)} onReserve={() => setScreen("reserve")} onBack={() => setScreen("hub")} />
        )}
        {screen === "reserve" && <ReserveDesk state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("bank")} />}
        {screen === "phone" && <PhoneDesk state={state} pack={pack} onOpen={setOpenCard} onBack={() => setScreen("hub")} />}
        {screen === "notebook" && (
          <Notebook state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} onLeave={onLeave} />
        )}
        {screen === "obra" && <Workshop state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
        {screen === "auction" && <AuctionDesk state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
      </div>
      <Feed hint={hint} lines={feed} />
      {phone && (
        <nav className="gf-v2-tabs" aria-label="Oficina">
          <button type="button" aria-current={screen === "hub" ? "page" : undefined} onClick={() => setScreen("hub")}>Oficina</button>
          <button type="button" aria-current={mapOpen ? "page" : undefined} onClick={() => setMapOpen(true)}>Cidade</button>
          <button type="button" aria-current={screen === "stock" ? "page" : undefined} onClick={() => setScreen("stock")}>Peças</button>
          <button type="button" aria-current={screen === "notebook" ? "page" : undefined} onClick={() => setScreen("notebook")}>Caderno</button>
        </nav>
      )}
      {proposal && (
        <Proposal
          lead={proposal}
          state={state}
          pack={pack}
          busy={busy}
          pct={pct}
          deposit={deposit}
          deadline={deadline}
          onPct={setPct}
          onDeposit={setDeposit}
          onDeadline={setDeadline}
          onClose={() => setProposalId(null)}
          onSend={(action) => void go(action)}
        />
      )}
      {week && <SundayClose state={state} pack={pack} summary={week} onClose={() => setWeek(null)} />}
      {openCard && (
        <CardModal
          state={state}
          pack={pack}
          cardId={openCard}
          busy={busy}
          onClose={() => setOpenCard(null)}
          onChoose={(optionId) => void go({ type: "CARD_CHOICE", cardId: openCard, optionId })}
        />
      )}
      {toast && (
        <p className="gf-toast" role="alert">
          {toast}
        </p>
      )}
    </>
  );

  const mapModal = mapOpen ? (
    <div className="gf-mapmodal" role="dialog" aria-modal="true" aria-label="Mapa mundial" onClick={() => setMapOpen(false)}>
      <div className="gf-mapsheet" onClick={(event) => event.stopPropagation()}>
        <CityStage
          state={state}
          pack={pack}
          busy={busy}
          focus={need}
          onAct={(action) => void go(action)}
          onBack={() => setMapOpen(false)}
          onCounter={() => {
            setMapOpen(false);
            setScreen("shop");
          }}
          onEnter={(next) => {
            setMapOpen(false);
            setScreen(next);
          }}
        />
      </div>
    </div>
  ) : null;

  if (phone) {
    return (
      <div className="gf-ui gf-phone gf-v2">
        <a href="/modos" className="gf-exit">
          Modos
        </a>
        {body}
        {mapModal}
      </div>
    );
  }

  return (
    <div className="gf-shell">
      <a href="/modos" className="gf-exit">
        Modos
      </a>
      <div className="gf-ui gf-pixel gf-flow gf-v2">{body}</div>
      {mapModal}
    </div>
  );
}

function Hud({
  state,
  pack,
  busy,
  blocked,
  tips,
  onAct,
  onMap,
  stat,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  blocked: boolean;
  tips: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onMap: () => void;
  stat: (text: string) => {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}) {
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  const worth = netWorth(state, pack);
  const ap = state.calendar.apLeft;
  const day = state.calendar.day;
  const clock = state.clock;
  const energy = clock?.energy ?? pack.time?.energy.max ?? 100;
  const tired = energy <= (pack.time?.energy.tired ?? 25);
  const wiped = energy <= (pack.time?.energy.exhausted ?? 10);
  const phase = clock ? partsOf(clock.t).periodo : "manha";
  const label = clock ? clockLabel(clock.t) : "";
  const face = label.split(" · ")[0] ?? label;
  const week = label.split(" · ")[1] ?? "";
  const speeds = [1, 2, 4] as const;
  return (
    <header className="gf-hud">
      <div className="gf-when">
        <span className={`gf-phase gf-phase-${phase}`} title={phase}>
          <img src={`/assets/gf/map/ui/ui_periodo_${phase}.png`} alt="" width={16} height={16} />
        </span>
        {clock ? (
          <span className="gf-clock" title={label}>
            <b>{face}</b>
          </span>
        ) : (
          <span>
            Semana {state.calendar.week} · {dayShort(day)}
          </span>
        )}
        {week && <span className="gf-week">{week}</span>}
        <button type="button" className="gf-stat" title={tips ? GLOSS.pa : undefined} aria-label={GLOSS.pa} {...stat(tips ? GLOSS.pa : "")}>
          <span className="gf-bones">
            {[0, 1, 2].map((index) => (
              <Bone key={index} on={index < Math.min(ap, 3)} />
            ))}
            {ap > 3 && <span className="gf-bone">+{ap - 3}</span>}
          </span>
        </button>
        <span className={`gf-energy${tired ? " is-low" : ""}${wiped ? " is-out" : ""}`} title={`Energia ${energy}. O corpo no dia. Não é o ânimo.`}>
          <i />
          {energy}
        </span>
        <span className="gf-speed">
          <button
            type="button"
            className={`gf-gear${clock?.paused ? " is-on" : ""}`}
            style={{ backgroundPosition: "0 0" }}
            disabled={busy}
            title={clock?.paused ? "Continuar" : "Pausar"}
            onClick={() => onAct({ type: "SET_SPEED", speed: clock?.speed ?? pack.time?.defaultSpeed ?? 2, paused: !clock?.paused })}
          />
          {speeds.map((speed, index) => (
            <button
              key={speed}
              type="button"
              className={`gf-gear${clock?.speed === speed && !clock?.paused ? " is-on" : ""}`}
              style={{ backgroundPosition: `${-(index + 1) * 32}px 0` }}
              disabled={busy}
              title={`${speed}×`}
              onClick={() => onAct({ type: "SET_SPEED", speed, paused: false })}
            />
          ))}
        </span>
        <button type="button" className="gf-mapbtn" title="Abrir o mapa mundial" onClick={onMap}>
          Mapa
        </button>
        <button
          type="button"
          className="gf-wait"
          disabled={busy || blocked || !clock}
          title="Esperar até a próxima hora"
          onClick={() => {
            if (!clock) return;
            const minute = clock.t % 60;
            onAct({ type: "WAIT", minutes: minute === 0 ? 60 : 60 - minute });
          }}
        >
          <img src="/assets/gf/map/ui/ui_btn_esperar.png?v=1" alt="" width={32} height={32} />
        </button>
      </div>
      <button type="button" className="gf-end" disabled={busy || blocked} title={blocked ? "Tem um recado no telefone que não espera." : "Dorme até as 06:00. Domingo às 19:00 a semana fecha."} onClick={() => onAct({ type: "END_DAY" })}>
        <img src="/assets/gf/map/ui/ui_despertador.png?v=1" alt="" width={32} height={32} />
        IR DORMIR
      </button>
      <div className="gf-stats">
        <button type="button" className="gf-stat" title={tips ? GLOSS.caixa : undefined} {...stat(tips ? GLOSS.caixa : "")}>
          Caixa <Money n={state.cash} />
        </button>
        <button type="button" className="gf-stat" title={tips ? GLOSS.divida : undefined} {...stat(tips ? GLOSS.divida : "")}>
          Dívida <span className="gf-danger">{formatF(debt)}</span>
        </button>
        <button type="button" className="gf-stat" title={tips ? GLOSS.pl : undefined} {...stat(tips ? GLOSS.pl : "")}>
          PL <Money n={worth} />
        </button>
        <button type="button" className="gf-stat" title={tips ? GLOSS.rep : undefined} {...stat(tips ? GLOSS.rep : "")}>
          <Tooth /> {state.rep}
        </button>
        <button type="button" className="gf-stat" title={tips ? GLOSS.animo : undefined} {...stat(tips ? GLOSS.animo : "")}>
          <Heart dim={state.morale < 30} /> {state.morale}
        </button>
      </div>
    </header>
  );
}

function Hub({
  state,
  pack,
  busy,
  onAct,
  onScreen,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onScreen: (screen: Screen) => void;
}) {
  const ap = state.calendar.apLeft;
  const nights = state.calendar.extraNightsUsed;
  const prospects = flagNum(state.flags, "prospectsUsed");
  const unread = state.cardQueue.filter((item) => !item.opened).length;
  const spots: { label: string; onClick: () => void; badge?: number; file?: string }[] = [
    { label: "Quadro de Clientes", onClick: () => onScreen("clients") },
    { label: "Baias", onClick: () => onScreen("bays") },
    { label: "Cidade", onClick: () => onScreen("map") },
    { label: "Estoque", onClick: () => onScreen("stock") },
    { label: "Mesa / Banco", onClick: () => onScreen("bank") },
    { label: "Equipe", onClick: () => onScreen("crew") },
    { label: "ZapDino", onClick: () => onScreen("phone"), badge: unread, file: GF.phone },
    { label: "Caderno", onClick: () => onScreen("notebook") },
  ];
  const actMarks = [1, 2, 3].map((n) => (state.flags[`act${n}_done`] === true ? `${n}✓` : String(n))).join(" · ");
  const away = typeof state.flags.district === "string" && state.flags.district !== "oficina";
  return (
    <div className="gf-hub">
      <Yard level={state.garage.level} bays={state.garage.bays} />
      <p className="gf-dim">Atos {actMarks}</p>
      {away && <p className="gf-banner">Você está na cidade. A baia espera a volta.</p>}
      <div className="gf-spots">
        {spots.map((spot) => (
          <button key={spot.label} type="button" title={spot.file} onClick={spot.onClick}>
            {spot.file && <span className="gf-spotfile">{spot.file}</span>}
            {spot.label}
            {spot.badge ? <span className="gf-badge">{spot.badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="gf-quick">
        <button
          type="button"
          disabled={busy || ap < pack.balance.contracts.prospectAp || prospects >= pack.balance.leads.prospectMaxWeek}
          onClick={() => onAct({ type: "PROSPECT" })}
        >
          Prospectar (1 PA + 10 ₣)
        </button>
        <button type="button" disabled={busy || ap < pack.balance.restAp} onClick={() => onAct({ type: "REST" })}>
          Descansar (1 PA, +12 Ânimo)
        </button>
        <button type="button" disabled={busy || nights >= pack.balance.nightShiftMaxPerWeek} onClick={() => onAct({ type: "NIGHT_SHIFT" })}>
          Virar a noite (+1 PA, −10 Ânimo)
        </button>
      </div>
      <div className="gf-links">
        <button type="button" onClick={() => onScreen("obra")}>
          Obra
        </button>
        <button type="button" onClick={() => onScreen("auction")}>
          Leilão
        </button>
        <button type="button" disabled={busy || state.calendar.apLeft < 1} onClick={() => onAct({ type: "STUDY" })}>
          Estudar
        </button>
      </div>
    </div>
  );
}

function Clients({
  state,
  pack,
  busy,
  phone,
  onAct,
  onProposal,
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  phone: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onProposal: (lead: Lead) => void;
  onBack: () => void;
}) {
  const counters = state.leads.filter((lead) => lead.status === "counter" && leadVisible(state, lead));
  const open = state.leads.filter((lead) => (lead.status ?? "open") === "open" && leadVisible(state, lead));
  const pending = state.leads.filter((lead) => lead.status === "pending");
  const empty = counters.length + open.length + pending.length === 0;
  return (
    <section className="gf-screen">
      {!phone && (
        <button type="button" onClick={onBack}>
          Voltar ao pátio
        </button>
      )}
      <h2 className="gf-kicker">Quadro de Clientes</h2>
      {empty && <p>Ninguém na porta. Prospectar no pátio traz gente na outra semana.</p>}
      {counters.map((lead) => (
        <article key={lead.id} className="gf-panel gf-card">
          <Face id={lead.apparentType} salt={lead.id} />
          <div>
            <h3>{clientNome(pack, lead.apparentType)}</h3>
            <p>
              {serviceNome(pack, lead.service)} · {daysLeft(state, lead)}
            </p>
            <p className="gf-quote">“{lead.quotes[0] ?? "Tá caro."}”</p>
            <p>
              Quer <Money n={lead.counterPrice ?? 0} />
            </p>
            <div className="gf-actions">
              <button type="button" className="gf-go" disabled={busy} onClick={() => onAct({ type: "ANSWER_COUNTER", leadId: lead.id, accept: true })}>
                Aceitar
              </button>
              <button type="button" disabled={busy} onClick={() => onAct({ type: "ANSWER_COUNTER", leadId: lead.id, accept: false })}>
                Recusar
              </button>
            </div>
          </div>
        </article>
      ))}
      {open.map((lead) => (
        <article key={lead.id} className="gf-panel gf-card">
          <Face id={lead.apparentType} salt={lead.id} />
          <div>
            <h3>{clientNome(pack, lead.apparentType)}</h3>
            <p>
              {serviceNome(pack, lead.service)} · prazo {lead.deadlineDays} dias · {daysLeft(state, lead)}
            </p>
            {lead.quotes[0] && <p className="gf-quote">“{lead.quotes[0]}”</p>}
            {lead.record && <p className={lead.record.includes("calote") ? "gf-danger" : undefined}>⚠ {lead.record}</p>}
            <div className="gf-actions">
              <button type="button" className="gf-go" disabled={busy} onClick={() => onProposal(lead)}>
                Fazer proposta
              </button>
              {!lead.record && (
                <button type="button" disabled={busy || state.calendar.apLeft < 1} onClick={() => onAct({ type: "CHECK_RECORD", targetId: lead.id })}>
                  Consultar ficha (1 PA + 20 ₣)
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
      {pending.map((lead) => (
        <article key={lead.id} className="gf-panel gf-card">
          <Face id={lead.apparentType} salt={lead.id} />
          <div>
            <h3>{clientNome(pack, lead.apparentType)}</h3>
            <p>
              {serviceNome(pack, lead.service)} · <Money n={lead.proposal?.price ?? lead.refPrice} />
            </p>
            <p>Aguardando resposta amanhã</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function Proposal({
  lead,
  state,
  pack,
  busy,
  pct,
  deposit,
  deadline,
  onPct,
  onDeposit,
  onDeadline,
  onClose,
  onSend,
}: {
  lead: Lead;
  state: GameState;
  pack: Content;
  busy: boolean;
  pct: number;
  deposit: (typeof DEPOSITS)[number];
  deadline: number;
  onPct: (value: number) => void;
  onDeposit: (value: (typeof DEPOSITS)[number]) => void;
  onDeadline: (value: number) => void;
  onClose: () => void;
  onSend: (action: Record<string, unknown>) => void;
}) {
  const rule = pack.balance.contracts;
  const price = quotePrice(lead.refPrice, pct, rule.priceMin, rule.priceMax);
  const service = pack.services.find((item) => item.id === lead.service);
  let quote: ReturnType<typeof quotePreview> | null = null;
  try {
    quote = quotePreview(state, pack, lead.id, price, deposit);
  } catch {
    quote = null;
  }
  const days = [];
  for (let day = rule.deadlineMin; day <= rule.deadlineMax; day += 1) days.push(day);
  return (
    <div className="gf-modal" role="dialog" aria-modal="true" aria-label="Proposta">
      <div className="gf-panel">
        <p className="gf-kicker">{clientNome(pack, lead.apparentType)}</p>
        <h2>{serviceNome(pack, lead.service)}</h2>
        <p>Referência {formatF(lead.refPrice)}</p>
        <label>
          Preço {formatF(price)} · {pct}%
          <input type="range" min={60} max={160} step={5} value={pct} aria-label="Preço da proposta" autoFocus onChange={(event) => onPct(Number(event.target.value))} />
        </label>
        <div className="gf-row" role="group" aria-label="Sinal">
          {DEPOSITS.map((value) => (
            <button key={value} type="button" aria-pressed={deposit === value} className={deposit === value ? "gf-go" : undefined} onClick={() => onDeposit(value)}>
              Sinal {value}%
            </button>
          ))}
        </div>
        <label>
          Prazo{" "}
          <select value={deadline} aria-label="Prazo em dias" onChange={(event) => onDeadline(Number(event.target.value))}>
            {days.map((day) => (
              <option key={day} value={day}>
                {day} dias
              </option>
            ))}
          </select>
        </label>
        {quote && (
          <div>
            <p>Material: {formatF(quote.materialCost)}</p>
            <p>
              Seu tempo: {service?.ap ?? 0} PA ≈ {formatF(quote.timeCost)}
            </p>
            <p>
              <strong>
                Margem: {formatF(quote.margin)} ({pctLabel(quote.marginPct)})
              </strong>
            </p>
            <p>Chance de aceitar: ~{Math.round(quote.acceptChance * 100)}%</p>
            {price < quote.breakEvenPrice && <p className="gf-banner">Abaixo do custo: você paga para trabalhar</p>}
          </div>
        )}
        <div className="gf-actions">
          <button
            type="button"
            className="gf-go"
            disabled={busy || !quote}
            onClick={() => onSend({ type: "SEND_PROPOSAL", leadId: lead.id, price, depositPct: deposit, deadline })}
          >
            Enviar proposta
          </button>
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function Bays({
  state,
  pack,
  busy,
  phone,
  onAct,
  onBuy,
  onMap,
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  phone: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBuy: (material: MaterialId, qty: number) => void;
  onMap: () => void;
  onBack: () => void;
}) {
  const columns = [
    { status: "waiting_materials", title: "Aguardando material" },
    { status: "queued", title: "Na fila" },
    { status: "in_progress", title: "Em produção" },
    { status: "ready", title: "Pronto" },
  ] as const;
  const recs = state.receivables.filter((item) => item.status === "open" || item.status === "defaulted");
  const recJobs = new Set(recs.map((item) => item.jobId));
  const delivered = state.jobs.filter((job) => job.status === "delivered" && !recJobs.has(job.id));
  const workers = [{ id: "teo", nome: "Téo" }, ...state.employees.map((person) => ({ id: person.id, nome: workerNome(pack, person.id) }))];
  const away = typeof state.flags.district === "string" && state.flags.district !== "oficina";
  return (
    <section className="gf-screen">
      {!phone && (
        <button type="button" onClick={onBack}>
          Voltar ao pátio
        </button>
      )}
      {away && (
        <p className="gf-banner">
          Você está na cidade. O reparo espera a volta.{" "}
          <button type="button" onClick={onMap}>
            Abrir o mapa
          </button>
        </p>
      )}
      <div className="gf-kanban">
        {columns.map((column) => (
          <div key={column.status} className="gf-col">
            <h3>{column.title}</h3>
            {state.jobs.filter((job) => job.status === column.status).length === 0 && <p className="gf-dim">—</p>}
            {state.jobs
              .filter((job) => job.status === column.status)
              .map((job) => (
                <JobCard key={job.id} job={job} state={state} pack={pack} busy={busy} away={away} workers={workers} onAct={onAct} onBuy={onBuy} />
              ))}
          </div>
        ))}
        <div className="gf-col">
          <h3>Entregue / A receber</h3>
          {delivered.length + recs.length === 0 && <p className="gf-dim">—</p>}
          {delivered.map((job) => (
            <article key={job.id} className="gf-panel">
              <h3>{serviceNome(pack, job.service)}</h3>
              <p>Entregue</p>
            </article>
          ))}
          {recs.map((rec) => (
            <ReceivableCard key={rec.id} rec={rec} state={state} pack={pack} busy={busy} onAct={onAct} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JobCard({
  job,
  state,
  pack,
  busy,
  away,
  workers,
  onAct,
  onBuy,
}: {
  job: Job;
  state: GameState;
  pack: Content;
  busy: boolean;
  away: boolean;
  workers: { id: string; nome: string }[];
  onAct: (action: Record<string, unknown>) => void;
  onBuy: (material: MaterialId, qty: number) => void;
}) {
  const missing = missingMaterials(state, pack, job);
  const late = isLate(state, job.dueWeek, job.dueDay);
  const pct = job.apNeeded > 0 ? Math.min(100, Math.round((100 * job.apDone) / job.apNeeded)) : 0;
  const options = workers.some((worker) => worker.id === job.assignedTo) ? workers : [...workers, { id: job.assignedTo, nome: workerNome(pack, job.assignedTo) }];
  return (
    <article className="gf-panel">
      <h3>{serviceNome(pack, job.service)}</h3>
      <p className={late ? "gf-danger" : undefined}>
        Entrega {dueLabel(job.dueWeek, job.dueDay)}
        {late ? " · atrasado" : ""}
      </p>
      <label>
        Quem trabalha{" "}
        <select
          aria-label={`Quem trabalha em ${serviceNome(pack, job.service)}`}
          value={job.assignedTo}
          disabled={busy}
          onChange={(event) => onAct({ type: "ASSIGN", jobId: job.id, worker: event.target.value })}
        >
          {options.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.nome}
            </option>
          ))}
        </select>
      </label>
      {job.status === "in_progress" && (
        <>
          <div className="gf-meter" role="progressbar" aria-valuenow={job.apDone} aria-valuemin={0} aria-valuemax={job.apNeeded} aria-label="Andamento">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p>
            {job.apDone}/{job.apNeeded} PA
          </p>
          <button type="button" className="gf-go" disabled={busy || away || state.calendar.apLeft < 1} onClick={() => onAct({ type: "WORK_JOB", jobId: job.id, ap: 1 })}>
            {away ? "Você está na cidade" : "Trabalhar (+1 PA)"}
          </button>
        </>
      )}
      {job.status === "ready" && (
        <button type="button" className="gf-go" disabled={busy} onClick={() => onAct({ type: "DELIVER", jobId: job.id })}>
          Entregar
        </button>
      )}
      {missing.length > 0 && (
        <ul>
          {missing.map((row) => (
            <li key={row.material}>
              {materialNome(pack, row.material)} {row.have}/{row.need}{" "}
              <button type="button" onClick={() => onBuy(row.material, Math.max(1, row.need - row.have))}>
                Buscar na cidade
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ReceivableCard({
  rec,
  state,
  pack,
  busy,
  onAct,
}: {
  rec: Receivable;
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
}) {
  const job = state.jobs.find((item) => item.id === rec.jobId);
  const late = isLate(state, rec.dueWeek, rec.dueDay);
  const bust = rec.status === "defaulted";
  return (
    <article className="gf-panel">
      <h3>{job ? serviceNome(pack, job.service) : "A receber"}</h3>
      <p>
        <Money n={rec.value} />
      </p>
      <p className={late || bust ? "gf-danger" : undefined}>
        Vence {dueLabel(rec.dueWeek, rec.dueDay)}
        {bust ? " · calote" : ""}
      </p>
      {bust && (
        <div className="gf-actions">
          {!rec.collected && (
            <button type="button" disabled={busy || state.calendar.apLeft < 1} onClick={() => onAct({ type: "COLLECT", receivableId: rec.id })}>
              Cobrar (1 PA)
            </button>
          )}
          {!rec.protested && (
            <button type="button" disabled={busy} onClick={() => onAct({ type: "PROTEST", receivableId: rec.id })}>
              Protestar (60 ₣)
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Feed({ hint, lines }: { hint: string | null; lines: FeedLine[] }) {
  return (
    <div className="gf-feed" aria-live="polite">
      {hint ? (
        <p>{hint}</p>
      ) : (
        <ul>
          {lines.length === 0 && <li className="gf-dim">A oficina está quieta.</li>}
          {lines.map((line, index) => (
            <li key={`${line.text}-${index}`}>
              {line.icon} {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

