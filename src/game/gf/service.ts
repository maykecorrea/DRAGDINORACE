import { randomInt, randomUUID } from "node:crypto";
import { redactState } from "../../../gf-engine/contracts.ts";
import type { GameState } from "../../../gf-engine/state.ts";
import { sealByKey, sealsFromState } from "./seals.ts";
import { applyEngine, CONTENT_VERSION, createInitialState, ENGINE_VERSION, ensureFullState, migrateState } from "./engine.ts";
import { GfError, isUniqueViolation } from "./errors.ts";

export type Exec = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export type RunView = {
  id: string;
  rev: number;
  week: number;
  day: number;
  state: unknown;
  content_version: string;
};

export type ActionResult = {
  rev: number;
  state: unknown;
  events: unknown[];
  unlocks?: { key: string; title: string; line: string }[];
};

type RunRow = {
  id: string;
  rev: number;
  week: number;
  day: number;
  state: unknown;
  content_version: string;
  engine_version: string;
  seed: number | string;
  status: string;
  ending: string | null;
  score: number | null;
  ended_at: Date | string | null;
};

const NAME_OK = /^[\p{L}](?:[\p{L} ]{0,14}[\p{L}])?$/u;

export function cleanName(raw: unknown): string {
  if (raw == null || raw === "") return "Téo";
  if (typeof raw !== "string") throw new GfError(422, "O nome precisa ter de 2 a 16 letras.");
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 16 || !NAME_OK.test(name)) {
    throw new GfError(422, "O nome precisa ter de 2 a 16 letras.");
  }
  return name;
}

