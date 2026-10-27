import { contentV1 } from "./content.ts";
import { blankClock } from "./clock.ts";
import { beginDay } from "./cards.ts";
import { spawnTutorial } from "./contracts.ts";
import { openingDebts } from "./finance.ts";
import type { GameState, StockLot } from "./state.ts";

export function actFor(week: number): GameState["calendar"]["act"] {
  const row = contentV1.balance.acts.find((item) => week >= item.from && week <= item.to);
  return row?.act ?? 4;
}

export function createInitialState(seed: number, name: string): GameState {
  const start = contentV1.balance.initial;
  const inventory: GameState["inventory"] = {};
  for (const lot of start.inventory) {
    const stock: StockLot = {
      qty: lot.qty,
      avgCost: lot.cost,
      source: { [start.heritageSource]: lot.qty },
      ageWeeks: 0,
      batches: [
        {
          supplier: start.heritageSource,
          qty: lot.qty,
          unitCost: lot.cost,
          baseCost: lot.cost,
          ageWeeks: 0,
          boughtWeek: 0,
        },
      ],
    };
    inventory[lot.id] = stock;
  }
  const draft: GameState = {
    schema: 1,
    player: { name },
    calendar: {
      week: 0,
      day: 1,
      act: 0,
      apLeft: contentV1.balance.apPerDay,
      extraNightsUsed: 0,
      apWorkedThisWeek: 0,
    },
    cash: start.cash,
    overdraftLimit: start.overdraftLimit,
    rep: start.rep,
    morale: start.morale,
    collapses: [],
    garage: {
      level: start.garageLevel,
      bays: start.bays,
      upgradingTo: null,
      hasCompressor: true,
      cameras: false,
    },
    flags: { receivedWeek: 0, revenueWeek: 0, materialsWeek: 0, cashWeekOpen: start.cash, hunger: 35, thirst: 30, xp: 0, pantry: "miojo:1,agua:1" },
    assets: start.assets.map((asset) => ({ ...asset })),
    inventory,
    debts: openingDebts(contentV1),
    savings: { cofrinho: 0, tesouro: 0, fundo: 0, pendingWithdraw: [], autoDepositPct: 0 },
    scamInvestments: [],
    employees: [],
    hands: [],
    offers: [],
    leads: [],
    jobs: [],
    receivables: [],
    carcasses: [],
    auctionLots: [],
    fixedRecurring: [],
    paymentPriority: [...start.paymentPriority],
    scheduled: [],
    cardQueue: [],
    cardHistory: [],
    cooldowns: {},
    failure: { redAlertWeeks: 0, bankMissed: 0, agiotaMissed: 0 },
    history: [],
    decisionsLog: [],
    lessonsTriggered: [],
    ending: null,
    rngState: seed >>> 0,
    clock: blankClock(contentV1.time.startT, contentV1.time.defaultSpeed, contentV1.time.energy.max),
  };
  spawnTutorial(draft, contentV1);
  beginDay(draft, contentV1, []);
  return draft;
}
