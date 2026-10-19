import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PitFrame } from "@/components/pit";
import { shortWallet } from "@/game/quests";
import { questAdminAct, questAdminBoard, questAdminLogin } from "@/game/quests.functions";

export const Route = createFileRoute("/quests/admin")({ component: Admin });

type Board = Extract<Awaited<ReturnType<typeof questAdminBoard>>, { ok: true }>;

function Admin() {
  const [password, setPassword] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [note, setNote] = useState("");

  async function load() {
    const next = await questAdminBoard();
    if (next.ok) setBoard(next);
    else setBoard(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function enter() {
    const result = await questAdminLogin({ data: { password } });
    if (!result.ok) {
      setNote("Senha recusada.");
      return;
    }
    setNote("");
    await load();
  }

  function csv() {
    const lines = ["lugar,carteira,pontos", ...(board?.top ?? []).map((row, index) => `${index + 1},${row.wallet},${row.points}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "top-semana.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PitFrame title="Admin das missões" kicker="FILA">
      {!board && (
        <div className="flex max-w-md flex-wrap gap-2">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 flex-1 border border-border bg-black px-3" placeholder="Senha" />
          <button type="button" onClick={() => void enter()} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">Entrar</button>
        </div>
      )}
      {note && <p className="mt-3 text-sm text-primary">{note}</p>}
      {board && (
        <div className="grid gap-4">
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Fila manual</p>
            <ul className="mt-3 grid gap-2">
              {board.pending.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2 text-sm">
                  <span>{shortWallet(item.wallet)} · {item.quest_id} · @{item.note} {item.sample ? "· amostra" : ""}</span>
                  <span className="flex gap-2">
                    <button type="button" className="min-h-11 bg-primary px-3 text-ink" onClick={() => void questAdminAct({ data: { op: "approve", id: item.id } }).then(load)}>Aprovar</button>
                    <button type="button" className="min-h-11 border border-border px-3" onClick={() => void questAdminAct({ data: { op: "reject", id: item.id } }).then(load)}>Rejeitar</button>
                  </span>
                </li>
              ))}
              {board.pending.length === 0 && <li className="text-muted">Fila vazia.</li>}
            </ul>
          </section>
          <section className="border border-border bg-bg p-4">
            <p className="font-display text-3xl leading-none">Posts e tarefas</p>
            <ul className="mt-3 grid gap-2">
              {board.configs.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-28">{item.id}</span>
                  <input defaultValue={item.href ?? ""} id={`href-${item.id}`} className="h-11 min-w-0 flex-1 border border-border bg-black px-2" />
                  <button type="button" className="min-h-11 border border-primary px-3 text-primary" onClick={() => void questAdminAct({ data: { op: "save", quest: item.id, href: (document.getElementById(`href-${item.id}`) as HTMLInputElement | null)?.value ?? "" } }).then(load)}>Salvar</button>
                  <button type="button" className="min-h-11 border border-border px-3" onClick={() => void questAdminAct({ data: { op: "pause", quest: item.id } }).then(load)}>{Number(item.paused) ? "Retomar" : "Pausar"}</button>
                </li>
              ))}
            </ul>
          </section>
          <section className="border border-border bg-bg p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-3xl leading-none">Top da semana</p>
              <button type="button" onClick={csv} className="min-h-11 border border-primary px-3 text-sm text-primary">Exportar CSV</button>
            </div>
            <ol className="mt-3 grid gap-1 text-sm">
              {board.top.map((row, index) => (
                <li key={row.wallet}>{index + 1}. {row.wallet} · {row.points}</li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </PitFrame>
  );
}
