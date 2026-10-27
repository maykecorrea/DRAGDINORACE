import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { contentV1 } from "./content.ts";
import { GameError } from "./errors.ts";
import { createInitialState } from "./initial.ts";
import { canStart, cheapestSupplierFor, missingMaterials, promoteJobs, successChance } from "./production.ts";
import { chance } from "./rng.ts";
import { oxidizeStock, receiveBatch } from "./stock.ts";
import type { GameState, Job, MaterialId, SupplierId } from "./state.ts";

function seedFor(p: number, want: boolean): number {
  for (let seed = 1; seed < 200000; seed += 1) {
    const rng = { rngState: seed >>> 0 };
    if (chance(rng, p) === want) return seed;
  }
  throw new Error("sem semente");
}

function reparo(id: string, service: Job["service"] = "reparo"): Job {
  return {
    id,
    leadId: "lead",
    service,
    price: 180,
    depositPaid: 0,
    apNeeded: service === "reparo" ? 1 : 2,
    apDone: 0,
    assignedTo: "teo",
    dueWeek: 0,
    dueDay: 6,
    status: "waiting_materials",
    reworks: 0,
    materialSource: "ferro_velho",
  };
}

function put(state: GameState, supplier: SupplierId, material: MaterialId, qty: number, cost: number): void {
  receiveBatch(state, material, { supplier, qty, unitCost: cost, baseCost: cost, ageWeeks: 0, boughtWeek: 0 });
}

