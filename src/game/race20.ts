import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type Race20Hold = { gas: boolean; left: boolean; right: boolean; brake: boolean };
export type Race20Keys = { gas: string; left: string; right: string };

const STRIP = 640;
const MAX_SPEED = 46;
const VMAX_MPH = 213;

type Particle = {
  sprite: THREE.Sprite;
  life: number;
  max: number;
  vx: number;
  vy: number;
  vz: number;
};

function srgb(v: number): number {
  const c = Math.max(0, Math.min(255, v)) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function magenta(r: number, g: number, b: number, a: number): boolean {
  if (a < 40) return true;
  return r > 200 && b > 200 && g < 120 && Math.abs(r - b) < 55;
}

function asphalt(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#100e0c";
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = i % 3 === 0 ? "#1c1914" : "#0a0908";
    g.fillRect((Math.random() * 128) | 0, (Math.random() * 256) | 0, 2, 2);
  }
  g.fillStyle = "#c6f542";
  g.fillRect(1, 0, 3, 256);
  g.fillRect(124, 0, 3, 256);
  g.fillStyle = "#5a5348";
  g.fillRect(6, 0, 2, 256);
  g.fillRect(120, 0, 2, 256);
  g.fillStyle = "#e4dccb";
  for (let y = 6; y < 256; y += 32) g.fillRect(61, y, 6, 14);
  g.fillStyle = "#2a241c";
  for (let y = 18; y < 256; y += 36) g.fillRect(10, y, 108, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1, 26);
  return tex;
}

function puffTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const g = c.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#fff";
  g.fillRect(4, 4, 8, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildGeck(img: HTMLImageElement): {
  model: THREE.Group;
  tires: THREE.Group[];
  tail: THREE.Vector3[];
  wheels: THREE.Vector3[];
} {
  // Three separate pieces. The chase camera sits at -Z and must see only the rear.
  // 1. rear fascia: louvers, lamps, bumper, exhausts
  // 2. body shell: coupe between the fascia and the nose
  // 3. nose + crest: garage pixels, kept low and forward so the eyes never show from behind
  const CELL = 0.06;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const at = (x: number, y: number) => {
    const i = (y * canvas.width + x) * 4;
    return [src[i], src[i + 1], src[i + 2], src[i + 3]] as const;
  };
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const [r, g, b, a] = at(x, y);
      if (magenta(r, g, b, a)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const pix = (u: number, v: number) => {
    const x = Math.max(minX, Math.min(maxX, Math.round(minX + u * (maxX - minX))));
    const y = Math.max(minY, Math.min(maxY, Math.round(minY + v * (maxY - minY))));
    const [r, g, b, a] = at(x, y);
    return magenta(r, g, b, a) ? null : { r, g, b };
  };

  const positions: number[] = [];
  const colors: number[] = [];
  const facePos: number[] = [];
  const faceCol: number[] = [];
  const used = new Set<number>();
  const pack = (ix: number, iy: number, iz: number) => (ix + 80) + (iy + 10) * 200 + (iz + 80) * 200 * 80;

  const pushBox = (bucket: number[], cols: number[], x: number, y: number, z: number, r: number, g: number, b: number) => {
    const ix = Math.round(x / CELL);
    const iy = Math.round(y / CELL);
    const iz = Math.round(z / CELL);
    const id = pack(ix, iy, iz);
    if (used.has(id)) return;
    used.add(id);
    const h = CELL / 2;
    const x0 = ix * CELL - h;
    const x1 = ix * CELL + h;
    const y0 = iy * CELL - h;
    const y1 = iy * CELL + h;
    const z0 = iz * CELL - h;
    const z1 = iz * CELL + h;
    const quads = [
      [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1],
      [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0],
      [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0],
      [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1],
      [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1],
      [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0],
    ];
    const shade = [0.92, 0.78, 1.22, 0.34, 0.84, 0.8];
    for (let f = 0; f < 6; f++) {
      const q = quads[f];
      const k = shade[f];
      const cr = srgb(r * k);
      const cg = srgb(g * k);
      const cb = srgb(b * k);
      for (const vi of [0, 1, 2, 0, 2, 3]) {
        bucket.push(q[vi * 3], q[vi * 3 + 1], q[vi * 3 + 2]);
        cols.push(cr, cg, cb);
      }
    }
  };

  const green = (x: number, y: number, z: number): [number, number, number] => ((Math.round(x / CELL) + Math.round(y / CELL) + Math.round(z / CELL)) % 3 === 0 ? [72, 160, 28] : [118, 214, 46]);

  const halfW = (z: number) => {
    if (z > 1.35) return 0.55;
    if (z > 0.7) return 0.78;
    if (z > -0.15) return 0.7;
    if (z > -1.05) return 0.84;
    return 0.9;
  };
  const roof = (z: number) => {
    if (z > 1.2) return 0.72;
    if (z > 0.45) return 0.9;
    if (z > -0.2) return 1.08;
    if (z > -1.15) return 1.08 - ((-0.2 - z) / 0.95) * 0.28;
    return 0.78;
  };
  const arch = (x: number, y: number, z: number) => {
    for (const axle of [-1.05, 1.15]) {
      if (Math.abs(x) > 0.45 && Math.hypot(z - axle, y - 0.4) < 0.38) return true;
    }
    return false;
  };

  for (let z = -1.2; z <= 1.6; z += CELL) {
    for (let y = 0.32; y <= 1.12; y += CELL) {
      for (let x = -1.0; x <= 1.0; x += CELL) {
        const w = halfW(z);
        const top = roof(z);
        if (y < 0.34 || y > top || Math.abs(x) > w || arch(x, y, z)) continue;
        const edge = Math.abs(x) > w - CELL * 1.4 || y > top - CELL * 1.4 || y < 0.34 + CELL * 1.4 || z > 1.6 - CELL * 1.4 || z < -1.2 + CELL * 1.4;
        if (!edge) continue;
        const glass = y > 0.78 && z < 0.15 && z > -0.55 && Math.abs(x) > 0.16 && Math.abs(x) < w - 0.08;
        const rgb = y < 0.46 ? [32, 34, 32] : glass ? [16, 18, 20] : green(x, y, z);
        pushBox(positions, colors, x, y, z, rgb[0], rgb[1], rgb[2]);
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    const z = -1.7 + i * 0.065;
    const y = 0.74 + i * 0.04;
    for (let x = -0.52; x <= 0.52; x += CELL) {
      const dark = i % 2 === 0;
      pushBox(positions, colors, x, y, z, dark ? 20 : 70, dark ? 22 : 74, dark ? 24 : 70);
    }
    for (let x = 0.56; x <= 0.9; x += CELL) {
      const rgb = green(x, y, z);
      pushBox(positions, colors, x, y, z, rgb[0], rgb[1], rgb[2]);
      pushBox(positions, colors, -x, y, z, rgb[0], rgb[1], rgb[2]);
    }
  }
  for (let y = 0.36; y <= 0.7; y += CELL) {
    for (let x = -0.9; x <= 0.9; x += CELL) {
      const rgb = Math.abs(x) > 0.55 ? green(x, y, -1.72) : [96, 176, 34];
      pushBox(positions, colors, x, y, -1.74, rgb[0], rgb[1], rgb[2]);
    }
  }
  for (let x = -0.82; x <= 0.82; x += CELL) {
    pushBox(positions, colors, x, 0.5, -1.86, 154, 158, 162);
    pushBox(positions, colors, x, 0.44, -1.86, 136, 140, 144);
    pushBox(positions, colors, x, 0.36, -1.82, 28, 30, 30);
  }
  for (const [gz, h] of [
    [-0.35, 7],
    [-0.55, 5],
    [-0.75, 8],
    [-0.95, 6],
    [-1.12, 4],
  ] as const) {
    for (let k = 0; k < h; k++) {
      const y = roof(gz) + 0.04 + k * CELL;
      const tip = k > h - 2;
      pushBox(positions, colors, 0, y, gz, tip ? 220 : 142, tip ? 110 : 40, tip ? 255 : 220);
      if (!tip) {
        pushBox(positions, colors, CELL, y - CELL, gz, 110, 24, 186);
        pushBox(positions, colors, -CELL, y - CELL, gz, 110, 24, 186);
      }
    }
  }

  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 28; col++) {
      const u = col / 27;
      const v = 0.4 + (row / 17) * 0.55;
      if (v > 0.78 && (u < 0.18 || u > 0.82)) continue;
      const sample = pix(u, v);
      if (!sample) continue;
      const x = (u - 0.5) * 1.35;
      const y = 0.9 - (row / 17) * 0.55;
      pushBox(facePos, faceCol, x, y, 1.72, sample.r, sample.g, sample.b);
    }
  }
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 14; col++) {
      const u = 0.32 + (col / 13) * 0.36;
      const v = (row / 15) * 0.4;
      const sample = pix(u, v);
      if (!sample) continue;
      const x = (u - 0.5) * 0.9;
      const y = 1.55 - (row / 15) * 0.6;
      const depth = 4;
      for (let d = 0; d < depth; d++) pushBox(facePos, faceCol, x, y, 1.15 + d * CELL, sample.r, sample.g, sample.b);
    }
  }

  const model = new THREE.Group();
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  bodyGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  model.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute("position", new THREE.Float32BufferAttribute(facePos, 3));
  faceGeo.setAttribute("color", new THREE.Float32BufferAttribute(faceCol, 3));
  model.add(new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ vertexColors: true })));

  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3b32 });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.05), lampMat);
    lamp.position.set(side * 0.38, 0.64, -1.8);
    model.add(lamp);
  }

  const tires: THREE.Group[] = [];
  const wheels: THREE.Vector3[] = [];
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 18);
  const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.28, 10);
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xc5c9ce });
  for (const axle of [-1.05, 1.15]) {
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      tire.rotation.z = Math.PI / 2;
      hub.rotation.z = Math.PI / 2;
      group.add(tire, hub);
      group.position.set(side * 0.92, 0.38, axle);
      tires.push(group);
      wheels.push(new THREE.Vector3(group.position.x, 0.12, axle));
    }
  }

  const tail: THREE.Vector3[] = [new THREE.Vector3(-0.16, 0.4, -2.02), new THREE.Vector3(0.16, 0.4, -2.02)];
  const pipeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.12, 12);
  const boreGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10);
  const pipeMat = new THREE.MeshLambertMaterial({ color: 0xd5d8dc });
  const boreMat = new THREE.MeshBasicMaterial({ color: 0x070808 });
  for (const local of tail) {
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    const bore = new THREE.Mesh(boreGeo, boreMat);
    pipe.rotation.x = Math.PI / 2;
    bore.rotation.x = Math.PI / 2;
    pipe.position.copy(local);
    bore.position.set(local.x, local.y, local.z - 0.012);
    model.add(pipe, bore);
  }

  return { model, tires, tail, wheels };
}

