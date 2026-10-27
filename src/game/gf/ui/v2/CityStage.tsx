import { useEffect, useState } from "react";
import { partsOf } from "../../../../../gf-engine/clock.ts";
import type { Content } from "../../../../../gf-engine/content.ts";
import { here, type PlaceId } from "../../../../../gf-engine/district.ts";
import type { GameState, MaterialId } from "../../../../../gf-engine/state.ts";
import { LugarTela, type LugarKey } from "./LugarTela";
import { MapaMundi } from "./MapaMundi";
import { art } from "./scene";

export function CityStage({
  state,
  pack,
  busy,
  focus,
  aim,
  arrive,
  onEsc,
  onAct,
  onBack,
  onClients,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  focus: { material: MaterialId; qty: number } | null;
  aim?: PlaceId | null;
  arrive?: number;
  onEsc?: (handler: (() => boolean) | null) => void;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
  onCounter?: () => void;
  onEnter?: (screen: "auction" | "bank" | "stock" | "coliseu") => void;
  onClients?: () => void;
}) {
  const spot = here(state);
  const t = state.clock?.t ?? pack.time?.startT ?? 360;
  const hour = partsOf(t).hour;
  const [lugar, setLugar] = useState<LugarKey | null>(aim && aim !== "oficina" ? aim : null);
  const [walk, setWalk] = useState<string>(aim && aim !== "oficina" ? aim : spot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onEsc?.(() => {
      if (lugar) {
        setLugar(null);
        return true;
      }
      return false;
    });
    return () => onEsc?.(null);
  }, [lugar, onEsc]);

  useEffect(() => {
    if (!aim || aim === "oficina") return;
    setWalk(aim);
    setLugar(aim);
  }, [aim, arrive]);

  function openPlace(id: string) {
    if (id === "oficina") {
      setWalk("oficina");
      setLugar(null);
      if (spot === "oficina") onBack();
      else onAct({ type: "TRAVEL", place: "oficina" });
      return;
    }
    setWalk(id);
    setLugar(id as LugarKey);
  }

  return (
    <div className="gf-city2">
      {!ready && <p className="gf-spin">Abrindo o mapa…</p>}
      <MapaMundi state={state} pack={pack} dest={walk} hour={hour} onOpen={openPlace} onReady={() => setReady(true)} />
      <button type="button" className="gf-map-x" aria-label="Fechar mapa" onClick={onBack}>
        <img src={art.mapa("btn_fechar_mapa.png?v=10")} alt="" />
      </button>
      {lugar && (
        <LugarTela
          id={lugar}
          state={state}
          pack={pack}
          busy={busy}
          focus={focus}
          onAct={onAct}
          onClose={() => setLugar(null)}
          onClients={onClients}
          onJump={(next) => {
            setWalk(next);
            setLugar(next);
          }}
        />
      )}
    </div>
  );
}
