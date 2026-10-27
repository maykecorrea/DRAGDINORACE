import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardSchema, type CardDef, type CardEffect } from "./cardSchema.ts";
import { applyEffect, beginDay, evalCond, flagRanges, shouldMarkFlags } from "./cards.ts";
import { applyAction } from "./apply.ts";
import { contentV1, lintCards, parseFile } from "./content.ts";
import { redactState } from "./contracts.ts";
import { ExprError, evalExpr } from "./expr.ts";
import { createInitialState } from "./initial.ts";
import type { Content } from "./content.ts";
import type { GameState } from "./state.ts";
import testCards from "../content/garagem-falida/v1/cards/_test.json" with { type: "json" };

const vars = {
  cash: 1000,
  rep: 20,
  week: 4,
  debt: (template: string) => (template === "banco_pai" ? 18000 : 0),
};

function pack(cards: CardDef[]): Content {
  const content = structuredClone(contentV1);
  content.cards = {
    offers: cards.filter((card) => card.kind === "offer"),
    events: cards.filter((card) => card.kind === "event"),
    story: cards.filter((card) => card.kind !== "offer" && card.kind !== "event"),
  };
  return content;
}

function card(partial: Partial<CardDef> & Pick<CardDef, "id" | "kind">): CardDef {
  return {
    npc: "juca",
    title: partial.id,
    act_min: 0,
    act_max: 4,
    week_min: 0,
    week_max: 99,
    weight: 10,
    once: false,
    cooldown_weeks: 0,
    priority: 0,
    blocking: false,
    conditions: [],
    text: "Texto da carta.",
    red_flags: [],
    options: [
      { id: "a", label: "Sim", requires: [], effects: [], dodged_scam: false, scam: false, decision_impact: 1 },
      { id: "b", label: "Não", requires: [], effects: [], dodged_scam: true, scam: false, lesson_unlock: "L06", decision_impact: 2 },
    ],
    ...partial,
  };
}

describe("expressões", () => {
  it("aceita a gramática e recusa o resto", () => {
    assert.equal(evalExpr("-0.2*cash", vars), -200);
    assert.equal(evalExpr("={caixa}*0.2", vars), 200);
    assert.equal(evalExpr("min(cash, 10)", vars), 10);
    assert.equal(evalExpr("max(1, week)", vars), 4);
    assert.equal(evalExpr("round(1.6)", vars), 2);
    assert.equal(evalExpr("debt(banco_pai)/2", vars), 9000);
    for (const bad of ["eval(1)", "cash**2", "alert(1)", "1;2", "", "caixa.rep", "process.exit", "debt()", "min(1)"]) {
      assert.throws(() => evalExpr(bad, vars), ExprError, bad);
    }
  });
});

describe("condições", () => {
  it("cobre cada forma", () => {
    const state = createInitialState(1, "Téo");
    state.cash = 100;
    state.rep = 20;
    state.morale = 60;
    state.flags.aberto = true;
    state.lessonsTriggered.push("L01");
    const content = contentV1;
    assert.equal(evalCond(state, content, { stat: "cash", lt: 101 }), true);
    assert.equal(evalCond(state, content, { stat: "cash", lt: 100 }), false);
    assert.equal(evalCond(state, content, { stat: "cash", lte: 100 }), true);
    assert.equal(evalCond(state, content, { stat: "rep", gt: 19 }), true);
    assert.equal(evalCond(state, content, { stat: "rep", gte: 20 }), true);
    assert.equal(evalCond(state, content, { stat: "week", eq: 0 }), true);
    assert.equal(evalCond(state, content, { stat: "level", eq: 0 }), true);
    assert.equal(evalCond(state, content, { stat: "act", eq: 0 }), true);
    assert.equal(evalCond(state, content, { stat: "bays", eq: state.garage.bays }), true);
    assert.equal(evalCond(state, content, { stat: "total_debt", gt: 0 }), true);
    assert.equal(evalCond(state, content, { stat: "net_worth", lt: 0 }), true);
    assert.equal(evalCond(state, content, { flag: "aberto", eq: true }), true);
    assert.equal(evalCond(state, content, { flag: "aberto", eq: false }), false);
    assert.equal(evalCond(state, content, { has_employee: "tico" }), false);
    state.employees.push({ id: "tico", hiredWeek: 0, salary: 180, skill: 1, apPerDay: 1, owedWeeks: 0 });
    assert.equal(evalCond(state, content, { has_employee: "tico" }), true);
    assert.equal(evalCond(state, content, { has_debt: "banco_pai" }), true);
    assert.equal(evalCond(state, content, { has_debt: "agiota_juca" }), false);
    assert.equal(evalCond(state, content, { lesson_seen: "L01" }), true);
    assert.equal(evalCond(state, content, { lesson_seen: "L02" }), false);
    assert.equal(evalCond(state, content, { any: [{ stat: "cash", gt: 9999 }, { stat: "rep", eq: 20 }] }), true);
    assert.equal(evalCond(state, content, { all: [{ stat: "rep", eq: 20 }, { flag: "aberto", eq: true }] }), true);
    assert.equal(evalCond(state, content, { not: { stat: "cash", lt: 0 } }), true);
  });
});

