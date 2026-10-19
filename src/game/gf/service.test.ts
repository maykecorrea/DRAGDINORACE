import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { resetActionSlots, takeActionSlot } from "./limit.ts";
import { abandonRun, applyRunAction, getActive, insertRun, type Exec } from "./service.ts";
import { GfError } from "./errors.ts";

async function db(): Promise<{ pg: PGlite; exec: Exec }> {
  const pg = new PGlite();
  await pg.waitReady;
  const auth = readFileSync(new URL("../../../migrations/0001_auth.sql", import.meta.url), "utf8");
  const gf = readFileSync(new URL("../../../migrations/0006_gf.sql", import.meta.url), "utf8");
  await pg.exec(auth);
  await pg.exec(gf);
  await pg.exec(`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values
      ('ana', 'Ana', 'ana@test', false, now(), now()),
      ('bia', 'Bia', 'bia@test', false, now(), now())
  `);
  const exec: Exec = {
    query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
      const result = await pg.query(text, params);
      return result.rows as T[];
    },
  };
  return { pg, exec };
}

async function inTx<T>(pg: PGlite, fn: (exec: Exec) => Promise<T>): Promise<T> {
  return pg.transaction(async (tx) => {
    const exec: Exec = {
      query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
        const result = await tx.query(text, params);
        return result.rows as T[];
      },
    };
    return fn(exec);
  });
}

describe("garagem falida save", () => {
  it("o banco recusa a segunda campanha ativa da mesma conta", async () => {
    const { pg, exec } = await db();
    const first = await inTx(pg, (tx) => insertRun(tx, "ana", "Téo"));
    await assert.rejects(() => inTx(pg, (tx) => insertRun(tx, "ana", "Lia")), (err: unknown) => {
      assert.ok(err instanceof GfError);
      assert.equal(err.status, 409);
      return true;
    });
    const other = await pg.exec(
      `insert into gf_runs (id, account_id, status, seed, engine_version, content_version, state)
       values ('${randomUUID()}', 'ana', 'active', 1, '0.1.0', 'v1', '{}'::jsonb)`,
    ).then(
      () => false,
      (err: { code?: string }) => err.code === "23505",
    );
    assert.equal(other, true);
    assert.equal((await getActive(exec, "bia"))?.id ?? null, null);
    assert.equal((await getActive(exec, "ana"))?.id, first.id);
    await pg.close();
  });

  it("a mesma chave aplica a ação uma vez e devolve a mesma resposta", async () => {
    const { pg, exec } = await db();
    await inTx(pg, (tx) => insertRun(tx, "ana", "Téo"));
    const key = "ping-0001";
    const once = await inTx(pg, (tx) => applyRunAction(tx, "ana", { rev: 0, idempotencyKey: key, action: { type: "END_DAY" } }));
    const twice = await inTx(pg, (tx) => applyRunAction(tx, "ana", { rev: 0, idempotencyKey: key, action: { type: "END_DAY" } }));
    assert.deepEqual(twice, once);
    assert.equal(once.rev, 1);
    const active = await getActive(exec, "ana");
    assert.equal(active?.rev, 1);
    const log = await exec.query<{ n: number }>("select count(*)::int as n from gf_action_log");
    assert.equal(Number(log[0]?.n), 1);
    await pg.close();
  });

  it("uma revisão velha devolve 409 com o estado atual", async () => {
    const { pg } = await db();
    await inTx(pg, (tx) => insertRun(tx, "ana", "Téo"));
    await inTx(pg, (tx) => applyRunAction(tx, "ana", { rev: 0, idempotencyKey: "ping-0002", action: { type: "END_DAY" } }));
    await assert.rejects(
      () => inTx(pg, (tx) => applyRunAction(tx, "ana", { rev: 0, idempotencyKey: "ping-0003", action: { type: "END_DAY" } })),
      (err: unknown) => {
        assert.ok(err instanceof GfError);
        assert.equal(err.status, 409);
        assert.equal((err.body.run as { rev: number }).rev, 1);
        return true;
      },
    );
    await pg.close();
  });

  it("a resposta da api não leva hiddenType, mas o save guarda", async () => {
    const { pg, exec } = await db();
    const run = await inTx(pg, (tx) => insertRun(tx, "ana", "Téo"));
    assert.equal(JSON.stringify(run).includes("hiddenType"), false);
    await exec.query(
      `update gf_runs set state = jsonb_set(state, '{leads,0,hiddenType}', '"caloteiro"') where id = $1`,
      [run.id],
    );
    const view = await getActive(exec, "ana");
    assert.equal(JSON.stringify(view).includes("hiddenType"), false);
    const raw = await exec.query<{ state: { leads?: { hiddenType?: string }[] } }>("select state from gf_runs where id = $1", [run.id]);
    assert.equal(raw[0]?.state.leads?.[0]?.hiddenType, "caloteiro");
    await pg.close();
  });

  it("apagar encerra a campanha e libera outra", async () => {
    const { pg, exec } = await db();
    await inTx(pg, (tx) => insertRun(tx, "ana", "Téo"));
    await inTx(pg, (tx) => abandonRun(tx, "ana"));
    assert.equal(await getActive(exec, "ana"), null);
    const next = await inTx(pg, (tx) => insertRun(tx, "ana", "Lia"));
    assert.equal((next.state as { player: { name: string } }).player.name, "Lia");
    await pg.close();
  });

  it("corta a 11ª ação no mesmo segundo", () => {
    resetActionSlots();
    const now = 1_000;
    for (let i = 0; i < 10; i++) assert.equal(takeActionSlot("ana", now), true);
    assert.equal(takeActionSlot("ana", now), false);
    assert.equal(takeActionSlot("ana", now + 1000), true);
  });
});
