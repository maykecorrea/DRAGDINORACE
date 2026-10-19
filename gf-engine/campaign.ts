import { revealLesson } from "./cards.ts";
import type { Content } from "./content.ts";
import type { GfEvent } from "./finance.ts";
import { netWorth } from "./finance.ts";
import { addMorale } from "./morale.ts";
import { addRep } from "./reputation.ts";
import { chance, int } from "./rng.ts";
import type { GameState } from "./state.ts";
import { fixedTotal } from "./weeklyClose.ts";

function num(state: GameState, key: string): number {
  const value = state.flags[key];
  return typeof value === "number" ? value : 0;
}

function salaries(state: GameState): number {
  return state.employees.reduce((sum, employee) => sum + employee.salary, 0);
}

export function weekBurn(state: GameState, content: Content): number {
  return fixedTotal(state.garage.level, content, state.fixedRecurring, state.calendar.week) + salaries(state);
}

export function passiveIncome(state: GameState, content: Content): number {
  const of = (id: string) => content.savingsProducts.find((item) => item.id === id)?.bps ?? 0;
  const box = state.savings.cofrinho * of("cofrinho");
  const bond = state.savings.tesouro * of("tesouro");
  const fund = state.savings.fundo * of("fundo");
  return Math.round((box + bond + fund) / 10000);
}

export function meetsFreedom(state: GameState, content: Content): boolean {
  const rule = content.balance.freedom;
  const debt = state.debts.reduce((sum, item) => sum + item.balance, 0);
  if (state.garage.level < 5 || debt > 0) return false;
  if (state.savings.cofrinho < rule.reserveWeeks * weekBurn(state, content)) return false;
  if (passiveIncome(state, content) < rule.passiveIncome) return false;
  return num(state, "goodWeeks") >= rule.teoApWeeks;
}

export function campaignScore(state: GameState, content: Content): number {
  const gang = state.flags.gangDown === true ? 1500 : 0;
  const bonus = state.ending === "liberdade" ? 15000 : state.ending === "prosperidade" ? 5000 : 0;
  return Math.round(netWorth(state, content) / 10) + 2000 * state.garage.level + 50 * state.lessonsTriggered.length + gang - 300 * num(state, "scams_taken") + bonus;
}

export function sealScore(state: GameState, content: Content): void {
  if (!state.ending || typeof state.flags.score === "number") return;
  state.flags.score = campaignScore(state, content);
}

function scheduleCard(state: GameState, cardId: string, week: number, day: number): void {
  state.scheduled.push({ atWeek: week, atDay: day, cardId, source: cardId, hidden: false });
}

function hitCash(state: GameState, amount: number): void {
  state.cash -= amount;
}

