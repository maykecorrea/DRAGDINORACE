import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dino Drag Race" }],
  }),
  component: Home,
});

const CARS = [
  {
    tag: "#008",
    name: "T-REX",
    img: "/game/legend/car-trex.png",
    tone: "neon" as const,
    stats: [
      ["Velocidade", "92"],
      ["Força bruta", "99"],
      ["Raridade", "Lendário"],
    ],
  },
  {
    tag: "#001",
    name: "PEPE",
    img: "/game/legend/car-pepe.png",
    tone: "ember" as const,
    stats: [
      ["Velocidade", "88"],
      ["Força bruta", "96"],
      ["Raridade", "Lendário"],
    ],
  },
  {
    tag: "#002",
    name: "DOGE",
    img: "/game/legend/car-doge.png",
    tone: "neon" as const,
    stats: [
      ["Velocidade", "90"],
      ["Força bruta", "84"],
      ["Raridade", "Lendário"],
    ],
  },
];

function ClientOnly({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on) return <span className="inline-flex min-h-11 min-w-24" aria-hidden />;
  return children;
}

function Home() {
  const [note, setNote] = useState<string | null>(null);

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
          <nav className="hidden items-center gap-6 font-pixel text-2xl text-muted md:flex">
            <a href="#sobre" className="hover:text-neon">Totens</a>
            <a href="#garagem" className="hover:text-ember">Garagem</a>
            <a href="#nucleo" className="hover:text-neon">Núcleo</a>
            <a href="#airdrop" className="hover:text-ember">Extração</a>
          </nav>
          <ClientOnly>
            <SignedOut>
              <Link
                to="/login"
                search={{ modo: "entrar" }}
                className="inline-flex min-h-11 items-center border border-neon px-3 font-pixel text-2xl text-neon hover:bg-neon hover:text-ink"
              >
                Entrar
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-flex min-h-11 items-center border border-neon px-3 font-pixel text-2xl text-neon hover:bg-neon hover:text-ink"
              >
                Painel
              </Link>
            </SignedIn>
          </ClientOnly>
        </div>
      </header>

      <Hero />
      <Sobre />
      <Garagem />
      <Nucleo />
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
      className="hero-spot relative h-dvh min-h-[640px] overflow-hidden"
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
          DA FLORESTA PROFUNDA, UMA NOVA <span className="utopia-bug" data-text="UTOPIA">UTOPIA</span> SURGE.
        </p>
        <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
          <a
            href="https://discord.com/channels/1103133770984468550"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center bg-neon px-4 font-pixel text-3xl text-ink"
          >
            Lista de espera
          </a>
          <ClientOnly>
            <SignedIn>
              <Link to="/pista" className="inline-flex min-h-11 items-center border border-neon px-4 font-pixel text-3xl text-neon">
                Ir pra pista
              </Link>
            </SignedIn>
          </ClientOnly>
          <a href="#sobre" className="inline-flex min-h-11 items-center border border-ember px-4 font-pixel text-3xl text-ember">
            Descer
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
          <h2 className="glitch-title relative font-pixel text-4xl text-ember md:text-5xl" data-text="> REGISTRO_ALIENIGENA.EXE">
            {"> REGISTRO_ALIENIGENA.EXE"}
          </h2>
          <p className="relative mt-4 text-pretty leading-relaxed text-muted">
            O cometa não era pedra. Era gosma, fauna e osso. Cobriu a Terra, as duas biosferas fundiram, e a guerra
            entre humanos e draconianos ia apagar o que sobrou.
          </p>
          <p className="relative mt-3 text-pretty leading-relaxed text-neon">
            Os líderes sentaram. Projetaram a faixa. A briga virou arrancada: marcha no osso, nitro na hora, 1 contra 1.
          </p>
          <ul className="relative mt-6 space-y-4">
            <li className="border-l-4 border-ember pl-4">
              <h3 className="font-pixel text-3xl text-ember">Tecnologia on-chain</h3>
              <p className="text-sm text-pretty text-muted">Cada carro cunhado é um NFT único. Lendário não se compra. Sai na roleta.</p>
            </li>
            <li className="border-l-4 border-neon pl-4">
              <h3 className="font-pixel text-3xl text-neon">Economia da faixa</h3>
              <p className="text-sm text-pretty text-muted">A moeda é fóssil. Corrida, modo história e peças pagam na mesma ficha.</p>
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
          <img
            src="/home/garage.jpg"
            alt="Hangar de osso com carros na plataforma e um crânio de rex no teto"
            className="art-drift max-h-[70vh] w-full object-cover object-center"
          />
        </div>
      </Reveal>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
        <h2 className="text-center font-pixel text-5xl text-ember md:text-6xl">Plataforma de extração</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-pretty text-muted">
          Passe o mouse no cartão. Ele inclina. Estes três são lendários: não estão na prateleira.
        </p>
        </Reveal>
        <ul className="mt-10 grid gap-8 md:grid-cols-3">
          {CARS.map((car, i) => (
            <li key={car.name}>
              <Reveal delay={i * 90}>
              <Tilt>
                <article className={`flex h-full flex-col border bg-bg p-4 ${car.tone === "neon" ? "border-neon" : "border-ember"}`}>
                  <p className={`self-end border px-2 font-pixel text-xl ${car.tone === "neon" ? "border-neon text-neon" : "border-ember text-ember"}`}>
                    {car.tag}
                  </p>
                  <img src={car.img} alt="" className="mt-3 h-40 w-full object-contain" />
                  <h3 className={`mt-3 font-pixel text-4xl ${car.tone === "neon" ? "text-neon" : "text-ember"}`}>{car.name}</h3>
                  <dl className="mt-3 space-y-1 text-lg">
                    {car.stats.map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-border">
                        <dt className="text-muted">{label}</dt>
                        <dd className={label === "Raridade" ? "text-neon" : "text-fg"}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 flex-1 text-sm text-pretty text-muted">Não está na prateleira. Só sai na roleta.</p>
                  <Link
                    to="/loja"
                    className={`mt-4 inline-flex min-h-11 items-center justify-center border font-pixel text-2xl ${car.tone === "neon" ? "border-neon text-neon hover:bg-neon hover:text-ink" : "border-ember text-ember hover:bg-ember hover:text-ink"}`}
                  >
                    Abrir a roleta
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

function Nucleo() {
  return (
    <section id="nucleo" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
        <h2 className="text-center font-pixel text-5xl text-neon md:text-6xl">Núcleo de distribuição</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-pretty text-muted">
          O coração reparte o que a faixa gera. Passe o mouse: o núcleo acompanha a mão.
        </p>
        </Reveal>
        <Reveal delay={80}>
        <Tilt>
          <div className="mt-8 overflow-hidden border border-neon">
            <img
              src="/home/core.jpg"
              alt="Coração mecânico repartindo play-to-earn, liquidez, crescimento e marketing"
              className="art-drift w-full object-cover"
            />
          </div>
        </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

function Airdrop({ onNote }: { onNote: (message: string) => void }) {
  return (
    <section id="airdrop" className="scroll-mt-20 border-t border-border bg-surface px-4 py-20">
      <Reveal>
      <div className="mx-auto max-w-3xl border border-neon bg-bg px-6 py-12 text-center">
        <h2 className="font-pixel text-5xl text-neon md:text-6xl">Ponto de extração</h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-muted">
          A rede social ainda não abre o baú. Quem já extrai é quem corre: fóssil cai na ficha.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onNote("O canal ainda está fora do ar. A ficha já entra.")}
            className="min-h-11 border border-ember px-4 font-pixel text-2xl text-ember"
          >
            [ + ] Seguir no Twitter
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
              Reivindicar na ficha
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/pista"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-neon font-pixel text-3xl text-ink"
            >
              Correr e extrair
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
        <img
          src="/home/scrap.jpg"
          alt="Lixão de osso, sucata e letreiro Dino Drag Race"
          className="art-drift w-full object-cover"
        />
      </div>
      </Reveal>
      <Reveal>
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-center font-pixel text-4xl text-muted">Roadmap · fases de ignição</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Fase 1 · Ignição", "Site no ar. Ficha. Mint de gênese na roleta.", "text-neon"],
            ["Fase 2 · Aceleração", "Fóssil na faixa. Modo história. Peças na oficina.", "text-ember"],
            ["Fase 3 · Dominação", "Torneio. Upgrade de lenda. A Ronin segura o NFT.", "text-muted"],
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
            onClick={() => onNote("O whitepaper ainda está na forja. A pista já está aberta.")}
            className="min-h-11 border border-border px-5 font-pixel text-2xl text-muted hover:border-neon hover:text-neon"
          >
            [ LER_WHITEPAPER.DAT ]
          </button>
          <p className="font-pixel text-xl text-muted">© 2026 Dino Drag Race. A faixa continua.</p>
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
        <h2 className="font-pixel text-3xl text-ember">{"> AVISO DO SISTEMA"}</h2>
        <p className="mt-4 text-pretty text-muted">{message}</p>
        <button type="button" onClick={onClose} className="mt-6 min-h-11 border border-neon px-5 font-pixel text-2xl text-neon">
          Fechar
        </button>
      </div>
    </div>
  );
}
