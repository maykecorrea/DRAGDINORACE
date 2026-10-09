import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FossilWord } from "@/components/fossil-word";
import { MINT_COST, driverById, type NftCar } from "@/game/data";
import { RARITY_WHEEL, inventSpec, paintSide, specToCar, wheelAngle, type ForgeSpec } from "@/game/forge";

const ICONS: Record<string, string> = {
  Comum: "/game/roulette/comum.png",
  Normal: "/game/roulette/normal.png",
  Raro: "/game/roulette/raro.png",
  Épico: "/game/roulette/epico.png",
  Lendário: "/game/roulette/lendario.png",
};

function prizeImage(spec: ForgeSpec): string {
  if (spec.image) return spec.image;
  return `/game/side/car-${driverById(spec.driverId).sprite}.png`;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 4.4);
}

function pocketAt(rotationY: number) {
  const spun = ((-rotationY * 180) / Math.PI) % 360;
  const norm = ((spun % 360) + 360) % 360;
  return (360 - norm) % 360;
}

function rarityAt(deg: number) {
  let acc = 0;
  for (const slice of RARITY_WHEEL) {
    acc += slice.pct * 3.6;
    if (deg < acc || slice === RARITY_WHEEL[RARITY_WHEEL.length - 1]) return slice;
  }
  return RARITY_WHEEL[0]!;
}

function wedgeShape(start: number, sweep: number, inner: number, outer: number) {
  const shape = new THREE.Shape();
  const steps = Math.max(2, Math.ceil(sweep / 2.5));
  const x = (deg: number, r: number) => Math.sin((deg * Math.PI) / 180) * r;
  const y = (deg: number, r: number) => -Math.cos((deg * Math.PI) / 180) * r;
  shape.moveTo(x(start, inner), y(start, inner));
  shape.lineTo(x(start, outer), y(start, outer));
  for (let i = 1; i <= steps; i += 1) {
    const deg = start + (sweep * i) / steps;
    shape.lineTo(x(deg, outer), y(deg, outer));
  }
  for (let i = steps; i >= 0; i -= 1) {
    const deg = start + (sweep * i) / steps;
    shape.lineTo(x(deg, inner), y(deg, inner));
  }
  return shape;
}

