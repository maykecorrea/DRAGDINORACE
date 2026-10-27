import { useEffect, useRef, useState } from "react";

type Card = { src: string; caption: string; ms: number; pan: string };

const V = "20261023.4";

const CARDS: Card[] = [
  { src: `/game/prologo/01.png?v=${V}`, caption: "Um cometa verde caiu na Terra… e os dinos acordaram!", ms: 5000, pan: "translate3d(0.6%, -1%, 0)" },
  { src: `/game/prologo/02.png?v=${V}`, caption: "Na Cidade-Faixa, briga não se resolve no grito. Resolve na pista.", ms: 5000, pan: "translate3d(-1%, 0.3%, 0)" },
  { src: `/game/prologo/03.png?v=${V}`, caption: "{nome} Ferrugem cresceu na oficina do pai, entre chaves e motores.", ms: 5000, pan: "translate3d(1.4%, 0, 0)" },
  { src: `/game/prologo/04.png?v=${V}`, caption: "Rex Navalha quer a rua inteira. O pai disse: “Essa não.”", ms: 5500, pan: "translate3d(0, -0.8%, 0)" },
  { src: `/game/prologo/05.png?v=${V}`, caption: "Uma noite, fogo na oficina. De manhã, cinza… e uma luz azul.", ms: 6000, pan: "translate3d(0.4%, 0.6%, 0)" },
  { src: `/game/prologo/06.png?v=${V}`, caption: "O pai virou luz de cometa e entregou a chave: “Agora é com você.”", ms: 6000, pan: "translate3d(-0.6%, -0.4%, 0)" },
  { src: `/game/prologo/07.png?v=${V}`, caption: "Seis pilotos da gangue te esperam. E, no fim, o VEX-REX.", ms: 5500, pan: "translate3d(0.8%, 0, 0)" },
  { src: `/game/prologo/08.png?v=${V}`, caption: "A rua ainda é nossa. Ligue o motor!", ms: 4000, pan: "translate3d(0, -0.6%, 0)" },
];

function Shot({ card, on, hold, onError }: { card: Card; on: boolean; hold?: boolean; onError?: () => void }) {
  const shown = on || !!hold;
  return (
    <img
      src={card.src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? `scale(1.06) ${card.pan}` : "scale(1) translate3d(0,0,0)",
        transition: hold ? "none" : "opacity 0.6s ease, transform 8s linear",
      }}
      onError={onError}
    />
  );
}

export function Prologue({
  mode,
  name,
  onDone,
}: {
  mode: "story" | "garage";
  name?: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [under, setUnder] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [miss, setMiss] = useState(false);
  const who = name?.trim() || "Téo";
  const done = useRef(onDone);
  done.current = onDone;
  const card = CARDS[index] ?? CARDS[0]!;
  const last = index >= CARDS.length - 1;
  const caption = (last && mode === "garage"
    ? "A oficina ainda é nossa. Abra o portão!"
    : card.caption
  ).replaceAll("{nome}", who);

  useEffect(() => {
    setMiss(false);
    setLive(false);
    const fadeIn = window.setTimeout(() => setLive(true), 30);
    const dropUnder = window.setTimeout(() => setUnder(null), 620);
    if (last) {
      return () => {
        window.clearTimeout(fadeIn);
        window.clearTimeout(dropUnder);
      };
    }
    const next = window.setTimeout(() => {
      setUnder(index);
      setIndex((value) => value + 1);
    }, card.ms);
    return () => {
      window.clearTimeout(fadeIn);
      window.clearTimeout(dropUnder);
      window.clearTimeout(next);
    };
  }, [index, card.ms, last]);

  return (
    <section className="absolute inset-0 z-40 overflow-hidden bg-black text-fg">
      {under != null && CARDS[under] && <Shot card={CARDS[under]} on hold />}
      <Shot card={card} on={live} onError={() => setMiss(true)} />
      {miss && (
        <div className="absolute inset-0 grid place-items-center bg-[#12160f] text-center">
          <p className="font-display text-6xl text-primary">{String(index + 1).padStart(2, "0")}</p>
        </div>
      )}
      <button type="button" className="absolute top-4 right-4 z-10 min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink" onClick={() => done.current()}>
        Pular
      </button>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-16 pb-5 text-center">
        <p className="text-lg text-fg">{caption}</p>
        {last && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink" onClick={() => done.current()}>
              Seguir
            </button>
            <button
              type="button"
              className="min-h-11 border border-primary px-4 font-display text-3xl leading-none text-primary"
              onClick={() => {
                setUnder(index);
                setIndex(0);
              }}
            >
              Ver de novo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