export class Race20 {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private car = new THREE.Group();
  private look = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private particles: Particle[] = [];
  private puff: THREE.CanvasTexture;
  private keysFn: () => Race20Keys;
  private held: Race20Hold;
  private speed = 0;
  private z = 18;
  private x = 0;
  private done = false;
  private raf = 0;
  private last = 0;
  private running = true;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onResize: () => void;
  private exhausts: THREE.Vector3[] = [];
  private wheelLocals: THREE.Vector3[] = [];
  private tires: THREE.Group[] = [];
  private mphNode: HTMLElement | null;
  private stateNode: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement, held: Race20Hold, keysFn: () => Race20Keys, mphNode: HTMLElement | null, stateNode: HTMLElement | null) {
    this.held = held;
    this.keysFn = keysFn;
    this.mphNode = mphNode;
    this.stateNode = stateNode;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 280);
    this.scene.background = new THREE.Color(0x07080a);
    this.scene.fog = new THREE.Fog(0x07080a, 22, 150);
    const key = new THREE.DirectionalLight(0xfff4e4, 1.7);
    key.position.set(3, 8, -4);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.38));
    this.puff = puffTexture();
    this.dressStrip();
    this.scene.add(this.car);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 4.8),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0);
    this.car.add(shadow);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.35, 0.25, 0.78);
    this.composer.addPass(this.bloom);
    this.onResize = () => this.resize();
    this.onKeyDown = (e) => this.setKey(e.code, true, e);
    this.onKeyUp = (e) => this.setKey(e.code, false, e);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    this.resize();
    void this.loadCar();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.composer.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    this.composer.dispose();
    this.renderer.dispose();
    this.puff.dispose();
  }

  private setKey(code: string, down: boolean, e: KeyboardEvent) {
    const keys = this.keysFn();
    if (code !== keys.gas && code !== keys.left && code !== keys.right && code !== "ArrowUp" && code !== "ArrowDown" && code !== "ArrowLeft" && code !== "ArrowRight" && code !== "Space") return;
    e.preventDefault();
    if (code === keys.gas || code === "ArrowUp") this.held.gas = down;
    if (code === keys.left || code === "ArrowLeft") this.held.left = down;
    if (code === keys.right || code === "ArrowRight") this.held.right = down;
    if (code === "ArrowDown" || code === "Space") this.held.brake = down;
  }

  private resize() {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private dressStrip() {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, STRIP + 40), new THREE.MeshBasicMaterial({ map: asphalt() }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, STRIP / 2);
    this.scene.add(road);
    const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(46, STRIP + 80), new THREE.MeshBasicMaterial({ color: 0x0c1210 }));
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(0, -0.02, STRIP / 2);
    this.scene.add(shoulder);
    const posts = new THREE.BoxGeometry(0.55, 1, 0.45);
    const ribs = new THREE.BoxGeometry(0.28, 1, 0.22);
    const scrapMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const n = 90;
    const blocks = new THREE.InstancedMesh(posts, scrapMat, n);
    const bones = new THREE.InstancedMesh(ribs, scrapMat, n);
    const dummy = new THREE.Object3D();
    const cScrap = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 8 + (i / 2) * 14;
      const h = 1.6 + (i % 5) * 0.55;
      dummy.position.set(side * 9.2, h / 2, z);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      blocks.setMatrixAt(i, dummy.matrix);
      cScrap.set(i % 4 === 0 ? 0x6a5a48 : 0x2a261f);
      blocks.setColorAt(i, cScrap);
      dummy.position.set(side * 8.4, 1.1 + (i % 3) * 0.4, z + 3);
      dummy.scale.set(1, 2.4, 1);
      dummy.rotation.set(0, 0, side * 0.5);
      dummy.updateMatrix();
      bones.setMatrixAt(i, dummy.matrix);
      cScrap.set(0xd7d0c0);
      bones.setColorAt(i, cScrap);
    }
    blocks.instanceColor!.needsUpdate = true;
    bones.instanceColor!.needsUpdate = true;
    this.scene.add(blocks, bones);
    const archMat = new THREE.MeshBasicMaterial({ color: 0xd6ff4a });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.2, 0.45), archMat);
      p.position.set(side * 6.4, 2.1, STRIP - 18);
      this.scene.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.42, 0.42), archMat);
    beam.position.set(0, 4.2, STRIP - 18);
    this.scene.add(beam);
  }

  private async loadCar() {
    const img = new Image();
    img.src = "/game/car-2.png";
    await img.decode();
    if (!this.running) return;
    const built = buildGeck(img);
    this.car.add(built.model);
    for (const tire of built.tires) this.car.add(tire);
    this.tires = built.tires;
    this.exhausts = built.tail;
    this.wheelLocals = built.wheels;
  }

  private spawn(x: number, y: number, z: number, color: number, size: number, life: number, vx: number, vy: number, vz: number) {
    const free = this.particles.find((p) => p.life <= 0);
    if (free) {
      free.life = life;
      free.max = life;
      free.vx = vx;
      free.vy = vy;
      free.vz = vz;
      free.sprite.position.set(x, y, z);
      free.sprite.material.color.setHex(color);
      free.sprite.material.opacity = 1;
      free.sprite.scale.setScalar(size);
      free.sprite.visible = true;
      return;
    }
    if (this.particles.length > 180) return;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.puff, color, transparent: true, depthWrite: false }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    this.scene.add(sprite);
    this.particles.push({ sprite, life, max: life, vx, vy, vz });
  }

  private step(dt: number) {
    const gas = this.held.gas && !this.done;
    const brake = this.held.brake || this.done;
    if (gas) this.speed += 16 * dt;
    else this.speed -= 3.2 * dt;
    if (brake) this.speed -= 22 * dt;
    this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed));
    let steer = 0;
    if (this.held.left) steer -= 1;
    if (this.held.right) steer += 1;
    this.x = Math.max(-5.2, Math.min(5.2, this.x + steer * 9 * dt));
    this.z += this.speed * dt;
    if (this.z > STRIP - 16) {
      this.z = STRIP - 16;
      this.done = true;
    }
    this.car.position.set(this.x, 0.05, this.z);
    this.car.rotation.y = steer * -0.08;
    for (const tire of this.tires) tire.rotation.x += this.speed * dt * 2.6;

    const back = 6.2 + this.speed * 0.02;
    const up = 1.45 + this.speed * 0.006;
    this.camTarget.set(this.x + 0.35, up, this.z - back);
    this.lookTarget.set(this.x, 0.55, this.z + 0.4);
    const k = 1 - Math.exp(-5 * dt);
    this.camera.position.lerp(this.camTarget, k);
    this.look.lerp(this.lookTarget, k);
    this.camera.lookAt(this.look);
    const fov = 54 + this.speed * 0.26;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    if (this.speed > 6) {
      for (const local of this.wheelLocals) {
        if (Math.random() > 0.5) continue;
        this.spawn(this.x + local.x, 0.12, this.z + local.z, 0x6a6458, 0.12, 0.28, (Math.random() - 0.5) * 0.4, 0.15, -this.speed * 0.04);
      }
    }
    if (gas) {
      for (const local of this.exhausts) {
        if (Math.random() > 0.45) continue;
        this.spawn(this.x + local.x, local.y, this.z + local.z - 0.08, 0xff6a28, 0.1, 0.12, 0, 0.05, -1.2);
      }
    }
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      const u = Math.max(0, p.life / p.max);
      p.sprite.material.opacity = u;
      if (p.life <= 0) p.sprite.visible = false;
    }
    if (this.mphNode) this.mphNode.textContent = String(Math.round((this.speed / MAX_SPEED) * VMAX_MPH * 1.60934));
    if (this.stateNode) this.stateNode.textContent = this.done ? "FAIXA 1 · CHEGADA" : "GECK-404";
  }
}
