import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PitFrame } from "@/components/pit";
import { RAFFLE_COST, SPIN_COST, shortWallet, type QuestId } from "@/game/quests";
import { questBoard, questChallenge, questCheckin, questLogin, questManual, questRedeem } from "@/game/quests.functions";

export const Route = createFileRoute("/quests")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    const ref = typeof search.ref === "string" ? search.ref : "";
    return ref ? { ref } : {};
  },
  component: Quests,
});

type Board = Awaited<ReturnType<typeof questBoard>>;
type Eip = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function walletProvider(): Eip | null {
  const w = window as unknown as { ronin?: { provider?: Eip }; ethereum?: Eip };
  return w.ronin?.provider ?? w.ethereum ?? null;
}

function Quests() {
  const { ref } = Route.useSearch();
  const [board, setBoard] = useState<Board | null>(null);
  const [note, setNote] = useState("");
  const [handle, setHandle] = useState("");
  const [captcha, setCaptcha] = useState<{ wallet: string; nonce: string; a: number; b: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBoard(await questBoard());
  }

  useEffect(() => {
    if (ref) window.sessionStorage.setItem("ddr-ref", ref);
    void load();
  }, [ref]);

  async function connect() {
    const provider = walletProvider();
    if (!provider) {
      setNote("Abre a Ronin Wallet neste navegador e tenta de novo.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const wallet = String(accounts[0] ?? "").toLowerCase();
      const challenge = await questChallenge({ data: { wallet } });
      if (!challenge.ok) {
        setNote(challenge.reason);
        return;
      }
      setCaptcha({ wallet, nonce: challenge.nonce, a: challenge.a, b: challenge.b });
    } catch {
      setNote("A Ronin não autorizou a conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!captcha) return;
    const provider = walletProvider();
    if (!provider) return;
    setBusy(true);
    setNote("");
    try {
      const message = `Dino Drag Race\nCarteira: ${captcha.wallet}\nNonce: ${captcha.nonce}`;
      const signature = (await provider.request({ method: "personal_sign", params: [message, captcha.wallet] })) as string;
      const saved = window.sessionStorage.getItem("ddr-ref") ?? "";
      const result = await questLogin({ data: { wallet: captcha.wallet, signature, answer: Number(answer), ref: saved } });
      if (!result.ok) {
        setNote(result.reason);
        return;
      }
      setCaptcha(null);
      await load();
    } catch {
      setNote("A assinatura foi cancelada.");
    } finally {
      setBusy(false);
    }
  }

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
    <PitFrame title="Missões" kicker="PONTOS">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border border-border bg-surface p-4">
        <div>
          <p className="font-display text-4xl leading-none text-primary">DINO DRAG RACE</p>
          <p className="mt-1 text-sm text-muted">Tarefa vira ponto. Ponto vira giro ou entrada no sorteio.</p>
        </div>
        <div className="text-right">
          <p className="font-pixel text-xs tracking-widest text-muted">{me ? shortWallet(me.wallet) : "sem carteira"}</p>
          <p className="font-display text-4xl leading-none text-primary">{me?.points ?? 0} pts</p>
        </div>
      </div>
      {!me && (
        <div className="mb-4 border border-border bg-bg p-4">
          <p className="text-sm text-muted">A Ronin assina uma frase. Não gasta gás. A carteira vira o teu ID.</p>
          {captcha ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm">Quanto é {captcha.a} + {captcha.b}?</p>
              <input value={answer} onChange={(event) => setAnswer(event.target.value)} className="h-11 w-24 border border-border bg-black px-2" />
              <button type="button" disabled={busy} onClick={() => void sign()} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">Assinar</button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void connect()} className="mt-3 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">Conectar Ronin</button>
          )}
        </div>
      )}
      {note && <p className="mb-3 text-sm text-primary">{note}</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-bg px-4 py-3">
        <p className="text-sm">Check-in diário: {streak}/7 dias{streak > 0 && streak % 7 === 0 ? " · bônus pago" : ""}</p>
        <button type="button" disabled={!me || busy || me.last_checkin === new Date().toISOString().slice(0, 10)} onClick={() => void run(() => questCheckin())} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Fazer check-in</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="border border-border bg-bg p-4">
          <p className="font-display text-3xl leading-none">Tarefas</p>
          <ul className="mt-3 grid gap-2">
            {board?.tasks.map((task) => (
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
          {me && (
            <div className="mt-4 grid gap-2">
              <label className="text-xs tracking-widest text-muted">@ do X ou do Instagram, sem o arroba</label>
              <input value={handle} onChange={(event) => setHandle(event.target.value)} className="h-11 border border-border bg-black px-3" placeholder="teu usuario" />
              {board?.discordReady ? (
                <a href="/api/quests/discord" className="inline-flex min-h-11 items-center bg-primary px-4 font-display text-2xl leading-none text-ink">Vincular Discord</a>
              ) : (
                <p className="text-xs text-muted">O Discord automático liga quando o servidor receber o app do Discord.</p>
              )}
              <p className="text-xs text-muted">Teu link de indicação: {typeof window === "undefined" ? `/quests?ref=${me.wallet}` : `${window.location.origin}/quests?ref=${me.wallet}`}</p>
            </div>
          )}
        </section>
        <aside className="grid gap-4">
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Trocar pontos</p>
            <p className="mt-3 text-sm">1 giro na roleta = {SPIN_COST} pts{me ? ` · você tem ${me.spins}` : ""}</p>
            <button type="button" disabled={!me || busy} onClick={() => void run(() => questRedeem({ data: { kind: "spin" } }))} className="mt-2 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink disabled:opacity-40">Girar</button>
            <p className="mt-4 text-sm">1 entrada no sorteio de NFT = {RAFFLE_COST} pts</p>
            <button type="button" disabled={!me || busy} onClick={() => void run(() => questRedeem({ data: { kind: "raffle" } }))} className="mt-2 min-h-11 border border-primary px-4 font-display text-2xl leading-none text-primary disabled:opacity-40">Entrar</button>
          </section>
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Top 10 da semana</p>
            <p className="mt-1 text-xs text-muted">Os dez primeiros levam um NFT Raro ou Épico.</p>
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
