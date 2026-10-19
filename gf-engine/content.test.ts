import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentV1, loadContent, marginPerAp, parseFile } from "./content.ts";
import { ContentError } from "./content.ts";
import { z } from "zod";
import { createInitialState } from "./initial.ts";
import { applyAction } from "./apply.ts";
import type { Content } from "./content.ts";

function pack(override?: (content: Content) => void): Content {
  const copy = structuredClone(contentV1);
  override?.(copy);
  return copy;
}

describe("pacote v1", () => {
  it("um custo fixo maior no JSON aumenta o fechamento sem mudar código", () => {
    const changed = pack((content) => {
      content.balance.fixed.living += 80;
    });
    let state = createInitialState(3, "Téo");
    for (let i = 0; i < 7; i += 1) state = applyAction(state, { type: "END_DAY" }, changed).state;
    assert.equal(state.history[0]?.fixed, 380);
  });

  it("um JSON inválido nomeia o arquivo e o campo", () => {
    assert.throws(
      () => parseFile("services.json", z.object({ ap: z.number().int() }), { ap: "dois" }),
      (err: unknown) => err instanceof ContentError && err.message.includes("services.json") && err.message.includes("ap"),
    );
    const broken = structuredClone(contentV1) as unknown as Parameters<typeof loadContent>[0];
    (broken.services as { ap: unknown }[])[0]!.ap = "dois";
    assert.throws(
      () =>
        loadContent({
          balance: contentV1.balance,
          materials: contentV1.materials,
          suppliers: contentV1.suppliers,
          services: broken.services,
          clients: contentV1.clients,
          employees: contentV1.employees,
          debtTemplates: contentV1.debtTemplates,
          savingsProducts: contentV1.savingsProducts,
          garageLevels: contentV1.garageLevels,
          carcasses: contentV1.carcasses,
          lessons: contentV1.lessons,
          time: contentV1.time,
          horarios: { versao: "1.0", nota: "teste", clientes: contentV1.horarios },
          cards: contentV1.cards,
        }),
      (err: unknown) => err instanceof ContentError && /services\.json: 0\.ap:/.test((err as Error).message),
    );
  });

  it("a margem por energia na Casco-Tech sai da receita menos o custo do material", () => {
    assert.equal(marginPerAp(contentV1, "oleo"), 82);
    assert.equal(marginPerAp(contentV1, "reparo"), 134);
    assert.equal(marginPerAp(contentV1, "funilaria"), 136);
    assert.equal(marginPerAp(contentV1, "eletrica"), 107);
    assert.equal(marginPerAp(contentV1, "motor"), 119);
    // A soma Casco (bobina 320 + osso 65×2 + cabo 90×2 + chapa 45×2) é 720.
    // (2200 − 720) / 8 = 185. A tabela do GDD cita 180, que pediria custo 760.
    assert.equal(marginPerAp(contentV1, "custom"), 185);
  });
});
