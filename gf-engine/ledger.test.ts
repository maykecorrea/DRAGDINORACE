import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { breakEvenRevenue, cashCascade, debtRateLabel, seesCet, simulateDebt } from "./ledger.ts";
import type { WeekSummary } from "./state.ts";

function summary(extra: Partial<WeekSummary> = {}): WeekSummary {
  return {
    week: 1,
    revenue: 0,
    received: 0,
    tax: 0,
    salaries: 0,
    fixed: 300,
    interest: 144,
    debtPaid: 300,
    materials: 0,
    profit: 0,
    cashEnd: 300,
    netWorth: 0,
    totalDebt: 0,
    teoAp: 0,
    stockLoss: 0,
    ...extra,
  };
}

describe("simulador e fechamento", () => {
  it("18.000 a 0,8% com 300 por semana termina em 83 semanas e cerca de 24.600", () => {
    const sim = simulateDebt(18000, 0.8, 300, 104);
    assert.equal(sim.never, false);
    assert.equal(sim.weeks, 83);
    assert.ok(Math.abs(sim.totalPaid - 24600) <= 200, `pago ${sim.totalPaid}`);
    assert.match(sim.phrase, /83 semanas/);
    assert.match(sim.phrase, /24\.616 ₣ no total/);
  });

  it("5.000 a 10% pagando 400 nunca termina", () => {
    const sim = simulateDebt(5000, 10, 400, 12);
    assert.equal(sim.never, true);
    assert.equal(sim.phrase, "Nunca termina: você só paga juros");
    assert.equal(sim.points.length, 12);
    assert.ok(sim.points[11]!.balance > 5000);
  });

  it("a cascata soma o caixa final, com e sem caixa inicial gravado", () => {
    const known = summary({
      cashOpen: 1000,
      received: 400,
      tax: 24,
      salaries: 180,
      fixed: 300,
      interest: 144,
      debtPaid: 300,
      materials: 46,
      cashEnd: 250,
    });
    const cascade = cashCascade(known);
    assert.equal(cascade.total, known.cashEnd);
    assert.equal(
      cascade.lines.reduce((sum, line) => sum + line.signed, 0),
      250,
    );

    const plugged = summary({ cashEnd: 80, received: 200, tax: 12, fixed: 300 });
    assert.equal(cashCascade(plugged).total, 80);
  });

  it("o CET fica escondido sem contadora e sem L07", () => {
    const debt = { weeklyBps: 120 };
    const template = { creditor: "Banco", group: "outras" as const, bps: 120, min: "price" as const, anunciada: "1,9% ao mês" };
    assert.equal(seesCet({}, []), false);
    assert.equal(debtRateLabel(debt, template, false), "1,9% ao mês");
    assert.equal(debtRateLabel(debt, template, false).includes("CET"), false);
    assert.equal(seesCet({ accountant: true }, []), true);
    assert.equal(seesCet({}, ["L07"]), true);
    assert.match(debtRateLabel(debt, template, true), /CET/);
    assert.match(debtRateLabel(debt, template, true), /1,2%/);
  });

  it("o ponto de equilíbrio cobre fixo, salário, juro, material e o imposto", () => {
    assert.equal(breakEvenRevenue({ fixed: 300, salaries: 0, interest: 0, materials: 0 }, 600), 320);
  });
});
