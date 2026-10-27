import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { gfGate } from "@/game/gf.functions";
import { useLocale } from "@/lib/locale-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dino Drag Race" }],
  }),
  component: Home,
});

const CARS = [
  { tag: "#001", name: "MEDULA", img: "/game/legend/car-medula.png?v=2", spin: "/game/legend/spin-medula.mp4?v=1", tone: "neon" as const, speed: "91", force: "94" },
  { tag: "#002", name: "FERRÃO", img: "/game/legend/car-ferrao.png?v=2", spin: "/game/legend/spin-ferrao.mp4?v=1", tone: "ember" as const, speed: "93", force: "90" },
  { tag: "#003", name: "COROA", img: "/game/legend/car-coroa.png?v=2", spin: "/game/legend/spin-coroa.mp4?v=2", tone: "ember" as const, speed: "88", force: "97" },
  { tag: "#004", name: "BOFE", img: "/game/legend/car-bofe.png?v=2", spin: "/game/legend/spin-bofe.mp4?v=1", tone: "neon" as const, speed: "90", force: "92" },
  { tag: "#006", name: "NEURO", img: "/game/legend/car-neuro.png?v=8", spin: "/game/legend/spin-neuro.mp4", tone: "neon" as const, speed: "85", force: "98" },
  { tag: "#007", name: "RONIN", img: "/game/legend/car-ronin.png?v=8", spin: "/game/legend/spin-ronin.mp4", tone: "ember" as const, speed: "93", force: "90" },
  { tag: "#008", name: "T-REX", img: "/game/legend/car-trex.png?v=8", spin: "/game/legend/spin-trex.mp4", tone: "neon" as const, speed: "92", force: "99" },
];

function ClientOnly({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on) return <span className="inline-flex min-h-11 min-w-24" aria-hidden />;
  return children;
}

