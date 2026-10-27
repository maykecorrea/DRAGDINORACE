import { useCallback, useEffect, useRef, useState } from "react";
import { cardById } from "../../../../gf-engine/cards.ts";
import { clockLabel, partsOf, placeOpen } from "../../../../gf-engine/clock.ts";
import type { Content } from "../../../../gf-engine/content.ts";
import { DEPOSITS, leadVisible, quotePreview, workIndex } from "../../../../gf-engine/contracts.ts";
import { netWorth } from "../../../../gf-engine/finance.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { missingMaterials } from "../../../../gf-engine/production.ts";
import { clientHome, here, illnessOffer, medOffer, placeNome, supplierAt } from "../../../../gf-engine/district.ts";
import type { PlaceId } from "../../../../gf-engine/district.ts";
import type { GameState, Job, Lead, MaterialId, Receivable, WeekSummary } from "../../../../gf-engine/state.ts";
import { act, GfApiError, rememberRev, type GfRun } from "./api";
import { CrewDesk } from "./CrewDesk";
import { DebtDesk } from "./DebtDesk";
import { Face } from "./Face";
import { CardModal, PhoneDesk } from "./Phone";
import { GF } from "./pixel";
import { AgendaPhone } from "./Agenda";
import { AuctionDesk } from "./AuctionDesk";
import { Coliseu } from "./Coliseu";
import { CityStage } from "./v2/CityStage";
import { HubScene, DadGhost } from "./v2/HubScene";
import { HudV2 } from "./v2/HudV2";
import { CentralTela } from "./v2/CentralEntrega";
import { AjustesPainel, CadernoTela, CofreTela, ElevadorTela, FogaoTela, PrateleiraTela, QuadroTela, QuartoTela } from "./v2/OficinaTelas";
import { PayModal } from "./v2/PayModal";
import { PhoneShell, type PhoneApp } from "./v2/PhoneShell";
import { Notebook } from "./Notebook";
import { ReserveDesk } from "./ReserveDesk";
import { StockDesk } from "./StockDesk";
import { SundayClose } from "./SundayClose";
import { GLOSS, dayShort, describeEvents, priceFromPct } from "./text";
import { blip } from "./sound";
import { Workshop } from "./Workshop";
import "./v2/v2.css";
import "./v2/mapa-mundi.css";

type Screen = "hub" | "clients" | "bays" | "stock" | "crew" | "bank" | "reserve" | "phone" | "notebook" | "obra" | "auction" | "map" | "shop" | "coliseu" | "quarto" | "fogao" | "central";
type FeedLine = { icon: string; text: string };
const SHOP_BG: Partial<Record<PlaceId, string>> = {
  ferro_velho: "/assets/gf/v2/lugares/bg_lugar_ferrovelho.jpg",
  megaosso: "/assets/gf/v2/lugares/bg_lugar_megaosso.jpg",
  casco_tech: "/assets/gf/v2/lugares/bg_lugar_cascotech.jpg",
  rato: "/assets/gf/v2/lugares/bg_lugar_beco_rato.jpg",
};

const EV_ICON: Record<string, string> = {
  "✔": "/assets/gf/v2/ui2/ev_sucesso.png",
  "✖": "/assets/gf/v2/ui2/ev_falha.png",
  "…": "/assets/gf/v2/ui2/ev_andamento.png",
  "♥": "/assets/gf/v2/ui2/ev_saude.png",
  "☾": "/assets/gf/v2/ui2/ev_noite.png",
  "★": "/assets/gf/v2/ui2/ev_nivel.png",
  "☎": "/assets/gf/v2/ui2/ev_recado.png",
  "✎": "/assets/gf/v2/ui2/ev_licao.png",
  "▣": "/assets/gf/v2/ui2/ev_semana.png",
  "!": "/assets/gf/v2/ui/ui_selo_alerta.png",
};

function EvIcon({ icon }: { icon: string }) {
  const src = EV_ICON[icon];
  if (!src) return <>{icon} </>;
  return <img className="gf-evico" src={src} alt="" />;
}

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

