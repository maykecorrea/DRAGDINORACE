import { useEffect, useMemo, useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import { installmentPitch } from "../../../../gf-engine/ledger.ts";
import { cheapestSupplierFor, missingMaterials } from "../../../../gf-engine/production.ts";
import type { GameState, MaterialId, SupplierId } from "../../../../gf-engine/state.ts";
import { Face } from "./Face";
import { GF, Interior, PixelFile } from "./pixel";
import { MenuPick } from "./v2/MenuPick";

type Term = "cash" | "prazo14" | "3x";

const ORDER: SupplierId[] = ["ferro_velho", "casco_tech", "megaosso", "rato"];

const ROOM: Record<SupplierId, { file: string; face: string }> = {
  ferro_velho: { file: "int_ferrovelho.png", face: "ze_femur" },
  casco_tech: { file: "int_cascotech.png", face: "npc_casco" },
  megaosso: { file: "int_megaosso.png", face: "npc_promo" },
  rato: { file: "int_rato.png", face: "rato" },
};

function ageOf(lot: NonNullable<GameState["inventory"][MaterialId]>): number {
  const batches = lot.batches?.map((batch) => batch.ageWeeks) ?? [];
  return Math.max(lot.ageWeeks, ...batches, 0);
}

function termsOf(supplier: Content["suppliers"][number]): Term[] {
  const terms: Term[] = ["cash"];
  if (supplier.creditDays != null) terms.push("prazo14");
  if (supplier.installments != null) terms.push("3x");
  return terms;
}

export function StockDesk({
  state,
  pack,
  busy,
  focus,
  mode = "counter",
  lockSupplier,
  backLabel = "Voltar ao pátio",
  onAct,
  onBack,
  onClearFocus,
  onMap,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  focus: { material: MaterialId; qty: number } | null;
  mode?: "shelf" | "counter";
  lockSupplier?: SupplierId;
  backLabel?: string;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
  onClearFocus: () => void;
  onMap?: () => void;
}) {
  const [tab, setTab] = useState<SupplierId>(lockSupplier ?? "ferro_velho");
  const [cart, setCart] = useState<Partial<Record<MaterialId, number>>>({});
  const [term, setTerm] = useState<Term>("cash");
  const [scrapId, setScrapId] = useState<MaterialId>("oleo");
  const [scrapQty, setScrapQty] = useState(1);
  const supplier = pack.suppliers.find((item) => item.id === (lockSupplier ?? tab)) ?? pack.suppliers[0]!;
  const scrapRate = pack.suppliers.find((item) => item.id === "ferro_velho")?.scrapBuy ?? 0.4;

  useEffect(() => {
    if (!focus) return;
    if (!lockSupplier) {
      const next = cheapestSupplierFor(focus.material, Math.max(1, focus.qty), state, pack) ?? "ferro_velho";
      setTab(next);
    }
    setTerm("cash");
    setCart({ [focus.material]: Math.max(1, focus.qty) });
  }, [focus, pack, state, lockSupplier]);

  const rows = useMemo(() => {
    return pack.materials.map((material) => {
      const lot = state.inventory[material.id];
      const qty = lot?.qty ?? 0;
      const avg = lot?.avgCost ?? 0;
      return { material, qty, avg, total: qty * avg, age: lot ? ageOf(lot) : 0 };
    });
  }, [pack.materials, state.inventory]);

  const priced = pack.materials
    .map((material) => {
      const price = supplier.prices[material.id];
      const qty = cart[material.id] ?? 0;
      return price == null ? null : { material, price, qty, min: supplier.minOrder?.[material.id] };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
  const cost = priced.reduce((sum, row) => sum + row.price * row.qty, 0);
  const terms = termsOf(supplier);
  const activeTerm = terms.includes(term) ? term : "cash";
  const pitch = supplier.installments ? installmentPitch(cost, supplier.installmentMarkup ?? 0, supplier.installments) : null;
  const short = priced.find((row) => row.qty > 0 && row.min != null && row.qty < row.min);
  const creditBlock = creditReason(state, supplier, cost);
  const stocked = rows.filter((row) => row.qty > 0);
  const scrap = stocked.find((row) => row.material.id === scrapId) ?? stocked[0];
  const scrapPay = scrap ? Math.round(scrap.avg * Math.min(scrapQty, scrap.qty) * scrapRate) : 0;
  const inbound = state.inbound ?? [];

  function setQty(id: MaterialId, qty: number) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  const buyDisabled = busy || cost <= 0 || short != null || (activeTerm === "prazo14" && creditBlock != null);
  const gaps = state.jobs.flatMap((job) =>
    missingMaterials(state, pack, job).map((row) => ({
      key: `${job.id}-${row.material}`,
      service: pack.services.find((item) => item.id === job.service)?.nome ?? "Reparo",
      material: pack.materials.find((item) => item.id === row.material)?.nome ?? row.material,
      have: row.have,
      need: row.need,
    })),
  );

  if (mode === "shelf") {
    return (
      <section className="gf-screen">
        <button type="button" onClick={onBack}>
          {backLabel}
        </button>
        <h2 className="gf-kicker">Prateleira</h2>
        <p>Todo conserto usa peças. Sem peça na prateleira, o carro não entra na baia. As lojas ficam na cidade: a caminhada gasta tempo, não PA.</p>
        {state.garage.level >= 4 && <p>A loja da oficina revende sucata 10% mais cara.</p>}
        {focus && missingName(pack, focus) && (
          <p className="gf-banner">
            Falta {missingName(pack, focus)} ×{focus.qty}
          </p>
        )}
        {rows.map((row) => (
          <article key={row.material.id} className={`gf-panel gf-line${focus?.material === row.material.id ? " is-hot" : ""}`}>
            <PixelFile file={GF.material(row.material.icone)} />
            <strong>{row.material.nome}</strong>
            <span>Qtd. {row.qty}</span>
            <span>Preço médio {formatF(row.avg)}</span>
            <span>Valor {formatF(row.total)}</span>
            <span>
              Idade {row.age} sem
              {row.age > 4 && (
                <span className="gf-rust" title="Parado há mais de 4 semanas. O ferro enferruja.">
                  <PixelFile file={GF.rust} /> ferrugem
                </span>
              )}
            </span>
          </article>
        ))}
        {stocked.length === 0 && <p>A prateleira está vazia.</p>}
        {gaps.length > 0 && (
          <div className="gf-panel">
            <h3>Falta para o conserto</h3>
            <ul>
              {gaps.map((gap) => (
                <li key={gap.key}>
                  {gap.service}: {gap.material} {gap.have}/{gap.need}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inbound.length > 0 && (
          <p>
            A caminho:{" "}
            {inbound
              .map((order) => order.items.map((item) => `${item.qty} ${pack.materials.find((material) => material.id === item.material)?.nome ?? item.material}`).join(", "))
              .join(" · ")}
          </p>
        )}
        <div className="gf-panel">
          <h3>Vender sucata</h3>
          {scrap ? (
            <div className="gf-fields">
              <label>
                Material
                <MenuPick
                  label="Sucata"
                  value={scrap.material.id}
                  options={stocked.map((row) => ({ value: row.material.id, label: `${row.material.nome} (${row.qty})` }))}
                  onChange={(id) => setScrapId(id)}
                />
              </label>
              <label>
                Quantidade
                <input
                  inputMode="numeric"
                  aria-label="Quantidade de sucata"
                  value={scrapQty}
                  onChange={(event) => setScrapQty(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <button
                type="button"
                className="gf-go"
                disabled={busy || scrapQty > scrap.qty}
                onClick={() => onAct({ type: "SELL_SCRAP", material: scrap.material.id, qty: Math.min(scrapQty, scrap.qty) })}
              >
                Vender sucata
              </button>
            </div>
          ) : (
            <p className="gf-dim">Não tem sucata na prateleira.</p>
          )}
          <p className="gf-dim">O Ferro-Velho paga 40% do que você pagou{scrap ? `: ${formatF(scrapPay)}` : ""}.</p>
        </div>
        {onMap && (
          <button type="button" className="gf-go" onClick={onMap}>
            Abrir o mapa da cidade
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        {backLabel}
      </button>
      <Interior file={ROOM[lockSupplier ?? tab].file} />
      <div className="gf-row">
        <Face id={ROOM[lockSupplier ?? tab].face} />
        <h2 className="gf-kicker">{supplier.nome}</h2>
      </div>
      <p>Na prateleira: {stocked.length > 0 ? stocked.map((row) => `${row.material.nome} ${row.qty}`).join(" · ") : "vazia"}.</p>
      {focus && (
        <p className="gf-banner">
          Comprar {pack.materials.find((item) => item.id === focus.material)?.nome}: faltam {focus.qty}{" "}
          <button type="button" onClick={onClearFocus}>
            Limpar
          </button>
        </p>
      )}
      {focus && supplier.prices[focus.material] == null && (
        <p className="gf-danger">Esse balcão não vende {pack.materials.find((item) => item.id === focus.material)?.nome}.</p>
      )}
      {inbound.length > 0 && <p className="gf-dim">Tem pedido a caminho. Ele chega na oficina, não aqui.</p>}
      {!lockSupplier && (
      <div className="gf-row" role="tablist" aria-label="Fornecedores">
        {ORDER.map((id) => {
          const row = pack.suppliers.find((item) => item.id === id);
          if (!row) return null;
          return (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "gf-go" : undefined} onClick={() => setTab(id)}>
              <PixelFile file={GF.supplier(id)} /> {row.nome}
            </button>
          );
        })}
      </div>
      )}
      <div className="gf-panel">
        <p>{supplier.pagamento}</p>
        {supplier.id === "megaosso" && <p>Atacado do Megaosso. Cada peça tem um mínimo. Dá para pagar em 3 vezes.</p>}
        {supplier.id === "ferro_velho" && <p>Balcão do Zé. Peça avulsa, só à vista. Sem bobina.</p>}
        <p>{qualityLine(supplier.qualityMod)}{supplier.defect ? ` · ${Math.round(supplier.defect * 100)}% defeituoso` : ""}</p>
        {supplier.minOrder && (
          <p>
            Mínimo:{" "}
            {Object.entries(supplier.minOrder)
              .map(([id, qty]) => `${pack.materials.find((item) => item.id === id)?.nome ?? id} ${qty}`)
              .join(" · ")}
          </p>
        )}
        {priced.map((row) => (
          <label key={row.material.id} className="gf-buyline">
            <PixelFile file={GF.material(row.material.icone)} />
            {row.material.nome} · {formatF(row.price)}
            <input
              inputMode="numeric"
              aria-label={`Quantidade de ${row.material.nome}`}
              value={row.qty || ""}
              placeholder="0"
              onChange={(event) => setQty(row.material.id, Number(event.target.value) || 0)}
            />
          </label>
        ))}
        <div className="gf-row" role="group" aria-label="Como pagar">
          {terms.map((item) => (
            <button key={item} type="button" aria-pressed={activeTerm === item} className={activeTerm === item ? "gf-go" : undefined} onClick={() => setTerm(item)}>
              {item === "cash" ? "À vista" : item === "prazo14" ? "14 dias" : "3×"}
            </button>
          ))}
        </div>
        {activeTerm === "3x" && pitch ? (
          <div>
            <p>3× de {formatF(pitch.each)} sem burocracia</p>
            <p className="gf-dim">Total: {formatF(pitch.total)}</p>
          </div>
        ) : (
          <p>{activeTerm === "prazo14" ? `Em 14 dias: ${formatF(cost)}` : `À vista: ${formatF(cost)}`}</p>
        )}
        {short && (
          <p className="gf-danger">
            Pedido mínimo: {short.material.nome} {short.min}
          </p>
        )}
        {activeTerm === "prazo14" && creditBlock && <p className="gf-danger">{creditBlock}</p>}
        {supplier.id === "rato" && <p>Peça do Beco do Rato, sem garantia. A gangue pode cobrar 10% a mais.</p>}
        <button
          type="button"
          className="gf-go"
          disabled={buyDisabled}
          onClick={() =>
            onAct({
              type: "BUY",
              supplier: supplier.id,
              terms: activeTerm,
              items: priced.filter((row) => row.qty > 0).map((row) => ({ material: row.material.id, qty: row.qty })),
            })
          }
        >
          {busy ? "Enviando…" : "Fazer pedido"}
        </button>
      </div>
    </section>
  );
}

function missingName(pack: Content, focus: { material: MaterialId; qty: number }): string | undefined {
  return pack.materials.find((item) => item.id === focus.material)?.nome;
}

function qualityLine(mod: number): string {
  const n = Math.round(mod * 100);
  if (n === 0) return "Qualidade normal";
  return `${n < 0 ? "−" : "+"}${Math.abs(n)}% de sucesso`;
}

function creditReason(state: GameState, supplier: Content["suppliers"][number], cost: number): string | null {
  if (supplier.creditDays == null) return null;
  if (state.rep < (supplier.creditRep ?? 0)) return `Pagar depois pede fama ${supplier.creditRep}. Você tem ${state.rep}.`;
  if (state.flags.negativado === true) return "O nome está sujo. A Casco-Tech recusou.";
  const open = state.debts.filter((debt) => debt.template === "fornecedor_casco" && debt.balance > 0).reduce((sum, debt) => sum + debt.balance, 0);
  if (open + cost > (supplier.creditLimit ?? 0)) return "O limite da Casco-Tech não cobre esse pedido.";
  return null;
}