export function stepCampaign(state: GameState, content: Content, events: GfEvent[]): void {
  const week = state.calendar.week;
  if (state.garage.upgradingTo != null) {
    const next = content.garageLevels[state.garage.upgradingTo];
    if (next) {
      state.garage.level = next.level as GameState["garage"]["level"];
      state.garage.bays = next.bays;
      addRep(state, content, 10, "a obra ficou pronta");
      events.push({ type: "UPGRADED", amount: next.level, text: next.nome });
    }
    state.garage.upgradingTo = null;
  }

  if (week === 0) revealLesson(state, events, "L01");
  if (week === 2) revealLesson(state, events, "L21");
  if (week >= 37) revealLesson(state, events, "L24");
  if (state.employees.length > 0) {
    revealLesson(state, events, "L03");
    revealLesson(state, events, "L28");
  }
  if (state.debts.filter((debt) => debt.balance > 0).length >= 2) revealLesson(state, events, "L22");
  if (state.savings.tesouro > 0) revealLesson(state, events, "L23");
  if (state.debts.some((debt) => debt.principal > 0 && debt.balance >= debt.principal * 2)) revealLesson(state, events, "L06");
  if (state.flags.protection || state.flags.refusedGang === true || state.flags.gangDown === true) revealLesson(state, events, "L25");
  if (state.morale < 30) revealLesson(state, events, "L29");
  if (week === 16) {
    const hit = addMorale(state, content, -15);
    events.push({ type: "MEMORY", text: "Aniversário da morte do pai", week });
    if (hit.collapsed) events.push({ type: "COLLAPSE", week });
    revealLesson(state, events, "L29");
  }

  for (const scam of state.scamInvestments) {
    if (scam.status !== "active") continue;
    const age = week - scam.week;
    if (scam.scamId === "ovo") {
      if (age >= 1 && age <= 3) {
        const yieldNow = Math.round(scam.principal * 0.075);
        scam.shownValue += yieldNow;
        state.cash += yieldNow;
        events.push({ type: "SCAM_YIELD", amount: yieldNow, text: "ovo" });
      }
      const odds = age >= 6 ? 1 : age === 5 ? 0.7 : age === 4 ? 0.4 : 0;
      if (odds > 0 && chance(state, odds)) {
        scam.status = "collapsed";
        scam.shownValue = 0;
        events.push({ type: "SCAM_COLLAPSE", text: "ovo", amount: scam.principal });
        if (state.flags.recruited === true) addRep(state, content, -10, "recrutou para a pirâmide");
        revealLesson(state, events, "L15");
      }
    }
    if (scam.scamId === "bito" && age >= 1 && scam.status === "active") {
      scam.shownValue = Math.round(scam.principal * 1.4);
      scam.status = "locked";
      scheduleCard(state, "bitossauro_saque", week + 1, 1);
    }
  }

  if (state.flags.refusedGang === true && state.flags.gangDown !== true && week >= 3) {
    const cameras = state.flags.cameras === true || state.garage.cameras;
    const assoc = state.fixedRecurring.some((item) => item.id === "associacao");
    const odds = cameras && assoc ? 0.05 : cameras ? 0.1 : 0.25;
    if (chance(state, odds)) {
      const bill = int(state, 200, 600);
      hitCash(state, bill);
      events.push({ type: "SABOTAGE", amount: bill, week });
      revealLesson(state, events, "L25");
    }
  }

  if (state.flags.franquia === true) {
    const cut = Math.round(num(state, "receivedWeek") * 0.12);
    if (cut > 0) {
      hitCash(state, cut);
      events.push({ type: "ROYALTY", amount: cut });
    }
  }

  if (week >= 12 && !state.ending) {
    const fireOdds = state.garage.level === 0 ? 0.06 : 0.03;
    if (chance(state, fireOdds)) scheduleCard(state, "evento_curto", week + 1, 1);
    if (chance(state, 0.06)) scheduleCard(state, "evento_maquina", week + 1, 2);
    if (chance(state, 0.04) && num(state, "criseCount") < 1) {
      state.flags.leadMult = 0.7;
      state.flags.criseUntil = week + 3;
      state.flags.criseCount = num(state, "criseCount") + 1;
      events.push({ type: "CRISE", week });
    }
    if (state.rep > 50 && chance(state, 0.1)) {
      state.flags.prospectsQueued = num(state, "prospectsQueued") + 2;
      events.push({ type: "INDICACAO", week });
    }
    const dirty = state.employees.some((employee) => employee.id === "zeca") || state.flags.rato_dirty === true;
    if (dirty && chance(state, 0.04)) {
      const fine = int(state, 300, 900);
      const due = state.flags.accountant === true ? Math.round(fine / 2) : fine;
      hitCash(state, due);
      events.push({ type: "FISCAL", amount: due, week });
      revealLesson(state, events, "L27");
    }
  }
  if (week === 18 || week === 30 || week === 44) {
    state.flags.leadMult = 1.3;
    state.flags.torneioUntil = week + 1;
    events.push({ type: "TORNEIO", week });
  }
  if (typeof state.flags.criseUntil === "number" && week >= state.flags.criseUntil && state.flags.leadMult === 0.7) {
    delete state.flags.leadMult;
  }
  if (typeof state.flags.torneioUntil === "number" && week >= state.flags.torneioUntil && state.flags.leadMult === 1.3) {
    delete state.flags.leadMult;
  }
  if (state.flags.franquia === true) state.flags.leadMult = 1.2;

  const act = state.calendar.act;
  if (act >= 1 && state.flags.act1_done !== true) {
    const boleto = !state.debts.some((debt) => debt.template === "fornecedor_casco" && debt.balance > 0);
    const bank = state.debts.find((debt) => debt.template === "banco_pai");
    if (boleto && (bank?.missed ?? 0) === 0 && state.garage.level >= 1 && state.lessonsTriggered.length >= 3) {
      state.flags.act1_done = true;
      addRep(state, content, 5, "objetivos do ato 1");
      addMorale(state, content, 10);
      events.push({ type: "ACT_DONE", amount: 1 });
    }
  }
  if (act >= 2 && state.flags.act2_done !== true) {
    const reserve = state.savings.cofrinho >= 4 * weekBurn(state, content);
    if (state.garage.level >= 2 && state.employees.length >= 1 && reserve && state.flags.fleet === true) {
      state.flags.act2_done = true;
      addRep(state, content, 5, "objetivos do ato 2");
      addMorale(state, content, 10);
      events.push({ type: "ACT_DONE", amount: 2 });
    }
  }
  if (act >= 3 && state.flags.act3_done !== true) {
    const bank = state.debts.find((debt) => debt.template === "banco_pai");
    if ((bank == null || bank.balance <= 0) && state.garage.level >= 3 && state.flags.gangDown === true) {
      state.flags.act3_done = true;
      addRep(state, content, 5, "objetivos do ato 3");
      addMorale(state, content, 10);
      events.push({ type: "ACT_DONE", amount: 3 });
    }
  }

  if (!state.ending || state.ending === "sobrevivencia" || state.ending === "prosperidade") {
    if (meetsFreedom(state, content)) state.ending = "liberdade";
  }
}

export function noteGoodWeek(state: GameState, profit: number, teoAp: number, cap: number): void {
  state.flags.goodWeeks = profit > 0 && teoAp <= cap ? num(state, "goodWeeks") + 1 : 0;
}
