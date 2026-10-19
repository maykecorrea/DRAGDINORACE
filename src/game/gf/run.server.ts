import { getSql, withTransaction } from "@/lib/db";
import { GfError } from "./errors.ts";
import { takeActionSlot } from "./limit.ts";
import { abandonRun, applyRunAction, cleanName, getActive, historyOf, insertRun, listUnlocks, type ActionResult, type RunView } from "./service.ts";

export type { ActionResult, RunView };

export const gfRunService = {
  getActive(accountId: string) {
    return getSql().then((sql) => getActive(sql, accountId));
  },
  create(accountId: string, playerName: unknown) {
    const name = cleanName(playerName);
    return withTransaction((sql) => insertRun(sql, accountId, name));
  },
  abandon(accountId: string) {
    return withTransaction((sql) => abandonRun(sql, accountId));
  },
  applyAction(accountId: string, input: { rev: unknown; idempotencyKey: unknown; action: unknown }) {
    if (!takeActionSlot(accountId)) throw new GfError(429, "Calma. Dez ações por segundo.");
    return withTransaction((sql) => applyRunAction(sql, accountId, input));
  },
  history(accountId: string) {
    return getSql().then((sql) => historyOf(sql, accountId));
  },
  unlocks(accountId: string) {
    return getSql().then((sql) => listUnlocks(sql, accountId));
  },
};