describe("produção e estoque", () => {
  it("reparo da Casco consome 46 e tem 83% com skill 2 e ânimo 60", () => {
    const state = createInitialState(1, "Téo");
    delete state.inventory.kit;
    delete state.inventory.oleo;
    put(state, "casco_tech", "kit", 1, 18);
    put(state, "casco_tech", "oleo", 1, 28);
    const job = reparo("casco");
    state.jobs = [job];
    promoteJobs(state, contentV1);
    assert.equal(job.status, "in_progress");
    assert.equal(job.materialCost, 46);
    assert.equal(job.qualityMod, 0);
    assert.equal(state.flags.materialsWeek, 46);
    assert.equal(successChance(contentV1, 2, 1, 0, 60).toFixed(2), "0.83");
  });

  it("Ferro-Velho cai para 73% e o Rato tem 30% de defeito e 63% no resto", () => {
    const ferro = createInitialState(2, "Téo");
    const ferroJob = reparo("ferro");
    ferro.jobs = [ferroJob];
    promoteJobs(ferro, contentV1);
    assert.equal(ferroJob.materialCost, 40);
    assert.equal(ferroJob.qualityMod, -0.1);
    assert.equal(successChance(contentV1, 2, 1, ferroJob.qualityMod ?? 0, 60).toFixed(2), "0.73");

    const rato = createInitialState(3, "Téo");
    delete rato.inventory.kit;
    delete rato.inventory.oleo;
    put(rato, "rato", "kit", 2, 8);
    put(rato, "rato", "oleo", 2, 12);
    const ratoJob = reparo("rato");
    rato.jobs = [ratoJob];
    promoteJobs(rato, contentV1);
    assert.equal(ratoJob.qualityMod, -0.2);
    assert.equal(ratoJob.usedRato, true);
    assert.equal(successChance(contentV1, 2, 1, -0.2, 60).toFixed(2), "0.63");
    assert.equal(contentV1.suppliers.find((item) => item.id === "rato")?.defect, 0.3);
    rato.rngState = seedFor(0.3, true);
    const failed = applyAction(rato, { type: "WORK_JOB", jobId: "rato" }, contentV1);
    assert.equal(failed.events.some((event) => event.type === "JOB_FAILED"), true);
    assert.equal(failed.state.jobs[0]?.reworks, 1);
    assert.notEqual(failed.state.jobs[0]?.status, "ready");
  });

  it("com 1 baia o segundo serviço espera o primeiro ficar pronto", () => {
    const state = createInitialState(4, "Téo");
    state.garage.bays = 1;
    const first = reparo("a");
    const second = reparo("b");
    state.jobs = [first, second];
    promoteJobs(state, contentV1);
    assert.equal(first.status, "in_progress");
    assert.equal(second.status, "queued");
    assert.equal(canStart(state, contentV1, second), false);
    const odds = successChance(contentV1, 2, 1, first.qualityMod ?? 0, state.morale);
    state.rngState = seedFor(odds, true);
    const done = applyAction(state, { type: "WORK_JOB", jobId: "a" }, contentV1).state;
    assert.equal(done.jobs.find((job) => job.id === "a")?.status, "ready");
    assert.equal(done.jobs.find((job) => job.id === "b")?.status, "in_progress");
  });

  it("a Megaosso recusa abaixo do mínimo e o 3x soma 8%", () => {
    const state = createInitialState(5, "Téo");
    const cash = state.cash;
    assert.throws(
      () => applyAction(state, { type: "BUY", supplier: "megaosso", items: [{ material: "kit", qty: 19 }], terms: "cash" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "pedido_minimo",
    );
    const bought = applyAction(state, { type: "BUY", supplier: "megaosso", items: [{ material: "kit", qty: 20 }], terms: "3x" }, contentV1).state;
    const debt = bought.debts.find((item) => item.id.startsWith("parcelado-"));
    const total = Math.round(20 * 13 * 1.08);
    assert.equal(debt?.balance, total);
    assert.equal(debt?.principal, total);
    assert.equal(debt?.weeklyBps, 0);
    assert.equal(debt?.installmentsLeft, 3);
    assert.equal(debt?.pricePayment, Math.ceil(total / 3));
    assert.equal(bought.cash, cash);
    assert.equal(bought.inventory.kit?.qty, 4);
    assert.equal(bought.inbound?.length, 1);
  });

  it("o prazo da Casco exige nome limpo, fama e o teto de 2.000", () => {
    let state = createInitialState(6, "Téo");
    assert.throws(
      () => applyAction(state, { type: "BUY", supplier: "casco_tech", items: [{ material: "kit", qty: 1 }], terms: "prazo14" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "prazo_recusado",
    );
    state = createInitialState(6, "Téo");
    state.rep = 30;
    state.flags.negativado = true;
    assert.throws(
      () => applyAction(state, { type: "BUY", supplier: "casco_tech", items: [{ material: "kit", qty: 1 }], terms: "prazo14" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "prazo_recusado",
    );
    state.flags.negativado = false;
    const cash = state.cash;
    const bought = applyAction(state, { type: "BUY", supplier: "casco_tech", items: [{ material: "kit", qty: 10 }], terms: "prazo14" }, contentV1).state;
    const debt = bought.debts.find((item) => item.id.startsWith("casco-"));
    assert.equal(bought.cash, cash);
    assert.equal(debt?.balance, 180);
    assert.equal(debt?.template, "fornecedor_casco");
    assert.equal(debt?.dueWeek, 2);
    assert.throws(
      () => applyAction(bought, { type: "BUY", supplier: "casco_tech", items: [{ material: "kit", qty: 50 }], terms: "prazo14" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "prazo_recusado",
    );
  });

  it("a batida só sai a partir da 3ª compra no Rato e leva o estoque dele", () => {
    const state = createInitialState(7, "Téo");
    state.rngState = seedFor(0.1, true);
    const seed = state.rngState;
    const cash = state.cash;
    let next = applyAction(state, { type: "BUY", supplier: "rato", items: [{ material: "kit", qty: 1 }], terms: "cash" }, contentV1).state;
    next = applyAction(next, { type: "BUY", supplier: "rato", items: [{ material: "kit", qty: 1 }], terms: "cash" }, contentV1).state;
    assert.equal(next.rngState, seed);
    assert.equal(next.flags.irregular_rato, undefined);
    assert.equal(next.inventory.kit?.qty, 6);
    const raided = applyAction(next, { type: "BUY", supplier: "rato", items: [{ material: "kit", qty: 1 }], terms: "cash" }, contentV1);
    assert.equal(raided.events.some((event) => event.type === "RAID"), true);
    assert.equal(raided.state.flags.irregular_rato, true);
    assert.equal(raided.state.inventory.kit?.qty, 4);
    assert.equal(raided.state.inventory.kit?.source.rato, undefined);
    assert.equal(raided.state.cash, cash - 24 - 1500);
    assert.equal(raided.state.rep, 5);
    assert.equal(raided.state.flags.ratoPurchases, 3);
  });

  it("chapa com 6 semanas vale 4% menos e óleo não oxida", () => {
    const state = createInitialState(8, "Téo");
    for (let i = 0; i < 6; i += 1) oxidizeStock(state, contentV1);
    const chapa = state.inventory.chapa?.batches?.[0];
    assert.equal(chapa?.ageWeeks, 6);
    assert.equal(chapa?.unitCost, Math.round(35 * (1 - 0.02 * 2)));
    assert.equal(state.inventory.chapa?.avgCost, 34);
    const oleo = state.inventory.oleo?.batches?.[0];
    assert.equal(oleo?.ageWeeks, 6);
    assert.equal(oleo?.unitCost, 25);
    assert.equal(state.flags.stockRotting, true);
  });

  it("em 4 semanas o CMV da DRE é a soma do material consumido", () => {
    let state = createInitialState(9, "Téo");
    state.cash = 20000;
    state.flags.xp = 250;
    for (let i = 0; i < 3; i += 1) state = applyAction(state, { type: "WORK", jobId: "reparo" }, contentV1).state;
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    state = applyAction(state, { type: "WORK", jobId: "reparo" }, contentV1).state;
    let guard = 0;
    while (state.history.length < 4 && guard < 40) {
      state = applyAction(state, { type: "END_DAY" }, contentV1).state;
      guard += 1;
    }
    const cmv = state.history.reduce((sum, week) => sum + week.materials, 0);
    assert.equal(state.history.length, 4);
    assert.equal(cmv, 160);
    assert.equal(state.history[0]?.materials, 160);
    assert.equal(state.inventory.kit?.qty ?? 0, 0);
    assert.equal(state.inventory.oleo?.qty ?? 0, 0);
  });

  it("compra à vista chega no dia seguinte e a sucata sai a 40%", () => {
    let state = createInitialState(10, "Téo");
    const oleo = state.inventory.oleo?.qty ?? 0;
    const bought = applyAction(state, { type: "BUY", material: "oleo", qty: 4 }, contentV1);
    assert.equal(bought.state.inventory.oleo?.qty, oleo);
    assert.equal(bought.state.cash, state.cash - 100);
    assert.equal(bought.events.some((event) => event.type === "BOUGHT" && event.text === "amanha"), true);
    const morning = applyAction(bought.state, { type: "END_DAY" }, contentV1);
    assert.equal(morning.state.inventory.oleo?.qty, oleo + 4);
    assert.equal(morning.events.some((event) => event.type === "MATERIALS_ARRIVED"), true);

    const scrap = applyAction(morning.state, { type: "SELL_SCRAP", material: "chapa", qty: 1 }, contentV1).state;
    assert.equal(scrap.inventory.chapa?.qty, 1);
    assert.equal(scrap.cash - morning.state.cash, Math.round(35 * 0.4));
  });

  it("funilaria sem compressor não começa, e o motor exige o nível", () => {
    const state = createInitialState(11, "Téo");
    const motor = reparo("mot", "motor");
    state.jobs = [motor];
    promoteJobs(state, contentV1);
    assert.equal(motor.status, "waiting_materials");
    state.garage.level = 2;
    promoteJobs(state, contentV1);
    assert.equal(motor.status, "waiting_materials");
    assert.ok(missingMaterials(state, contentV1, motor).length > 0);

    state.jobs = [];
    state.garage.hasCompressor = false;
    const body = reparo("funi", "funilaria");
    state.jobs = [body];
    promoteJobs(state, contentV1);
    assert.equal(body.status, "waiting_materials");
    assert.equal(missingMaterials(state, contentV1, body).length, 0);
    state.garage.hasCompressor = true;
    promoteJobs(state, contentV1);
    assert.equal(body.status, "in_progress");
    assert.equal(cheapestSupplierFor("kit", 1, state, contentV1), "rato");
    assert.equal(cheapestSupplierFor("bobina", 1, state, contentV1), "rato");
  });
});
