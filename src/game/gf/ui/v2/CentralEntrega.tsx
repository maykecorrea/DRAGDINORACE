import { useState } from "react";
import { partsOf } from "../../../../../gf-engine/clock.ts";
import { formatF } from "../../../../../gf-engine/format.ts";
import { CARRIERS, TIOZAO_PRICES, deliveryQuote, type CarrierId } from "../../../../../gf-engine/production.ts";
import type { GameState, MaterialId } from "../../../../../gf-engine/state.ts";
import { FOODS, type FoodId } from "../../../../../gf-engine/body.ts";
import { ArtBtn, Stepper, Tela, tela } from "./OficinaTelas";

const Q = "19";
const PARTS = ["kit", "oleo", "chapa", "cabo", "osso"] as const;
const NAMES: Record<string, string> = {
  kit: "Kit parafuso",
  oleo: "Óleo fóssil",
  chapa: "Chapa",
  cabo: "Cabo de nave",
  osso: "Osso",
};

function art(file: string): string {
  return `/assets/gf/v2/entrega/${file}.png?v=${Q}`;
}

function hours(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  const whole = Math.round(minutes / 60);
  return whole === 1 ? "1 hora" : `${whole} horas`;
}

function lossLabel(loss: number): string {
  if (loss <= 0.005) return "0,5% some no caminho";
  return "1% some no caminho";
}