describe("efeitos", () => {
  it("aplica cada operação", () => {
    const state = createInitialState(2, "Téo");
    state.cash = 5000;
    const events: { type: string }[] = [];
    const ctx = { content: contentV1, events, source: "teste" };
    const run = (effect: CardEffect) => applyEffect(state, effect, ctx);

    run({ op: "cash", value: "-0.2*cash" });
    assert.equal(state.cash, 4000);
    const rep = state.rep;
    run({ op: "rep", value: 3 });
    assert.equal(state.rep, rep + 3);
    const morale = state.morale;
    run({ op: "morale", value: -1 });
    assert.equal(state.morale, morale - 1);
    run({ op: "debt_add", template: "agiota_juca", principal: 500 });
    assert.equal(state.debts.some((debt) => debt.template === "agiota_juca" && debt.balance === 500), true);
    assert.equal(state.cash, 4000);
    const agiota = state.debts.find((debt) => debt.template === "agiota_juca")!;
    run({ op: "debt_pay", debt_id: agiota.id, value: 100 });
    assert.equal(agiota.balance, 400);
    assert.equal(state.cash, 3900);
    run({ op: "asset_remove", asset_id: "compressor" });
    assert.equal(state.assets.some((asset) => asset.id === "compressor"), false);
    assert.equal(state.garage.hasCompressor, false);
    run({ op: "stock", material: "kit", qty: 2 });
    assert.equal(state.inventory.kit?.qty, (state.inventory.kit?.qty ?? 0));
    const kit = state.inventory.kit?.qty ?? 0;
    assert.ok(kit >= 2);
    run({ op: "stock", material: "kit", qty: -1 });
    assert.equal(state.inventory.kit?.qty, kit - 1);
    run({ op: "flag", key: "took_agiota", value: true });
    assert.equal(state.flags.took_agiota, true);
    run({ op: "schedule", in_weeks: 3, hidden: true, effects: [{ op: "flag", key: "depois", value: true }] });
    assert.equal(state.scheduled.some((item) => item.hidden === true && item.atWeek === 3), true);
    run({ op: "investment_add", product: "cofrinho", value: 40 });
    assert.equal(state.savings.cofrinho, 40);
    run({ op: "investment_add", scam_id: "ovo", product: "ovo", value: 70 });
    assert.equal(state.scamInvestments[0]?.scamId, "ovo");
    run({ op: "employee_hire", id: "tico" });
    assert.equal(state.employees.some((employee) => employee.id === "tico"), true);
    run({ op: "employee_fire", id: "tico" });
    assert.equal(state.employees.some((employee) => employee.id === "tico"), false);
    run({ op: "lead_add", client_type: "vizinho" });
    assert.ok(state.leads.length > 1);
    run({ op: "lesson", id: "L06" });
    assert.ok(state.lessonsTriggered.includes("L06"));
    run({ op: "unlock", key: "coop_ossada" });
    assert.equal(state.flags.coop_ossada, true);
    run({ op: "fixed_cost_add", id: "protecao", value: 50, until_week: 9, growth_every_weeks: 3, growth_pct: 0.1 });
    assert.equal(state.fixedRecurring.find((item) => item.id === "protecao")?.value, 50);
    run({ op: "fixed_cost_remove", id: "protecao" });
    assert.equal(state.fixedRecurring.some((item) => item.id === "protecao"), false);
    run({ op: "ending", id: "peao" });
    assert.equal(state.ending, "peao");
  });
});