function kindOf(icon?: string): "ok" | "erro" | "alerta" | "info" {
  if (icon === "✔" || icon === "★") return "ok";
  if (icon === "✖") return "erro";
  if (icon === "!") return "alerta";
  return "info";
}

function hushDev(text: string): string {
  const t = text.trim();
  if (
    t === "Ação não reconhecida." ||
    t === "A ordem precisa ter os cinco grupos." ||
    t === "Essa conta não fecha." ||
    t === "O valor principal não fecha." ||
    t === "A meta não fecha." ||
    t === "O depósito não fecha." ||
    t === "Esse produto não existe." ||
    t === "Não tem dívida para juntar." ||
    t === "Esse final não existe." ||
    t === "O modo de teste está desligado neste servidor." ||
    t === "Comando de teste desconhecido." ||
    / não é um número\.$/.test(t) ||
    / inválido\.$/.test(t)
  ) return "Opa, isso não deu certo. Tente de novo.";
  return t;
}

function failLine(action: Record<string, unknown>, err: unknown): string {
  const raw = err instanceof Error ? hushDev(err.message) : "";
  if (raw === "Opa, isso não deu certo. Tente de novo.") return raw;
  if (raw && !raw.startsWith("Opa, isso não deu certo") && raw.length <= 70) return raw;
  if (/fetch|network|failed/i.test(raw)) return "Sem rede. Nada foi salvo.";
  if (action.type === "COOK") return "Não cozinhou: falta ingrediente ou nível.";
  if (action.type === "EAT") return "Não comeu: esse prato não está na despensa.";
  if (action.type === "BUY_FOOD") return "Não comprou: faltou dinheiro ou a loja fechou.";
  return "Não salvou. Tenta de novo.";
}

