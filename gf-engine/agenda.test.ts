import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgenda } from "./agenda.ts";
import { weekBurn } from "./campaign.ts";
import { contentV1 } from "./content.ts";
import { createInitialState } from "./initial.ts";
import type { Job } from "./state.ts";

function job(over: Partial<Job>): Job {
  return {
    id: "job-1",
    leadId: "lead-1",
    service: "oleo",
    price: 110,
    depositPaid: 0,
    apNeeded: 1,
    apDone: 0,
    assignedTo: "teo",
    dueWeek: 0,
    dueDay: 1,
    status: "in_progress",
    reworks: 0,
    materialSource: "ferro_velho",
    ...over,
  };
}

describe("agenda", () => {
  it("domingo lista o boleto do banco e as contas da oficina", () => {
    const state = createInitialState(3, "Téo");
    const items = buildAgenda(state, contentV1);
    const boleto = items.find((item) => item.id === "boleto-banco_pai");
    const conta = items.find((item) => item.id === "conta-oficina");
    assert.ok(boleto);
    assert.equal(boleto.kind, "boleto");
    assert.equal(boleto.amount, 300);
    assert.equal(boleto.day, 7);
    assert.equal(boleto.late, false);
    assert.ok(conta);
    assert.equal(conta.amount, weekBurn(state, contentV1));
    assert.equal(conta.day, 7);
    assert.equal(items.some((item) => item.title.includes("Torneio")), true);
    assert.equal(items.filter((item) => item.kind === "cidade" && item.title.startsWith("Evento")).length, 7);
  });

  it("entrega vencida sobe, pedido a caminho entra e recado escondido fica de fora", () => {
    const state = createInitialState(4, "Téo");
    state.calendar.day = 3;
    state.jobs = [job({ dueWeek: 0, dueDay: 1, status: "ready" })];
    state.inbound = [{ id: "ped-1", supplier: "megaosso", items: [{ material: "kit", qty: 2, unitCost: 10 }], atWeek: 0, atDay: 4 }];
    state.scheduled = [
      { atWeek: 1, atDay: 2, source: "segredo", hidden: true },
      { atWeek: 1, atDay: 3, source: "visita", hidden: false },
    ];
    const items = buildAgenda(state, contentV1);
    assert.equal(items[0]?.late, true);
    assert.equal(items[0]?.id, "job-job-1");
    assert.equal(items.some((item) => item.id === "in-ped-1" && item.title.includes("Megaosso")), true);
    assert.equal(items.some((item) => item.detail === "segredo" || item.title.includes("segredo")), false);
    assert.equal(items.some((item) => item.id.startsWith("sch-1-3")), true);
  });
});
