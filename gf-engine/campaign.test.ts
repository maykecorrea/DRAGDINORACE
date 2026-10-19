import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction } from "./apply.ts";
import { campaignScore } from "./campaign.ts";
import { contentV1 } from "./content.ts";
import { createInitialState } from "./initial.ts";

describe("campanha", () => {
  it("o placar usa patrimônio, nível, lição, golpe e o fim", () => {
    const state = createInitialState(1, "Téo");
    state.ending = "prosperidade";
    state.garage.level = 2;
    state.lessonsTriggered = ["L01", "L03"];
    state.flags.gangDown = true;
    state.flags.scams_taken = 1;
    const worth = campaignScore(state, contentV1);
    assert.equal(typeof worth, "number");
    assert.ok(worth > 5000);
  });

  it("a obra só troca a placa no domingo", () => {
    const state = createInitialState(3, "Téo");
    state.cash = 9000;
    state.rep = 40;
    const started = applyAction(state, { type: "UPGRADE", mode: "vista" }, contentV1);
    assert.equal(started.state.garage.level, 0);
    assert.equal(started.state.garage.upgradingTo, 1);
    let next = started.state;
    for (let i = 0; i < 8 && next.garage.level === 0 && !next.ending; i += 1) {
      next = applyAction(next, { type: "END_DAY" }, contentV1).state;
    }
    assert.equal(next.garage.level, 1);
  });

  it("a lição aberta se lê uma vez", () => {
    const state = createInitialState(5, "Téo");
    state.lessonsTriggered = ["L01"];
    state.flags.lessonPop = "L01";
    const read = applyAction(state, { type: "READ_LESSON", id: "L01" }, contentV1);
    assert.equal(read.state.flags.read_L01, true);
    assert.equal(read.state.flags.lessonPop, undefined);
    const again = applyAction(read.state, { type: "READ_LESSON", id: "L01" }, contentV1);
    assert.equal(again.state.rep, read.state.rep);
  });

  it("sem oficina remendada o leilão não mexe no domingo", () => {
    const state = createInitialState(9, "Lia");
    assert.equal(state.garage.level, 0);
    let next = state;
    for (let i = 0; i < 7 && !next.ending; i += 1) next = applyAction(next, { type: "END_DAY" }, contentV1).state;
    assert.equal(next.auctionLots?.length ?? 0, 0);
  });
});