describe("fila", () => {
  it("sorteia no máximo uma oferta e um evento, e respeita once e cooldown", () => {
    const offers = [1, 2, 3].map((n) => card({ id: `o${n}`, kind: "offer", weight: 10 }));
    const events = [1, 2, 3].map((n) => card({ id: `e${n}`, kind: "event", weight: 10 }));
    const content = pack([...offers, ...events]);
    const state = createInitialState(9, "Téo");
    state.cardQueue = [];
    beginDay(state, content, []);
    const born = state.cardQueue.filter((item) => item.week === 0 && item.day === 1);
    const kinds = born.map((item) => content.cards.offers.some((card) => card.id === item.cardId) ? "offer" : "event");
    assert.equal(kinds.filter((kind) => kind === "offer").length, 1);
    assert.equal(kinds.filter((kind) => kind === "event").length, 1);
    beginDay(state, content, []);
    assert.equal(state.cardQueue.length, 2);

    const once = pack([card({ id: "unica", kind: "offer", once: true })]);
    const solo = createInitialState(3, "Téo");
    beginDay(solo, once, []);
    solo.cardQueue[0]!.opened = true;
    const chosen = applyAction(solo, { type: "CARD_CHOICE", cardId: "unica", optionId: "a" }, once).state;
    chosen.calendar.week = 4;
    beginDay(chosen, once, []);
    assert.equal(chosen.cardQueue.some((item) => item.cardId === "unica"), false);

    const cool = pack([card({ id: "volta", kind: "offer", cooldown_weeks: 2 })]);
    const again = createInitialState(5, "Téo");
    again.cardQueue = [];
    beginDay(again, cool, []);
    again.cardQueue[0]!.opened = true;
    const refused = applyAction(again, { type: "CARD_CHOICE", cardId: "volta", optionId: "a" }, cool).state;
    assert.equal(refused.cooldowns.volta, 2);
    refused.calendar.week = 1;
    beginDay(refused, cool, []);
    assert.equal(refused.cardQueue.length, 0);
    refused.calendar.week = 2;
    beginDay(refused, cool, []);
    assert.equal(refused.cardQueue[0]?.cardId, "volta");
  });

  it("a história com prioridade ocupa a vaga antes do evento", () => {
    const content = pack([
      card({ id: "oferta", kind: "offer" }),
      card({ id: "evento", kind: "event", weight: 50 }),
      card({ id: "historia", kind: "story", priority: 5, weight: 1 }),
    ]);
    const state = createInitialState(1, "Téo");
    state.cardQueue = [];
    beginDay(state, content, []);
    const ids = state.cardQueue.map((item) => item.cardId).sort();
    assert.deepEqual(ids, ["historia", "oferta"]);
  });

  it("agenda 3 semanas, esconde o efeito e dispara no dia", () => {
    const parsed = parseFile("cards/_test.json", cardSchema.array(), testCards);
    lintCards(parsed, contentV1);
    assert.equal(contentV1.cards.offers.some((card) => card.id === "teste_oferta_juca"), false);
    const offer = parsed.find((item) => item.id === "teste_oferta_juca");
    assert.ok(offer);
    const content = pack([offer]);
    const boot = () => {
      const state = createInitialState(8, "Téo");
      state.cash = 100000;
      return state;
    };
    let state = boot();
    state.cardQueue.push({ cardId: "teste_oferta_juca", week: 0, day: 1, opened: true });
    state = applyAction(state, { type: "CARD_CHOICE", cardId: "teste_oferta_juca", optionId: "aceitar" }, content).state;
    assert.equal(state.flags.scams_taken, 1);
    assert.equal(state.cash, 100200);
    assert.notEqual(state.flags.teste_juros, true);
    assert.equal(JSON.stringify(state).includes("teste_juros"), true);
    assert.equal(JSON.stringify(redactState(state)).includes("teste_juros"), false);
    let control = boot();
    let guard = 0;
    while ((state.calendar.week < 3 || state.calendar.day !== 1) && guard < 40) {
      assert.notEqual(state.flags.teste_juros, true);
      assert.equal(state.ending, null);
      state = applyAction(state, { type: "END_DAY" }, content).state;
      control = applyAction(control, { type: "END_DAY" }, contentV1).state;
      guard += 1;
    }
    assert.equal(state.calendar.week, 3);
    assert.equal(state.calendar.day, 1);
    assert.equal(state.flags.teste_juros, true);
    assert.equal(state.cash, control.cash + 120);
  });

  it("o efeito de domingo cai no fechamento e não antes", () => {
    let state = createInitialState(4, "Téo");
    state.cash = 100000;
    state.scheduled.push({
      atWeek: 0,
      atDay: 7,
      source: "teste",
      hidden: true,
      effects: [{ op: "flag", key: "domingo_bateu", value: true }],
    });
    for (let i = 0; i < 5; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.day, 6);
    assert.notEqual(state.flags.domingo_bateu, true);
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.day, 7);
    assert.notEqual(state.flags.domingo_bateu, true);
    assert.equal(JSON.stringify(redactState(state)).includes("domingo_bateu"), false);
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.flags.domingo_bateu, true);
  });

  it("oferta vencida só conta golpe farejado se foi aberta", () => {
    const content = pack([card({ id: "golpe", kind: "offer" })]);
    const closed = createInitialState(1, "Ana");
    closed.cardQueue = [{ cardId: "golpe", week: 0, day: 1, opened: false, expiresWeek: 0, expiresDay: 1 }];
    const quiet = applyAction(closed, { type: "END_DAY" }, content).state;
    assert.equal(quiet.flags.scams_dodged, undefined);
    assert.equal(quiet.cardHistory[0]?.option, "b");

    const opened = createInitialState(1, "Ana");
    opened.morale = 50;
    opened.cardQueue = [{ cardId: "golpe", week: 0, day: 1, opened: true, expiresWeek: 0, expiresDay: 1 }];
    const sniffed = applyAction(opened, { type: "END_DAY" }, content);
    assert.equal(sniffed.state.flags.scams_dodged, 1);
    assert.equal(sniffed.state.morale, 85.333);
    assert.equal(sniffed.events.some((event) => event.type === "SCAM_DODGED"), true);
    assert.ok(sniffed.state.lessonsTriggered.includes("L06"));
  });

  it("evento bloqueante impede encerrar o dia", () => {
    const content = pack([card({ id: "trava", kind: "event", blocking: true })]);
    const state = createInitialState(1, "Téo");
    state.cardQueue = [{ cardId: "trava", week: 0, day: 1, opened: false }];
    assert.throws(() => applyAction(state, { type: "END_DAY" }, content), /telefone/);
    const next = applyAction(state, { type: "CARD_CHOICE", cardId: "trava", optionId: "a" }, content).state;
    assert.doesNotThrow(() => applyAction(next, { type: "END_DAY" }, content));
  });

  it("o mesmo replay chega no mesmo estado", () => {
    const content = pack([card({ id: "replay", kind: "offer", once: true })]);
    const play = () => {
      let state = createInitialState(11, "Téo");
      beginDay(state, content, []);
      state.cardQueue[0]!.opened = true;
      state = applyAction(state, { type: "CARD_CHOICE", cardId: "replay", optionId: "b" }, content).state;
      state = applyAction(state, { type: "END_DAY" }, content).state;
      return state;
    };
    assert.deepEqual(play(), play());
  });

  it("sinal vermelho só com a contadora", () => {
    assert.equal(shouldMarkFlags({}), false);
    assert.equal(shouldMarkFlags({ accountant: true }), true);
    assert.deepEqual(flagRanges("Sem papelada. A gente se entende.", ["Sem papel", "A gente se entende"]), [
      { start: 0, end: 9 },
      { start: 14, end: 32 },
    ]);
  });

  it("o custo fixo cresce na semana pedida", () => {
    let state = createInitialState(2, "Téo");
    state.cash = 100000;
    state.fixedRecurring.push({ id: "protecao", value: 100, bornWeek: 0, growthEveryWeeks: 3, growthPct: 0.1 });
    state.calendar.week = 3;
    state.calendar.day = 6;
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.fixedRecurring.find((item) => item.id === "protecao")?.value, 110);
  });
});
