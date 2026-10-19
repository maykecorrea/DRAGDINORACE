import { useState } from "react";
import type { Content } from "../../../../gf-engine/content.ts";
import { nextOpenLabel, partsOf, placeOpen, tintFor } from "../../../../gf-engine/clock.ts";
import { here, PLACES, supplierAt, travelCost, type PlaceId } from "../../../../gf-engine/district.ts";
import type { GameState, MaterialId } from "../../../../gf-engine/state.ts";

const MAP_W = 480;
const MAP_H = 188;

const FOLK: { src: string; x: number; y: number }[] = [
  { src: "w_teo", x: 88, y: 150 },
  { src: "w_operario", x: 168, y: 108 },
  { src: "w_executivo", x: 248, y: 62 },
  { src: "w_comerciante", x: 300, y: 100 },
  { src: "w_motoboy", x: 430, y: 96 },
  { src: "w_patrulheiro", x: 400, y: 140 },
];

const PIN: Record<PlaceId, { x: number; y: number }> = {
  rato: { x: 62, y: 34 },
  banco: { x: 230, y: 36 },
  ferro_velho: { x: 150, y: 78 },
  casco_tech: { x: 262, y: 74 },
  leilao: { x: 214, y: 112 },
  oficina: { x: 64, y: 108 },
  megaosso: { x: 412, y: 70 },
};

