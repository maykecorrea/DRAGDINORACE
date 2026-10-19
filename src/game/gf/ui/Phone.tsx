import { useEffect, useState } from "react";
import { cardById, fillCardText, flagRanges, optionBlock, shouldMarkFlags } from "../../../../gf-engine/cards.ts";
import type { Content } from "../../../../gf-engine/content.ts";
import type { GameState } from "../../../../gf-engine/state.ts";
import { Face } from "./Face";
import { GF } from "./pixel";
import { dayShort } from "./text";

function typeDelay(): number {
  try {
    const raw = Number(localStorage.getItem("gf-type-ms") ?? "16");
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(80, raw);
  } catch {
    return 16;
  }
}

export function PhoneDesk({
  state,
  pack,
  onOpen,
  onBack,
}: {
  state: GameState;
  pack: Content;
  onOpen: (cardId: string) => void;
  onBack: () => void;
}) {
  const queue = state.cardQueue;
  return (
    <section className="gf-screen gf-phonebook">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <h2 className="gf-kicker">ZapDino</h2>
      <p className="gf-filechip">{GF.phone}</p>
      {queue.length === 0 && <p>Nenhum recado. O telefone está mudo.</p>}
      {queue.map((item) => {
        const card = cardById(pack, item.cardId);
        if (!card) return null;
        const preview = fillCardText(state, card.text).slice(0, 72);
        return (
          <button key={item.cardId} type="button" className="gf-panel gf-card gf-thread" onClick={() => onOpen(item.cardId)}>
            <Face id={card.npc ?? "teo"} />
            <span className="gf-thread-copy">
              <strong>
                {card.title}
                {!item.opened && <span className="gf-badge">novo</span>}
              </strong>
              <span className="gf-preview">{preview}</span>
              <span className="gf-dim">
                Sem {item.week} · {dayShort(item.day)}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function Marked({ text, flags, on }: { text: string; flags: string[]; on: boolean }) {
  if (!on || flags.length === 0) return <>{text}</>;
  const ranges = flagRanges(text, flags).filter((range) => range.start < text.length);
  if (ranges.length === 0) return <>{text}</>;
  const nodes: (string | { flag: string; key: number })[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    const end = Math.min(range.end, text.length);
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    if (end > range.start) nodes.push({ flag: text.slice(range.start, end), key: index });
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return (
    <>
      {nodes.map((node, index) =>
        typeof node === "string" ? (
          <span key={index}>{node}</span>
        ) : (
          <span key={node.key} className="gf-flag">
            {node.flag}
          </span>
        ),
      )}
    </>
  );
}

export function CardModal({
  state,
  pack,
  cardId,
  busy,
  onClose,
  onChoose,
}: {
  state: GameState;
  pack: Content;
  cardId: string;
  busy: boolean;
  onClose: () => void;
  onChoose: (optionId: string) => void;
}) {
  const card = cardById(pack, cardId);
  const full = card ? fillCardText(state, card.text) : "";
  const [count, setCount] = useState(full.length);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeDelay() <= 0) {
      setCount(full.length);
      return;
    }
    setCount(0);
  }, [cardId, full]);
  useEffect(() => {
    if (count >= full.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), typeDelay());
    return () => window.clearTimeout(timer);
  }, [count, full.length]);
  if (!card) return null;
  const shown = full.slice(0, count);
  const mark = shouldMarkFlags(state.flags);
  const done = count >= full.length;
  return (
    <div className="gf-modal">
      <div className="gf-sheet" role="dialog" aria-modal="true" aria-labelledby="gf-card-title">
        <p className="gf-filechip">{GF.cardFrame}</p>
        <div className="gf-cardhead">
          <Face id={card.npc ?? "teo"} large />
          <h2 id="gf-card-title">{card.title}</h2>
        </div>
        <p className="gf-letter" onClick={() => setCount(full.length)}>
          <Marked text={shown} flags={card.red_flags} on={mark} />
          {!done && <span className="gf-caret">▌</span>}
        </p>
        {mark && card.red_flags.length > 0 && done && <p className="gf-amber">⚠ Âmbar: confira isso</p>}
        <div className="gf-actions">
          {card.options.map((option) => {
            const need = optionBlock(state, pack, option);
            return (
              <button key={option.id} type="button" className={need ? undefined : "gf-go"} disabled={busy || Boolean(need)} onClick={() => onChoose(option.id)}>
                {option.label}
                {need && <small className="gf-dim"> {need}</small>}
              </button>
            );
          })}
          {!card.blocking && (
            <button type="button" disabled={busy} onClick={onClose}>
              Guardar no telefone
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