function labelTexture(title: string, pct: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = "#141806";
  g.font = "700 108px Teko, Impact, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title.toUpperCase(), 256, 96);
  g.font = "600 72px Teko, Impact, sans-serif";
  g.fillText(pct, 256, 186);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function RouletteWheel({
  spinning,
  target,
  onDone,
  live,
}: {
  spinning: boolean;
  target: number | null;
  onDone: () => void;
  live: (name: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const spinRef = useRef<{ from: number; to: number; t0: number; dur: number } | null>(null);
  const doneRef = useRef(onDone);
  const liveRef = useRef(live);
  doneRef.current = onDone;
  liveRef.current = live;

  useEffect(() => {
    if (!spinning || target == null) return;
    spinRef.current = {
      from: 0,
      to: -((7 * 360 - target) * Math.PI) / 180,
      t0: performance.now(),
      dur: 5600,
    };
  }, [spinning, target]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x090b08, 9, 18);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camera.position.set(0.2, 2.55, 8.1);
    camera.lookAt(0, 0.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const key = new THREE.SpotLight(0xfff6df, 28, 24, 0.55, 0.35, 1);
    key.position.set(2.4, 8.2, 4.2);
    scene.add(key);
    const lime = new THREE.PointLight(0xd6ff3f, 10, 9);
    lime.position.set(-2.4, 2.4, 2);
    scene.add(lime);
    const pink = new THREE.PointLight(0xff4bd8, 4, 7);
    pink.position.set(2.6, 1.4, -1.2);
    scene.add(pink);

    const steel = new THREE.MeshStandardMaterial({ color: 0x2a3124, metalness: 0.86, roughness: 0.28 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd7b15a, metalness: 0.8, roughness: 0.32 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 0.42, 48), steel);
    foot.position.y = -0.46;
    scene.add(foot);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 0.38, 24), steel);
    neck.position.y = -0.16;
    scene.add(neck);

    const wheel = new THREE.Group();
    scene.add(wheel);

    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(2.28, 2.36, 0.42, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a2016, metalness: 0.78, roughness: 0.34 }),
    );
    platter.position.y = 0.02;
    wheel.add(platter);

    let acc = 0;
    const gems: THREE.Object3D[] = [];
    for (const slice of RARITY_WHEEL) {
      const sweep = slice.pct * 3.6;
      const start = acc;
      acc += sweep;
      if (sweep > 1.4) {
        const geom = new THREE.ExtrudeGeometry(wedgeShape(start + (sweep > 8 ? 0.4 : 0.05), Math.max(0.4, sweep - (sweep > 8 ? 0.8 : 0.1)), 0.72, 1.98), {
          depth: 0.16,
          bevelEnabled: true,
          bevelThickness: sweep > 10 ? 0.02 : 0.004,
          bevelSize: sweep > 10 ? 0.018 : 0.004,
          bevelSegments: 1,
          curveSegments: 1,
        });
        geom.rotateX(-Math.PI / 2);
        geom.translate(0, 0.2, 0);
        const mesh = new THREE.Mesh(
          geom,
          new THREE.MeshStandardMaterial({
            color: slice.color,
            metalness: 0.42,
            roughness: 0.34,
            emissive: slice.color,
            emissiveIntensity: 0.22,
            side: THREE.DoubleSide,
          }),
        );
        wheel.add(mesh);
        if (sweep > 12) {
          const tex = labelTexture(slice.rarity, `${slice.pct}%`);
          if (tex) {
            const tag = new THREE.Mesh(
              new THREE.PlaneGeometry(0.92, 0.46),
              new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
            );
            const mid = ((start + sweep / 2) * Math.PI) / 180;
            tag.position.set(Math.sin(mid) * 1.38, 0.46, Math.cos(mid) * 1.38);
            tag.rotation.order = "YXZ";
            tag.rotation.x = -Math.PI / 2;
            tag.rotation.y = -mid;
            wheel.add(tag);
          }
        }
      }
      if (slice.pct <= 5) {
        const mid = ((start + sweep / 2) * Math.PI) / 180;
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(slice.pct < 1 ? 0.11 : 0.08, 0),
          new THREE.MeshStandardMaterial({
            color: slice.color,
            emissive: slice.color,
            emissiveIntensity: 0.85,
            metalness: 0.25,
            roughness: 0.18,
          }),
        );
        gem.position.set(Math.sin(mid) * 2.05, 0.58, Math.cos(mid) * 2.05);
        gem.userData.pulse = slice.rarity;
        wheel.add(gem);
        gems.push(gem);
      }
    }

    for (let deg = 0; deg < 360; deg += 6) {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 8), brass);
      const a = (deg * Math.PI) / 180;
      peg.position.set(Math.sin(a) * 2.12, 0.42, Math.cos(a) * 2.12);
      wheel.add(peg);
    }

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.11, 16, 80),
      new THREE.MeshPhysicalMaterial({ color: 0xc8c2b2, metalness: 1, roughness: 0.22, clearcoat: 0.6 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.32;
    wheel.add(rim);
    const neon = new THREE.Mesh(
      new THREE.TorusGeometry(2.02, 0.018, 8, 80),
      new THREE.MeshStandardMaterial({ color: 0xd6ff3f, emissive: 0xd6ff3f, emissiveIntensity: 0.9, roughness: 0.4 }),
    );
    neon.rotation.x = Math.PI / 2;
    neon.position.y = 0.4;
    wheel.add(neon);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.66, 0.18, 36),
      new THREE.MeshStandardMaterial({ color: 0xc6a15a, metalness: 0.82, roughness: 0.28 }),
    );
    hub.position.y = 0.42;
    wheel.add(hub);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.06, 28),
      new THREE.MeshStandardMaterial({ color: 0xd6ff3f, emissive: 0xd6ff3f, emissiveIntensity: 0.45, metalness: 0.35, roughness: 0.28 }),
    );
    cap.position.y = 0.54;
    wheel.add(cap);

    const pointer = new THREE.Group();
    pointer.position.set(0, 0.95, 3.05);
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), steel);
    hanger.position.y = 0.28;
    pointer.add(hanger);
    const head = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.72), brass);
    blade.position.z = -0.28;
    head.add(blade);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.32, 4),
      new THREE.MeshStandardMaterial({ color: 0xff3b1f, emissive: 0xff3b1f, emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.3 }),
    );
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.72;
    head.add(tip);
    pointer.add(head);
    scene.add(pointer);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 40),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.67;
    scene.add(shadow);

    let frame = 0;
    const resize = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(el);

    let last = 0;
    let shown = "";
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const spin = spinRef.current;
      if (spin) {
        const t = Math.min(1, (now - spin.t0) / spin.dur);
        wheel.rotation.y = spin.from + (spin.to - spin.from) * easeOut(t);
        const speed = Math.abs(wheel.rotation.y - last);
        const peg = Math.abs(((-wheel.rotation.y / (Math.PI * 2)) * 60) % 1);
        const kick = Math.pow(Math.max(0, 1 - peg * 7), 2);
        head.rotation.x = kick * Math.min(0.55, 0.15 + speed * 18);
        if (t >= 1) {
          spinRef.current = null;
          head.rotation.x = 0;
          doneRef.current();
        }
      } else {
        head.rotation.x *= 0.85;
      }
      last = wheel.rotation.y;
      const slice = rarityAt(pocketAt(wheel.rotation.y));
      if (slice.rarity !== shown) {
        shown = slice.rarity;
        liveRef.current(slice.rarity);
      }
      for (const gem of gems) {
        gem.rotation.y += 0.03;
        const hot = gem.userData.pulse === slice.rarity;
        gem.scale.setScalar(hot ? 1.25 + Math.sin(now / 140) * 0.12 : 1);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
  }, []);

  return <div ref={host} className="h-[420px] w-full" />;
}