export function Office({ run, pack, onRun, onLeave }: { run: GfRun; pack: Content; onRun: (run: GfRun) => void; onLeave: () => void }) {
  const state = run.state;
  const [screen, setScreen] = useState<Screen>("hub");
  const [mapOpen, setMapOpen] = useState(false);
  const [layout, setLayout] = useState(layoutNow);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [pct, setPct] = useState(100);
  const [deposit, setDeposit] = useState<(typeof DEPOSITS)[number]>(0);
  const [deadline, setDeadline] = useState(pack.balance.contracts.deadlineMin);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [need, setNeed] = useState<{ material: MaterialId; qty: number } | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [phoneApp, setPhoneApp] = useState<PhoneApp | null>(null);
  const [aim, setAim] = useState<PlaceId | null>(null);
  const [payQueue, setPayQueue] = useState<number[]>([]);
  const [reneg, setReneg] = useState<number | null>(null);
  const [rankUp, setRankUp] = useState<string | null>(null);
  const [report, setReport] = useState<{ title: string; lines: FeedLine[] } | null>(null);
  const [log, setLog] = useState<(FeedLine & { day?: number })[]>([]);
  const [debugOn] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");
  const [debugWeek, setDebugWeek] = useState("6");
  const [tips, setTips] = useState(true);
  const [dad, setDad] = useState(true);
  const [ajustes, setAjustes] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [arrive, setArrive] = useState(0);
  const [notices, setNotices] = useState<{ id: number; text: string; icon: "ok" | "erro" | "alerta" | "info" }[]>([]);
  const [toastOut, setToastOut] = useState(false);
  const noticeSeq = useRef(0);
  const trap = useRef<(() => boolean) | null>(null);
  const mapEsc = useRef<(() => boolean) | null>(null);
  const bindMapEsc = useCallback((handler: (() => boolean) | null) => {
    mapEsc.current = handler;
  }, []);
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

  const showing = notices[0]?.id;
  useEffect(() => {
    if (showing == null) return;
    setToastOut(false);
    const fade = window.setTimeout(() => setToastOut(true), 4200);
    const timer = window.setTimeout(() => {
      setNotices((queue) => queue.filter((item) => item.id !== showing));
      setToastOut(false);
    }, 4400);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(timer);
    };
  }, [showing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (trap.current?.()) return;
      if (openCard) {
        setOpenCard(null);
        return;
      }
      if (report) {
        setReport(null);
        return;
      }
      if (cashOpen) {
        setCashOpen(false);
        return;
      }
      if (phoneApp) {
        setPhoneApp(null);
        return;
      }
      if (ajustes) {
        setAjustes(false);
        return;
      }
      if (proposalId) {
        setProposalId(null);
        return;
      }
      if (screen !== "hub") {
        setScreen("hub");
        return;
      }
      if (mapOpen) {
        if (mapEsc.current?.()) return;
        setMapOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [ajustes, proposalId, phoneApp, report, mapOpen, screen, openCard, cashOpen]);

  const blockingId = state.cardQueue.find((item) => cardById(pack, item.cardId)?.blocking)?.cardId ?? null;

  useEffect(() => {
    if (blockingId) setOpenCard(blockingId);
  }, [blockingId, state.calendar.week, state.calendar.day]);

  useEffect(() => {
    if (openCard || blockingId || state.ending) return;
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
  }, [openCard, blockingId, state.ending, run.rev]);

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

  function pushNotice(text: string, icon: "ok" | "erro" | "alerta" | "info" = "info") {
    const clean = hushDev(text.replaceAll("{nome}", state.player.name || "Téo")).trim();
    if (!clean) return;
    setToastOut(false);
    setNotices((queue) => {
      if (queue.some((item) => item.text === clean)) return queue;
      noticeSeq.current += 1;
      return [...queue, { id: noticeSeq.current, text: clean, icon }];
    });
  }

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
      const renegotiated = result.events.find((event) => event.type === "DEBT_PAID" && event.text === "renegociado");
      const kind = String(action.type ?? "");
      const dest = typeof action.place === "string" ? action.place : "";
      const traveling = (kind === "TRAVEL" || kind === "OSSOBUS") && dest.length > 0;
      if (lines.length > 0 && kind !== "TICK" && kind !== "SET_SPEED" && kind !== "BUY_MED" && kind !== "TREAT" && kind !== "DEBUG" && kind !== "COOK" && kind !== "EAT" && kind !== "BUY_FOOD" && !traveling) {
        const day = result.state.calendar.week * 10 + result.state.calendar.day;
        setLog((prev) => [...lines.map((line) => ({ ...line, day })), ...prev.filter((line) => line.day === day)].slice(0, 12));
        if (!renegotiated) {
          const morning = result.events.some((event) => event.type === "DAY_ENDED" || event.type === "FAINTED");
          const client = result.events.some((event) =>
            event.type === "PROPOSAL_ACCEPTED" ||
            event.type === "PROPOSAL_REFUSED" ||
            event.type === "COUNTER_OFFER" ||
            event.type === "PAID" ||
            event.type === "DEFAULT" ||
            event.type === "JOB_OPENED" ||
            event.type === "DELIVERED",
          );
          setReport({
            title: morning ? "Amanheceu" : client ? "O cliente respondeu" : "O que rolou na oficina",
            lines,
          });
          setMapOpen(false);
        }
      }
      if (traveling && !renegotiated) {
        const landed = result.events.some((event) => event.type === "TRAVELED");
        if (lines.length > 0) {
          const day = result.state.calendar.week * 10 + result.state.calendar.day;
          setLog((prev) => [...lines.map((line) => ({ ...line, day })), ...prev.filter((line) => line.day === day)].slice(0, 12));
        }
        const place = dest as PlaceId;
        if (!landed) {
          if (lines.length > 0) {
            setScreen("hub");
            setMapOpen(false);
            setReport({ title: "O que rolou na oficina", lines });
          }
        } else if (place === "oficina") {
          setScreen("hub");
          setMapOpen(false);
          if (lines.length > 0) setReport({ title: "O que rolou na oficina", lines });
        } else {
          setAim(place);
          setArrive((n) => n + 1);
          setScreen("hub");
          setMapOpen(true);
        }
      }
      if (renegotiated) {
        setReneg(renegotiated.amount ?? 0);
        setMapOpen(false);
      }
      const paid = result.events.find((event) => (event.type === "PAID" || event.type === "COLISEU_WIN") && (event.amount ?? 0) > 0);
      if (paid?.amount) {
        setPayQueue((queue) => [...queue, paid.amount!]);
        setMapOpen(false);
      }
      const ranked = result.events.find((event) => event.type === "LEVEL_UP");
      if (ranked?.text) setRankUp(ranked.text);
      if (result.unlocks[0]) {
        pushNotice(`${result.unlocks[0].title}. ${result.unlocks[0].line}`, "info");
        blip("coin");
      } else if (result.events.some((event) => event.type === "CARD" || event.type === "PAID")) {
        blip(result.events.some((event) => event.type === "PAID") ? "coin" : "note");
      }
      const closed = result.events.find((event) => event.type === "WEEK_CLOSED" && event.summary);
      if (closed?.summary) setWeek(closed.summary);
      if (action.type === "TICK") {
        const notable = result.events.find((event) =>
          event.type === "PROPOSAL_ACCEPTED" ||
          event.type === "PROPOSAL_REFUSED" ||
          event.type === "COUNTER_OFFER" ||
          event.type === "JOB_OPENED" ||
          event.type === "MATERIALS_ARRIVED" ||
          event.type === "MEMORY" ||
          event.type === "COOKED",
        );
        const spoken = notable ? describeEvents([notable], result.state, pack)[0] : undefined;
        if (spoken) pushNotice(spoken.text, kindOf(spoken.icon));
      }
      if (action.type === "SEND_PROPOSAL") {
        setProposalId(null);
        setScreen("bays");
        pushNotice(lines[0]?.text ?? "Proposta enviada! O carro espera o cliente aceitar.", kindOf(lines[0]?.icon));
      }
      if (action.type === "ORDER_PARTS") pushNotice(lines[0]?.text ?? "Pedido confirmado. Olha a rota na central.", kindOf(lines[0]?.icon));
      if (action.type === "CARD_CHOICE") setOpenCard(null);
      if (kind === "COOK" || kind === "EAT" || kind === "BUY_FOOD") {
        if (lines[0]) pushNotice(lines[0].text, kindOf(lines[0].icon));
      }
      if (action.type === "BUY") pushNotice("Pedido feito.", "ok");
      if (action.type === "BUY_MED") pushNotice("Foi pra mochila.", "ok");
      if (action.type === "TREAT") pushNotice(lines[0]?.text ?? "Tratado.", kindOf(lines[0]?.icon));
      if (action.type === "DEBUG") pushNotice(lines[0]?.text ?? "Teste aplicado.", "info");
      return true;
    } catch (err) {
      if (action.type !== "TICK") {
        if (err instanceof GfApiError && err.run) onRun(err.run);
        const text = failLine(action, err);
        pushNotice(text, text.includes("outra aba") ? "alerta" : "erro");
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
        onOpen={(next) => {
          if (next === "phone") {
            setPhoneApp("home");
            return;
          }
          setScreen(next);
        }}
        onGear={() => { setPhoneApp(null); setAjustes(true); }}
      />
      <div className="gf-body">
        {screen !== "bank" && screen !== "coliseu" && (
          <HubScene
            state={state}
            pack={pack}
            busy={busy}
            dad={dad}
            onAct={(action) => void go(action)}
            onOpen={(next) => {
              if (next === "map") {
                setMapOpen(true);
                return;
              }
              if (next === "phone") {
                setPhoneApp("home");
                return;
              }
              if (next === "caixa") {
                setCashOpen(true);
                return;
              }
              if (next === "stock") setNeed(null);
              setScreen(next);
            }}
          />
        )}
        {screen !== "hub" && screen !== "bank" && screen !== "coliseu" && screen !== "clients" && screen !== "bays" && screen !== "stock" && screen !== "notebook" && screen !== "reserve" && screen !== "quarto" && screen !== "fogao" && screen !== "central" && (
          <div
            className={`gf-overlay${screen === "shop" ? " is-place" : ""}`}
            style={screen === "shop" && SHOP_BG[here(state)] ? { backgroundImage: `url(${SHOP_BG[here(state)]})` } : undefined}
            onClick={(event) => { if (event.target === event.currentTarget) setScreen("hub"); }}
          >
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
                  <p>O balcão só abre quando você está na loja.</p>
                </section>
              ))}
            {screen === "crew" && <CrewDesk state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
            {screen === "obra" && <Workshop state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
            {screen === "auction" && <AuctionDesk state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />}
          </div>
        )}
        {screen === "clients" && <QuadroTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onClose={() => setScreen("hub")} />}
        {screen === "bays" && (
          <ElevadorTela
            state={state}
            pack={pack}
            busy={busy}
            onAct={(action) => void go(action)}
            onMap={() => setMapOpen(true)}
            onQuadro={() => setScreen("clients")}
            onZap={() => { setScreen("hub"); setPhoneApp("zapdino"); }}
            onClose={() => setScreen("hub")}
          />
        )}
        {screen === "stock" && (
          <PrateleiraTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onMap={() => setMapOpen(true)} onOrder={() => setScreen("central")} onClose={() => setScreen("hub")} />
        )}
        {screen === "central" && <CentralTela state={state} busy={busy} onAct={(action) => void go(action)} onClose={() => setScreen("hub")} />}
        {screen === "notebook" && <CadernoTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onClose={() => setScreen("hub")} />}
        {screen === "reserve" && <CofreTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onClose={() => setScreen("hub")} />}
        {screen === "quarto" && (
          <QuartoTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onFogao={() => setScreen("fogao")} onClose={() => setScreen("hub")} />
        )}
        {screen === "fogao" && (
          <FogaoTela state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onMap={() => setMapOpen(true)} onClose={() => setScreen("hub")} />
        )}
        {ajustes && phoneApp !== "config" && (
          <AjustesPainel
            tips={tips}
            dad={dad}
            trap={trap}
            onTips={setTips}
            onDad={setDad}
            onClose={() => setAjustes(false)}
            onWipe={onLeave}
          />
        )}
        {screen === "bank" && (
          <DebtDesk state={state} pack={pack} busy={busy} phone={phone} onAct={(action) => void go(action)} onBack={() => setScreen("hub")} />
        )}
        {screen === "coliseu" && (
          <Coliseu
            state={state}
            busy={busy}
            open={placeOpen(pack, "coliseu", state.clock?.t ?? pack.time.startT)}
            onAct={(action) => void go(action)}
            onBack={() => { setScreen("hub"); setMapOpen(true); }}
          />
        )}
      </div>
      {report && payQueue.length === 0 && !rankUp && reneg == null && (
        <div className="gf-report" role="dialog" aria-modal="true" aria-label={report.title} onClick={(event) => { if (event.target === event.currentTarget) setReport(null); }}>
          <article>
            <h2>{report.title === "O que aconteceu" ? "O que rolou na oficina" : report.title}</h2>
            <p>Olha só o que aconteceu enquanto você trabalhava:</p>
            <ul>
              {report.lines.map((line, index) => (
                <li key={`${line.text}-${index}`}><EvIcon icon={line.icon} /> {line.text}</li>
              ))}
            </ul>
            <menu>
              <button type="button" className="is-go gf-ok" onClick={() => setReport(null)}>Beleza!</button>
            </menu>
          </article>
        </div>
      )}
      {!report && log.length > 0 && (
        <button type="button" className="gf-log" onClick={() => setReport({ title: "O que rolou na oficina", lines: log.slice(0, 8) })}>
          Ver o que houve
        </button>
      )}
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
      {dad && (
        <DadGhost
          state={state}
          line={notices[0]?.text}
          pose={notices[0] ? (notices[0].icon === "erro" || notices[0].icon === "alerta" ? "alerta" : notices[0].icon === "ok" ? "orgulhoso" : "apontando") : undefined}
        />
      )}
      {payQueue[0] != null && <PayModal amount={payQueue[0]} onClose={() => setPayQueue((queue) => queue.slice(1))} />}
      {payQueue.length === 0 && reneg != null && (
        <div className="gf-report" role="dialog" aria-modal="true" aria-label="Renegociado">
          <article>
            <h2>Renegociado</h2>
            <p>O Sr. Juros-Baixo cortou {formatF(reneg)} e deu +1 semana.</p>
            <menu>
              <button type="button" className="is-go" onClick={() => setReneg(null)}>Beleza!</button>
            </menu>
          </article>
        </div>
      )}
      {payQueue.length === 0 && reneg == null && rankUp && (
        <button type="button" className="gf-levelup" onClick={() => setRankUp(null)}>
          <img src="/assets/gf/map/ui/ui_levelup_banner.png" alt="" />
          <b>Nível {rankUp}</b>
          <small>Toque para guardar</small>
        </button>
      )}
      {phoneApp && (
        <PhoneShell
          app={phoneApp}
          title={
            phoneApp === "zapdino" ? "ZapDino"
            : phoneApp === "clientes" ? "Clientes"
            : phoneApp === "banco" ? "Banco"
            : phoneApp === "pecas" ? "Peças"
            : phoneApp === "mapa" ? "Mapa"
            : phoneApp === "caderno" ? "Caderno"
            : phoneApp === "saude" ? "Saúde"
            : phoneApp === "agenda" ? "Agenda"
            : phoneApp === "album" ? "Álbum"
            : phoneApp === "config" ? "Ajustes"
            : "Celular"
          }
          badge={{
            zapdino: state.cardQueue.filter((item) => !item.opened).length,
            clientes: state.leads.filter((lead) => (lead.status ?? "open") === "open" || lead.status === "counter").length,
            entrega: (state.inbound ?? []).filter((order) => order.carrier === "dinoturbo" || order.carrier === "dinodrone").length,
          }}
          onOpen={(app) => {
            if (app === "entrega") {
              setPhoneApp(null);
              setScreen("central");
              return;
            }
            setPhoneApp(app);
          }}
          onHome={() => setPhoneApp("home")}
          onClose={() => setPhoneApp(null)}
        >
          {phoneApp === "zapdino" && (
            <PhoneDesk
              state={state}
              pack={pack}
              onOpen={setOpenCard}
              onBack={() => setPhoneApp("home")}
              onMap={(place) => { setAim(place); setPhoneApp(null); setScreen("hub"); setMapOpen(true); }}
            />
          )}
          {phoneApp === "clientes" && (
            <Clients state={state} pack={pack} busy={busy} phone onAct={(action) => void go(action)} onProposal={openProposal} onBack={() => setPhoneApp("home")} />
          )}
          {phoneApp === "banco" && (
            <DebtDesk state={state} pack={pack} busy={busy} phone onAct={(action) => void go(action)} onBack={() => setPhoneApp("home")} />
          )}
          {phoneApp === "pecas" && (
            <StockDesk state={state} pack={pack} busy={busy} focus={need} mode="shelf" onAct={(action) => void go(action)} onBack={() => setPhoneApp("home")} onClearFocus={() => setNeed(null)} onMap={() => { setPhoneApp(null); setMapOpen(true); }} />
          )}
          {phoneApp === "mapa" && (
            <div className="gf-phone-note">
              <p>O mapa da cidade abre em tela cheia.</p>
              <button type="button" className="is-go" onClick={() => { setPhoneApp(null); setMapOpen(true); }}>Abrir mapa</button>
            </div>
          )}
          {phoneApp === "caderno" && (
            <Notebook state={state} pack={pack} busy={busy} onAct={(action) => void go(action)} onBack={() => setPhoneApp("home")} />
          )}
          {phoneApp === "saude" && (
            <Saude state={state} />
          )}
          {phoneApp === "agenda" && <AgendaPhone state={state} pack={pack} />}
          {phoneApp === "album" && (
            <div className="gf-album">
              <img className="gf-album-frame" src="/assets/gf/v2/bilhetes/album_bilhetes_moldura.png?v=9" alt="" />
              <div className="gf-album-body">
                <h3>Bilhetes do pai</h3>
                <img src="/assets/gf/v2/bilhetes/bilhete_do_pai.png?v=9" alt="" />
                {state.lessonsTriggered.length === 0 && <p>O caderno do pai ainda está quieto.</p>}
                {state.lessonsTriggered.map((id) => (
                  <p key={id}>{pack.lessons.find((lesson) => lesson.id === id)?.title ?? id}</p>
                ))}
                <h3>Achados</h3>
                <div className="gf-quest-row">
                  <img src="/assets/gf/v2/quest/q_carrinho_rajadinha.png?v=9" alt="Carrinho da Rajadinha" />
                  <img src="/assets/gf/v2/quest/q_cofrinho_vaquinha.png?v=9" alt="Cofrinho" />
                  <img src="/assets/gf/v2/quest/q_desenho_nico.png?v=9" alt="Desenho do Nico" />
                  <img src="/assets/gf/v2/quest/q_gibi_raptor.png?v=9" alt="Gibi" />
                </div>
              </div>
            </div>
          )}
          {phoneApp === "config" && (
            <AjustesPainel
              embed
              tips={tips}
              dad={dad}
              trap={trap}
              onTips={setTips}
              onDad={setDad}
              onClose={() => setPhoneApp("home")}
              onWipe={onLeave}
            />
          )}
        </PhoneShell>
      )}
      {cashOpen && (
        <div className="gf-report" role="dialog" aria-modal="true" aria-label="Caixa" onClick={(event) => { if (event.target === event.currentTarget) setCashOpen(false); }}>
          <article>
            <h2>Caixa</h2>
            <p>Saldo {formatF(state.cash)}.</p>
            <ul>
              {log.length === 0 && <li>Nenhum movimento ainda.</li>}
              {log.slice(0, 8).map((line, index) => (
                <li key={`${line.text}-${index}`}><EvIcon icon={line.icon} /> {line.text}</li>
              ))}
            </ul>
            <menu>
              <button type="button" className="is-go gf-ok" onClick={() => setCashOpen(false)}>Fechar</button>
            </menu>
          </article>
        </div>
      )}
      {debugOn && (
        <form className="gf-debug" onSubmit={(event) => event.preventDefault()}>
          <b>Teste</b>
          <label>
            Semana
            <input inputMode="numeric" value={debugWeek} onChange={(event) => setDebugWeek(event.target.value)} />
          </label>
          <button type="button" onClick={() => void go({ type: "DEBUG", op: "week", week: Number(debugWeek) })}>Pular</button>
          <button type="button" onClick={() => void go({ type: "DEBUG", op: "lesson", id: "L06" })}>Liberar L06</button>
          <button type="button" onClick={() => void go({ type: "DEBUG", op: "disease", id: "dz_resfriado" })}>Forçar resfriado</button>
          <button type="button" onClick={() => void go({ type: "DEBUG", op: "cash", amount: 500 })}>+500 ₣</button>
          <button type="button" onClick={() => void go({ type: "DEBUG", op: "tourney" })}>Abrir torneio</button>
        </form>
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
          aim={aim}
          arrive={arrive}
          onEsc={bindMapEsc}
          onAct={(action) => go(action)}
          onBack={() => setMapOpen(false)}
          onCounter={() => {
            setMapOpen(false);
            setScreen("shop");
          }}
          onEnter={(next) => {
            setMapOpen(false);
            setScreen(next);
          }}
          onClients={() => {
            setMapOpen(false);
            setScreen("clients");
          }}
        />
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
          onMap={() => setMapOpen(false)}
          onOpen={(next) => {
            setMapOpen(false);
            if (next === "phone") {
              setPhoneApp("home");
              return;
            }
            setScreen(next);
          }}
          onGear={() => { setMapOpen(false); setPhoneApp(null); setAjustes(true); }}
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

function Saude({ state }: { state: GameState }) {
  const id = typeof state.flags.disease === "string" ? state.flags.disease : "";
  const ill = id ? illnessOffer(id) : null;
  const bag = typeof state.flags.meds === "string" ? state.flags.meds : "";
  const meds = bag.split(",").map((pair) => {
    const [med, qty] = pair.split(":");
    return { med: med ?? "", qty: Number(qty) || 0 };
  }).filter((item) => item.med && item.qty > 0);
  return (
    <div className="gf-phone-note">
      <h3>Ficha</h3>
      {ill ? (
        <p>Doença: {ill.nome}. Vá ao hospital. {medOffer(ill.rx)?.nome ?? "O remédio"} está na farmácia.</p>
      ) : (
        <p>Sem doença na ficha. O hospital trata se doer.</p>
      )}
      <p>Ânimo {state.morale}. Abaixo de 30 o serviço falha mais.</p>
      <p>Fôlego {Math.floor(state.clock.energy / 4)}h. Cada hora acordado gasta energia.</p>
      <h3>Mochila</h3>
      {meds.length === 0 && <p>Sem remédio. A farmácia vende.</p>}
      {meds.map((item) => (
        <p key={item.med}>{medOffer(item.med)?.nome ?? item.med} × {item.qty}</p>
      ))}
    </div>
  );
}

function replyWhen(state: GameState, lead: Lead): string {
  const at = lead.proposal?.replyAt;
  if (typeof at !== "number") return "amanhã";
  const mins = at - state.clock.t;
  if (mins <= 0) return "agora";
  return `em ${Math.max(1, Math.round(mins / 60))}h`;
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
      {empty && phone && <img className="gf-empty-art" src="/assets/gf/v2/ui2/cel_clientes_vazio.png" alt="" />}
      {empty && <p>{phone ? "Nenhum cliente ainda." : "Ninguém na porta. Prospectar no pátio traz gente na outra semana."}</p>}
      {counters.map((lead) => (
        <article key={lead.id} className="gf-panel gf-card animate-gf-buzz motion-reduce:animate-none">
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
              <button
                type="button"
                disabled={busy || here(state) !== clientHome(lead.apparentType)}
                title={here(state) === clientHome(lead.apparentType) ? "Sobe 3% o preço, no teto da proposta." : `Pechincha só na casa do cliente (${placeNome(clientHome(lead.apparentType))}).`}
                onClick={() => onAct({ type: "NUDGE_COUNTER", leadId: lead.id, dir: 3 })}
              >
                Empurrar +3%
              </button>
              <button
                type="button"
                disabled={busy || here(state) !== clientHome(lead.apparentType)}
                title={here(state) === clientHome(lead.apparentType) ? "Aceita 2% abaixo do que ele pediu." : `Pechincha só na casa do cliente (${placeNome(clientHome(lead.apparentType))}).`}
                onClick={() => onAct({ type: "NUDGE_COUNTER", leadId: lead.id, dir: -2 })}
              >
                Ceder −2%
              </button>
            </div>
          </div>
        </article>
      ))}
      {open.map((lead) => (
        <article key={lead.id} className="gf-panel gf-card animate-gf-buzz motion-reduce:animate-none">
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
                Proposta
              </button>
              {!lead.record && (
                <button type="button" disabled={busy || state.calendar.apLeft < 1} onClick={() => onAct({ type: "CHECK_RECORD", targetId: lead.id })}>
                  Ficha · 1 PA + 20 ₣
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
            <p>A resposta chega {replyWhen(state, lead)}</p>
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
    <div className="gf-modal" role="dialog" aria-modal="true" aria-label="Proposta" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="gf-panel gf-slice">
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
              {line.icon ? <EvIcon icon={line.icon} /> : null} {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

