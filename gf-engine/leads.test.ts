import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { contentV1 } from "./balance.ts";
import { acceptanceChance, generateWeekLeads, leadCount, quotePreview, redactState, settleReceivable } from "./contracts.ts";
import { bookReceipt } from "./finance.ts";
import { createInitialState } from "./initial.ts";
import { chance } from "./rng.ts";
import type { GameState, Job, Receivable } from "./state.ts";

function seedFor(p: number, want: boolean): number {
  for (let seed = 1; seed < 20000; seed += 1) {
    const rng = { rngState: seed >>> 0 };
    if (chance(rng, p) === want) return seed >>> 0;
  }
  throw new Error("sem semente");
}

function readyJob(over: Partial<Job>): Job {
  return {
    id: "job-1",
    leadId: "lead-1",
    service: "oleo",
    price: 110,
    depositPaid: 0,
    apNeeded: 1,
    apDone: 1,
    assignedTo: "teo",
    dueWeek: 0,
    dueDay: 1,
    status: "ready",
    reworks: 0,
    materialSource: "ferro_velho",
    clientType: "vizinho",
    payment: "entrega",
    ...over,
  };
}

describe("clientes e contratos", () => {
  it("com rep 20 e nível 0 saem 5 leads; com 2 prospecções, 9", () => {
    assert.equal(leadCount(20, 0, 0, contentV1), 5);
    assert.equal(leadCount(20, 0, 2, contentV1), 9);
    const plain = createInitialState(8, "Téo");
    plain.leads = [];
    plain.rep = 20;
    plain.garage.level = 0;
    generateWeekLeads(plain, contentV1, 1);
    assert.equal(plain.leads.length, 5);
    assert.ok(plain.leads.filter((lead) => lead.appearDay === 1).length >= 2);
    const sought = createInitialState(8, "Téo");
    sought.leads = [];
    sought.flags.prospectsQueued = 2;
    generateWeekLeads(sought, contentV1, 2);
    assert.equal(sought.leads.length, 9);
    assert.equal(sought.flags.prospectsQueued, 0);
  });

  it("a chance de aceitar bate 0,83 no preço cheio e 0,51 com 20% a mais", () => {
    const even = acceptanceChance(contentV1, 2, 20, 100, 100, 0);
    const high = acceptanceChance(contentV1, 2, 20, 120, 100, 0);
    assert.equal(Number(even.toFixed(2)), 0.83);
    assert.equal(Number(high.toFixed(2)), 0.51);
  });

  it("o json redigido não contém a chave hiddenType", () => {
    const state = createInitialState(3, "Téo");
    state.leads[0]!.hiddenType = "caloteiro";
    state.leads[0]!.ficha = "caloteiro";
    state.jobs.push(readyJob({ clientType: "caloteiro" }));
    (state.jobs[0] as Job & { hiddenType?: string }).hiddenType = "caloteiro";
    const secret = JSON.stringify(state);
    assert.equal(secret.includes("hiddenType"), true);
    assert.equal(secret.includes("caloteiro"), true);
    const shown = JSON.stringify(redactState(state));
    assert.equal(shown.includes("hiddenType"), false);
    assert.equal(shown.includes("caloteiro"), false);
    assert.equal(JSON.stringify(state).includes("hiddenType"), true);
    const events = redactState([{ type: "DEFAULT", text: "caloteiro", amount: 80 }]);
    assert.equal(JSON.stringify(events).includes("caloteiro"), false);
    assert.equal(events[0]?.amount, 80);
  });

  it("caloteiro sem sinal perde o material; com 50% perde no máximo a metade", () => {
    const price = 110;
    const bare = createInitialState(1, "Téo");
    const cost = bare.inventory.oleo?.avgCost ?? 0;
    const cash = bare.cash;
    bare.inventory.oleo!.qty -= 1;
    const owed: Receivable = {
      id: "r-0",
      jobId: "j",
      value: price,
      dueWeek: 0,
      dueDay: 1,
      caloteRolled: false,
      status: "open",
      clientType: "caloteiro",
    };
    settleReceivable(bare, contentV1, owed, [], "default");
    assert.equal(owed.status, "defaulted");
    assert.equal(bare.cash, cash);
    assert.equal(cost - (bare.cash - cash), cost);

    const hedged = createInitialState(1, "Téo");
    const deposit = Math.round(price * 0.5);
    bookReceipt(hedged, deposit, deposit, 0);
    hedged.inventory.oleo!.qty -= 1;
    const rest: Receivable = {
      id: "r-1",
      jobId: "j",
      value: price - deposit,
      dueWeek: 0,
      dueDay: 1,
      caloteRolled: false,
      status: "open",
      clientType: "caloteiro",
    };
    settleReceivable(hedged, contentV1, rest, [], "default");
    const gained = hedged.cash - cash;
    assert.equal(gained, deposit);
    assert.ok(rest.value <= price / 2);
    assert.ok(cost - gained <= price / 2);
  });

  it("a frota deixa o caixa negativo enquanto a receita já existe, e paga quatro semanas depois", () => {
    let state = createInitialState(11, "Téo");
    state.garage.level = 2;
    state.rep = 40;
    state.cash = 0;
    state.contracts = [
      {
        id: "frota-1",
        template: "frota_raptor",
        startWeek: 0,
        endWeek: 8,
        weekly: 1400,
        perWeek: 6,
        delivered: 6,
        active: true,
      },
    ];
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.history[0]?.revenue, 1400);
    assert.ok((state.history[0]?.cashEnd ?? 0) < 0);
    const first = state.receivables.find((item) => item.jobId === "frota-1-0");
    assert.equal(first?.dueWeek, 4);
    assert.notEqual(first?.status, "paid");

    let rich = createInitialState(12, "Téo");
    rich.garage.level = 2;
    rich.rep = 40;
    rich.cash = 20000;
    rich.contracts = [
      {
        id: "frota-2",
        template: "frota_raptor",
        startWeek: 0,
        endWeek: 8,
        weekly: 1400,
        perWeek: 6,
        delivered: 6,
        active: true,
      },
    ];
    let guard = 0;
    while (rich.calendar.week < 4 && guard < 40) {
      if (rich.calendar.day === 6) {
        const live = rich.contracts?.find((item) => item.id === "frota-2");
        if (live) live.delivered = 6;
      }
      rich = applyAction(rich, { type: "END_DAY" }, contentV1).state;
      guard += 1;
    }
    assert.equal(rich.receivables.find((item) => item.jobId === "frota-2-0")?.status, "open");
    while (rich.calendar.week < 5 && guard < 80) {
      if (rich.calendar.day === 6) {
        const live = rich.contracts?.find((item) => item.id === "frota-2");
        if (live) live.delivered = 6;
      }
      rich = applyAction(rich, { type: "END_DAY" }, contentV1).state;
      guard += 1;
    }
    assert.equal(rich.receivables.find((item) => item.jobId === "frota-2-0")?.status, "paid");
  });

  it("atraso multa o valor e a fama; no prazo a fama sobe", () => {
    const content = structuredClone(contentV1);
    const neighbor = content.clients.find((item) => item.id === "vizinho");
    if (neighbor) neighbor.caloteBase = 0;
    let late = createInitialState(2, "Téo");
    late.calendar.day = 3;
    late.jobs = [readyJob({ price: 100, dueWeek: 0, dueDay: 1 })];
    late = applyAction(late, { type: "DELIVER", jobId: "job-1" }, content).state;
    assert.equal(late.rep, 16);
    const paid = late.receivables.find((item) => item.status === "paid");
    assert.equal(paid?.value, 80);

    let onTime = createInitialState(2, "Téo");
    onTime.jobs = [readyJob({ price: 100, depositPaid: 100, dueWeek: 0, dueDay: 1 })];
    onTime = applyAction(onTime, { type: "DELIVER", jobId: "job-1" }, content).state;
    assert.equal(onTime.rep, 22);
  });

  it("o protesto aceito paga três semanas depois", () => {
    let state = createInitialState(6, "Téo");
    state.cash = 8000;
    state.rep = 20;
    state.receivables = [
      {
        id: "r1",
        jobId: "j",
        value: 200,
        dueWeek: 0,
        dueDay: 1,
        caloteRolled: true,
        status: "defaulted",
        clientType: "comerciante",
      },
    ];
    state.rngState = seedFor(contentV1.balance.contracts.protestChance, true);
    state = applyAction(state, { type: "PROTEST", receivableId: "r1" }, contentV1).state;
    assert.equal(state.rep, 21);
    assert.equal(state.cash, 7940);
    assert.equal(state.receivables[0]?.status, "open");
    let guard = 0;
    while (state.calendar.week < 3 && guard < 30) {
      assert.notEqual(state.receivables[0]?.status, "paid");
      state = applyAction(state, { type: "END_DAY" }, contentV1).state;
      guard += 1;
    }
    assert.equal(state.receivables[0]?.status, "paid");
    assert.equal(state.calendar.week, 3);
  });

  it("a prévia usa o tipo aparente e o custo da hora", () => {
    const state = createInitialState(1, "Téo");
    const lead = state.leads[0]!;
    lead.hiddenType = "caloteiro";
    lead.apparentType = "comerciante";
    const quote = quotePreview(state, contentV1, lead.id, lead.refPrice, 0);
    const apparent = acceptanceChance(contentV1, 1.4, state.rep, lead.refPrice, lead.refPrice, 0);
    assert.equal(quote.acceptChance, apparent);
    assert.equal(quote.materialCost, 25);
    assert.ok(quote.timeCost > 0);
    assert.equal(quote.breakEvenPrice, quote.materialCost + quote.timeCost);
  });

  it("o corredor de verdade exige sinal; o disfarce não", () => {
    const state = createInitialState(1, "Téo");
    state.leads.push({
      id: "corr",
      apparentType: "corredor",
      service: "motor",
      refPrice: 750,
      deadlineDays: 4,
      quotes: ["Sem sinal eu não deixo."],
      expiresDay: 20,
      appearWeek: 0,
      appearDay: 1,
      status: "open",
    });
    assert.throws(() => applyAction(state, { type: "SEND_PROPOSAL", leadId: "corr", price: 750, depositPct: 0, deadline: 4 }, contentV1), /sinal/);
    const fake = structuredClone(state) as GameState;
    const lead = fake.leads.find((item) => item.id === "corr");
    if (lead) lead.hiddenType = "caloteiro";
    const sent = applyAction(fake, { type: "SEND_PROPOSAL", leadId: "corr", price: 750, depositPct: 0, deadline: 4 }, contentV1);
    assert.equal(sent.state.leads.find((item) => item.id === "corr")?.status, "pending");
  });
});
