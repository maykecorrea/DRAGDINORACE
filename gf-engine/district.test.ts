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

  it("andar gasta minutos e não PA, e loja fechada não deixa sair", () => {
    const state = createInitialState(4, "Téo");
    const ap = state.calendar.apLeft;
    assert.equal(travelCost("oficina", "megaosso"), 2);
    assert.equal(travelCost("casco_tech", "casco_tech"), 0);
    const early = structuredClone(state);
    early.calendar.apLeft = 0;
    assert.throws(
      () => applyAction(early, { type: "TRAVEL", place: "casco_tech" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "fechado",
    );
    assert.equal(early.clock.t, state.clock.t);
    assert.throws(
      () => applyAction(state, { type: "TRAVEL", place: "inferno" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "lugar_invalido",
    );
    assert.throws(
      () => applyAction(state, { type: "TRAVEL", place: "leilao" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "trancado",
    );
    assert.equal(state.calendar.apLeft, ap);
    const ready = applyAction(state, { type: "WAIT", minutes: 120 }, contentV1).state;
    const broke = structuredClone(ready);
    broke.calendar.apLeft = 0;
    const walked = applyAction(broke, { type: "TRAVEL", place: "casco_tech" }, contentV1);
    assert.equal(walked.state.flags.district, "casco_tech");
    assert.equal(walked.state.calendar.apLeft, 0);
    assert.ok(walked.state.clock.t > ready.clock.t);
    assert.equal(walked.events.some((event) => event.type === "TRAVELED" && event.amount === 0), true);
    const stay = applyAction(walked.state, { type: "TRAVEL", place: "casco_tech" }, contentV1);
    assert.equal(stay.state.clock.t, walked.state.clock.t);
    const back = applyAction(stay.state, { type: "TRAVEL", place: "oficina" }, contentV1);
    assert.equal(back.state.flags.district, "oficina");
    assert.equal(back.state.calendar.apLeft, 0);
  });

  it("comprar de madrugada não passa: o horário vale na hora da compra", () => {
    const state = createInitialState(7, "Téo");
    const open = applyAction(state, { type: "WAIT", minutes: 90 }, contentV1).state;
    const there = applyAction(open, { type: "TRAVEL", place: "ferro_velho" }, contentV1).state;
    const bought = applyAction(there, { type: "BUY", supplier: "ferro_velho", material: "kit", qty: 1 }, contentV1);
    assert.equal(bought.events.some((event) => event.type === "BOUGHT"), true);
    const late = structuredClone(bought.state);
    late.clock.t = late.clock.t - (late.clock.t % 1440) + 18 * 60;
    assert.throws(
      () => applyAction(late, { type: "BUY", supplier: "ferro_velho", material: "kit", qty: 1 }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "fechado",
    );
  });

  it("dormir na cidade traz Téo para a oficina", () => {
    const state = createInitialState(5, "Téo");
    const open = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    const gone = applyAction(open, { type: "TRAVEL", place: "megaosso" }, contentV1).state;
    assert.equal(gone.calendar.apLeft, open.calendar.apLeft);
    const slept = applyAction(gone, { type: "END_DAY" }, contentV1).state;
    assert.equal(slept.flags.district, "oficina");
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

  it("a pechincha de +3 e −2 só vale na casa do cliente", () => {
    const state = createInitialState(8, "Téo");
    state.cash = 4000;
    state.leads = [{
      id: "pech",
      apparentType: "pechincheiro",
      service: "oleo",
      refPrice: 100,
      deadlineDays: 4,
      quotes: ["Tira um pouco."],
      expiresDay: 40,
      status: "counter",
      counterPrice: 70,
      proposal: { price: 100, depositPct: 0, deadline: 4 },
    }];
    assert.throws(
      () => applyAction(state, { type: "NUDGE_COUNTER", leadId: "pech", dir: 3 }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "longe",
    );
    const open = applyAction(state, { type: "WAIT", minutes: 90 }, contentV1).state;
    const there = applyAction(open, { type: "TRAVEL", place: "ferro_velho" }, contentV1).state;
    const up = applyAction(there, { type: "NUDGE_COUNTER", leadId: "pech", dir: 3 }, contentV1);
    assert.equal(up.state.leads[0]?.counterPrice, 72);
    assert.equal(up.events.some((event) => event.type === "COUNTER_OFFER" && event.text === "subiu"), true);
    const down = applyAction(up.state, { type: "NUDGE_COUNTER", leadId: "pech", dir: -2 }, contentV1);
    assert.equal(down.events.some((event) => event.type === "PROPOSAL_ACCEPTED"), true);
    assert.equal(down.state.jobs[0]?.price, Math.round(72 * 0.98));
  });

  it("o modo de teste desliga quando GF_DEBUG é 0", () => {
    const prev = process.env.GF_DEBUG;
    process.env.GF_DEBUG = "0";
    try {
      const state = createInitialState(2, "Téo");
      assert.throws(
        () => applyAction(state, { type: "DEBUG", op: "week", week: 2 }, contentV1),
        (err: unknown) => err instanceof GameError && err.code === "debug",
      );
    } finally {
      if (prev == null) delete process.env.GF_DEBUG;
      else process.env.GF_DEBUG = prev;
    }
  });

  it("tratar no hospital cura a doença da ficha e o remédio da mochila zera o preço", () => {
    const state = createInitialState(9, "Téo");
    state.cash = 200;
    state.flags.disease = "dz_resfriado";
    const open = applyAction(state, { type: "WAIT", minutes: 30 }, contentV1).state;
    const hospital = applyAction(open, { type: "TRAVEL", place: "hospital" }, contentV1).state;
    const paid = applyAction(hospital, { type: "TREAT", illness: "dz_resfriado" }, contentV1);
    assert.equal(paid.state.flags.disease, undefined);
    assert.equal(paid.state.cash, hospital.cash - 12);
    assert.equal(paid.events.some((event) => event.type === "TREATED" && event.text === "Resfriado"), true);
    const again = structuredClone(paid.state);
    again.flags.disease = "dz_resfriado";
    again.flags.meds = "rx_espirro_zero:1";
    const cash = again.cash;
    const free = applyAction(again, { type: "TREAT", illness: "dz_resfriado" }, contentV1);
    assert.equal(free.state.cash, cash);
    assert.equal(free.state.flags.disease, undefined);
    assert.equal(free.state.flags.meds ?? "", "");
  });

  it("a carga da semana 6 só descarrega em casa", () => {
    const state = createInitialState(11, "Téo");
    state.cash = 2000;
    state.calendar.week = 5;
    state.clock.t = 5 * 10080 + 8 * 60;
    const away = applyAction(state, { type: "TRAVEL", place: "praca" }, contentV1).state;
    away.inbound = [{
      id: "box",
      supplier: "megaosso",
      items: [{ material: "kit", qty: 1, unitCost: 10 }],
      atWeek: 5,
      atDay: 1,
      fromT: away.clock.t - 60,
    }];
    const held = applyAction(away, { type: "SET_SPEED", speed: 1 }, contentV1);
    assert.equal(held.events.some((event) => event.type === "MATERIALS_ARRIVED"), false);
    assert.equal(held.state.inbound?.length, 1);
    const home = applyAction(held.state, { type: "TRAVEL", place: "oficina" }, contentV1);
    assert.equal(home.state.flags.district, "oficina");
    assert.equal(home.events.some((event) => event.type === "MATERIALS_ARRIVED"), true);
    assert.equal(home.state.inbound?.length ?? 0, 0);
  });

  it("entregar o carro só vale na oficina", () => {
    const state = createInitialState(12, "Téo");
    state.cash = 500;
    const open = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    const away = applyAction(open, { type: "TRAVEL", place: "praca" }, contentV1).state;
    away.jobs = [{
      ...job(),
      status: "ready",
      apDone: 1,
      dueWeek: 0,
      dueDay: 7,
    }];
    assert.throws(
      () => applyAction(away, { type: "DELIVER", jobId: "a" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "longe",
    );
  });

  it("a Dona Brasa da semana 6 só entra na oficina", () => {
    const state = createInitialState(13, "Téo");
    state.cash = 5000;
    state.rep = 30;
    state.calendar.week = 6;
    const open = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    const away = applyAction(open, { type: "TRAVEL", place: "praca" }, contentV1).state;
    assert.throws(
      () => applyAction(away, { type: "HIRE", employeeId: "brasa" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "longe",
    );
    const home = applyAction(away, { type: "TRAVEL", place: "oficina" }, contentV1).state;
    const hired = applyAction(home, { type: "HIRE", employeeId: "brasa" }, contentV1);
    assert.equal(hired.events.some((event) => event.type === "HIRED" && event.text === "brasa"), true);
  });
});
