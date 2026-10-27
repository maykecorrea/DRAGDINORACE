import { useEffect, useRef, useState } from "react";
import { trophyWeeks } from "../../../../gf-engine/district.ts";
import type { GameState } from "../../../../gf-engine/state.ts";
import { liveStats } from "../../data";
import { loadSave, selectedCar } from "../../save";

const PRIZE = 400;
const TOURNEY = 1000;
const LIGHTS = [8, 24, 40, 56, 72];

function tourneyWeek(week: number): boolean {
  const shown = week + 1;
  return shown === 18 || shown === 30 || shown === 44;
}

function nextTourney(shown: number): number {
  if (shown <= 18) return 18;
  if (shown <= 30) return 30;
  return 44;
}

type Heat = { win: boolean; late: boolean; prize: number; you: number; rival: number };

function streetCar(level: number): { name: string; power: number; weight: number } {
  const fallback = { name: "da oficina", power: 48 + level * 18, weight: 90 };
  if (typeof window === "undefined") return fallback;
  try {
    const save = loadSave();
    const car = selectedCar(save);
    const stats = liveStats(car, save.pilot);
    return { name: car.rarity, power: stats.power, weight: Math.max(48, stats.durability) };
  } catch {
    return fallback;
  }
}

export function Coliseu({
  state,
  busy,
  open,
  onAct,
  onBack,
}: {
  state: GameState;
  busy: boolean;
  open: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const name = state.player.name || "Téo";
  const week = state.calendar.week + 1;
  const tournament = tourneyWeek(state.calendar.week);
  const next = nextTourney(week);
  const prize = tournament ? TOURNEY : PRIZE;
  const [phase, setPhase] = useState(0);
  const [line, setLine] = useState(open ? "Boa noite, Cidade-Faixa! Aqui é o Turbão!" : "O Coliseu abre às 18:00. Volta de noite!");
  const [foul, setFoul] = useState(false);
  const [result, setResult] = useState<Heat | null>(null);
  const greenAt = useRef(0);
  const settled = useRef(false);
  const trophies = trophyWeeks(state.flags);
  const car = streetCar(state.garage.level);
  const power = car.power;
  const weight = car.weight;

  useEffect(() => {
    if (phase <= 0 || phase >= 5) return;
    const timer = window.setTimeout(() => setPhase((n) => Math.min(5, n + 1)), 500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 5) return;
    greenAt.current = performance.now();
    setLine("Olho na luz… VAI!");
    const late = window.setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      setPhase(7);
      setResult({ win: false, late: true, prize: 0, you: 1500, rival: 0 });
      setLine("Atrasou.");
    }, 1500);
    return () => window.clearTimeout(late);
  }, [phase]);

  function resetHeat() {
    settled.current = false;
    setFoul(false);
    setResult(null);
    setPhase(0);
  }

  function start() {
    if (!open || busy) return;
    resetHeat();
    setPhase(1);
    setLine(tournament ? "Semana de torneio! O troféu de osso está esperando." : "Olho na luz… VAI!");
  }

  function launch() {
    if (phase < 5) {
      settled.current = true;
      setPhase(0);
      setFoul(true);
      setLine("Saiu antes do VAI. Respira e tenta de novo.");
      return;
    }
    if (phase !== 5 || settled.current) return;
    settled.current = true;
    const reaction = performance.now() - greenAt.current;
    const you = Math.max(40, reaction - (power / weight) * 80);
    const rival = 220 + Math.random() * 160;
    const win = you < rival;
    setPhase(6);
    setResult({ win, late: false, prize: win ? prize : 0, you, rival });
    if (win) {
      setLine("Que arrancada! Rugido de motor puro!");
      onAct({ type: "COLISEU" });
    } else {
      setLine("Quase! Ajusta o carro na oficina e volta amanhã.");
    }
  }

  return (
    <section className="gf-screen gf-coliseu-screen">
      <button type="button" onClick={onBack}>Voltar ao mapa</button>
      <div className="gf-coliseu">
        <img className="gf-coliseu-bg" src="/assets/gf/v2/interiores/int_coliseu.png?v=8" alt="" />
        <img className="gf-coliseu-host" src="/assets/gf/npcs/npc_locutor_coliseu.png?v=8" alt="Turbão" />
        <p className="gf-coliseu-say">{line}</p>
        <div className={`gf-lights${phase > 0 && phase < 6 ? " is-live" : ""}`} aria-hidden={phase === 0}>
          <img src="/assets/gf/v2/coliseu/coliseu_semaforo_largada.png" alt="" />
          {LIGHTS.map((top, index) => (
            <i key={top} className={phase === index + 1 && phase < 5 ? "is-on" : phase >= 5 && index === 4 ? "is-go" : ""} style={{ top: `${top}%` }} />
          ))}
        </div>
        <div className="gf-poster">
          <b>Próximo torneio</b>
          <span>Semana {next}</span>
          <small>{tournament ? "Inscrições abertas · ₣ 1.000" : "Inscrever só nessa semana"}</small>
          <button type="button" disabled={!open || busy || phase > 0 || !tournament} title={tournament ? "Inscrever" : `Abre na semana ${next}.`} onClick={start}>Inscrever</button>
        </div>
        <div className="gf-coliseu-panel">
          <p>Duas pistas, dois carros, uma arrancada. Bora, {name}?</p>
          <p>Prêmio fixo de {prize} fósseis para quem chegar primeiro.</p>
          <p>Aqui ninguém aposta. Aqui se corre!</p>
          <p>Carro {car.name} · força {power} · peso {weight}</p>
          {phase === 0 && !result && <button type="button" className="is-go" disabled={!open || busy} onClick={start}>{tournament ? "Correr no torneio" : "Correr"}</button>}
          {phase > 0 && phase < 6 && <button type="button" className="is-go" onClick={launch}>Largar</button>}
          {foul && <p>Saiu antes do VAI.</p>}
        </div>
        {result && (
          <div className="gf-heat">
            <b>{result.late ? "Atrasou" : result.win ? "Chegou primeiro" : "O rival chegou primeiro"}</b>
            <p>{result.win ? `Prêmio: ${result.prize} fósseis` : "Sem prêmio desta vez."}</p>
            {!result.late && <p>Você {Math.round(result.you)} ms · rival {Math.round(result.rival)} ms. Carro {car.name}, força {power}, peso {weight}.</p>}
            <button type="button" className="is-go" onClick={resetHeat}>Correr de novo</button>
          </div>
        )}
        {result?.win && tournament && (
          <div className="gf-trophy">
            <img src="/assets/gf/v2/coliseu/coliseu_trofeu.png" alt="" />
            <b>Semana {week}</b>
          </div>
        )}
      </div>
      {trophies.length > 0 && <p>Troféus na oficina: {trophies.map((item) => `Semana ${item}`).join(", ")}.</p>}
    </section>
  );
}
