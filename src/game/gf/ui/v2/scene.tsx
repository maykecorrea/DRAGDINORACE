import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

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

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.4;

function clampZoom(value: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

/** Palco 16:9. No mapa, a cidade inteira cabe na tela; a roda, a pinça e o arrasto aproximam. */
export function SceneFrame({
  src,
  children,
  label,
  roam = false,
  focus,
  onReady,
  onEmpty,
}: {
  src: string;
  children: ReactNode;
  label: string;
  roam?: boolean;
  focus?: { x: number; y: number } | null;
  onReady?: () => void;
  onEmpty?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, moved: false, x: 0, y: 0, startX: 0, startY: 0 });
  const suppress = useRef(false);
  const vel = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0, t: 0 });
  const raf = useRef(0);
  const userMoved = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [grab, setGrab] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hint, setHint] = useState(false);
  const zoomRef = useRef(1);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mark = () => {
      el.querySelectorAll("img").forEach((img) => img.setAttribute("draggable", "false"));
    };
    mark();
    const watch = new MutationObserver(mark);
    watch.observe(el, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      setNarrow(el.clientWidth < 900);
      setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    if (!roam) return;
    try {
      setHint(localStorage.getItem("gf-map-hint") !== "1");
    } catch {
      setHint(true);
    }
  }, [roam]);

  useEffect(() => {
    if (roam) return;
    cancelAnimationFrame(raf.current);
    drag.current.on = false;
    suppress.current = false;
    vel.current = { x: 0, y: 0 };
    setGrab(false);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [roam]);

  const fitHub = !roam && narrow;
  const fitW = box.w > 0 && box.h > 0 ? Math.min(box.w, box.h * (1376 / 768)) : 0;
  const sceneW = roam ? fitW * zoom : box.w > 0 ? Math.max(box.w, box.h * (1376 / 768)) : 0;
  const sceneH = sceneW > 0 ? sceneW * (768 / 1376) : 0;

  function limitsFor(z: number) {
    const w = fitW * z;
    const h = w > 0 ? w * (768 / 1376) : 0;
    return {
      x: Math.max(0, (w - box.w) / 2),
      y: Math.max(0, (h - box.h) / 2),
    };
  }

  function clampAt(x: number, y: number, z: number) {
    const lim = limitsFor(z);
    return {
      x: Math.max(-lim.x, Math.min(lim.x, x)),
      y: Math.max(-lim.y, Math.min(lim.y, y)),
    };
  }

  function centerOn(point: { x: number; y: number }, z: number) {
    if (fitW <= 0) return;
    const w = fitW * z;
    const h = w * (768 / 1376);
    const x = (0.5 - point.x / 100) * w;
    const y = (0.5 - point.y / 100) * h;
    setPan(clampAt(x, y, z));
  }

  useEffect(() => {
    if (!roam || !focus || fitW <= 0 || userMoved.current || zoom < 1.15) return;
    centerOn(focus, zoom);
    // recentra no Téo só depois que o jogador aproximou e ainda não arrastou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roam, focus?.x, focus?.y, fitW, zoom]);

  useEffect(() => {
    if (!roam) return;
    setPan((now) => clampAt(now.x, now.y, zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, box.w, box.h, roam]);

  function forgetHint() {
    if (!hint) return;
    setHint(false);
    try {
      localStorage.setItem("gf-map-hint", "1");
    } catch {
      /* o navegador pode recusar */
    }
  }

  useEffect(() => {
    const el = ref.current;
    if (!el || !roam) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0011);
      userMoved.current = true;
      setHint(false);
      try {
        localStorage.setItem("gf-map-hint", "1");
      } catch {
        /* ignore */
      }
      setZoom((now) => clampZoom(now * factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [roam]);

  function down(event: PointerEvent<HTMLDivElement>) {
    if (!roam) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), zoom: zoomRef.current };
      drag.current.on = false;
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, .gf-pan")) return;
    cancelAnimationFrame(raf.current);
    vel.current = { x: 0, y: 0 };
    drag.current = { on: true, moved: false, x: event.clientX, y: event.clientY, startX: panRef.current.x, startY: panRef.current.y };
    last.current = { x: event.clientX, y: event.clientY, t: performance.now() };
  }

  function coast() {
    if (!roam) return;
    const step = () => {
      vel.current.x *= 0.92;
      vel.current.y *= 0.92;
      if (Math.hypot(vel.current.x, vel.current.y) < 0.4) return;
      setPan((now) => clampAt(now.x + vel.current.x, now.y + vel.current.y, zoomRef.current));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (roam && drag.current.moved) {
      suppress.current = true;
      coast();
    }
    drag.current.on = false;
    setGrab(false);
  }

  function nudge(dx: number, dy: number) {
    userMoved.current = true;
    forgetHint();
    const nextZoom = zoomRef.current < 1.08 ? 1.45 : zoomRef.current;
    if (nextZoom !== zoomRef.current) setZoom(nextZoom);
    setPan((now) => clampAt(now.x + dx, now.y + dy, nextZoom));
  }

  return (
    <div
      ref={ref}
      className={`gf-frame${roam ? " is-roam" : ""}${grab ? " is-drag" : ""}`}
      aria-label={label}
      onPointerDown={down}
      onClickCapture={(event) => {
        if (!suppress.current) return;
        suppress.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        if (suppress.current) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("button, a, input, textarea")) return;
        onEmpty?.();
      }}
      onPointerMove={(event) => {
        if (!roam) return;
        if (pointers.current.has(event.pointerId)) {
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }
        if (pinch.current && pointers.current.size >= 2) {
          const [a, b] = [...pointers.current.values()];
          const dist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
          userMoved.current = true;
          forgetHint();
          setZoom(clampZoom(pinch.current.zoom * (dist / pinch.current.dist)));
          return;
        }
        if (!drag.current.on) return;
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        if (!drag.current.moved && Math.hypot(dx, dy) < 8) return;
        if (!drag.current.moved && zoomRef.current < 1.08) {
          zoomRef.current = 1.25;
          setZoom(1.25);
        }
        if (!drag.current.moved) event.currentTarget.setPointerCapture(event.pointerId);
        drag.current.moved = true;
        userMoved.current = true;
        setGrab(true);
        forgetHint();
        const now = performance.now();
        const dt = Math.max(16, now - last.current.t);
        vel.current = { x: ((event.clientX - last.current.x) / dt) * 16, y: ((event.clientY - last.current.y) / dt) * 16 };
        last.current = { x: event.clientX, y: event.clientY, t: now };
        setPan(clampAt(drag.current.startX + dx, drag.current.startY + dy, zoomRef.current));
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className={`gf-scene${roam ? " is-roam" : ""}${fitHub ? " is-fit" : ""}`}
        style={
          fitHub
            ? undefined
            : roam && sceneW > 0
              ? { width: sceneW, height: sceneH, top: "50%", left: "50%", transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`, ["--gf-z" as string]: String(Math.sqrt(zoom)) }
              : { transform: "translateX(-50%)", ["--gf-z" as string]: "1" }
        }
      >
        <img className="gf-scene-bg" src={src} alt="" draggable={false} onLoad={onReady} onError={onReady} />
        {children}
      </div>
      {roam && hint && <p className="gf-draghint">Roda, pinça ou as setas aproximam. Arraste para olhar.</p>}
      {roam && (
        <div className="gf-pans">
          <button type="button" className="gf-pan gf-pan-n" aria-label="Ver o norte" onClick={() => nudge(0, 140)}>
            <img src={art.mapa("mapa_seta_pan.png?v=10")} alt="" />
          </button>
          <button type="button" className="gf-pan gf-pan-e" aria-label="Ver o leste" onClick={() => nudge(-140, 0)}>
            <img src={art.mapa("mapa_seta_pan.png?v=10")} alt="" />
          </button>
          <button type="button" className="gf-pan gf-pan-s" aria-label="Ver o sul" onClick={() => nudge(0, -140)}>
            <img src={art.mapa("mapa_seta_pan.png?v=10")} alt="" />
          </button>
          <button type="button" className="gf-pan gf-pan-w" aria-label="Ver o oeste" onClick={() => nudge(140, 0)}>
            <img src={art.mapa("mapa_seta_pan.png?v=10")} alt="" />
          </button>
        </div>
      )}
    </div>
  );
}
