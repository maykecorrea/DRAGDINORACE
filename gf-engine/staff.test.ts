import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { contentV1 } from "./content.ts";
import { createInitialState } from "./initial.ts";
import { projection8w } from "./projection.ts";
import { successChance, workerSkill } from "./production.ts";
import { addRep } from "./reputation.ts";
import { chance } from "./rng.ts";
import { rollDisease, availableHires, weeklyAp } from "./staff.ts";
import { receiveBatch } from "./stock.ts";
import type { GameState, Job } from "./state.ts";

function seedFor(p: number, want: boolean): number {
  for (let seed = 1; seed < 200000; seed += 1) {
    const rng = { rngState: seed >>> 0 };
    if (chance(rng, p) === want) return seed;
  }
  throw new Error("sem semente");
}

function closeWeek(state: GameState): { state: GameState; events: { type: string; text?: string }[] } {
  let current = state;
  let events: { type: string; text?: string }[] = [];
  const week = current.calendar.week;
  while (current.calendar.week === week) {
    const step = applyAction(current, { type: "END_DAY" }, contentV1);
    current = step.state;
    events = step.events;
  }
  return { state: current, events };
}

describe("funcionários, ânimo e reputação", () => {
  it("contratar o Tico na semana 2 custa 180 na hora e 180 no domingo, e o PA sobe para 24", () => {
    let state = createInitialState(4, "Téo");
    assert.equal(weeklyAp(state, contentV1), 18);
    assert.equal(availableHires(state, contentV1).some((item) => item.id === "tico"), false);
    state.calendar.week = 2;
    state.cash = 5000;
    assert.deepEqual(availableHires(state, contentV1).map((item) => item.id), ["tico"]);
    state = applyAction(state, { type: "HIRE", employeeId: "tico" }, contentV1).state;
    assert.equal(state.cash, 4820);
    assert.equal(weeklyAp(state, contentV1), 24);
    assert.equal(state.employees[0]?.hiredWeek, 2);
    const closed = closeWeek(state);
    assert.equal(closed.state.history.at(-1)?.salaries, 180);
    assert.equal(closed.state.employees[0]?.owedWeeks, 0);
    assert.equal(closed.state.calendar.week, 3);
  });

  it("dois domingos sem caixa: o funcionário sai, a fama cai 5 e a rescisão vira dívida", () => {
    let state = createInitialState(5, "Téo");
    state.calendar.week = 2;
    state.cash = 1000;
    state = applyAction(state, { type: "HIRE", employeeId: "tico" }, contentV1).state;
    state.cash = -400;
    const first = closeWeek(state);
    state = first.state;
    assert.equal(state.employees[0]?.owedWeeks, 1);
    assert.equal(state.morale, 88.333);
    state.cash = -400;
    const second = closeWeek(state);
    assert.equal(second.state.employees.length, 0);
    assert.equal(second.state.rep, 15);
    const debt = second.state.debts.find((item) => item.template === "rescisao");
    assert.equal(debt?.balance, 360);
    assert.equal(contentV1.debtTemplates.rescisao?.group, "outras");
    assert.equal(debt?.weeklyBps, 0);
    assert.equal(second.events.some((event) => event.type === "QUIT"), true);
    const log = second.state.flags.repLog;
    assert.equal(Array.isArray(log) && log.some((entry) => "reason" in entry && entry.reason === "ajudante saiu por salário atrasado" && entry.delta === -5), true);
  });

  it("pagar o atrasado zera as semanas devidas", () => {
    let state = createInitialState(6, "Téo");
    state.calendar.week = 2;
    state.cash = 1000;
    state = applyAction(state, { type: "HIRE", employeeId: "tico" }, contentV1).state;
    state.cash = -400;
    state = closeWeek(state).state;
    state.cash = 5000;
    state = applyAction(state, { type: "PAY_WAGES", employeeId: "tico" }, contentV1).state;
    assert.equal(state.employees[0]?.owedWeeks, 0);
    assert.equal(state.cash, 4820);
  });

  it("o Zeca rouba em silêncio e a DRE mostra perdas de estoque", () => {
    let state = createInitialState(7, "Téo");
    state.calendar.week = 3;
    state.cash = 5000;
    state.inventory = {};
    receiveBatch(state, "oleo", { supplier: "ferro_velho", qty: 20, unitCost: 25, baseCost: 25, ageWeeks: 0, boughtWeek: 3 });
    state = applyAction(state, { type: "HIRE", employeeId: "zeca" }, contentV1).state;
    assert.equal(state.flags.irregular_zeca, true);
    assert.equal(state.cash, 4880);
    const closed = closeWeek(state);
    assert.equal(closed.state.inventory.oleo?.qty, 19);
    assert.equal(closed.state.history.at(-1)?.stockLoss, 25);
    const stolen = closed.state.flags.zecaStolen;
    assert.equal(Array.isArray(stolen) && stolen.length === 1 && "qty" in stolen[0]! && stolen[0].qty === 1, true);
    assert.equal(closed.events.some((event) => event.type === "THEFT" || event.type === "ZECA"), false);
  });

  it("Brasa no motor tem 75% e Téo tem 67%", () => {
    const state = createInitialState(8, "Téo");
    state.morale = 60;
    state.employees = [{ id: "brasa", hiredWeek: 6, salary: 450, skill: 3, apPerDay: 2, owedWeeks: 0 }];
    const job: Job = {
      id: "motor-1",
      leadId: "l",
      service: "motor",
      price: 750,
      depositPaid: 0,
      apNeeded: 4,
      apDone: 0,
      assignedTo: "brasa",
      dueWeek: 1,
      dueDay: 6,
      status: "in_progress",
      reworks: 0,
      materialSource: "casco_tech",
      qualityMod: 0,
    };
    assert.equal(successChance(contentV1, workerSkill(state, contentV1, job), 3, 0, 60).toFixed(2), "0.75");
    job.assignedTo = "teo";
    assert.equal(successChance(contentV1, workerSkill(state, contentV1, job), 3, 0, 60).toFixed(2), "0.67");
  });

  it("a projeção de 8 semanas só existe com a contadora e segue o caixa sem receita nova", () => {
    const base = createInitialState(9, "Téo");
    base.cash = 20000;
    base.debts = [];
    base.employees = [{ id: "ambar", hiredWeek: 8, salary: 260, skill: 0, apPerDay: 0, owedWeeks: 0 }];
    base.flags.accountant = true;
    base.receivables = [
      {
        id: "rec-conhecido",
        jobId: "j",
        value: 500,
        dueWeek: 0,
        dueDay: 1,
        caloteRolled: false,
        status: "open",
        clientType: "vizinho",
        sure: true,
      },
    ];
    assert.equal(projection8w({ ...base, flags: { ...base.flags, accountant: false } }, contentV1), null);
    const projected = projection8w(base, contentV1);
    assert.ok(projected);
    assert.equal(projected?.length, 8);
    let sim = structuredClone(base);
    const cash: number[] = [];
    for (let week = 0; week < 8; week += 1) {
      for (let day = 0; day < 7; day += 1) sim = applyAction(sim, { type: "END_DAY" }, contentV1).state;
      cash.push(sim.cash);
    }
    assert.deepEqual(projected?.map((row) => row.cash), cash);
    const dry = structuredClone(base);
    dry.receivables = [];
    let bare = dry;
    for (let week = 0; week < 8; week += 1) {
      for (let day = 0; day < 7; day += 1) bare = applyAction(bare, { type: "END_DAY" }, contentV1).state;
    }
    assert.ok(sim.cash > bare.cash);
  });

  it("a fama não passa do teto do nível", () => {
    const state = createInitialState(10, "Téo");
    state.rep = 39;
    addRep(state, contentV1, 8, "teste");
    assert.equal(state.rep, 40);
    state.garage.level = 5;
    state.rep = 100;
    addRep(state, contentV1, 5, "teto");
    assert.equal(state.rep, 100);
    state.rep = 0;
    for (let i = 0; i < 25; i += 1) addRep(state, contentV1, 1, "entrega no prazo");
    const log = state.flags.repLog;
    assert.equal(Array.isArray(log) && log.length === 20, true);
  });

  it("o curso do Tico custa 300 e a habilidade sobe depois de 8 semanas", () => {
    let state = createInitialState(11, "Téo");
    state.calendar.week = 2;
    state.cash = 100000;
    state = applyAction(state, { type: "HIRE", employeeId: "tico" }, contentV1).state;
    state = applyAction(state, { type: "TRAIN", employeeId: "tico" }, contentV1).state;
    assert.equal(state.flags.ticoReadyWeek, 10);
    assert.equal(state.employees[0]?.skill, 1);
    while (state.calendar.week < 10) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.employees.find((item) => item.id === "tico")?.skill, 2);
  });

  it("doença a partir da semana 12 tira o PA da semana e o salário continua", () => {
    const quiet = createInitialState(12, "Téo");
    quiet.calendar.week = 11;
    quiet.employees = [{ id: "tico", hiredWeek: 2, salary: 180, skill: 1, apPerDay: 1, owedWeeks: 0 }];
    const seed = quiet.rngState;
    rollDisease(quiet, []);
    assert.equal(quiet.employees[0]?.sickUntilWeek, undefined);
    assert.equal(quiet.rngState, seed);

    const sick = createInitialState(13, "Téo");
    sick.calendar.week = 12;
    sick.cash = 5000;
    sick.employees = [{ id: "tico", hiredWeek: 2, salary: 180, skill: 1, apPerDay: 1, owedWeeks: 0 }];
    sick.rngState = seedFor(0.05, true);
    const events: { type: string }[] = [];
    rollDisease(sick, events);
    assert.equal(events[0]?.type, "DOENCA");
    assert.equal(sick.employees[0]?.sickUntilWeek, 13);
    sick.jobs = [
      {
        id: "oleo-1",
        leadId: "l",
        service: "oleo",
        price: 110,
        depositPaid: 0,
        apNeeded: 1,
        apDone: 0,
        assignedTo: "tico",
        dueWeek: 14,
        dueDay: 6,
        status: "in_progress",
        reworks: 0,
        materialSource: "ferro_velho",
        qualityMod: 0,
      },
    ];
    sick.calendar.day = 6;
    const closed = closeWeek(sick);
    assert.equal(closed.state.jobs[0]?.apDone, 0);
    assert.equal(closed.state.history.at(-1)?.salaries, 180);
  });

  it("a equipe gasta o próprio PA e a demissão custa dois salários e ânimo", () => {
    let state = createInitialState(14, "Téo");
    state.morale = 60;
    state.cash = 5000;
    state.employees = [{ id: "brasa", hiredWeek: 6, salary: 450, skill: 3, apPerDay: 2, owedWeeks: 0 }];
    state.jobs = [
      {
        id: "motor-1",
        leadId: "l",
        service: "motor",
        price: 750,
        depositPaid: 0,
        apNeeded: 1,
        apDone: 0,
        assignedTo: "brasa",
        dueWeek: 2,
        dueDay: 6,
        status: "in_progress",
        reworks: 0,
        materialSource: "casco_tech",
        qualityMod: 0,
      },
    ];
    state.rngState = seedFor(0.75, true);
    const worked = applyAction(state, { type: "END_DAY" }, contentV1);
    assert.equal(worked.state.jobs[0]?.status, "ready");
    assert.equal(worked.state.calendar.apWorkedThisWeek, 0);
    assert.equal(worked.events.some((event) => event.type === "JOB_READY"), true);
    const fired = applyAction(worked.state, { type: "FIRE", employeeId: "brasa" }, contentV1).state;
    assert.equal(fired.employees.length, 0);
    assert.equal(fired.cash, worked.state.cash - 900);
    assert.equal(fired.morale, 88.333);
    assert.equal(fired.jobs[0]?.assignedTo, "teo");
  });
});
