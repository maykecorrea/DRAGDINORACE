import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const V2 = "/assets/gf/v2";

export const art = {
  hud: (file: string) => `${V2}/hud/${file}`,
  mapa: (file: string) => `${V2}/mapa/${file}`,
  hub: (file: string) => `${V2}/hub/${file}`,
  ui: (file: string) => `${V2}/ui/${file}`,
  guia: (file: string) => `${V2}/guia/${file}`,
  predio: (file: string) => `${V2}/predios/${file}`,
  interior: (file: string) => `${V2}/interiores/${file}`,
  saude: (file: string) => `${V2}/saude/${file}`,
  doenca: (file: string) => `${V2}/doencas/${file}`,
  npc: (file: string) => `${V2}/npcs/${file}`,
  plano: (file: string) => `${V2}/planos/${file}`,
};

export function hubLevel(level: number): 0 | 1 | 2 | 3 {
  if (level <= 0) return 0;
  if (level === 1) return 1;
  if (level === 2) return 2;
  return 3;
}

export function skyFile(hour: number): string {
  if (hour < 6) return "mapa_cidade_madrugada.png";
  if (hour >= 18) return "mapa_cidade_noite.png";
  return "mapa_cidade_dia.png";
}

/** Palco 16:9 que preenche a tela. No retrato, arrasta para os lados. */
export function SceneFrame({ src, children, label }: { src: string; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, start: 0 });
  const [pan, setPan] = useState(0);

  function clamp(n: number) {
    const el = ref.current;
    if (!el) return n;
    const view = el.clientWidth;
    const scene = Math.max(view, el.clientHeight * (1376 / 768));
    const max = Math.max(0, (scene - view) / 2);
    return Math.max(-max, Math.min(max, n));
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    drag.current = { on: true, x: event.clientX, start: pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return (
    <div ref={ref} className="gf-frame" aria-label={label} onPointerDown={down} onPointerMove={(event) => {
      if (!drag.current.on) return;
      setPan(clamp(drag.current.start + event.clientX - drag.current.x));
    }} onPointerUp={() => { drag.current.on = false; }} onPointerCancel={() => { drag.current.on = false; }}>
      <div className="gf-scene" style={{ transform: `translateX(calc(-50% + ${pan}px))` }}>
        <img className="gf-scene-bg" src={src} alt="" draggable={false} />
        {children}
      </div>
    </div>
  );
}
