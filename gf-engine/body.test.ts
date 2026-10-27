import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { applyWorkLoad, hungerOf, levelOf, readPantry, thirstOf, tickBody, xpOf } from "./body.ts";
import { contentV1 } from "./content.ts";
import { GameError } from "./errors.ts";
import { createInitialState } from "./initial.ts";

describe("comer, cozinhar e nível", () => {
  it("a barraca vende para a despensa e comer baixa a sede", () => {
    const state = createInitialState(3, "Téo");
    const cash = state.cash;
    const bought = applyAction(state, { type: "BUY_FOOD", food: "agua" }, contentV1);
    assert.equal(bought.state.cash, cash - 4);
    assert.equal(readPantry(bought.state.flags).agua, 2);
    const ate = applyAction(bought.state, { type: "EAT", food: "agua" }, contentV1);
    assert.equal(readPantry(ate.state.flags).agua, 1);
    assert.ok(thirstOf(ate.state) < thirstOf(bought.state));
    assert.ok(xpOf(ate.state) > xpOf(bought.state));
    assert.equal(ate.events.some((event) => event.type === "ATE"), true);
  });

  it("miojo com água vira marmita e o Bone Special espera o Bronze", () => {
    const state = createInitialState(4, "Téo");
    assert.throws(
      () => applyAction(state, { type: "COOK", recipe: "pf" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "sem_comida",
    );
    const cooked = applyAction(state, { type: "COOK", recipe: "marmita" }, contentV1);
    assert.equal(readPantry(cooked.state.flags).marmita, 1);
    assert.equal(readPantry(cooked.state.flags).miojo ?? 0, 0);
    assert.equal(levelOf(xpOf(cooked.state)).level, 0);
    const stocked = cooked.state;
    stocked.flags.pantry = "sacola:1,miojo:1";
    stocked.flags.xp = 250;
    assert.throws(
      () => applyAction(stocked, { type: "COOK", recipe: "pf" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "nivel_baixo",
    );
    stocked.flags.xp = 700;
    const pf = applyAction(stocked, { type: "COOK", recipe: "pf" }, contentV1);
    assert.equal(readPantry(pf.state.flags).pf, 1);
    assert.equal(pf.events.some((event) => event.type === "LEVEL_UP"), false);
  });

  it("comer marmita sobe o nível quando o xp chega", () => {
    const state = createInitialState(5, "Téo");
    state.flags.xp = 684;
    state.flags.pantry = "marmita:1";
    const ate = applyAction(state, { type: "EAT", food: "marmita" }, contentV1);
    assert.equal(levelOf(xpOf(ate.state)).nome, "Bronze");
    assert.equal(ate.state.flags.medal, "bronze");
    assert.equal(ate.events.some((event) => event.type === "LEVEL_UP" && event.text === "Bronze"), true);
    assert.ok(hungerOf(ate.state) < 35);
  });

  it("cada hora acordado aumenta a fome e a feira fechada não vende", () => {
    const state = createInitialState(6, "Téo");
    const before = hungerOf(state);
    const waited = applyAction(state, { type: "WAIT", minutes: 60 }, contentV1).state;
    assert.equal(hungerOf(waited), before + 4);
    assert.throws(
      () => applyAction(state, { type: "BUY_FOOD", food: "pastel" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "fechado",
    );
  });

  it("as taxas batem a tabela e o desmaio conta do minuto em que a energia zera", () => {
    const awake = createInitialState(8, "Téo");
    tickBody(awake, contentV1, 60, "awake", []);
    assert.equal(awake.clock.energy, 96);
    assert.equal(awake.flags.hunger, 39);
    assert.equal(awake.flags.thirst, 35);
    assert.equal(awake.morale, 60);
    applyWorkLoad(awake, 1);
    assert.equal(awake.clock.energy, 86);
    assert.equal(awake.flags.hunger, 45);
    assert.equal(awake.flags.thirst, 44);

    const asleep = createInitialState(8, "Téo");
    asleep.clock.energy = 20;
    tickBody(asleep, contentV1, 120, "sleep", []);
    assert.equal(asleep.clock.energy, 37);
    assert.equal(asleep.flags.hunger, 37);
    assert.equal(asleep.flags.thirst, 33);
    assert.equal(asleep.morale, 65);

    const dry = createInitialState(8, "Téo");
    dry.clock.energy = 4;
    const from = dry.clock.t;
    const fainted = applyAction(dry, { type: "WAIT", minutes: 120 }, contentV1);
    assert.equal(fainted.events.some((event) => event.type === "FAINTED"), true);
    assert.equal(fainted.state.clock.energy, 20);
    assert.equal(fainted.state.morale, 50);
    assert.equal(fainted.state.clock.t, from + 60 + 8 * 60);

    const sick = createInitialState(8, "Téo");
    sick.morale = 2;
    sick.flags.thirst = 100;
    sick.clock.energy = 80;
    sick.cash = 200;
    const start = sick.clock.t;
    const knocked = applyAction(sick, { type: "WAIT", minutes: 120 }, contentV1);
    assert.equal(knocked.events.some((event) => event.type === "KNOCKOUT"), true);
    assert.equal(knocked.state.morale, 50);
    assert.equal(knocked.state.clock.energy, 40);
    assert.equal(knocked.state.cash, 170);
    assert.equal(knocked.state.flags.district, "oficina");
    assert.equal(knocked.state.clock.t, start + 40 + 12 * 60);
  });
});
