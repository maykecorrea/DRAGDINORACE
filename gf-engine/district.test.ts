import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { contentV1 } from "./content.ts";
import { here, travelCost } from "./district.ts";
import { GameError } from "./errors.ts";
import { createInitialState } from "./initial.ts";
import { promoteJobs } from "./production.ts";
import type { Job } from "./state.ts";

function job(): Job {
  return {
    id: "a",
    leadId: "lead",
    service: "reparo",
    price: 180,
    depositPaid: 0,
    apNeeded: 1,
    apDone: 0,
    assignedTo: "teo",
    dueWeek: 0,
    dueDay: 6,
    status: "in_progress",
    reworks: 0,
    materialSource: "ferro_velho",
  };
}

describe("mapa da cidade", () => {
  it("sem bandeira Téo está na oficina e a compra antiga continua válida", () => {
    const state = createInitialState(3, "Téo");
    assert.equal(state.flags.district, undefined);
    assert.equal(here(state), "oficina");
    const bought = applyAction(state, { type: "BUY", supplier: "ferro_velho", material: "kit", qty: 1 }, contentV1);
    assert.equal(bought.events.some((event) => event.type === "BOUGHT"), true);
  });

  it("a ida gasta PA, a volta gasta de novo, e o mesmo lugar é de graça", () => {
    const state = createInitialState(4, "Téo");
    const ap = state.calendar.apLeft;
    const worked = state.calendar.apWorkedThisWeek;
    assert.equal(travelCost("oficina", "megaosso"), 2);
    assert.equal(travelCost("megaosso", "oficina"), 2);
    assert.equal(travelCost("casco_tech", "casco_tech"), 0);
    const dry = structuredClone(state);
    dry.calendar.apLeft = 0;
    assert.throws(
      () => applyAction(dry, { type: "TRAVEL", place: "casco_tech" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "sem_pa",
    );
    assert.throws(
      () => applyAction(state, { type: "TRAVEL", place: "inferno" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "lugar_invalido",
    );
    const ready = applyAction(state, { type: "WAIT", minutes: 120 }, contentV1).state;
    const gone = applyAction(ready, { type: "TRAVEL", place: "casco_tech" }, contentV1);
    assert.equal(gone.state.flags.district, "casco_tech");
    assert.equal(gone.state.calendar.apLeft, ap - 1);
    assert.equal(gone.state.calendar.apWorkedThisWeek, worked);
    assert.equal(gone.events.some((event) => event.type === "TRAVELED" && event.amount === 1), true);
    const stay = applyAction(gone.state, { type: "TRAVEL", place: "casco_tech" }, contentV1);
    assert.equal(stay.state.calendar.apLeft, ap - 1);
    const back = applyAction(stay.state, { type: "TRAVEL", place: "oficina" }, contentV1);
    assert.equal(back.state.flags.district, "oficina");
    assert.equal(back.state.calendar.apLeft, ap - 2);
  });

  it("a Megaosso fica a 2 PA e dormir na cidade não traz Téo de volta", () => {
    const state = createInitialState(5, "Téo");
    const open = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    const gone = applyAction(open, { type: "TRAVEL", place: "megaosso" }, contentV1).state;
    assert.equal(gone.calendar.apLeft, open.calendar.apLeft - 2);
    const slept = applyAction(gone, { type: "END_DAY" }, contentV1).state;
    assert.equal(slept.flags.district, "megaosso");
    assert.equal(slept.calendar.day, 2);
  });

  it("o balcão só vende se Téo está nele, e o reparo espera a oficina", () => {
    const state = createInitialState(6, "Téo");
    const open = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    const away = applyAction(open, { type: "TRAVEL", place: "ferro_velho" }, contentV1).state;
    assert.throws(
      () => applyAction(away, { type: "BUY", supplier: "casco_tech", items: [{ material: "kit", qty: 1 }], terms: "cash" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "longe_da_loja",
    );
    const bought = applyAction(away, { type: "BUY", supplier: "ferro_velho", material: "kit", qty: 1 }, contentV1);
    assert.equal(bought.events.some((event) => event.type === "BOUGHT"), true);
    const bench = bought.state;
    bench.jobs = [job()];
    promoteJobs(bench, contentV1);
    assert.throws(
      () => applyAction(bench, { type: "WORK_JOB", jobId: "a" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "fora_da_oficina",
    );
    const home = applyAction(bench, { type: "TRAVEL", place: "oficina" }, contentV1).state;
    const worked = applyAction(home, { type: "WORK_JOB", jobId: "a" }, contentV1);
    assert.equal(worked.events.some((event) => event.type === "JOB_READY" || event.type === "JOB_WORKED" || event.type === "JOB_FAILED"), true);
  });
});