function asState(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

type Outcome = {
  ending: string | null;
  score: number | null;
  level: number;
  dodged: number;
  lessons: string[];
};

function outcomeOf(state: unknown): Outcome {
  const row = state && typeof state === "object" ? (state as Record<string, unknown>) : {};
  const flags = row.flags && typeof row.flags === "object" ? (row.flags as Record<string, unknown>) : {};
  const garage = row.garage && typeof row.garage === "object" ? (row.garage as { level?: unknown }) : {};
  const ending = typeof row.ending === "string" ? row.ending : null;
  const score = typeof flags.score === "number" && Number.isFinite(flags.score) ? Math.round(flags.score) : null;
  const dodged = typeof flags.scams_dodged === "number" ? flags.scams_dodged : 0;
  const lessons = Array.isArray(row.lessonsTriggered) ? row.lessonsTriggered.filter((id): id is string => typeof id === "string") : [];
  return { ending, score, level: typeof garage.level === "number" ? garage.level : 0, dodged, lessons };
}

async function grantHooks(db: Exec, accountId: string, state: unknown): Promise<{ key: string; title: string; line: string }[]> {
  if (!state || typeof state !== "object") return [];
  const row = state as { garage?: { level?: number }; flags?: Record<string, unknown>; ending?: string | null };
  const earned = sealsFromState({
    garage: { level: typeof row.garage?.level === "number" ? row.garage.level : 0 } as GameState["garage"],
    flags: (row.flags ?? {}) as GameState["flags"],
    ending: typeof row.ending === "string" ? (row.ending as GameState["ending"]) : null,
  });
  const fresh: { key: string; title: string; line: string }[] = [];
  for (const seal of earned) {
    const payload = seal.key === "gf_liberdade" ? { fossil: 1000 } : null;
    const inserted = await db.query<{ unlock_key: string }>(
      `insert into account_unlocks (account_id, source, unlock_key, payload)
       values ($1, 'garagem_falida', $2, $3::jsonb)
       on conflict (account_id, source, unlock_key) do nothing
       returning unlock_key`,
      [accountId, seal.key, payload == null ? null : JSON.stringify(payload)],
    );
    if (inserted[0]) fresh.push(seal);
  }
  return fresh;
}

async function sealAccount(db: Exec, accountId: string, stamp: Outcome): Promise<void> {
  if (!stamp.ending) return;
  const bust = stamp.ending.startsWith("F") ? 1 : 0;
  await db.query(
    `update gf_account_progress
     set bankruptcies = bankruptcies + $2,
         best_score = case when $3::int is null then best_score when best_score is null or $3::int > best_score then $3::int else best_score end,
         best_ending = case when $3::int is null then best_ending when best_score is null or $3::int >= best_score then $4 else best_ending end,
         max_level = greatest(max_level, $5),
         scams_dodged = greatest(scams_dodged, $6),
         updated_at = now()
     where account_id = $1`,
    [accountId, bust, stamp.score, stamp.ending, stamp.level, stamp.dodged],
  );
  for (const lesson of stamp.lessons) {
    await db.query(
      `insert into gf_lessons (account_id, lesson_id)
       values ($1, $2)
       on conflict (account_id, lesson_id) do update set times = gf_lessons.times + 1`,
      [accountId, lesson],
    );
  }
}

function viewOf(row: RunRow, state: unknown): RunView {
  return {
    id: String(row.id),
    rev: Number(row.rev),
    week: Number(row.week),
    day: Number(row.day),
    state: redactState(state),
    content_version: row.content_version,
  };
}

async function loadActive(db: Exec, accountId: string, lock: boolean): Promise<RunRow | null> {
  const rows = await db.query<RunRow>(
    `select id, rev, week, day, state, content_version, engine_version, seed, status, ending, score, ended_at
     from gf_runs
     where account_id = $1 and status = 'active'
     ${lock ? "for update" : ""}`,
    [accountId],
  );
  return rows[0] ?? null;
}

async function persistMigration(db: Exec, row: RunRow): Promise<RunView> {
  const state = asState(row.state);
  const migrated = migrateState(state, row.engine_version);
  const full = ensureFullState(migrated.state, Number(row.seed) || 0);
  if (!migrated.changed && !full.changed) return viewOf(row, full.state);
  await db.query(
    `update gf_runs
     set state = $2::jsonb, engine_version = $3, updated_at = now()
     where id = $1`,
    [row.id, JSON.stringify(full.state), ENGINE_VERSION],
  );
  return viewOf(row, full.state);
}

export async function getActive(db: Exec, accountId: string): Promise<RunView | null> {
  const row = await loadActive(db, accountId, false);
  if (!row) return null;
  return persistMigration(db, row);
}

export async function insertRun(db: Exec, accountId: string, playerName: string): Promise<RunView> {
  const existing = await loadActive(db, accountId, true);
  if (existing) throw new GfError(409, "Já existe uma campanha ativa.");
  const seed = randomInt(0, 2 ** 32);
  const state = createInitialState(seed, playerName);
  const id = randomUUID();
  try {
    await db.query(
      `insert into gf_runs
        (id, account_id, status, seed, engine_version, content_version, rev, week, day, state)
       values ($1, $2, 'active', $3, $4, $5, 0, 0, 1, $6::jsonb)`,
      [id, accountId, seed, ENGINE_VERSION, CONTENT_VERSION, JSON.stringify(state)],
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new GfError(409, "Já existe uma campanha ativa.");
    throw err;
  }
  await db.query(
    `insert into gf_account_progress (account_id, runs_started)
     values ($1, 1)
     on conflict (account_id) do update
     set runs_started = gf_account_progress.runs_started + 1, updated_at = now()`,
    [accountId],
  );
  return { id, rev: 0, week: 0, day: 1, state: redactState(state), content_version: CONTENT_VERSION };
}

export async function abandonRun(db: Exec, accountId: string): Promise<{ ok: true }> {
  const row = await loadActive(db, accountId, true);
  if (!row) throw new GfError(404, "Não há campanha ativa.");
  const stamp = outcomeOf(asState(row.state));
  const ending = stamp.ending ?? "abandoned";
  await grantHooks(db, accountId, asState(row.state));
  if (!row.ending && stamp.ending) await sealAccount(db, accountId, stamp);
  await db.query(
    `update gf_runs
     set status = 'ended', ending = $2, score = $3, ended_at = now(), updated_at = now()
     where id = $1`,
    [row.id, ending, stamp.score],
  );
  await db.query(
    `update gf_account_progress
     set runs_ended = runs_ended + 1, updated_at = now()
     where account_id = $1`,
    [accountId],
  );
  return { ok: true };
}

export async function applyRunAction(
  db: Exec,
  accountId: string,
  input: { rev: unknown; idempotencyKey: unknown; action: unknown },
): Promise<ActionResult> {
  const key = input.idempotencyKey;
  if (typeof key !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(key)) {
    throw new GfError(422, "Chave de ação inválida.");
  }
  if (typeof input.rev !== "number" || !Number.isInteger(input.rev) || input.rev < 0) {
    throw new GfError(422, "A revisão da campanha é inválida.");
  }
  const row = await loadActive(db, accountId, true);
  if (!row) throw new GfError(404, "Não há campanha ativa.");
  const saved = await db.query<{ summary: unknown }>(
    `select summary from gf_action_log where run_id = $1 and idempotency_key = $2`,
    [row.id, key],
  );
  if (saved[0]) return asState(saved[0].summary) as ActionResult;
  const current = await persistMigration(db, row);
  if (input.rev !== current.rev) {
    throw new GfError(409, "A campanha mudou. Recarregue.", { run: current });
  }
  const next = applyEngine(current.state, input.action);
  const stamp = outcomeOf(next.state);
  const unlocks = await grantHooks(db, accountId, next.state);
  const rev = current.rev + 1;
  const calendar = (next.state as { calendar?: { week?: number; day?: number } } | null)?.calendar;
  const week = Number(calendar?.week ?? current.week);
  const day = Number(calendar?.day ?? current.day);
  const result: ActionResult = { rev, state: redactState(next.state), events: redactState(next.events), unlocks };
  try {
    await db.query(
      `insert into gf_action_log (id, run_id, rev, idempotency_key, action, summary)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [randomUUID(), row.id, rev, key, JSON.stringify(input.action), JSON.stringify(result)],
    );
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const again = await db.query<{ summary: unknown }>(
      `select summary from gf_action_log where run_id = $1 and idempotency_key = $2`,
      [row.id, key],
    );
    if (again[0]) return asState(again[0].summary) as ActionResult;
    throw err;
  }
  await db.query(
    `update gf_runs
     set state = $2::jsonb, rev = $3, week = $4, day = $5,
         ending = coalesce($6, ending), score = coalesce($7, score), updated_at = now()
     where id = $1`,
    [row.id, JSON.stringify(next.state), rev, week, day, stamp.ending, stamp.score],
  );
  if (!row.ending && stamp.ending) await sealAccount(db, accountId, stamp);
  return result;
}

export type HistoryRun = {
  id: string;
  ending: string | null;
  score: number | null;
  week: number;
  ended_at: string | null;
};

export async function listUnlocks(db: Exec, accountId: string): Promise<{
  unlocks: { key: string; title: string; line: string; payload: unknown }[];
}> {
  const rows = await db.query<{ unlock_key: string; payload: unknown }>(
    `select unlock_key, payload from account_unlocks
     where account_id = $1 and source = 'garagem_falida'
     order by granted_at`,
    [accountId],
  );
  return {
    unlocks: rows.map((row) => {
      const known = sealByKey(row.unlock_key);
      return { key: row.unlock_key, title: known?.title ?? row.unlock_key, line: known?.line ?? "Em breve no Dino Drag.", payload: row.payload ?? null };
    }),
  };
}

export async function historyOf(db: Exec, accountId: string): Promise<{
  runs: HistoryRun[];
  progress: Record<string, unknown> | null;
}> {
  const runs = await db.query<RunRow>(
    `select id, ending, score, week, ended_at, rev, day, state, content_version, engine_version, seed, status
     from gf_runs
     where account_id = $1 and status = 'ended'
     order by ended_at desc nulls last`,
    [accountId],
  );
  const progress = await db.query(
    `select runs_started, runs_ended, bankruptcies, best_ending, best_score, max_level, scams_dodged
     from gf_account_progress where account_id = $1`,
    [accountId],
  );
  return {
    runs: runs.map((row) => ({
      id: String(row.id),
      ending: row.ending,
      score: row.score == null ? null : Number(row.score),
      week: Number(row.week),
      ended_at: row.ended_at == null ? null : row.ended_at instanceof Date ? row.ended_at.toISOString() : String(row.ended_at),
    })),
    progress: progress[0] ?? null,
  };
}