export function DistrictMap({
  state,
  pack,
  busy,
  focus,
  onAct,
  onBack,
  onCounter,
  onEnter,
}: {
  state: GameState;
  pack: Content;
  busy: boolean;
  focus: { material: MaterialId; qty: number } | null;
  onAct: (action: Record<string, unknown>) => void;
  onBack: () => void;
  onCounter: () => void;
  onEnter: (screen: "auction" | "bank" | "stock") => void;
}) {
  const spot = here(state);
  const [picked, setPicked] = useState<PlaceId>(spot);
  const t = state.clock?.t ?? pack.time?.startT ?? 360;
  const open = placeOpen(pack, picked, t);
  const tint = pack.time ? tintFor(pack, t) : { color: "#000000", opacity: 0 };
  const hour = partsOf(t).hour;
  const place = PLACES.find((item) => item.id === picked) ?? PLACES[0]!;
  const cost = travelCost(spot, picked);
  const backCost = place.cost;
  const ap = state.calendar.apLeft;
  const sellers = focus
    ? pack.suppliers.filter((item) => item.prices[focus.material] != null).map((item) => item.nome)
    : [];
  const missingName = focus ? pack.materials.find((item) => item.id === focus.material)?.nome : null;

  return (
    <section className="gf-screen gf-city">
      <div className="gf-mapwrap">
        <MapArt spot={spot} level={state.garage.level} tint={tint} hour={hour} closed={PLACES.filter((item) => !placeOpen(pack, item.id, t)).map((item) => item.id)} />
        {FOLK.map((folk) => (
          <span
            key={folk.src}
            className="gf-walker"
            style={{
              left: `${(folk.x / MAP_W) * 100}%`,
              top: `${(folk.y / MAP_H) * 100}%`,
              backgroundImage: `url(/assets/gf/map/sprites/${folk.src}.png?v=1)`,
            }}
          />
        ))}
        <button type="button" className="gf-mapback" onClick={onBack}>
          Pátio
        </button>
        {PLACES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`gf-pin${spot === item.id ? " is-here" : ""}${picked === item.id ? " is-pick" : ""}`}
            style={{ left: `${(PIN[item.id].x / MAP_W) * 100}%`, top: `${(PIN[item.id].y / MAP_H) * 100}%` }}
            aria-pressed={picked === item.id}
            onClick={() => setPicked(item.id)}
          >
            {item.short}
            {!placeOpen(pack, item.id, t) && (
              <>
                <img className="gf-placa" src="/assets/gf/map/ui/ui_placa_fechado.png?v=1" alt="" width={32} height={32} />
                <small className="gf-fechado" title="FECHADO">FECHADO</small>
              </>
            )}
            {item.cost > 0 && placeOpen(pack, item.id, t) && <small>{item.cost} PA</small>}
          </button>
        ))}
        <div className="gf-mapact">
          <p title={place.blurb}>
            <strong>{place.nome}</strong>
            {cost === 0 ? " · você está aqui" : picked === "oficina" ? ` · volta ${cost} PA` : ` · ida ${cost} PA, volta ${backCost} PA`}
            {!open && ` · abre ${nextOpenLabel(pack, picked, t)}`}
          </p>
          {missingName && (
            <p className="gf-banner">
              Falta {missingName}
              {focus ? ` ×${focus.qty}` : ""}. {sellers.length > 0 ? sellers.join(", ") : "Ninguém vende."}
            </p>
          )}
          <div className="gf-row">
            {cost > 0 && (
              <button type="button" className="gf-go" disabled={busy || ap < cost || !open} onClick={() => onAct({ type: "TRAVEL", place: picked })}>
                Caminhar ({cost} PA)
              </button>
            )}
            {cost === 0 && supplierAt(picked) && (
              <button type="button" className="gf-go" onClick={onCounter}>
                Abrir balcão
              </button>
            )}
            {cost === 0 && picked === "leilao" && (
              <button type="button" className="gf-go" onClick={() => onEnter("auction")}>
                Entrar no leilão
              </button>
            )}
            {cost === 0 && picked === "banco" && (
              <button type="button" className="gf-go" onClick={() => onEnter("bank")}>
                Entrar no banco
              </button>
            )}
            {cost === 0 && picked === "oficina" && (
              <button type="button" onClick={() => onEnter("stock")}>
                Ver a prateleira
              </button>
            )}
            <span className="gf-dim">{ap} PA no dia</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MapArt({ spot, level, tint, hour, closed }: { spot: PlaceId; level: number; tint: { color: string; opacity: number }; hour: number; closed: PlaceId[] }) {
  const pin = PIN[spot];
  const lv = Math.max(0, Math.min(5, Math.floor(level)));
  const art: Record<PlaceId, { src: string; w: number; h: number }> = {
    rato: { src: "/assets/gf/map/predios/b_toca_rato.png?v=1", w: 52, h: 52 },
    banco: { src: "/assets/gf/map/predios/b_banco.png?v=1", w: 78, h: 62 },
    ferro_velho: { src: "/assets/gf/map/predios/b_ferrovelho.png?v=1", w: 78, h: 62 },
    casco_tech: { src: "/assets/gf/map/predios/b_cascotech.png?v=1", w: 64, h: 56 },
    leilao: { src: "/assets/gf/map/predios/b_leilao.png?v=1", w: 64, h: 56 },
    oficina: { src: `/assets/gf/map/predios/b_garagem_l${lv}.png?v=1`, w: 78, h: 62 },
    megaosso: { src: "/assets/gf/map/predios/b_megaosso.png?v=1", w: 78, h: 62 },
  };
  const props = [
    { src: "/assets/gf/map/props/p_lixeira.png?v=1", x: 118, y: 128, w: 16, h: 16 },
    { src: "/assets/gf/map/props/p_poste.png?v=1", x: 188, y: 48, w: 14, h: 14 },
    { src: "/assets/gf/map/props/p_carro_sucata_1.png?v=1", x: 108, y: 96, w: 28, h: 21 },
    { src: "/assets/gf/map/props/p_cone.png?v=1", x: 250, y: 128, w: 14, h: 14 },
    { src: "/assets/gf/map/props/p_tambor.png?v=1", x: 360, y: 118, w: 16, h: 16 },
    { src: "/assets/gf/map/props/p_pneus.png?v=1", x: 96, y: 148, w: 16, h: 16 },
    { src: "/assets/gf/map/props/p_caixa_eletronico.png?v=1", x: 248, y: 8, w: 32, h: 32 },
  ];
  const night = hour >= 18 || hour < 6;
  const lights = [
    night ? { src: "/assets/gf/map/luzes/l_janela.png?v=1", x: 48, y: 78, w: 22, h: 16 } : null,
    night ? { src: "/assets/gf/map/luzes/l_poste.png?v=2", x: 196, y: 18, w: 28, h: 28 } : null,
    hour >= 15 || hour < 2 ? { src: "/assets/gf/map/luzes/l_letreiro_juca.png?v=1", x: 28, y: 18, w: 56, h: 14 } : null,
    hour >= 19 || hour < 5 ? { src: "/assets/gf/map/luzes/l_lanterna_patrulha.png?v=1", x: 390, y: 118, w: 36, h: 27 } : null,
    night ? { src: "/assets/gf/map/luzes/l_caixa_eletronico.png?v=1", x: 248, y: 8, w: 32, h: 32 } : null,
  ].filter((item) => item != null);
  return (
    <svg className="gf-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Mapa do Ossário, o piche em volta da oficina">
      <defs>
        <pattern id="gf-asfalto" width="16" height="16" patternUnits="userSpaceOnUse">
          <image href="/assets/gf/map/tiles/t_asfalto.png?v=1" width="16" height="16" />
        </pattern>
        <pattern id="gf-terra" width="16" height="16" patternUnits="userSpaceOnUse">
          <image href="/assets/gf/map/tiles/t_terra.png?v=1" width="16" height="16" />
        </pattern>
        <pattern id="gf-calcada" width="16" height="16" patternUnits="userSpaceOnUse">
          <image href="/assets/gf/map/tiles/t_calcada.png?v=1" width="16" height="16" />
        </pattern>
        <pattern id="gf-cinzas" width="16" height="16" patternUnits="userSpaceOnUse">
          <image href="/assets/gf/map/tiles/t_cinzas.png?v=1" width="16" height="16" />
        </pattern>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="url(#gf-asfalto)" />
      <rect x="8" y="86" width="100" height="70" fill="url(#gf-cinzas)" />
      <rect x="120" y="70" width="70" height="40" fill="url(#gf-terra)" />
      <rect x="340" y="40" width="120" height="50" fill="url(#gf-calcada)" />
      {props.map((item) => (
        <image key={item.src} href={item.src} x={item.x} y={item.y} width={item.w} height={item.h} />
      ))}
      {(Object.keys(art) as PlaceId[]).map((id) => {
        const item = art[id];
        const at = PIN[id];
        return (
          <image
            key={id}
            href={item.src}
            x={at.x - item.w / 2}
            y={at.y - item.h + 8}
            width={item.w}
            height={item.h}
            preserveAspectRatio="xMidYMax meet"
          />
        );
      })}
      <rect width={MAP_W} height={MAP_H} fill={tint.color} opacity={tint.opacity} />
      {lights.map((item) => (
        <image key={item.src} href={item.src} x={item.x} y={item.y} width={item.w} height={item.h} style={{ mixBlendMode: "plus-lighter" }} />
      ))}
      {closed.map((id) => (
        <image key={`fechado-${id}`} href="/assets/gf/map/ui/ui_placa_fechado.png?v=1" x={PIN[id].x - 16} y={PIN[id].y - 28} width={32} height={32} />
      ))}
      <rect x={pin.x - 3} y={pin.y - 16} width="6" height="6" fill="#7cff4f" />
      <rect x={pin.x - 1} y={pin.y - 10} width="2" height="6" fill="#f1e6c8" />
    </svg>
  );
}