export function MintRoulette({
  fossil,
  blocked,
  onClose,
  onMinted,
  onEquip,
}: {
  fossil: number;
  blocked: Set<string>;
  onClose: () => void;
  onMinted: (nft: NftCar) => void;
  onEquip: (tokenId: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "spin" | "won">("idle");
  const [prize, setPrize] = useState<ForgeSpec | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [under, setUnder] = useState("Comum");

  function spin() {
    if (phase !== "idle" || fossil < MINT_COST) return;
    const spec = inventSpec(blocked);
    if (!spec.image) spec.image = paintSide(spec);
    onMinted(specToCar(spec));
    setPrize(spec);
    setTarget(wheelAngle(spec.rarity));
    setPhase("spin");
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/80 p-4">
      <div className={`w-full max-w-3xl border bg-bg p-5 ${prize?.rarity === "Lendário" && phase === "won" ? "border-[#ffd24a]" : "border-border"}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-primary">ROLETA</p>
            <h2 className="font-display text-5xl leading-none">Sorteio</h2>
          </div>
          <p className="font-display text-4xl leading-none text-primary">{under}</p>
        </div>
        <div className="mt-3 overflow-hidden border border-border bg-black">
          <RouletteWheel spinning={phase === "spin"} target={target} onDone={() => setPhase("won")} live={setUnder} />
        </div>
        <ul className="mt-4 grid grid-cols-5 gap-1 text-center">
          {RARITY_WHEEL.map((slice) => (
            <li key={slice.rarity} className={under === slice.rarity ? "text-primary" : ""}>
              <img src={ICONS[slice.rarity]} alt="" className="mx-auto size-8 object-contain" />
              <p className="mt-1 text-[10px] tracking-widest text-muted">{slice.rarity}</p>
              <p className="font-display text-lg leading-none">{slice.pct}%</p>
            </li>
          ))}
        </ul>
        {phase === "won" && prize && (
          <div className="mt-4 border border-border bg-surface p-3 text-center">
            <p className="text-xs tracking-widest text-primary">{prize.rarity}</p>
            <img src={prizeImage(prize)} alt="" className="mx-auto mt-2 h-28 object-contain" />
            <p className="mt-2 font-display text-4xl leading-none">{prize.name}</p>
            <p className="text-sm text-muted">Entrou na garagem. O carro atual continua equipado.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" onClick={() => onEquip(prize.id)} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
                Equipar
              </button>
              <button type="button" onClick={onClose} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">
                Depois
              </button>
            </div>
          </div>
        )}
        {phase !== "won" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={phase !== "idle" || fossil < MINT_COST}
              onClick={spin}
              className="min-h-11 bg-danger px-4 font-display text-3xl leading-none text-fg disabled:opacity-40"
            >
              Girar · {MINT_COST} <FossilWord />
            </button>
            <button type="button" onClick={onClose} disabled={phase === "spin"} className="min-h-11 border border-border px-4 font-display text-2xl leading-none disabled:opacity-40">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