export function CentralTela({
  state,
  busy,
  onAct,
  onClose,
}: {
  state: GameState;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState<Partial<Record<MaterialId, number>>>({});
  const [foodQty, setFoodQty] = useState<Partial<Record<FoodId, number>>>({});
  const [note, setNote] = useState<string | null>(null);
  const [carrier, setCarrier] = useState<CarrierId>("dinoturbo");
  const [sure, setSure] = useState(false);
  const lines = PARTS.flatMap((id) => {
    const price = TIOZAO_PRICES[id];
    if (price == null) return [];
    return [{ id, nome: NAMES[id] ?? id, price, qty: qty[id] ?? 0 }];
  });
  const menu = FOODS.filter((food) => food.stall && food.price > 0);
  const foods = menu.map((food) => ({ ...food, qty: foodQty[food.id] ?? 0 }));
  const units = lines.reduce((sum, row) => sum + row.qty, 0) + foods.reduce((sum, row) => sum + row.qty, 0);
  const goods = lines.reduce((sum, row) => sum + row.qty * row.price, 0) + foods.reduce((sum, row) => sum + row.qty * row.price, 0);
  const quote = deliveryQuote(Math.max(units, 0), carrier);
  const total = goods + (units > 0 ? quote.freight : 0);
  const broke = units > 0 && state.cash - total < -state.overdraftLimit;
  const orders = (state.inbound ?? []).filter((order) => order.carrier === "dinoturbo" || order.carrier === "dinodrone");
  return (
    <Tela title="Central de entrega" bg={art("bg_central_entrega")} focus="50% 45%" onClose={onClose}>
      <img className="gf-clerk" src={art("personagem_atendente")} alt="" />
      <section className="gf-order">
        <img className="gf-clip-bg" src={tela("tela_moldura_painel")} alt="" />
        <div>
          <b>Estoque do Tiozão</b>
          <ul>
            {lines.map((row) => (
              <li key={row.id}>
                <img src={`/assets/gf/v2/pecas/peca_${row.id}.png?v=${Q}`} alt="" />
                <span>
                  <b>{NAMES[row.id] ?? row.id}</b>
                  <small>{formatF(row.price)}</small>
                  <Stepper value={row.qty} min={0} max={9} label={NAMES[row.id] ?? row.id} onChange={(value) => { setSure(false); setQty((prev) => ({ ...prev, [row.id]: value })); }} />
                </span>
              </li>
            ))}
          </ul>
          <b>Comida</b>
          <ul>
            {foods.map((row) => (
              <li key={row.id}>
                <img src={`/assets/gf/map/itens/comida/${row.file}?v=19`} alt="" />
                <span>
                  <b>{row.nome}</b>
                  <small>{formatF(row.price)}</small>
                  <Stepper value={row.qty} min={0} max={9} label={row.nome} onChange={(value) => { setSure(false); setFoodQty((prev) => ({ ...prev, [row.id]: value })); }} />
                </span>
              </li>
            ))}
          </ul>
          <p>{units === 0 ? "Escolhe peça ou comida." : `${units} ${units === 1 ? "item" : "itens"} · mercadoria ${formatF(goods)} · frete ${formatF(quote.freight)}`}</p>
          {note && <p className="gf-order-note">{note}</p>}
        </div>
      </section>
      <section className="gf-carriers">
        {(Object.keys(CARRIERS) as CarrierId[]).map((id) => {
          const row = CARRIERS[id];
          const preview = deliveryQuote(units, id);
          const on = carrier === id;
          return (
            <button key={id} type="button" className={`gf-carrier${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => { setCarrier(id); setSure(false); }}>
              <img className="gf-carrier-card" src={art(id === "dinoturbo" ? "entrega_card_turbo" : "entrega_card_drone")} alt="" />
              <img className="gf-carrier-ico" src={art(id === "dinoturbo" ? "entrega_icone_moto" : "entrega_icone_drone")} alt="" />
              <span>
                <b>{row.nome}</b>
                <small>{row.frase}</small>
                <small>Frete {units > 0 ? formatF(preview.freight) : `desde ${formatF(preview.freight)}`}</small>
                <small><img src={art("entrega_icone_relogio")} alt="" /> {hours(preview.minutes)}</small>
                <small>{lossLabel(row.loss)}</small>
              </span>
            </button>
          );
        })}
      </section>
      <div className="gf-order-foot">
        <p>{units > 0 ? `Total ${formatF(total)} · frete ${formatF(quote.freight)}` : "Quanto mais item, maior o frete."}</p>
        <ArtBtn
          kind={units > 0 && !broke ? "primario" : "desativado"}
          disabled={busy || units <= 0 || broke}
          title={broke ? "O limite do banco não cobre." : undefined}
          onClick={() => {
            if (!sure) {
              setSure(true);
              setNote(`Confira: ${formatF(total)} saem do caixa. Toque de novo para confirmar.`);
              return;
            }
            const nome = carrier === "dinodrone" ? "DinoDrone" : "DinoTurbo";
            const eta = hours(quote.minutes);
            onAct({
              type: "ORDER_PARTS",
              carrier,
              items: lines.filter((row) => row.qty > 0).map((row) => ({ material: row.id, qty: row.qty })),
              foods: foods.filter((row) => row.qty > 0).map((row) => ({ food: row.id, qty: row.qty })),
            });
            setQty({});
            setFoodQty({});
            setSure(false);
            setNote(`Pedido confirmado. O ${nome} saiu com a carga. ${formatF(total)} saiu do caixa. Chega em ${eta}.`);
          }}
        >
          {sure ? "Confirmar pedido" : "Pedir agora"}
        </ArtBtn>
        {broke && <small>O limite do banco não cobre.</small>}
      </div>
      <section className="gf-routes" aria-label="Pedidos a caminho">
        {orders.length === 0 && (
          <div className="gf-route">
            <img className="gf-route-road" src={art("entrega_trilho")} alt="" />
            <img className="gf-route-pin" src={art("entrega_pino")} alt="" style={{ left: "8%" }} />
            <span className="gf-route-rider" style={{ left: "8%" }}>
              <img className="gf-rider" src={art("personagem_entregador_dinoturbo")} alt="" />
              <img className="gf-bike" src={art("moto_dinoturbo")} alt="" />
            </span>
            <p>A rota anda quando o pedido sai.</p>
          </div>
        )}
        {orders.map((order) => {
            const now = state.clock?.t ?? 0;
            const start = order.fromT ?? now;
            const end = order.arriveT ?? start + 60;
            const pct = Math.max(4, Math.min(96, ((now - start) / Math.max(1, end - start)) * 100));
            const left = Math.max(0, end - now);
            const drone = order.carrier === "dinodrone";
            return (
              <div key={order.id} className="gf-route animate-gf-buzz motion-reduce:animate-none">
                <img className="gf-route-road" src={art("entrega_trilho")} alt="" />
                <img className="gf-route-pin" src={art("entrega_pino")} alt="" style={{ left: `${pct}%` }} />
                <span className={`gf-route-rider${drone ? " is-drone" : ""}`} style={{ left: `${pct}%` }}>
                  {drone ? (
                    <img className="gf-drone" src={art("dinodrone")} alt="" />
                  ) : (
                    <>
                      <img className="gf-rider" src={art("personagem_entregador_dinoturbo")} alt="" />
                      <img className="gf-bike" src={art("moto_dinoturbo")} alt="" />
                    </>
                  )}
                </span>
                <p>
                  <img src={art(order.items.reduce((sum, item) => sum + item.qty, 0) > 2 ? "entrega_icone_caixas" : "entrega_icone_caixa")} alt="" />
                  {drone ? "DinoDrone" : "DinoTurbo"} · chega {left < 90 ? `em ${left} min` : hours(left)}
                  <small>{partsOf(end).hour}h{String(partsOf(end).minute).padStart(2, "0")}</small>
                </p>
              </div>
            );
          })}
      </section>
    </Tela>
  );
}
