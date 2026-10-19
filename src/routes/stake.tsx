import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { streetOpen } from "@/game/save";
import { useSave } from "@/game/use-save";
import type { LedgerLine, StakePos } from "@/game/save";

export const Route = createFileRoute("/stake")({ component: Stake });

const BONUS = 1.1;
const LOCKS = [
  { days: 7, apr: 0.12, label: "7d" },
  { days: 30, apr: 0.28, label: "30d" },
  { days: 90, apr: 0.48, label: "90d" },
  { days: 180, apr: 0.72, label: "180d" },
  { days: 365, apr: 1.2, label: "365d" },
] as const;

const RANKS = [
  { name: "OSSO", min: 0, icon: "/game/rank-osso.png" },
  { name: "ESCAMA", min: 500, icon: "/game/rank-escama.png" },
  { name: "CROMO", min: 2000, icon: "/game/rank-cromo.png" },
  { name: "GOSMA", min: 8000, icon: "/game/rank-gosma.png" },
  { name: "LENDA", min: 20000, icon: "/game/rank-lenda.png" },
] as const;

const DAY = 86400000;
const YEAR = 365 * DAY;

function earned(pos: StakePos, now: number) {
  return pos.amount * pos.apr * ((now - pos.at) / YEAR);
}

function claimable(pos: StakePos, now: number) {
  return Math.max(0, earned(pos, now) - pos.claimed);
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function when(at: number) {
  return new Date(at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Stake() {
  const { save, commit } = useSave();
  const [now, setNow] = useState(() => Date.now());
  const [lock, setLock] = useState(1);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [burst, setBurst] = useState<{ id: number; amount: number } | null>(null);
  const stakes = save.stakes ?? [];
  const picked = LOCKS[lock] ?? LOCKS[1];
  const apr = picked.apr * BONUS;
  const total = stakes.reduce((sum, pos) => sum + pos.amount, 0);
  const reward = stakes.reduce((sum, pos) => sum + claimable(pos, now), 0);
  const rank = [...RANKS].reverse().find((item) => total >= item.min) ?? RANKS[0];
  const log = (save.ledger ?? []).filter((line) => line.kind !== "bar");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const id = window.setTimeout(() => setBurst(null), 1700);
    return () => window.clearTimeout(id);
  }, [burst]);

  function push(line: Omit<LedgerLine, "id" | "at">, nextStakes: StakePos[], fossil: number) {
    const entry: LedgerLine = { ...line, id: crypto.randomUUID(), at: Date.now() };
    commit({
      ...save,
      fossil,
      stakes: nextStakes,
      ledger: [entry, ...(save.ledger ?? [])].slice(0, 40),
    });
  }

  function travar() {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value < 1) {
      setNote("Coloca um valor.");
      return;
    }
    if (value > save.fossil) {
      setNote("Fóssil insuficiente.");
      return;
    }
    const pos: StakePos = {
      id: crypto.randomUUID(),
      amount: value,
      days: picked.days,
      apr,
      at: Date.now(),
      claimed: 0,
    };
    setAmount("");
    setNote("");
    setBurst({ id: Date.now(), amount: value });
    push({ kind: "stake", label: `Travar ${picked.days}d`, amount: value }, [pos, ...stakes], save.fossil - value);
  }

  function coletar() {
    if (reward < 0.01) return;
    const next = stakes.map((pos) => ({ ...pos, claimed: pos.claimed + claimable(pos, now) }));
    setNote("");
    push({ kind: "claim", label: "Coletar", amount: reward }, next, save.fossil + reward);
  }

  function soltar(pos: StakePos) {
    if (now < pos.at + pos.days * DAY) return;
    const gain = claimable(pos, now);
    const next = stakes.filter((item) => item.id !== pos.id);
    push({ kind: "unstake", label: "Soltar", amount: pos.amount }, next, save.fossil + pos.amount + gain);
  }

  if (!streetOpen(save)) {
    return (
      <PitFrame title="Stake" kicker="FÓSSIL TRAVADO">
        <p className="max-w-xl text-sm text-muted">O stake abre depois de 4 corridas. Travar fóssil rende por dia, e o prazo longo rende mais. Não dá pra tirar antes do prazo.</p>
        <Link to="/pista" className="mt-4 inline-flex min-h-11 items-center bg-primary px-4 font-display text-3xl leading-none text-ink">Pista</Link>
      </PitFrame>
    );
  }

  return (
    <PitFrame title="Stake" kicker="FÓSSIL TRAVADO">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-primary/40 bg-surface px-3 py-2">
            <p className="font-pixel text-[10px] tracking-widest text-primary">TEMPORADA DA GOSMA</p>
            <p className="text-sm text-primary">+10% no travamento</p>
          </div>
          <p className="mb-3 text-sm text-muted">Travar tira o fóssil da mão até o prazo acabar. 7 dias rende pouco. 365 dias rende muito. Coletar pega só o rendimento. Soltar devolve o valor, depois do prazo.</p>
          <p className="mb-3 text-xs tracking-widest text-muted">
            TOTAL TRAVADO {fmt(total)} · TEMPORADA 80 DIAS · GRAU {rank.name}
          </p>
          <section className="border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-widest text-muted">A COLETAR</p>
                <p className="font-display text-5xl leading-none text-primary">
                  {fmt(reward)} <FossilWord />
                </p>
              </div>
              <button
                type="button"
                onClick={coletar}
                disabled={reward < 0.01}
                className="min-h-11 border border-primary px-3 text-sm text-primary disabled:opacity-40"
              >
                Coletar
              </button>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {RANKS.map((item) => {
                const on = item.name === rank.name;
                return (
                  <div key={item.name} className={`text-center ${on ? "" : "opacity-40 grayscale"}`}>
                    <img src={item.icon} alt="" className={`mx-auto h-9 w-9 object-contain sm:h-16 sm:w-16 ${on ? "drop-shadow-[0_0_12px_rgba(214,255,63,0.85)]" : ""}`} />
                    <span className={`mt-1 block font-pixel text-[8px] tracking-widest sm:text-[10px] ${on ? "text-primary" : "text-muted"}`}>{item.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <p className="text-xs tracking-widest text-muted">PRAZO</p>
              <input
                type="range"
                min={0}
                max={LOCKS.length - 1}
                step={1}
                value={lock}
                onChange={(e) => setLock(Number(e.target.value))}
                className="stake-range mt-2"
              />
              <div className="flex justify-between font-pixel text-[8px] tracking-widest sm:text-[10px]">
                {LOCKS.map((item, index) => (
                  <span key={item.days} className={index === lock ? "text-primary" : "text-muted"}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              APR atual <span className="font-display text-3xl text-primary">{Math.round(apr * 100)}%</span>
            </p>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                travar();
              }}
            >
              <input
                inputMode="numeric"
                value={amount ? fmt(Number(amount)) : ""}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="Quantidade"
                className="min-h-11 flex-1 border border-border bg-bg px-3 text-sm"
              />
              <button type="submit" className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                Travar
              </button>
            </form>
            <p className="mt-2 text-xs text-muted">
              Na conta {fmt(save.fossil)} <FossilWord />
            </p>
            {note && <p className="mt-2 text-sm text-danger">{note}</p>}
          </section>
          <section className="mt-4 border border-border bg-surface p-4">
            <p className="text-xs tracking-widest text-muted">POSIÇÕES ABERTAS</p>
            {stakes.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nenhuma posição aberta.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {stakes.map((pos) => {
                  const left = pos.at + pos.days * DAY - now;
                  const open = left <= 0;
                  return (
                    <li key={pos.id} className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2">
                      <div>
                        <p className="font-display text-2xl leading-none">{fmt(pos.amount)} fóssil</p>
                        <p className="text-xs text-muted">
                          {pos.days}d · {Math.round(pos.apr * 100)}% · {open ? "livre" : `${Math.ceil(left / DAY)}d restantes`} · a coletar {fmt(claimable(pos, now))}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!open}
                        onClick={() => soltar(pos)}
                        className="min-h-11 border border-border px-3 text-sm disabled:opacity-40"
                      >
                        Soltar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="mt-4 border border-border bg-surface p-4">
            <p className="text-xs tracking-widest text-muted">HISTÓRICO</p>
            {log.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Sua conta não possui nenhuma atividade recente.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs tracking-widest text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-normal">Fóssil</th>
                      <th className="py-2 pr-3 font-normal">Ação</th>
                      <th className="py-2 pr-3 font-normal">Status</th>
                      <th className="py-2 font-normal">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((line) => (
                      <tr key={line.id} className="border-t border-border">
                        <td className="py-2 pr-3">{fmt(line.amount)}</td>
                        <td className="py-2 pr-3">{line.label}</td>
                        <td className="py-2 pr-3 text-primary">ok</td>
                        <td className="py-2 text-muted">{when(line.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <img src="/game/stake-host.gif" alt="" className="mx-auto w-full max-w-[220px] object-contain" />
      </div>
      {burst && (
        <div className="stake-burst" key={burst.id}>
          <div className="stake-burst-flash" />
          <div className="stake-burst-ring" />
          <div className="stake-burst-ring stake-burst-ring-late" />
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="stake-spark" style={{ ["--a" as string]: `${i * 22.5}deg` }} />
          ))}
          <div className="stake-burst-card">
            <img src="/game/stake-host.gif" alt="" className="stake-burst-host" />
            <p className="font-display text-7xl leading-none text-primary">TRAVADO</p>
            <p className="mt-1 font-pixel text-3xl tracking-widest text-fg">
              {fmt(burst.amount)} FÓSSIL
            </p>
          </div>
        </div>
      )}
    </PitFrame>
  );
}