function Home() {
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const { t, lang, choose } = useLocale();

  useEffect(() => {
    if (isPending || !user) return;
    let stop = false;
    void gfGate()
      .then((gate) => {
        if (!stop) void navigate({ to: gate.home });
      })
      .catch(() => {
        if (!stop) void navigate({ to: "/modos" });
      });
    return () => {
      stop = true;
    };
  }, [user, isPending, navigate]);

  useEffect(() => {
    void router.preloadRoute({ to: "/dashboard" });
  }, [router]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const move = (e: PointerEvent) => {
      root.style.setProperty("--px", ((e.clientX / window.innerWidth) - 0.5).toFixed(4));
      root.style.setProperty("--py", ((e.clientY / window.innerHeight) - 0.5).toFixed(4));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <main className="home-grid overflow-x-hidden text-fg">
      <header className="anim-in fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <a href="#hero" className="flex items-center gap-2">
            <img src="/home/logo.png" alt="" className="size-11 border border-neon object-cover" />
            <span className="brand-neon font-pixel text-2xl leading-none sm:text-3xl" data-text="DINO DRAG RACE">
              DINO DRAG RACE
            </span>
          </a>
          <nav className="hidden items-center font-pixel text-2xl md:flex">
            <a href="#sobre" className="nav-link">{t("home.totems")}</a>
            <a href="#garagem" className="nav-link" data-tone="ember">{t("home.garage")}</a>
            <a href="#nucleo" className="nav-link">{t("home.core")}</a>
            <a href="#airdrop" className="nav-link" data-tone="ember">{t("home.extract")}</a>
          </nav>
          <ClientOnly>
            <span className="flex items-center gap-2">
            <div className="flex items-center" style={{ gap: "8px" }}>
              <button
                type="button"
                onClick={() => choose("pt")}
                className="inline-flex items-center font-pixel text-xs tracking-wider"
                style={{
                  gap: "6px",
                  padding: "5px 9px",
                  borderRadius: "6px",
                  border: "none",
                  background: lang === "pt" ? "radial-gradient(circle, rgba(214,255,63,0.28) 0%, rgba(214,255,63,0.08) 70%, transparent 100%)" : "transparent",
                  boxShadow: lang === "pt" ? "0 0 14px rgba(214,255,63,0.55), 0 0 4px rgba(214,255,63,0.35)" : "none",
                  color: lang === "pt" ? "#d6ff3f" : "#9aa18c",
                  textShadow: lang === "pt" ? "0 0 8px rgba(214,255,63,0.85)" : "none",
                  opacity: lang === "pt" ? 1 : 0.55,
                }}
              >
                <img
                  src="/flags/br.svg"
                  alt="BR"
                  style={{
                    width: "20px",
                    height: "14px",
                    objectFit: "cover",
                    borderRadius: "2px",
                    filter: lang === "pt" ? "drop-shadow(0 0 6px rgba(214,255,63,0.75))" : "none",
                  }}
                />
                PT
              </button>
              <button
                type="button"
                onClick={() => choose("en")}
                className="inline-flex items-center font-pixel text-xs tracking-wider"
                style={{
                  gap: "6px",
                  padding: "5px 9px",
                  borderRadius: "6px",
                  border: "none",
                  background: lang === "en" ? "radial-gradient(circle, rgba(214,255,63,0.28) 0%, rgba(214,255,63,0.08) 70%, transparent 100%)" : "transparent",
                  boxShadow: lang === "en" ? "0 0 14px rgba(214,255,63,0.55), 0 0 4px rgba(214,255,63,0.35)" : "none",
                  color: lang === "en" ? "#d6ff3f" : "#9aa18c",
                  textShadow: lang === "en" ? "0 0 8px rgba(214,255,63,0.85)" : "none",
                  opacity: lang === "en" ? 1 : 0.55,
                }}
              >
                <img
                  src="/flags/us.svg"
                  alt="US"
                  style={{
                    width: "20px",
                    height: "14px",
                    objectFit: "cover",
                    borderRadius: "2px",
                    filter: lang === "en" ? "drop-shadow(0 0 6px rgba(214,255,63,0.75))" : "none",
                  }}
                />
                EN
              </button>
            </div>
            <SignedOut>
              <Link
                to="/login"
                search={{ modo: "entrar" }}
                className="inline-flex min-h-11 items-center border border-neon px-3 font-pixel text-2xl text-neon hover:bg-neon hover:text-ink"
              >
                {t("home.enter")}
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/modos"
                preload="render"
                className="inline-flex min-h-11 items-center border border-neon px-3 font-pixel text-2xl text-neon hover:bg-neon hover:text-ink"
              >
                {t("home.panel")}
              </Link>
            </SignedIn>
            </span>
          </ClientOnly>
        </div>
      </header>

      <Hero />
      <Sobre />
      <Garagem />
      <Nucleo />
      <Gestacao />
      <Airdrop onNote={setNote} />
      <Footer onNote={setNote} />
      {note ? <Notice message={note} onClose={() => setNote(null)} /> : null}
    </main>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.dataset.still = "1";
  }, []);

  function point(clientX: number, clientY: number, target: HTMLElement) {
    target.dataset.open = "1";
    const box = target.getBoundingClientRect();
    const nx = (clientX - box.left) / box.width - 0.5;
    const ny = (clientY - box.top) / box.height - 0.5;
    target.style.setProperty("--mx", `${clientX - box.left}px`);
    target.style.setProperty("--my", `${clientY - box.top}px`);
    target.style.setProperty("--pan-x", `${(nx * -28).toFixed(1)}px`);
    target.style.setProperty("--pan-y", `${(ny * -18).toFixed(1)}px`);
  }

  return (
    <section
      id="hero"
      ref={ref}
      className="hero-spot relative h-dvh overflow-hidden"
      onMouseMove={(e) => point(e.clientX, e.clientY, e.currentTarget)}
      onMouseLeave={(e) => {
        if (e.currentTarget.dataset.stick === "1") return;
        delete e.currentTarget.dataset.open;
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        e.currentTarget.dataset.stick = "1";
        if (t) point(t.clientX, t.clientY, e.currentTarget);
      }}
    >
      <img
        src="/home/temple.jpg"
        alt="Templo de osso cromado com o letreiro Dino Drag Race"
        className="hero-art absolute inset-0 h-full w-full object-cover"
      />
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="hero-fog pointer-events-none absolute inset-0" />
      <div className="hero-ring pointer-events-none absolute inset-0" />
      <div className="anim-in pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 bg-gradient-to-t from-bg via-bg/80 to-transparent px-4 pb-5 pt-14 text-center">
        <p className="max-w-3xl font-pixel text-xl tracking-wide text-neon md:text-2xl">
          DO COMETA VERDE, UMA NOVA <span className="utopia-bug" data-text="PISTA">PISTA</span> NASCE.
        </p>
        <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
          <a
            href="https://discord.com/channels/1103133770984468550"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center bg-neon px-4 font-pixel text-3xl text-ink"
          >
            Avise-me
          </a>
          <ClientOnly>
            <SignedIn>
              <Link to="/modos" className="inline-flex min-h-11 items-center border border-neon px-4 font-pixel text-3xl text-neon">
                Ir para a pista
              </Link>
            </SignedIn>
          </ClientOnly>
          <a href="#sobre" className="inline-flex min-h-11 items-center border border-ember px-4 font-pixel text-3xl text-ember">
            Ver mais
          </a>
        </div>
      </div>
    </section>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.in = "1";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.in = entry.isIntersecting ? "1" : "0";
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-in="0" className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

const DUST = [
  { left: "12%", top: "30%", delay: "0s" },
  { left: "22%", top: "48%", delay: "0.4s" },
  { left: "38%", top: "22%", delay: "1.1s" },
  { left: "61%", top: "18%", delay: "0.2s" },
  { left: "74%", top: "36%", delay: "0.8s" },
  { left: "86%", top: "58%", delay: "1.4s" },
  { left: "48%", top: "62%", delay: "0.6s" },
  { left: "33%", top: "74%", delay: "1.6s" },
];

function LivingHangar() {
  const ref = useRef<HTMLDivElement>(null);

  function aim(clientX: number, clientY: number) {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const x = (clientX - box.left) / Math.max(1, box.width);
    const y = (clientY - box.top) / Math.max(1, box.height);
    el.style.setProperty("--hx", `${(x * 100).toFixed(2)}%`);
    el.style.setProperty("--look-x", Math.max(-1, Math.min(1, (x - 0.5) * 2)).toFixed(3));
    el.style.setProperty("--look-y", Math.max(-1, Math.min(1, (y - 0.38) * 2)).toFixed(3));
    el.dataset.live = "1";
  }

  return (
    <div
      ref={ref}
      className="hangar relative aspect-[1920/1048] w-full overflow-hidden bg-black"
      onPointerEnter={(e) => aim(e.clientX, e.clientY)}
      onPointerMove={(e) => aim(e.clientX, e.clientY)}
      onPointerLeave={(e) => {
        delete e.currentTarget.dataset.live;
      }}
    >
      <img
        src="/home/garage.jpg"
        alt="Hangar de osso com carros na plataforma e um crânio de rex no teto"
        className="hangar-plate pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="hangar-beam pointer-events-none absolute inset-0" />
      <span className="eye eye-l" />
      <span className="eye eye-r" />
      <span className="holo holo-a" />
      <span className="holo holo-b" />
      <span className="holo holo-c" />
      <span className="pad pad-a" />
      <span className="pad pad-b" />
      <span className="pad pad-c" />
      <span className="visor visor-a" />
      <span className="visor visor-b" />
      <span className="visor visor-c" />
      {DUST.map((bit) => (
        <span key={bit.left} className="dust" style={{ left: bit.left, top: bit.top, animationDelay: bit.delay }} />
      ))}
    </div>
  );
}

function Sobre() {
  return (
    <section id="sobre" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden border border-border">
            <img
              src="/home/ruins.jpg"
              alt="Beco de pedra com hologramas e o templo ao fundo"
              className="art-drift w-full object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={80}>
        <div className="relative border border-neon bg-bg/80 p-6">
          <div className="scanlines pointer-events-none absolute inset-0" />
          <h2 className="glitch-title relative font-pixel text-4xl text-ember md:text-5xl" data-text="> DIÁRIO_DO_COMETA">
            {"> DIÁRIO_DO_COMETA"}
          </h2>
          <p className="relative mt-4 text-pretty leading-relaxed text-muted">
            Um cometa verde caiu na Terra e acordou os dinos. Humanos e dinos agora dividem a Cidade-Faixa.
          </p>
          <p className="relative mt-3 text-pretty leading-relaxed text-neon">
            Lá, ninguém briga no braço. Briga se resolve na pista: arrancada, 1 contra 1.
          </p>
          <ul className="relative mt-6 space-y-4">
            <li className="border-l-4 border-ember pl-4">
              <h3 className="font-pixel text-3xl text-ember">Tecnologia on-chain</h3>
              <p className="text-sm text-pretty text-muted">Cada carro tem número de série na sua garagem. Lendário não se compra: você conquista.</p>
            </li>
            <li className="border-l-4 border-neon pl-4">
              <h3 className="font-pixel text-3xl text-neon">Fósseis da pista</h3>
              <p className="text-sm text-pretty text-muted">A moeda é o fóssil. Corrida, modo história e missões pagam na mesma conta.</p>
            </li>
          </ul>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

function Garagem() {
  return (
    <section id="garagem" className="scroll-mt-20 border-y border-border bg-surface">
      <Reveal>
        <div className="overflow-hidden">
          <LivingHangar />
        </div>
      </Reveal>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
        <h2 className="text-center font-pixel text-5xl text-ember md:text-6xl">Galeria de carros</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-pretty text-muted">
          Passe o mouse no cartão para ele inclinar. Os oito lendários não estão à venda.
        </p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARS.map((car, i) => (
            <li key={car.name}>
              <Reveal delay={i * 90}>
              <Tilt>
                <article className={`flex h-full flex-col border bg-bg p-4 ${car.tone === "neon" ? "border-neon" : "border-ember"}`}>
                  <p className={`self-end border px-2 font-pixel text-xl ${car.tone === "neon" ? "border-neon text-neon" : "border-ember text-ember"}`}>
                    {car.tag}
                  </p>
                  <video
                    src={car.spin}
                    poster={car.img}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="mt-3 h-40 w-full object-contain"
                  />
                  <h3 className={`mt-3 font-pixel text-4xl ${car.tone === "neon" ? "text-neon" : "text-ember"}`}>{car.name}</h3>
                  <dl className="mt-3 space-y-1 text-lg">
                    <div className="flex justify-between border-b border-border">
                      <dt className="text-muted">Velocidade</dt>
                      <dd>{car.speed}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border">
                      <dt className="text-muted">Força bruta</dt>
                      <dd>{car.force}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border">
                      <dt className="text-muted">Raridade</dt>
                      <dd className="text-neon">Lendário</dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex-1 text-sm text-pretty text-muted">Não está à venda. Só se conquista.</p>
                  <Link
                    to="/loja"
                    className={`mt-4 inline-flex min-h-11 items-center justify-center border font-pixel text-2xl ${car.tone === "neon" ? "border-neon text-neon hover:bg-neon hover:text-ink" : "border-ember text-ember hover:bg-ember hover:text-ink"}`}
                  >
                    Ver os lendários
                  </Link>
                </article>
              </Tilt>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HoverClip({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  function play() {
    const video = ref.current;
    if (!video) return;
    void video.play();
  }

  function stop() {
    const video = ref.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-label={label}
      className="w-full object-cover"
      onPointerEnter={play}
      onPointerLeave={stop}
    />
  );
}

function Nucleo() {
  return (
    <section id="nucleo" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
        <h2 className="text-center font-pixel text-5xl text-neon md:text-6xl">Coração da pista</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-pretty text-muted">
          A pista pulsa com cada corrida. Passe o mouse para ver.
        </p>
        </Reveal>
        <Reveal delay={80}>
        <Tilt>
          <div className="mt-8 overflow-hidden border border-neon">
            <HoverClip
              src="/home/core.mp4"
              poster="/home/core.jpg"
              label="Coração mecânico de osso brilhando em ciano"
            />
          </div>
        </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

function Gestacao() {
  const steps = [
    ["01", "Sorteio da classe", "O ovo escolhe a classe do carro: comum, raro, épico ou lendário."],
    ["02", "Montagem", "A oficina monta o carro: chapa humana, osso e cabo de nave."],
    ["03", "Garagem", "Aceitou? O carro vai para a sua garagem com um número só dele."],
  ];

  return (
    <section id="gestacao" className="scroll-mt-20 border-t border-border px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-pixel text-5xl text-neon md:text-6xl">Como nasce um carro</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-pretty text-muted">
            Cada carro nasce na oficina, com peças de osso e sucata. Passe o mouse para ver o vídeo.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <Tilt>
            <div className="mt-8 overflow-hidden border border-ember">
              <HoverClip
                src="/home/gestation.mp4"
                poster="/home/gestation.jpg"
                label="Oficina onde os carros nascem"
              />
            </div>
          </Tilt>
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(([n, title, text], i) => (
            <Reveal key={n} delay={i * 70}>
              <li className="border border-border bg-surface p-4">
                <p className="font-pixel text-2xl text-ember">{n}</p>
                <h3 className="mt-2 font-pixel text-3xl text-fg">{title}</h3>
                <p className="mt-2 text-pretty text-muted">{text}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Airdrop({ onNote }: { onNote: (message: string) => void }) {
  return (
    <section id="airdrop" className="scroll-mt-20 border-t border-border bg-surface px-4 py-20">
      <Reveal>
      <div className="mx-auto max-w-3xl border border-neon bg-bg px-6 py-12 text-center">
        <h2 className="font-pixel text-5xl text-neon md:text-6xl">Prêmios</h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-muted">
          Quem corre ganha: os fósseis caem na conta depois de cada corrida.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onNote("O canal ainda está fechado. A pista já está aberta.")}
            className="min-h-11 border border-ember px-4 font-pixel text-2xl text-ember"
          >
            [ + ] Seguir no X
          </button>
          <a
            href="https://discord.com/channels/1103133770984468550"
            target="_blank"
            rel="noreferrer"
            className="min-h-11 border border-ember px-4 font-pixel text-2xl text-ember inline-flex items-center justify-center"
          >
            [ + ] Entrar no Discord
          </a>
        </div>
        <ClientOnly>
          <SignedOut>
            <Link
              to="/login"
              search={{ modo: "criar" }}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-neon font-pixel text-3xl text-ink"
            >
              Ver na minha conta
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/pista"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-neon font-pixel text-3xl text-ink"
            >
              Correr e ganhar
            </Link>
          </SignedIn>
        </ClientOnly>
      </div>
      </Reveal>
    </section>
  );
}

function Footer({ onNote }: { onNote: (message: string) => void }) {
  return (
    <footer className="border-t border-border bg-bg pb-10">
      <Reveal>
      <div className="overflow-hidden">
        <video
          src="/home/scrap.mp4"
          poster="/home/scrap.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Ferro-velho de osso e sucata com o letreiro Dino Drag Race"
          className="w-full object-cover"
        />
      </div>
      </Reveal>
      <Reveal>
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-center font-pixel text-4xl text-muted">Próximas fases</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Fase 1 · Largada", "Site no ar. Conta. Primeiros carros.", "text-neon"],
            ["Fase 2 · Aceleração", "Fósseis na pista. Modo história. Peças na oficina.", "text-ember"],
            ["Fase 3 · Campeonato", "Torneio. Carros lendários. Novos rivais.", "text-muted"],
          ].map(([title, body, tone]) => (
            <li key={title} className="border border-border bg-surface p-5">
              <h3 className={`font-pixel text-3xl ${tone}`}>{title}</h3>
              <p className="mt-2 text-sm text-pretty text-muted">{body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => onNote("O livro do jogo ainda está na forja. A pista já está aberta.")}
            className="min-h-11 border border-border px-5 font-pixel text-2xl text-muted hover:border-neon hover:text-neon"
          >
            [ LER_WHITEPAPER.DAT ]
          </button>
          <p className="font-pixel text-xl text-muted">© 2026 Dino Drag Race. A pista continua.</p>
          <p className="flex gap-4 font-pixel text-xl text-muted">
            <Link to="/privacidade" className="hover:text-neon">Privacidade</Link>
            <Link to="/termos" className="hover:text-neon">Termos</Link>
          </p>
        </div>
      </div>
      </Reveal>
    </footer>
  );
}

function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  function move(e: React.MouseEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    card.style.transform = `rotateX(${(-py * 14).toFixed(2)}deg) rotateY(${(px * 16).toFixed(2)}deg)`;
    if (glare.current) {
      const gx = ((e.clientX - box.left) / box.width) * 100;
      const gy = ((e.clientY - box.top) / box.height) * 100;
      glare.current.style.background = `radial-gradient(circle at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, color-mix(in srgb, var(--color-neon) 32%, transparent), transparent 46%)`;
    }
  }

  function leave() {
    if (ref.current) ref.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    if (glare.current) glare.current.style.background = "transparent";
  }

  return (
    <div className="h-full [perspective:1000px]" onMouseMove={move} onMouseLeave={leave}>
      <div ref={ref} className="relative h-full transition-transform duration-100 ease-out [transform-style:preserve-3d]">
        {children}
        <div ref={glare} className="pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/90 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-ember bg-bg p-6 text-center">
        <h2 className="font-pixel text-3xl text-ember">{"> AVISO"}</h2>
        <p className="mt-4 text-pretty text-muted">{message}</p>
        <button type="button" onClick={onClose} className="mt-6 min-h-11 border border-neon px-5 font-pixel text-2xl text-neon">
          Fechar
        </button>
      </div>
    </div>
  );
}
