import type { Content } from "./content.ts";
import { stepAuction } from "./auction.ts";
import { noteGoodWeek, stepCampaign } from "./campaign.ts";
import { releaseSunday } from "./cards.ts";
import { closeFleetWeek, generateWeekLeads, settleDueReceivables } from "./contracts.ts";
import { stepBooks, stepCard, stepInterest, stepMinimums, stepOverdraft, stepProtection, stepYields, netWorth, type CloseTally, type GfEvent } from "./finance.ts";
import { bps } from "./format.ts";
import { actFor } from "./initial.ts";
import { addMorale, morningAp } from "./morale.ts";
import { stepReputation } from "./reputation.ts";
import { applyTraining, divertStock, payWeeklySalaries, rollDisease } from "./staff.ts";
import { oxidizeStock } from "./stock.ts";
import type { GameState, WeekSummary } from "./state.ts";

export type { GfEvent };

function book(state: GameState, key: "receivedWeek" | "revenueWeek" | "materialsWeek"): number {
  const value = state.flags[key];
  return typeof value === "number" ? value : 0;
}

function stepReceivables(state: GameState, content: Content, events: GfEvent[]): void {
  settleDueReceivables(state, content, events);
}

function stepTax(state: GameState, content: Content, tally: { tax: number; received: number }): void {
  tally.received = book(state, "receivedWeek");
  tally.tax = bps(tally.received, content.balance.taxBps);
  state.cash -= tally.tax;
}

function stepSalaries(state: GameState, content: Content, events: GfEvent[]): number {
  return payWeeklySalaries(state, content, events);
}

export function fixedTotal(level: number, content: Content, recurring: GameState["fixedRecurring"], week: number): number {
  const fixed = content.balance.fixed;
  const base =
    fixed.districtBase +
    fixed.districtPerLevel * level +
    fixed.energyBase +
    fixed.energyPerLevel * level +
    fixed.maintenancePerLevel * level +
    fixed.living;
  const extra = recurring.reduce((sum, item) => {
    if (item.untilWeek != null && week > item.untilWeek) return sum;
    return sum + item.value;
  }, 0);
  return base + extra;
}

function stepFixed(state: GameState, content: Content, tally: { fixed: number }): void {
  for (const item of state.fixedRecurring) {
    const every = item.growthEveryWeeks;
    const pct = item.growthPct;
    if (!every || every <= 0 || pct == null) continue;
    if (item.untilWeek != null && state.calendar.week > item.untilWeek) continue;
    const born = item.bornWeek ?? state.calendar.week;
    const elapsed = state.calendar.week - born;
    if (elapsed > 0 && elapsed % every === 0) item.value = Math.max(0, Math.round(item.value * (1 + pct)));
  }
  tally.fixed = fixedTotal(state.garage.level, content, state.fixedRecurring, state.calendar.week);
  state.cash -= tally.fixed;
}

function stepLeads(state: GameState, content: Content, events: GfEvent[]): void {
  closeFleetWeek(state, content, events);
  generateWeekLeads(state, content, state.calendar.week + 1);
}

function stepLessons(state: GameState, content: Content, events: GfEvent[]): void {
  stepCampaign(state, content, events);
}

function stepReport(state: GameState, content: Content, events: GfEvent[], tally: CloseTally, salaries: number): void {
  stepReputation(state, content);
  const rule = content.balance;
  let bonus = rule.sundayMorale;
  if (state.garage.level >= rule.sundayMoraleFromLevel) bonus += rule.sundayMoraleLevelBonus;
  addMorale(state, content, bonus);
  const materials = book(state, "materialsWeek");
  const revenue = book(state, "revenueWeek");
  const loss = state.flags.stockLossWeek;
  const stockLoss = typeof loss === "number" ? loss : 0;
  const openFlag = state.flags.cashWeekOpen;
  const summary: WeekSummary = {
    week: state.calendar.week,
    revenue,
    received: tally.received,
    tax: tally.tax,
    salaries,
    fixed: tally.fixed,
    interest: tally.interest,
    debtPaid: tally.debtPaid,
    materials,
    profit: tally.received - tally.tax - salaries - tally.fixed - tally.interest - tally.debtPaid - materials,
    cashEnd: state.cash,
    netWorth: netWorth(state, content),
    totalDebt: state.debts.reduce((sum, item) => sum + item.balance, 0),
    teoAp: state.calendar.apWorkedThisWeek,
    stockLoss,
    ...(typeof openFlag === "number" ? { cashOpen: openFlag } : {}),
  };
  state.history.push(summary);
  noteGoodWeek(state, summary.profit, summary.teoAp, rule.freedom.teoApMax);
  events.push({ type: "WEEK_CLOSED", summary, week: summary.week });
  state.flags.receivedWeek = 0;
  state.flags.revenueWeek = 0;
  state.flags.materialsWeek = 0;
  state.flags.stockLossWeek = 0;
  const nextWeek = state.calendar.week + 1;
  state.calendar.week = nextWeek;
  state.calendar.day = 1;
  state.calendar.act = actFor(nextWeek);
  state.calendar.extraNightsUsed = 0;
  state.calendar.apWorkedThisWeek = 0;
  state.flags.cashWeekOpen = state.cash;
  applyTraining(state, events);
  rollDisease(state, events);
  state.calendar.apLeft = morningAp(state, content);
}

export function weeklyClose(state: GameState, content: Content, events: GfEvent[]): void {
  const tally: CloseTally = { tax: 0, received: 0, fixed: 0, interest: 0, debtPaid: 0, charged: new Map(), missedNow: new Set() };
  stepReceivables(state, content, events);
  stepTax(state, content, tally);
  divertStock(state, content);
  const salaries = stepSalaries(state, content, events);
  stepFixed(state, content, tally);
  stepProtection(state, content);
  stepInterest(state, content, tally);
  stepMinimums(state, content, tally);
  stepCard(state, content);
  stepOverdraft(state, content);
  stepYields(state, content);
  stepBooks(state, content, tally, events);
  stepLeads(state, content, events);
  stepLessons(state, content, events);
  stepAuction(state, content, events);
  oxidizeStock(state, content);
  releaseSunday(state, content, events);
  stepReport(state, content, events, tally, salaries);
}
