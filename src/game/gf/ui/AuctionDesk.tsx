import { useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { formatF } from "../../../../gf-engine/format.ts";
import type { GameState } from "../../../../gf-engine/state.ts";
import { Face } from "./Face";
import { Interior } from "./pixel";

export function AuctionDesk({
  state,
  pack,
  busy,
  onAct,
  onBack,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [price, setPrice] = useState("");
  const open = state.garage.level >= 1;
  const lots = state.auctionLots ?? [];
  return (
    <section className="gf-screen">
      <button type="button" onClick={onBack}>
        Voltar ao pátio
      </button>
      <Interior file="int_leilao.png" />
      <div className="gf-row">
        <Face id="npc_martelo" />
        <h2 className="gf-kicker">Leilão</h2>
      </div>
      {!open ? (
        <p>O pátio de carcaça abre quando a oficina estiver remendada.</p>
      ) : (
        <>
          {lots.length === 0 && <p>Sem lote nesta semana. O domingo traz dois.</p>}
          {lots.map((lot) => {
            const def = pack.carcasses.find((item) => item.id === lot.type);
            return (
              <article key={lot.id} className="gf-panel">
                <h3>{def?.nome ?? lot.type}</h3>
                <p>Pedido {formatF(lot.price)}</p>
                <p>{lot.revealed ? (lot.defect ? "Vício à vista. O conserto fica mais caro." : "Inspeção limpa.") : "Por fora, parece inteira."}</p>
                <div className="gf-fields">
                  <button type="button" disabled={busy || lot.revealed || state.calendar.apLeft < 1} onClick={() => onAct({ type: "INSPECT_LOT", id: lot.id })}>
                    Inspecionar (1 PA)
                  </button>
                  <button type="button" className="gf-go" disabled={busy} onClick={() => onAct({ type: "BUY_LOT", id: lot.id })}>
                    Comprar
                  </button>
                </div>
              </article>
            );
          })}
          {state.carcasses.map((carcass) => {
            const def = pack.carcasses.find((item) => item.id === carcass.type);
            const asked = Number(price);
            return (
              <article key={carcass.id} className="gf-panel">
                <h3>{def?.nome ?? carcass.type}</h3>
                <p>
                  Falta {carcass.apLeft} PA · paga {formatF(carcass.boughtFor)}
                  {carcass.hiddenDefect ? " · tem coisa escondida" : ""}
                </p>
                {carcass.apLeft > 0 ? (
                  <button type="button" disabled={busy || state.calendar.apLeft < 1} onClick={() => onAct({ type: "WORK_CARCASS", id: carcass.id })}>
                    Mão na carcaça (1 PA)
                  </button>
                ) : (
                  <div className="gf-fields">
                    <label>
                      Preço
                      <input inputMode="numeric" aria-label="Preço do anúncio" value={price} placeholder={String(def?.sell[1] ?? "")} onChange={(event) => setPrice(event.target.value)} />
                    </label>
                    <button
                      type="button"
                      className="gf-go"
                      disabled={busy}
                      onClick={() => onAct({ type: "LIST_CARCASS", id: carcass.id, price: Number.isInteger(asked) ? asked : undefined })}
                    >
                      Anunciar
                    </button>
                  </div>
                )}
                {carcass.listedPrice != null && <p>No anúncio: {formatF(carcass.listedPrice)}. O pátio cobra 20 ₣ por semana.</p>}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
