import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { DAY, partsOf, WEEK } from "./clock.ts";
import { contentBody, contentV1 } from "./content.ts";
import { GameError } from "./errors.ts";
import { createInitialState } from "./initial.ts";

describe("relógio de 24h", () => {
  it("deriva semana, dia e fase das horas de fronteira", () => {
    const marks: [number, number, number, string][] = [
      [0, 0, 0, "madrugada"],
      [5 * 60 + 59, 5, 59, "madrugada"],
      [6 * 60, 6, 0, "manha"],
      [11 * 60 + 59, 11, 59, "manha"],
      [12 * 60, 12, 0, "tarde"],
      [17 * 60 + 59, 17, 59, "tarde"],
      [18 * 60, 18, 0, "noite"],
      [23 * 60 + 59, 23, 59, "noite"],
    ];
    for (const [t, hour, minute, periodo] of marks) {
      const parts = partsOf(t);
      assert.equal(parts.week, 0);
      assert.equal(parts.day, 1);
      assert.equal(parts.hour, hour);
      assert.equal(parts.minute, minute);
      assert.equal(parts.periodo, periodo);
    }
    assert.equal(partsOf(WEEK + 6 * DAY).day, 7);
  });

  it("a semana dá 18 PA de segunda a sábado e fecha no sétimo sono", () => {
    let state = createInitialState(9, "Téo");
    const got = [state.calendar.apLeft];
    for (let i = 0; i < 6; i += 1) {
      state = applyAction(state, { type: "END_DAY" }, contentV1).state;
      got.push(state.calendar.apLeft);
    }
    assert.deepEqual(got, [3, 3, 3, 3, 3, 3, 0]);
    assert.equal(state.calendar.day, 7);
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.week, 1);
    assert.equal(state.calendar.day, 1);
    assert.equal(state.calendar.apLeft, 3);
    assert.equal(state.history.length, 1);
  });

  it("dormir duas vezes no mesmo dia não dá 6 PA", () => {
    const state = createInitialState(1, "Téo");
    const nap = applyAction(state, { type: "SLEEP", wakeAt: state.clock.t + 120 }, contentV1).state;
    assert.equal(nap.calendar.apLeft, 3);
    assert.equal(nap.clock.energy, 44);
    assert.equal(nap.calendar.day, 1);
  });

  it("ficar acordado até as 06:00 renova com 2 PA e ânimo −10", () => {
    const state = createInitialState(1, "Téo");
    state.clock.t = 5 * 60;
    state.clock.apRefillDay = -1;
    const woke = applyAction(state, { type: "WAIT", minutes: 90 }, contentV1).state;
    assert.equal(woke.calendar.apLeft, 2);
    assert.equal(woke.morale, 50);
  });

  it("o banco fechado recusa a ida e o tick não passa do teto", () => {
    const state = createInitialState(1, "Téo");
    assert.throws(
      () => applyAction(state, { type: "TRAVEL", place: "banco" }, contentV1),
      (err: unknown) => err instanceof GameError && err.code === "fechado",
    );
    const tick = applyAction(state, { type: "TICK", elapsedMs: 10 * 60 * 1000 }, contentV1).state;
    assert.equal(tick.clock.t, state.clock.t + Math.floor((15000 * 2) / 1000));
  });

  it("save antigo com 1 PA abre às 18:00 e a nota do servidor não sai", () => {
    const state = createInitialState(1, "Téo");
    (state as { clock?: unknown }).clock = undefined;
    state.calendar.day = 2;
    state.calendar.apLeft = 1;
    const next = applyAction(state, { type: "SET_SPEED", speed: 2 }, contentV1).state;
    assert.equal(next.clock.t, DAY + 18 * 60);
    assert.equal(partsOf(next.clock.t).hour, 18);
    assert.equal(contentBody.includes("nota_servidor"), false);
    assert.equal(contentBody.includes("Sinal pelo horário"), false);
  });
});
