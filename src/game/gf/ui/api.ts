import { getBearerToken } from "@/lib/auth/client";
import type { GameState } from "../../../../gf-engine/state.ts";
import type { GfEvent } from "../../../../gf-engine/finance.ts";

export type GfRun = {
  id: string;
  rev: number;
  week: number;
  day: number;
  state: GameState;
  content_version: string;
};

export class GfApiError extends Error {
  readonly status: number;
  run?: GfRun | null;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GfApiError";
    this.status = status;
  }
}

let rev = 0;

export function rememberRev(next: number): void {
  rev = next;
}

function headers(json: boolean): HeadersInit {
  const token = getBearerToken();
  const out: Record<string, string> = {};
  if (token) out.Authorization = `Bearer ${token}`;
  if (json) out["content-type"] = "application/json";
  return out;
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function asRun(value: unknown): GfRun | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<GfRun>;
  if (typeof row.id !== "string" || typeof row.rev !== "number" || !row.state) return null;
  return row as GfRun;
}

export async function fetchRun(): Promise<GfRun | null> {
  const res = await fetch("/api/gf/run", { headers: headers(false) });
  const body = await readBody(res);
  if (!res.ok) {
    throw new GfApiError(res.status, typeof body.error === "string" ? body.error : "A oficina não abriu.");
  }
  const run = asRun(body.run);
  if (run) rememberRev(run.rev);
  return run;
}

export async function startRun(playerName: string): Promise<GfRun> {
  const res = await fetch("/api/gf/run", {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ playerName }),
  });
  const body = await readBody(res);
  if (res.status === 409) {
    const run = await fetchRun();
    const err = new GfApiError(409, "Atualizado em outra aba");
    err.run = run;
    throw err;
  }
  if (!res.ok) {
    throw new GfApiError(res.status, typeof body.error === "string" ? body.error : "Não deu para herdar a oficina.");
  }
  const run = asRun(body.run);
  if (!run) throw new GfApiError(422, "A oficina não devolveu a campanha.");
  rememberRev(run.rev);
  return run;
}

export async function dropRun(): Promise<void> {
  const res = await fetch("/api/gf/run", {
    method: "DELETE",
    headers: headers(true),
    body: JSON.stringify({ confirm: "APAGAR" }),
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new GfApiError(res.status, typeof body.error === "string" ? body.error : "Não deu para recomeçar.");
  }
  rememberRev(0);
}

export async function act(action: Record<string, unknown>): Promise<{ rev: number; state: GameState; events: GfEvent[]; unlocks: { key: string; title: string; line: string }[] }> {
  const idempotencyKey = crypto.randomUUID();
  const res = await fetch("/api/gf/action", {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ rev, idempotencyKey, action }),
  });
  const body = await readBody(res);
  if (res.status === 409) {
    const embedded = asRun(body.run);
    const run = embedded ?? (await fetchRun());
    if (run) rememberRev(run.rev);
    const err = new GfApiError(409, "Atualizado em outra aba");
    err.run = run;
    throw err;
  }
  if (!res.ok || typeof body.rev !== "number" || !body.state) {
    throw new GfApiError(res.status || 422, typeof body.error === "string" ? body.error : "Não deu para fazer isso.");
  }
  rememberRev(body.rev);
  const unlocks = Array.isArray(body.unlocks) ? (body.unlocks as { key: string; title: string; line: string }[]) : [];
  return { rev: body.rev, state: body.state as GameState, events: (body.events as GfEvent[]) ?? [], unlocks };
}
