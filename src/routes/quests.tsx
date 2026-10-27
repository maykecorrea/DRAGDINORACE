import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PitFrame } from "@/components/pit";
import { RAFFLE_COST, SPIN_COST, shortWallet, type QuestId } from "@/game/quests";
import { questBoard, questCheckin, questManual, questRedeem } from "@/game/quests.functions";

export const Route = createFileRoute("/quests")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    const ref = typeof search.ref === "string" ? search.ref : "";
    return ref ? { ref } : {};
  },
  component: Quests,
});

type Board = Awaited<ReturnType<typeof questBoard>>;

const SOCIAL = new Set(["x-follow", "x-like", "x-rt", "ig-follow", "ig-like", "ig-comment"]);

function adultOk() {
  try {
    return localStorage.getItem("ddr-13") === "1";
  } catch {
    return false;
  }
}

function Quests() {
  const { ref } = Route.useSearch();
  const [board, setBoard] = useState<Board | null>(null);
  const [note, setNote] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [adult, setAdult] = useState(false);

  async function load() {
    setBoard(await questBoard());
  }

  useEffect(() => {
    if (ref) window.sessionStorage.setItem("ddr-ref", ref);
    setAdult(adultOk());
    void load();
  }, [ref]);

  async function run(task: () => Promise<{ ok: boolean; reason?: string }>) {
    setBusy(true);
    setNote("");
    const result = await task().catch(() => ({ ok: false as const, reason: "falhou" }));
    if (!result.ok) setNote(result.reason ?? "falhou");
    await load();
    setBusy(false);
  }

  const me = board?.me;
  const streak = me?.streak ?? 0;

  return (
    <PitFrame title="Missões" kicker="Pontos">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border border-border bg-surface p-4">
        <div>
          <p className="font-display text-4xl leading-none text-primary">DINO DRAG RACE</p>
          <p className="mt-1 text-sm text-muted">Cada tarefa vale pontos. Troque pontos por giros ou baús.</p>
        </div>
        <div className="text-right">
          <p className="font-pixel text-xs tracking-widest text-muted">{me ? "sua conta" : "entre para pontuar"}</p>
          <p className="font-display text-4xl leading-none text-primary">{me?.points ?? 0} pts</p>
        </div>
      </div>
      {note && <p className="mb-3 text-sm text-primary">{note}</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-bg px-4 py-3">
        <p className="text-sm">Presença do dia: {streak}/7 dias{streak > 0 && streak % 7 === 0 ? " · bônus recebido" : ""}</p>
        <button type="button" disabled={!me || busy || me.last_checkin === new Date().toISOString().slice(0, 10)} onClick={() => void run(() => questCheckin())} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Fazer check-in</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="border border-border bg-bg p-4">
          <p className="font-display text-3xl leading-none">Tarefas</p>
          <ul className="mt-3 grid gap-2">
            {board?.tasks.filter((task) => task.id !== "wallet" && (adult || !SOCIAL.has(task.id))).map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2">
                <div>
                  <p className="text-sm">{task.status === "done" ? "[x]" : task.status === "pending" ? "[~]" : "[ ]"} {task.name}</p>
                  <p className="text-xs text-muted">+{task.points}{task.cap ? ` · ${task.hits}/${task.cap}` : ""}{task.status === "pending" ? " · pendente" : ""}{task.status === "paused" ? " · pausada" : ""}</p>
                </div>
                {task.check === "manual" && task.status === "open" && me && (
                  <button type="button" className="min-h-11 border border-primary px-3 text-sm text-primary" onClick={() => void run(() => questManual({ data: { quest: task.id as QuestId, handle } }))}>Enviar</button>
                )}
                {task.href && <a href={task.href} target="_blank" rel="noreferrer" className="text-xs text-primary">abrir</a>}
              </li>
            ))}
          </ul>
          {!adult && <p className="mt-3 text-xs text-muted">Tarefas do X e do Instagram aparecem para contas de 13 anos ou mais. Marque isso em Conta.</p>}
          {adult && me && (
            <div className="mt-4 grid gap-2">
              <label className="text-xs tracking-widest text-muted">Seu nome no X ou no Instagram, sem @</label>
              <input value={handle} onChange={(event) => setHandle(event.target.value)} className="h-11 border border-border bg-black px-3" placeholder="teu usuario" />
              {board?.discordReady ? (
                <a href="/api/quests/discord" className="inline-flex min-h-11 items-center bg-primary px-4 font-display text-2xl leading-none text-ink">Vincular Discord</a>
              ) : (
                <p className="text-xs text-muted">A ligação com o Discord chega em breve.</p>
              )}
              <p className="text-xs text-muted">Seu link de convite: {typeof window === "undefined" ? "/quests" : `${window.location.origin}/quests`}</p>
            </div>
          )}
        </section>
        <aside className="grid gap-4">
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Trocar pontos</p>
            <p className="mt-3 text-sm">1 ovo para chocar =  {SPIN_COST} pts{me ? ` · você tem ${me.spins}` : ""}</p>
            <button type="button" disabled={!me || busy} onClick={() => void run(() => questRedeem({ data: { kind: "spin" } }))} className="mt-2 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Chocar</button>
            <p className="mt-4 text-sm">1 baú raro =  {RAFFLE_COST} pts</p>
            <button type="button" disabled={!me || busy} onClick={() => void run(() => questRedeem({ data: { kind: "raffle" } }))} className="mt-2 min-h-11 border border-primary px-4 font-display text-2xl leading-none text-primary disabled:opacity-40">Abrir baú</button>
          </section>
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Top 10 da semana</p>
            <p className="mt-1 text-xs text-muted">Os dez primeiros ganham um carro Raro ou Épico.</p>
            <ol className="mt-3 grid gap-1 text-sm">
              {(board?.top ?? []).map((row, index) => (
                <li key={row.wallet}>{index + 1}. {shortWallet(row.wallet)} · {row.points}</li>
              ))}
              {board && board.top.length === 0 && <li className="text-muted">Ninguém pontuou ainda.</li>}
            </ol>
          </section>
        </aside>
      </div>
    </PitFrame>
  );
}
