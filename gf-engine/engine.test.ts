import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { applyAction, spendWorkAp } from "./apply.ts";
import { inNightWindow } from "./clock.ts";
import { contentV1 } from "./balance.ts";
import { bps, formatF } from "./format.ts";
import { compoundUnchecked, makeDebt, priceInstallment, projectMinimum } from "./finance.ts";
import { actFor, createInitialState } from "./initial.ts";
import { int } from "./rng.ts";
import type { GameState } from "./state.ts";
import { fixedTotal } from "./weeklyClose.ts";

function hash(state: unknown): string {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

function replay(seed: number, actions: Record<string, unknown>[]): GameState {
  let state = createInitialState(seed, "Téo");
  for (const action of actions) state = applyAction(state, action, contentV1).state;
  return state;
}

describe("motor da garagem", () => {
  it("a mesma semente e as mesmas ações dão o mesmo estado", () => {
    const actions = [{ type: "REST" }, { type: "END_DAY" }, { type: "WAIT", minutes: 14 * 60 }, { type: "NIGHT_SHIFT" }, { type: "END_DAY" }];
    assert.deepEqual(replay(42, actions), replay(42, actions));
  });

  it("trinta ações com semente fixa batem o mesmo hash nas duas execuções", () => {
    const rng = { rngState: 123456 };
    const actions: { type: string }[] = [];
    let shadow = createInitialState(7, "Téo");
    for (let i = 0; i < 30; i += 1) {
      const roll = int(rng, 0, 2);
      let action = { type: "END_DAY" };
      if (roll === 1 && shadow.calendar.apLeft > 0) action = { type: "REST" };
      else if (roll === 2 && shadow.calendar.extraNightsUsed < 2 && inNightWindow(contentV1, shadow.clock.t)) action = { type: "NIGHT_SHIFT" };
      actions.push(action);
      shadow = applyAction(shadow, action, contentV1).state;
    }
    const first = replay(7, actions);
    const second = replay(7, actions);
    assert.equal(actions.length, 30);
    assert.equal(hash(first), hash(second));
    assert.deepEqual(first, second);
  });

  it("seis encerramentos fecham a semana com fixo 300 e o imposto", () => {
    let state = createInitialState(9, "Téo");
    state.flags.receivedWeek = 1000;
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.week, 1);
    assert.equal(state.calendar.day, 1);
    assert.equal(state.calendar.act, 1);
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0]!.fixed, 300);
    assert.equal(state.history[0]!.tax, 60);
    assert.equal(state.history[0]!.received, 1000);
    assert.equal(state.history[0]!.debtPaid, 300);
    assert.equal(state.cash, 0);
    const cheque = state.debts.find((debt) => debt.template === "cheque_especial");
    assert.equal(cheque?.balance, 360);
    assert.equal(state.morale, 98.333);
    assert.equal(state.flags.receivedWeek, 0);
  });

  it("os fixos dos níveis 0 a 5 batem a tabela", () => {
    const expected = [300, 450, 600, 750, 900, 1050];
    expected.forEach((total, level) => {
      assert.equal(fixedTotal(level, contentV1, [], 0), total);
    });
  });

  it("o colapso zera a energia da semana seguinte e devolve o ânimo a 40", () => {
    let state = createInitialState(4, "Téo");
    state.morale = 10;
    state = applyAction(state, { type: "WAIT", minutes: 14 * 60 }, contentV1).state;
    const hit = applyAction(state, { type: "NIGHT_SHIFT" }, contentV1);
    assert.equal(hit.events.some((event) => event.type === "COLLAPSE"), true);
    state = hit.state;
    assert.equal(state.morale, 29.5);
    assert.deepEqual(state.collapses, [0]);
    assert.equal(state.flags.noApWeek, 1);
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.week, 1);
    assert.equal(state.calendar.apLeft, 0);
    state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.calendar.day, 2);
    assert.equal(state.calendar.apLeft, 0);
  });

  it("não altera o estado de entrada", () => {
    const state = createInitialState(1, "Téo");
    const snap = structuredClone(state);
    applyAction(state, { type: "END_DAY" }, contentV1);
    assert.deepEqual(state, snap);
  });

  it("trabalho acima de 15 PA na semana custa ânimo", () => {
    const state = createInitialState(1, "Téo");
    state.calendar.apLeft = 20;
    state.calendar.apWorkedThisWeek = 15;
    state.morale = 60;
    spendWorkAp(state, contentV1, 1);
    assert.equal(state.morale, 57);
    assert.equal(state.calendar.apWorkedThisWeek, 16);
  });

  it("formata fóssil e pontos-base", () => {
    assert.equal(formatF(1200), "1.200 ₣");
    assert.equal(formatF(-300), "−300 ₣");
    assert.equal(bps(1000, 600), 60);
    assert.equal(actFor(0), 0);
    assert.equal(actFor(8), 1);
    assert.equal(actFor(9), 2);
    assert.equal(actFor(21), 3);
    assert.equal(actFor(37), 4);
  });

  it("o banco do pai no mínimo acaba em 83 semanas e cerca de 24.600 pagos", () => {
    const result = projectMinimum(18000, 80, 300);
    assert.ok(Math.abs(result.weeks - 83) <= 1, `semanas ${result.weeks}`);
    assert.ok(Math.abs(result.totalPaid - 24600) <= 200, `pago ${result.totalPaid}`);
  });

  it("o agiota de 5.000 sem pagamento chega a 10.718 em 8 semanas", () => {
    const balance = compoundUnchecked(5000, 1000, 8);
    assert.ok(Math.abs(balance - 10718) <= 1, String(balance));
  });

  it("o cartão no mínimo por 5 semanas segue a fórmula da fatura", () => {
    let state = createInitialState(2, "Téo");
    state.debts = [makeDebt(contentV1, "cartao_platina", 2000, 0)];
    state.cash = 100000;
    const rows: { revolving: number; min: number }[] = [];
    let revolving = 0;
    let statement = 2000;
    for (let week = 0; week < 5; week += 1) {
      const interest = Math.round((revolving * 350) / 10000);
      revolving += interest;
      const fatura = statement + revolving;
      const min = Math.round((fatura * 15) / 100);
      let left = min;
      const fromStatement = Math.min(statement, left);
      statement -= fromStatement;
      left -= fromStatement;
      revolving -= left;
      revolving += statement;
      statement = 0;
      rows.push({ revolving, min });
      for (let day = 0; day < 7; day += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
      const card = state.debts.find((debt) => debt.template === "cartao_platina");
      assert.equal(card?.balance, rows[week]!.revolving);
    }
  });

  it("dois domingos abaixo de -500 encerram em F1", () => {
    let state = createInitialState(1, "Téo");
    state.debts = [];
    state.cash = -2000;
    let sawAlert = false;
    for (let i = 0; i < 7; i += 1) {
      const step = applyAction(state, { type: "END_DAY" }, contentV1);
      state = step.state;
      if (step.events.some((event) => event.type === "RED_ALERT")) sawAlert = true;
    }
    assert.equal(sawAlert, true);
    assert.equal(state.ending, null);
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.ending, "F1_caixa");
  });

  it("sem receita a campanha inicial quebra até a semana 4", () => {
    let state = createInitialState(3, "Téo");
    for (let guard = 0; guard < 40 && !state.ending; guard += 1) {
      state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    }
    assert.ok(state.ending === "F1_caixa" || state.ending === "F2_banco");
    assert.ok(state.calendar.week <= 4);
  });

  it("o tesouro rende 20 bps e o resgate só cai no fechamento seguinte", () => {
    let state = createInitialState(5, "Téo");
    state.cash = 5000;
    state = applyAction(state, { type: "SAVE", product: "tesouro", value: 1000 }, contentV1).state;
    assert.equal(state.savings.tesouro, 1000);
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    assert.equal(state.savings.tesouro, 1000 + bps(1000, 20));
    const before = state.cash;
    state = applyAction(state, { type: "WITHDRAW", product: "tesouro", value: state.savings.tesouro }, contentV1).state;
    assert.equal(state.cash, before);
    assert.equal(state.savings.pendingWithdraw.length, 1);
    const pending = state.savings.pendingWithdraw[0]!.value;
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, contentV1).state;
    const summary = state.history.at(-1)!;
    assert.equal(state.savings.pendingWithdraw.length, 0);
    assert.equal(state.cash, before - summary.fixed - summary.tax - summary.debtPaid + pending);
    assert.equal(priceInstallment(1000, 120, 26) > 0, true);
  });
});
