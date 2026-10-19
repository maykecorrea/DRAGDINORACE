import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playSeed } from "./sim.ts";

describe("simulador", () => {
  it("o ingênuo não atravessa o ano sem um fim", () => {
    const end = playSeed(1, "ingenuo");
    assert.ok(end.ending, "a campanha precisa terminar");
    assert.ok(end.ending.startsWith("F"));
    assert.ok(end.week < 20);
  });

  it("o medroso não chega na liberdade", () => {
    const end = playSeed(2, "medroso");
    assert.notEqual(end.ending, "liberdade");
  });
});
