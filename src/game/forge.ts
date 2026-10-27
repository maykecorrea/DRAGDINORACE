import { driverById, CATALOG, DRIVERS, type DriverId, type NftCar, type Rarity } from "./data";
import type { Art } from "./render";

type Opt = { id: string; name: string; hex?: string; tag?: string; noun?: string; driver?: DriverId };

const SPECIES: Opt[] = [
  { id: "rex", name: "mandíbula de rex", tag: "REX", noun: "Tiranossauro de rua", driver: "vex" },
  { id: "tri", name: "três chifres", tag: "TRI", noun: "Triceratops de frente", driver: "nyx" },
  { id: "geck", name: "lagarto glitch", tag: "GECK", noun: "Gecko de hatch", driver: "geck" },
  { id: "ptero", name: "asa de ptero", tag: "ASA", noun: "Pterossauro baixo", driver: "lua" },
  { id: "shell", name: "casco", tag: "CASCO", noun: "Quelônio blindado", driver: "shell" },
  { id: "raptor", name: "garra aberta", tag: "GARRA", noun: "Raptor de largada", driver: "claw" },
  { id: "stego", name: "placas", tag: "PLACA", noun: "Estegossauro", driver: "shell" },
  { id: "brachio", name: "pescoço longo", tag: "PESCOÇO", noun: "Braquiossauro", driver: "lua" },
  { id: "ankylo", name: "clava", tag: "CLAVA", noun: "Anquilossauro", driver: "shell" },
  { id: "spino", name: "vela", tag: "VELA", noun: "Espinossauro", driver: "vex" },
  { id: "dilo", name: "babado", tag: "BABADO", noun: "Dilofossauro", driver: "geck" },
  { id: "carno", name: "chifres curtos", tag: "CORNO", noun: "Carnotauro", driver: "claw" },
  { id: "para", name: "crista", tag: "CRISTA", noun: "Parassaurolofo", driver: "nyx" },
  { id: "compy", name: "miúdo", tag: "MIÚDO", noun: "Compsognato", driver: "geck" },
];

const CHASSIS: Opt[] = [
  { id: "muscle", name: "muscle curto" },
  { id: "wedge", name: "cunha" },
  { id: "truck", name: "picape" },
  { id: "hatch", name: "hatch" },
  { id: "buggy", name: "buggy" },
  { id: "limo", name: "limusine baixa" },
  { id: "wagon", name: "perua" },
  { id: "nose", name: "narigão" },
];

const PAINT: Opt[] = [
  { id: "osso", name: "osso", hex: "#e6dcc4" },
  { id: "petroleo", name: "petróleo", hex: "#1c2420" },
  { id: "magma", name: "magma", hex: "#c2411a" },
  { id: "cromo", name: "cromo", hex: "#c5ccd4" },
  { id: "acido", name: "ácido", hex: "#c6f23a" },
  { id: "uva", name: "uva neon", hex: "#7a3cff" },
  { id: "sangue", name: "sangue seco", hex: "#6e1d2a" },
  { id: "areia", name: "areia", hex: "#d2b48a" },
  { id: "musgo", name: "musgo", hex: "#3e6b3a" },
  { id: "noite", name: "noite", hex: "#14161c" },
  { id: "gelo", name: "gelo", hex: "#d5fff4" },
  { id: "ouro", name: "ouro velho", hex: "#c6a15b" },
  { id: "rosa", name: "rosa fóssil", hex: "#ff7ad9" },
  { id: "cobre", name: "cobre", hex: "#b87333" },
  { id: "mar", name: "mar fundo", hex: "#1f4d6e" },
  { id: "lima", name: "lima podre", hex: "#8ea818" },
];

const NEON: Opt[] = [
  { id: "acido", name: "ácido", hex: "#d6ff3f" },
  { id: "magma", name: "magma", hex: "#ff3b1f" },
  { id: "gelo", name: "gelo", hex: "#d5fff4" },
  { id: "hype", name: "hype", hex: "#ff7ad9" },
  { id: "ouro", name: "ouro", hex: "#ffd15c" },
  { id: "violeta", name: "violeta", hex: "#b388ff" },
  { id: "ciano", name: "ciano", hex: "#39f3ff" },
  { id: "branco", name: "branco", hex: "#f7f7f2" },
];

const EYE: Opt[] = [
  { id: "brasa", name: "brasa", hex: "#ff3b1f" },
  { id: "acido", name: "ácido", hex: "#d6ff3f" },
  { id: "ambar", name: "âmbar", hex: "#ffb020" },
  { id: "gelo", name: "gelo", hex: "#d5fff4" },
];

const WHEEL: Opt[] = [
  { id: "lisa", name: "lisa preta" },
  { id: "raio", name: "de raio" },
  { id: "gorda", name: "gorda" },
  { id: "disco", name: "disco cromado" },
];

const PATTERN: Opt[] = [
  { id: "solido", name: "liso" },
  { id: "faixa", name: "faixas" },
  { id: "pinta", name: "pintas" },
  { id: "xadrez", name: "xadrez miúdo" },
  { id: "perigo", name: "chevron de perigo" },
];

const DECAL: Opt[] = [
  { id: "hodl", name: "HODL", tag: "HODL" },
  { id: "ngmi", name: "NGMI", tag: "NGMI" },
  { id: "wagmi", name: "WAGMI", tag: "WAGMI" },
  { id: "gm", name: "GM", tag: "GM" },
  { id: "rekt", name: "REKT", tag: "REKT" },
  { id: "404", name: "404", tag: "404" },
  { id: "ser", name: "SER", tag: "SER" },
  { id: "moon", name: "MOON", tag: "MOON" },
  { id: "foss", name: "FOSS", tag: "FOSS" },
  { id: "rawr", name: "RAWR", tag: "RAWR" },
];

const EXTRA: Opt[] = [
  { id: "nenhum", name: "sem adorno" },
  { id: "chifre", name: "chifre extra" },
  { id: "vela", name: "vela dorsal" },
  { id: "cristal", name: "cristais glitch" },
  { id: "asa", name: "asa dobrada" },
  { id: "moeda", name: "moeda na porta" },
  { id: "corrente", name: "corrente no para-choque" },
  { id: "cranio", name: "crânio no capô" },
];

const RARITY_BAG = ["Comum", "Normal", "Raro", "Épico", "Lendário"] as const;
type CarTier = (typeof RARITY_BAG)[number];
type WheelSlice = CarTier | "Prêmio";

const CAR_ODDS: { rarity: CarTier; pct: number }[] = [
  { rarity: "Comum", pct: 70 },
  { rarity: "Normal", pct: 23.9 },
  { rarity: "Raro", pct: 5 },
  { rarity: "Épico", pct: 1 },
  { rarity: "Lendário", pct: 0.1 },
];

export const RARITY_WHEEL: { rarity: WheelSlice; pct: number; color: string }[] = [
  { rarity: "Comum", pct: 60, color: "#efe6d2" },
  { rarity: "Normal", pct: 23.9, color: "#d6ff3f" },
  { rarity: "Raro", pct: 5, color: "#7fd7ff" },
  { rarity: "Épico", pct: 1, color: "#ff4bd8" },
  { rarity: "Lendário", pct: 0.1, color: "#ffd24a" },
  { rarity: "Prêmio", pct: 10, color: "#d6ff3f" },
];

export function wheelAngle(rarity: string): number {
  let acc = 0;
  for (const slice of RARITY_WHEEL) {
    const sweep = slice.pct * 3.6;
    if (slice.rarity === rarity) {
      const margin = Math.min(sweep * 0.18, 6);
      const span = Math.max(sweep * 0.2, sweep - margin * 2);
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return acc + (sweep - span) / 2 + (buf[0]! / 4294967296) * span;
    }
    acc += sweep;
  }
  return 180;
}

type Model = {
  id: string;
  name: string;
  driver: DriverId;
  speciesId: string;
  chassisId: string;
  paintId: string;
  secondaryId: string;
  neonId: string;
  eyeId: string;
  wheelId: string;
  patternId: string;
  decalId: string;
  extraId: string;
  prompt: string;
};

type CardArt = { no: string; car: string; pilot?: string; spin?: string; rear?: string };

const LEGEND_ART: Record<string, CardArt> = {
  medula: { no: "001", car: "/game/legend/car-medula.png?v=2", spin: "/game/legend/spin-medula.mp4?v=1" },
  ferrao: { no: "002", car: "/game/legend/car-ferrao.png?v=2", spin: "/game/legend/spin-ferrao.mp4?v=1" },
  coroa: { no: "003", car: "/game/legend/car-coroa.png?v=2", spin: "/game/legend/spin-coroa.mp4?v=2" },
  bofe: { no: "004", car: "/game/legend/car-bofe.png?v=2", spin: "/game/legend/spin-bofe.mp4?v=1" },
  neuro: { no: "006", car: "/game/legend/car-neuro.png?v=8", pilot: "/game/legend/pilot-neuro.png?v=8", spin: "/game/legend/spin-neuro.mp4" },
  ronin: { no: "007", car: "/game/legend/car-ronin.png?v=8", pilot: "/game/legend/pilot-ronin.png?v=8", spin: "/game/legend/spin-ronin.mp4" },
  trex: { no: "008", car: "/game/legend/car-trex.png?v=8", pilot: "/game/legend/pilot-trex.png?v=8", spin: "/game/legend/spin-trex.mp4" },
};

const EPIC_ART: Record<string, CardArt> = {
  cinza: { no: "009", car: "/game/epic/car-cinza.png?v=8", spin: "/game/epic/spin-cinza.mp4?v=3" },
  viuva: { no: "010", car: "/game/epic/car-viuva.png?v=8", spin: "/game/epic/spin-viuva.mp4?v=2" },
  rebite: { no: "011", car: "/game/epic/car-rebite.png?v=8", spin: "/game/epic/spin-rebite.mp4?v=3" },
  luz: { no: "012", car: "/game/epic/car-luz.png?v=8", spin: "/game/epic/spin-luz.mp4?v=3" },
  queixo: { no: "013", car: "/game/epic/car-queixo.png?v=8", spin: "/game/epic/spin-queixo.mp4?v=2" },
  unha: { no: "014", car: "/game/epic/car-unha.png?v=8", spin: "/game/epic/spin-unha.mp4?v=2" },
  friso: { no: "015", car: "/game/epic/car-friso.png?v=8", spin: "/game/epic/spin-friso.mp4?v=2" },
  nave: { no: "030", car: "/game/epic/car-nave.png?v=1", spin: "/game/epic/spin-nave.mp4?v=1" },
};

const RARE_ART: Record<string, CardArt> = {
  prato: { no: "016", car: "/game/rare/car-prato.png?v=8", spin: "/game/rare/spin-prato.mp4?v=5" },
  vassoura: { no: "017", car: "/game/rare/car-vassoura.png?v=8", spin: "/game/rare/spin-vassoura.mp4?v=6" },
  barril: { no: "018", car: "/game/rare/car-barril.png?v=8", rear: "/game/rare/car-barril-rear.png?v=1", spin: "/game/rare/spin-barril.mp4?v=9" },
  gaiola: { no: "019", car: "/game/rare/car-gaiola.png?v=8", spin: "/game/rare/spin-gaiola.mp4?v=6" },
  lanterna: { no: "020", car: "/game/rare/car-lanterna.png?v=8", spin: "/game/rare/spin-lanterna.mp4?v=6" },
  telha: { no: "021", car: "/game/rare/car-telha.png?v=8", spin: "/game/rare/spin-telha.mp4?v=7" },
  sino: { no: "022", car: "/game/rare/car-sino.png?v=8", spin: "/game/rare/spin-sino.mp4?v=6" },
  placa: { no: "023", car: "/game/rare/car-placa.png?v=8", spin: "/game/rare/spin-placa.mp4?v=6" },
  clava: { no: "024", car: "/game/rare/car-clava.png?v=8", spin: "/game/rare/spin-clava.mp4?v=6" },
  vela: { no: "025", car: "/game/rare/car-vela.png?v=8", spin: "/game/rare/spin-vela.mp4?v=6" },
  pescoco: { no: "026", car: "/game/rare/car-pescoco.png?v=8", spin: "/game/rare/spin-pescoco.mp4?v=6" },
  babado: { no: "027", car: "/game/rare/car-babado.png?v=8", spin: "/game/rare/spin-babado.mp4?v=7" },
  bico: { no: "028", car: "/game/rare/car-bico.png?v=8", spin: "/game/rare/spin-bico.mp4?v=7" },
  casco: { no: "029", car: "/game/rare/car-casco.png?v=10", spin: "/game/rare/spin-casco.mp4?v=8" },
};

function cardArt(id: string): CardArt | undefined {
  return LEGEND_ART[id] ?? EPIC_ART[id] ?? RARE_ART[id];
}

const LEGENDS: Model[] = [
  {
    id: "medula",
    name: "MEDULA",
    driver: "vex",
    speciesId: "rex",
    chassisId: "muscle",
    paintId: "osso",
    secondaryId: "acido",
    neonId: "acido",
    eyeId: "acido",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "nenhum",
    extraId: "nenhum",
    prompt: "Lendário original. Trenó de vértebra rachada, medula verde, cabo roxo, esqui de osso, dois sinos de empuxo. Sem roda, sem marca, sem letra.",
  },
  {
    id: "ferrao",
    name: "FERRÃO",
    driver: "claw",
    speciesId: "raptor",
    chassisId: "wedge",
    paintId: "noite",
    secondaryId: "acido",
    neonId: "ciano",
    eyeId: "gelo",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "nenhum",
    extraId: "nenhum",
    prompt: "Lendário original. Cunha de quitina e sucata, ferrão de ácido, anéis de flutuação. Sem roda, sem marca, sem letra.",
  },
  {
    id: "coroa",
    name: "COROA",
    driver: "nyx",
    speciesId: "shell",
    chassisId: "hatch",
    paintId: "osso",
    secondaryId: "ouro",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "nenhum",
    extraId: "nenhum",
    prompt: "Lendário original. Coroa de dente fóssil, empuxo âmbar, esqui de osso. Sem moeda, sem roda, sem marca, sem letra.",
  },
  {
    id: "bofe",
    name: "BOFE",
    driver: "lua",
    speciesId: "para",
    chassisId: "nose",
    paintId: "musgo",
    secondaryId: "noite",
    neonId: "ciano",
    eyeId: "gelo",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "nenhum",
    extraId: "nenhum",
    prompt: "Lendário original. Gaiola de costela com dois pulmões vivos, válvula ciano, cano de sucata. Sem roda, sem marca, sem letra.",
  },
  {
    id: "neuro",
    name: "NEURO",
    driver: "nyx",
    speciesId: "para",
    chassisId: "nose",
    paintId: "uva",
    secondaryId: "noite",
    neonId: "violeta",
    eyeId: "acido",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "ser",
    extraId: "cristal",
    prompt: "Figurinha pixel, fundo preto. Cápsula neural. Cristais no lugar do capô, cabo saindo do teto. Sem roda. Anel violeta. Placa NEURO.",
  },
  {
    id: "ronin",
    name: "RONIN",
    driver: "claw",
    speciesId: "raptor",
    chassisId: "wedge",
    paintId: "noite",
    secondaryId: "sangue",
    neonId: "magma",
    eyeId: "brasa",
    wheelId: "lisa",
    patternId: "faixa",
    decalId: "rekt",
    extraId: "corrente",
    prompt: "Figurinha pixel, fundo preto. Lâmina preta de sucata de nave. Corrente no bico, anéis de luz, sem roda. Placa RONIN.",
  },
  {
    id: "trex",
    name: "T-REX",
    driver: "vex",
    speciesId: "rex",
    chassisId: "muscle",
    paintId: "osso",
    secondaryId: "noite",
    neonId: "branco",
    eyeId: "brasa",
    wheelId: "gorda",
    patternId: "faixa",
    decalId: "rawr",
    extraId: "cranio",
    prompt: "Figurinha pixel, fundo preto. Fuselagem de costela. O nariz é um crânio de T-Rex, dente branco, olho brasa. Chapa sobre escama, reator ácido, sinos de empuxo atrás, esqui de osso. Sem roda. Placa TREX.",
  },
];

const EPICS: Model[] = [
  {
    id: "cinza",
    name: "CINZA-9",
    driver: "shell",
    speciesId: "shell",
    chassisId: "hatch",
    paintId: "cromo",
    secondaryId: "lima",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "404",
    extraId: "nenhum",
    prompt: "Humano. Cápsula de fuga cortada ao meio. Visor redondo de capacete, crânio pequeno no nariz, pontão de gosma lima, um único jato atrás, alinhado. Sem roda. Figurinha 009.",
  },
  {
    id: "viuva",
    name: "VIÚVA",
    driver: "lua",
    speciesId: "ptero",
    chassisId: "limo",
    paintId: "noite",
    secondaryId: "ouro",
    neonId: "violeta",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "faixa",
    decalId: "moon",
    extraId: "asa",
    prompt: "Humano. Caixão longo. Vela solar rasgada no teto, visor de ouro, esqui de osso e quilha roxa. Cauda de cabo de nave. Sem roda. Figurinha 010.",
  },
  {
    id: "rebite",
    name: "REBITE",
    driver: "nyx",
    speciesId: "ankylo",
    chassisId: "truck",
    paintId: "osso",
    secondaryId: "petroleo",
    neonId: "acido",
    eyeId: "gelo",
    wheelId: "gorda",
    patternId: "perigo",
    decalId: "ngmi",
    extraId: "nenhum",
    prompt: "Humano. Tijolo de chapas brancas, ferrugem e preto, rebite enorme, chevron, vigia de escafandro, quatro sinos de empuxo. Sem roda. Figurinha 011.",
  },
  {
    id: "luz",
    name: "LUZ-MORTA",
    driver: "claw",
    speciesId: "compy",
    chassisId: "wedge",
    paintId: "noite",
    secondaryId: "mar",
    neonId: "ciano",
    eyeId: "gelo",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "404",
    extraId: "nenhum",
    prompt: "Humano. Agulha preta. Tubos de néon mortos, um só ainda ciano. Fresta de visor. Dois anéis embaixo e um esqui de osso na ponta. Sem roda. Figurinha 012.",
  },
  {
    id: "queixo",
    name: "QUEIXO",
    driver: "vex",
    speciesId: "rex",
    chassisId: "nose",
    paintId: "osso",
    secondaryId: "magma",
    neonId: "ouro",
    eyeId: "brasa",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "rawr",
    extraId: "cranio",
    prompt: "Dinocar. O carro é o crânio do rex. A mandíbula é o aríete, o olho é uma fornalha, o coto do pescoço é anel de empuxo. Chapa rebitada no osso. Sem roda. Figurinha 013.",
  },
  {
    id: "unha",
    name: "CARRAPA",
    driver: "claw",
    speciesId: "raptor",
    chassisId: "wedge",
    paintId: "noite",
    secondaryId: "uva",
    neonId: "acido",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "rekt",
    extraId: "nenhum",
    prompt: "Dinocar. Carrapato de sucata. Abdômen inchado de chapa preta, tripa roxa, sensor dourado, dois pods lima e um jato. O nariz é o ferrão, não uma garra. Sem perna e sem roda. Figurinha 014.",
  },
  {
    id: "friso",
    name: "FRISO",
    driver: "nyx",
    speciesId: "tri",
    chassisId: "nose",
    paintId: "musgo",
    secondaryId: "cromo",
    neonId: "ouro",
    eyeId: "gelo",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "ser",
    extraId: "chifre",
    prompt: "Dinocar. Três chifres na frente, o escudo ósseo é a asa traseira, cabine curta no meio, escamas e rebite. Três jatos de gosma amarela. Sem roda e sem perna. Figurinha 015.",
  },
  {
    id: "nave",
    name: "BROKEN NAVE",
    driver: "vex",
    speciesId: "rex",
    chassisId: "buggy",
    paintId: "osso",
    secondaryId: "magma",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "rawr",
    extraId: "nenhum",
    prompt: "Dinocar épico. Carro aberto, sem teto. O arco de osso é a cabine, a fenda âmbar fica à vista, veia orgânica na sucata. Visto de trás. Figurinha 030.",
  },
];

const RARES: Model[] = [
  { id: "prato", name: "PRATO", driver: "nyx", speciesId: "compy", chassisId: "hatch", paintId: "cromo", secondaryId: "lima", neonId: "ouro", eyeId: "gelo", wheelId: "lisa", patternId: "solido", decalId: "gm", extraId: "nenhum", prompt: "Humano raro. Antena parabólica no nariz, gaiola de carrinho, vigia redonda, pontão de gosma. Sem roda. Figurinha 016." },
  { id: "vassoura", name: "VASSOURA", driver: "claw", speciesId: "compy", chassisId: "wedge", paintId: "cobre", secondaryId: "noite", neonId: "violeta", eyeId: "ambar", wheelId: "lisa", patternId: "solido", decalId: "rekt", extraId: "nenhum", prompt: "Humano raro. Uma viga só, capacete rachado de cockpit, esqui de osso, um jato roxo. Sem roda. Figurinha 017." },
  { id: "barril", name: "BARRIL", driver: "shell", speciesId: "shell", chassisId: "truck", paintId: "magma", secondaryId: "noite", neonId: "ouro", eyeId: "ambar", wheelId: "lisa", patternId: "perigo", decalId: "ngmi", extraId: "nenhum", prompt: "Humano raro. Tambor deitado, faixa de perigo, fresta de visor, dois pontões amarelos. Sem roda. Figurinha 018." },
  { id: "gaiola", name: "GAIOLA", driver: "geck", speciesId: "geck", chassisId: "buggy", paintId: "petroleo", secondaryId: "osso", neonId: "violeta", eyeId: "acido", wheelId: "lisa", patternId: "solido", decalId: "404", extraId: "nenhum", prompt: "Humano raro. Gaiola aberta de vergalhão, banco à vista, esqui de osso, jato roxo. Sem chapa e sem roda. Figurinha 019." },
  { id: "lanterna", name: "LANTERNA", driver: "lua", speciesId: "ptero", chassisId: "nose", paintId: "noite", secondaryId: "mar", neonId: "ciano", eyeId: "gelo", wheelId: "lisa", patternId: "solido", decalId: "moon", extraId: "nenhum", prompt: "Humano raro. O carro é uma lanterna industrial. A lente ciano é o nariz, o cabo é a cauda. Sem roda. Figurinha 020." },
  { id: "telha", name: "TELHA", driver: "vex", speciesId: "ankylo", chassisId: "limo", paintId: "cobre", secondaryId: "noite", neonId: "ouro", eyeId: "ambar", wheelId: "lisa", patternId: "faixa", decalId: "foss", extraId: "nenhum", prompt: "Humano raro. Chapa ondulada baixa feito telha, periscópio no meio, quatro velas de empuxo. Sem roda. Figurinha 021." },
  { id: "sino", name: "SINO", driver: "nyx", speciesId: "shell", chassisId: "hatch", paintId: "cobre", secondaryId: "ouro", neonId: "magma", eyeId: "ambar", wheelId: "lisa", patternId: "solido", decalId: "ser", extraId: "nenhum", prompt: "Humano raro. Sino de igreja cortado vira o cockpit, esquis de osso, um jato atrás. Sem roda. Figurinha 022." },
  { id: "placa", name: "PLACA", driver: "shell", speciesId: "stego", chassisId: "truck", paintId: "musgo", secondaryId: "cromo", neonId: "acido", eyeId: "acido", wheelId: "lisa", patternId: "solido", decalId: "rawr", extraId: "vela", prompt: "Dinocar raro. Estegossauro: as placas dorsais são radiadores, espinhos na cauda, anéis lima. Sem roda. Figurinha 023." },
  { id: "clava", name: "CLAVA", driver: "shell", speciesId: "ankylo", chassisId: "truck", paintId: "noite", secondaryId: "cromo", neonId: "magma", eyeId: "brasa", wheelId: "lisa", patternId: "solido", decalId: "hodl", extraId: "nenhum", prompt: "Dinocar raro. Bunker de anquilossauro. A clava da cauda é o motor. Sem roda. Figurinha 024." },
  { id: "vela", name: "VELA", driver: "vex", speciesId: "spino", chassisId: "nose", paintId: "cromo", secondaryId: "uva", neonId: "ouro", eyeId: "ambar", wheelId: "lisa", patternId: "solido", decalId: "moon", extraId: "vela", prompt: "Dinocar raro. Focinho de crocodilo, vela de painel solar rasgado, quilha de gosma amarela. Sem roda. Figurinha 025." },
  { id: "pescoco", name: "PESCOÇO", driver: "lua", speciesId: "brachio", chassisId: "limo", paintId: "areia", secondaryId: "petroleo", neonId: "violeta", eyeId: "gelo", wheelId: "lisa", patternId: "solido", decalId: "moon", extraId: "nenhum", prompt: "Dinocar raro. O pescoço é o chassi, a cabeça é o sensor, o corpo é um pod de carga. Anéis roxos. Sem roda. Figurinha 026." },
  { id: "babado", name: "BABADO", driver: "geck", speciesId: "dilo", chassisId: "hatch", paintId: "petroleo", secondaryId: "uva", neonId: "violeta", eyeId: "ambar", wheelId: "lisa", patternId: "solido", decalId: "gm", extraId: "nenhum", prompt: "Dinocar raro. Babado de dilofossauro vira asa roxa, a boca é um canhão de gosma. Sem roda. Figurinha 027." },
  { id: "bico", name: "BICO", driver: "lua", speciesId: "ptero", chassisId: "wedge", paintId: "cromo", secondaryId: "uva", neonId: "ouro", eyeId: "gelo", wheelId: "lisa", patternId: "solido", decalId: "404", extraId: "asa", prompt: "Dinocar raro. Bico longo é o aríete, asa dobrada de membrana roxa nos flancos. Sem roda. Figurinha 028." },
  { id: "casco", name: "CASCO", driver: "shell", speciesId: "shell", chassisId: "hatch", paintId: "musgo", secondaryId: "lima", neonId: "acido", eyeId: "gelo", wheelId: "lisa", patternId: "solido", decalId: "hodl", extraId: "nenhum", prompt: "Dinocar raro. O carro é um casco de quelônio, escotilha rebitada, gosma e esqui de osso. Sem perna e sem roda. Figurinha 029." },
];

const DINO_IDS = new Set(["queixo", "unha", "friso", "nave", "placa", "clava", "vela", "pescoco", "babado", "bico", "casco"]);

export function legendStickers() {
  return LEGENDS.map((model) => ({ id: model.id, name: model.name, driver: model.driver, ...LEGEND_ART[model.id]! }));
}

export function epicStickers() {
  return EPICS.map((model) => ({ id: model.id, name: model.name, driver: model.driver, kind: DINO_IDS.has(model.id) ? "dinocar" : "humano", ...EPIC_ART[model.id]! }));
}

export function rareStickers() {
  return RARES.map((model) => ({ id: model.id, name: model.name, driver: model.driver, kind: DINO_IDS.has(model.id) ? "dinocar" : "humano", ...RARE_ART[model.id]! }));
}

const RETIRED_MODEL: Record<string, string> = {
  pepe: "medula",
  doge: "ferrao",
  binance: "coroa",
  mexc: "bofe",
  btc: "medula",
};

export function canonModel(id?: string): string | undefined {
  if (!id) return id;
  const key = id.toLowerCase();
  return RETIRED_MODEL[key] ?? id;
}

export function legendOf(image?: string) {
  if (!image) return undefined;
  const clean = image.split("?")[0].replace(/\.jpe?g$/, ".png");
  return [...legendStickers(), ...epicStickers(), ...rareStickers()].find((card) => card.car.split("?")[0] === clean);
}

export function stickerOf(id?: string) {
  if (!id) return undefined;
  const key = canonModel(id.toLowerCase()) ?? id.toLowerCase();
  return [...legendStickers(), ...epicStickers(), ...rareStickers()].find((card) => card.id === key || card.name.toLowerCase() === key);
}

function rollTier(): CarTier {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let roll = (buf[0]! / 4294967296) * 100;
  for (const slice of CAR_ODDS) {
    if (roll < slice.pct) return slice.rarity;
    roll -= slice.pct;
  }
  return "Normal";
}

function unitRoll(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 4294967296;
}

const WHEEL_BP: { rarity: WheelSlice; bp: number }[] = [
  { rarity: "Comum", bp: 6000 },
  { rarity: "Normal", bp: 2390 },
  { rarity: "Raro", bp: 500 },
  { rarity: "Épico", bp: 100 },
  { rarity: "Lendário", bp: 10 },
  { rarity: "Prêmio", bp: 1000 },
];

export function rollSlice(): WheelSlice {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let roll = buf[0]! % 10000;
  for (const band of WHEEL_BP) {
    if (roll < band.bp) return band.rarity;
    roll -= band.bp;
  }
  return "Prêmio";
}

/** 10% of the wheel. Inside it: 5% of spins pay 100, 0.1% pay 10000, the rest climbs on a log curve. */
export function rollFossilPayout(): number {
  const u = unitRoll();
  if (u < 0.5) return 100;
  if (u >= 0.99) return 10000;
  const t = (u - 0.5) / 0.49;
  const raw = Math.round(100 * 100 ** t);
  return Math.min(9990, Math.max(110, Math.round(raw / 10) * 10));
}

export type MintHit = { kind: "car"; spec: ForgeSpec } | { kind: "fossil"; amount: number };

/** Same wheel for cars, items and pilots. Fóssil is exactly 10%. */
export function rollWheel(): { kind: "fossil"; amount: number } | { kind: "tier"; tier: CarTier } {
  const slice = rollSlice();
  if (slice === "Prêmio") return { kind: "fossil", amount: rollFossilPayout() };
  return { kind: "tier", tier: slice };
}

export function rollMint(blocked: Set<string>): MintHit {
  const spin = rollWheel();
  if (spin.kind === "fossil") return { kind: "fossil", amount: spin.amount };
  return { kind: "car", spec: inventOfTier(spin.tier, blocked) };
}

function fromModel(model: Model, rarity: (typeof RARITY_BAG)[number]): ForgeSpec {
  const id = mintId();
  const art = cardArt(model.id);
  return {
    id,
    signature: `${rarity}.${model.id}.${id}`,
    name: model.name,
    prompt: model.prompt,
    rarity,
    modelId: model.id,
    driverId: model.driver,
    speciesId: model.speciesId,
    chassisId: model.chassisId,
    paintId: model.paintId,
    secondaryId: model.secondaryId,
    neonId: model.neonId,
    eyeId: model.eyeId,
    wheelId: model.wheelId,
    patternId: model.patternId,
    decalId: model.decalId,
    extraId: model.extraId,
    image: art?.car,
    pilot: art?.pilot,
    stickerNo: art?.no,
  };
}

export type ForgeSpec = {
  id: string;
  signature: string;
  name: string;
  prompt: string;
  rarity: Rarity;
  driverId: DriverId;
  speciesId: string;
  chassisId: string;
  paintId: string;
  secondaryId: string;
  neonId: string;
  eyeId: string;
  wheelId: string;
  patternId: string;
  decalId: string;
  extraId: string;
  image?: string;
  reveal?: string;
  pilot?: string;
  stickerNo?: string;
  modelId?: string;
};

type HatchTier = "Comum" | "Normal" | "Raro" | "Épico" | "Lendário";

export const HATCHES: Record<HatchTier, { name: string; image: string; reveal: string }[]> = {
  Comum: [1, 2, 3, 4].map((n) => ({
    name: `COMUM-0${n}`,
    image: n === 4 ? "/game/hatch/comum-4.png" : `/game/hatch/comum-${n}.jpg`,
    reveal: `/game/hatch/comum-${n}.mp4?v=3`,
  })),
  Normal: [1, 2, 3, 4].map((n) => ({
    name: `NORMAL-0${n}`,
    image: `/game/hatch/normal-${n}.jpg`,
    reveal: `/game/hatch/normal-${n}.mp4?v=3`,
  })),
  Raro: [1, 2, 3, 4].map((n) => ({
    name: `RARE-0${n}`,
    image: `/game/hatch/raro-${n}.jpg`,
    reveal: `/game/hatch/raro-${n}.mp4?v=3`,
  })),
  Épico: [1, 2, 3, 4].map((n) => ({
    name: `EPIC-0${n}`,
    image: `/game/hatch/epico-${n}.jpg`,
    reveal: `/game/hatch/epico-${n}.mp4?v=3`,
  })),
  Lendário: [1, 2, 3, 4].map((n) => ({
    name: `LEGENDARY-0${n}`,
    image: `/game/hatch/lendario-${n}.jpg`,
    reveal: `/game/hatch/lendario-${n}.mp4?v=3`,
  })),
};

function attachReveal(spec: ForgeSpec): ForgeSpec {
  const pool = HATCHES[spec.rarity as HatchTier];
  if (!pool?.length) return spec;
  spec.reveal = pick(pool).reveal;
  return spec;
}

function pick<T>(list: readonly T[]): T {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return list[buf[0]! % list.length]!;
}

function mintId(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return `SAUR-${[...buf].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function byId(list: readonly Opt[], id: string): Opt {
  return list.find((item) => item.id === id) ?? list[0]!;
}

export function writePrompt(spec: ForgeSpec): string {
  if (spec.modelId) return spec.prompt;
  const species = byId(SPECIES, spec.speciesId);
  const paint = byId(PAINT, spec.paintId);
  const secondary = byId(PAINT, spec.secondaryId);
  const neon = byId(NEON, spec.neonId);
  const eye = byId(EYE, spec.eyeId);
  const wheel = byId(WHEEL, spec.wheelId);
  const pattern = byId(PATTERN, spec.patternId);
  const decal = byId(DECAL, spec.decalId);
  const extra = byId(EXTRA, spec.extraId);
  const dino = (species.noun ?? species.name).toLowerCase();
  if (spec.rarity === "Comum") {
    return `Carro de lado, pixel, fundo preto. Só o carro, simples. Lataria ${paint.name}. Sem cabeça, sem asa, sem vela. Toque dino: ${dino}. Placa ${decal.name}.`;
  }
  if (spec.rarity === "Normal") {
    return `Carro de lado, pixel, fundo preto. Só o carro. Lataria ${paint.name}, uma faixa ${secondary.name}. Sem cabeça. Toque dino: ${dino}. Roda ${wheel.name}. Placa ${decal.name}.`;
  }
  return `Carro de lado, pixel, fundo preto. Carro raro, sem cabeça cheia. Lataria ${paint.name}, ${pattern.name} ${secondary.name}. Olho pequeno ${eye.name}. ${extra.name}. Roda ${wheel.name}. Néon ${neon.name} embaixo. Placa ${decal.name}.`;
}

const BLANK = {
  speciesId: "geck",
  chassisId: "hatch",
  paintId: "cromo",
  secondaryId: "noite",
  neonId: "branco",
  eyeId: "ambar",
  wheelId: "lisa",
  patternId: "solido",
  decalId: "gm",
  extraId: "nenhum",
} as const;

const COMMONS: Model[] = DRIVERS.map((driver) => ({
  id: driver.id,
  name: driver.car,
  driver: driver.id,
  ...BLANK,
  prompt: driver.line,
}));

const NORMALS: Model[] = CATALOG.map((item) => ({
  id: (item.name ?? `${item.driverId}-loja`).toLowerCase(),
  name: item.name ?? driverById(item.driverId).car,
  driver: item.driverId,
  ...BLANK,
  prompt: item.note,
}));

function roster(tier: (typeof RARITY_BAG)[number]): Model[] {
  if (tier === "Lendário") return LEGENDS;
  if (tier === "Épico") return EPICS;
  if (tier === "Raro") return RARES;
  if (tier === "Normal") return NORMALS;
  return COMMONS;
}

function alreadyOwned(blocked: Set<string>, tier: string, modelId: string): boolean {
  const key = `${tier}.${modelId}.`;
  for (const signature of blocked) {
    if (signature.startsWith(key) || signature === `${tier}.${modelId}`) return true;
  }
  return false;
}

export const FUSE_LADDER: { from: HatchTier; to: HatchTier; chance: number }[] = [
  { from: "Comum", to: "Normal", chance: 0.25 },
  { from: "Normal", to: "Raro", chance: 0.1 },
  { from: "Raro", to: "Épico", chance: 0.05 },
  { from: "Épico", to: "Lendário", chance: 0.01 },
];

export function fuseStep(rarity: string) {
  return FUSE_LADDER.find((step) => step.from === rarity);
}

export function inventOfTier(tier: HatchTier, blocked: Set<string>): ForgeSpec {
  const pool = roster(tier);
  const open = pool.filter((model) => !alreadyOwned(blocked, tier, model.id));
  const model = pick(open.length ? open : pool);
  const spec = fromModel(model, tier);
  if (tier === "Comum") {
    const driver = driverById(model.driver);
    spec.image = `/game/car-${driver.sprite}.png`;
    spec.pilot = `/game/pilot-${driver.sprite}.png`;
  }
  if (tier === "Normal") {
    const item = CATALOG.find((entry) => (entry.name ?? `${entry.driverId}-loja`).toLowerCase() === model.id);
    const driver = driverById(model.driver);
    spec.image = item?.image ?? `/game/car-${driver.sprite}.png`;
    spec.pilot = item?.image ? undefined : `/game/pilot-${driver.sprite}.png`;
    spec.stickerNo = undefined;
  }
  return attachReveal(spec);
}

export function inventSpec(blocked: Set<string>): ForgeSpec {
  return inventOfTier(rollTier(), blocked);
}

export function specToCar(spec: ForgeSpec): NftCar {
  return {
    tokenId: spec.id,
    driverId: spec.driverId,
    rarity: spec.rarity,
    paint: byId(PAINT, spec.paintId).name,
    neon: byId(NEON, spec.neonId).name,
    charm: byId(EXTRA, spec.extraId).name,
    upgrades: { engine: 0, gearbox: 0, nitro: 0, tires: 0, chassis: 0 },
    xp: 0,
    exclusive: {
      signature: spec.signature,
      prompt: spec.prompt,
      name: spec.name,
      image: spec.image ?? "",
      modelId: spec.modelId,
      reveal: spec.reveal,
    },
  };
}

function clearSticker(image: string): string {
  const cut = image.split("?")[0];
  if (/\/game\/(epic|rare|normal|legend)\/car-[a-z0-9-]+\.jpe?g$/.test(cut)) {
    return `${cut.replace(/\.jpe?g$/, ".png")}?v=9`;
  }
  if (/\/game\/legend\/(car|pilot|side|front)-[a-z0-9-]+\.png$/.test(cut)) {
    return `${cut}?v=2`;
  }
  if (/\/game\/(epic|rare|normal)\/(car|pilot)-[a-z0-9-]+\.png$/.test(cut)) {
    return `${cut}?v=9`;
  }
  return image;
}

export function carArt(car: NftCar): string {
  const swapped = canonModel(car.exclusive?.modelId) ?? canonModel(car.exclusive?.name);
  if (swapped && swapped !== car.exclusive?.modelId && swapped !== car.exclusive?.name) {
    const card = stickerOf(swapped);
    if (card?.car) return card.car;
  }
  const image = car.exclusive?.image ?? "";
  if (image.includes("car-casco")) return "/game/rare/car-casco.png?v=10";
  if (image.includes("car-balde")) return "/game/normal/car-balde.png?v=3";
  if (image.includes("car-valvula")) return "/game/normal/car-valvula.png?v=9";
  if (image.includes("car-pino")) return "/game/normal/car-pino.png?v=10";
  const retired = image.match(/car-(pepe|doge|binance|mexc|btc)/);
  if (retired) {
    const card = stickerOf(retired[1]);
    if (card?.car) return card.car;
  }
  if (image) return clearSticker(image);
  return `/game/car-${driverById(car.driverId).sprite}.png`;
}

export const TOP_MODELS = [
  "vex",
  "nyx",
  "geck",
  "lua",
  "shell",
  "claw",
  "calha",
  "gancho",
  "tambor",
  "valvula",
  "escora",
  "costela",
  "fenda",
  "broca",
  "balde",
  "pino",
  "prato",
  "vassoura",
  "barril",
  "gaiola",
  "lanterna",
  "telha",
  "sino",
  "placa",
  "clava",
  "vela",
  "pescoco",
  "babado",
  "bico",
  "casco",
  "cinza",
  "viuva",
  "rebite",
  "luz",
  "queixo",
  "unha",
  "friso",
  "nave",
  "medula",
  "ferrao",
  "coroa",
  "bofe",
  "neuro",
  "ronin",
  "trex",
] as const;

export function topArt(car: NftCar): string {
  const named = carArt(car).match(/car-([a-z0-9-]+)\.(png|jpe?g)/i);
  const raw = named?.[1];
  const file = (id: string) => `/game/top/${id}.png?v=top4`;
  if (raw && /^\d+$/.test(raw)) {
    return file(["vex", "nyx", "geck", "lua", "shell", "claw"][Number(raw)] ?? "vex");
  }
  if (raw && (TOP_MODELS as readonly string[]).includes(raw)) return file(raw);
  return file((TOP_MODELS as readonly string[]).includes(car.driverId) ? car.driverId : "vex");
}

export function sideMark(car: NftCar): { src: string; flip: boolean } {
  const swapped = canonModel(car.exclusive?.modelId) ?? canonModel(car.exclusive?.name);
  const image = (car.exclusive?.image ?? "").split("?")[0];
  const fresh = image.match(/\/legend\/car-(medula|ferrao|coroa|bofe)/);
  const id = fresh?.[1] ?? (swapped && swapped !== car.exclusive?.modelId ? swapped : undefined);
  if (id && ["medula", "ferrao", "coroa", "bofe"].includes(id)) {
    return { src: `/game/legend/side-${id}.png?v=2`, flip: false };
  }
  if (image.includes("/legend/") || image.includes("/epic/") || image.includes("/rare/")) {
    return { src: clearSticker(image), flip: true };
  }
  const normal = image.match(/\/normal\/car-([a-z0-9]+)/);
  if (normal) return { src: `/game/side/normal-${normal[1]}.png?v=8`, flip: false };
  return { src: `/game/side/car-${driverById(car.driverId).sprite}.png`, flip: false };
}

export function carLabel(car: NftCar): string {
  const swapped = canonModel(car.exclusive?.modelId) ?? canonModel(car.exclusive?.name);
  if (swapped && swapped !== (car.exclusive?.modelId ?? car.exclusive?.name)) {
    return stickerOf(swapped)?.name || swapped.toUpperCase();
  }
  return car.exclusive?.name || driverById(car.driverId).car;
}

export function paintSide(spec: ForgeSpec): string {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 640, 360);
  const paint = byId(PAINT, spec.paintId).hex ?? "#c5ccd4";
  const alt = byId(PAINT, spec.secondaryId).hex ?? "#14161c";
  const neon = byId(NEON, spec.neonId).hex ?? "#d6ff3f";
  const eye = byId(EYE, spec.eyeId).hex ?? "#ffb020";
  const s = 8;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * s, y * s, w * s, h * s);
  };
  px(8, 22, 52, 10, paint);
  px(14, 16, 28, 8, paint);
  px(18, 18, 10, 4, "#9fd7ff");
  if (spec.patternId === "faixa" || spec.patternId === "perigo") px(8, 25, 52, 2, alt);
  if (spec.rarity === "Raro") px(12, 20, 3, 3, eye);
  px(10, 32, 8, 6, "#1a1a1a");
  px(44, 32, 8, 6, "#1a1a1a");
  px(12, 33, 4, 4, neon);
  px(46, 33, 4, 4, neon);
  px(58, 24, 8, 4, neon);
  ctx.fillStyle = "#d6ff3f";
  ctx.font = "16px monospace";
  ctx.fillText(spec.name.slice(0, 12), 24, 340);
  return canvas.toDataURL("image/png");
}

function slugId(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const COCKPIT_ALIAS: Record<string, string> = {};
for (const model of [...COMMONS, ...NORMALS, ...RARES, ...EPICS, ...LEGENDS]) {
  COCKPIT_ALIAS[model.id] = model.id;
  COCKPIT_ALIAS[slugId(model.id)] = model.id;
  COCKPIT_ALIAS[slugId(model.name)] = model.id;
}
for (const [from, to] of Object.entries(RETIRED_MODEL)) COCKPIT_ALIAS[from] = to;

function cockpitKeys(car: NftCar): string[] {
  const out: string[] = [];
  const push = (value?: string) => {
    if (!value) return;
    const id = COCKPIT_ALIAS[value] ?? COCKPIT_ALIAS[slugId(value)] ?? slugId(value);
    if (id && !out.includes(id)) out.push(id);
  };
  push(car.exclusive?.modelId);
  push(legendOf(car.exclusive?.image)?.id);
  push(car.exclusive?.name);
  const piece = car.exclusive?.signature?.split(".")[1];
  push(piece);
  push(car.driverId);
  return out;
}

export function cockpitKey(car: NftCar, art: { cockpits: Record<string, HTMLImageElement> }): string {
  for (const key of cockpitKeys(car)) {
    if (art.cockpits[key]) return key;
  }
  return "default";
}

export function cockpitPlate(car: NftCar, art: Art): CanvasImageSource {
  for (const key of cockpitKeys(car)) {
    const plate = art.cockpits[key];
    if (plate) return plate;
  }
  return art.cockpit;
}

export function recordTurntable(spec: ForgeSpec): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext("2d");
      if (!ctx || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        reject(new Error("Giro"));
        return;
      }
      const stream = canvas.captureStream(24);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      };
      rec.start();
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = (now - t0) / 1000;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 960, 540);
        const turn = t * Math.PI;
        const c = Math.cos(turn);
        const squash = Math.max(0.16, Math.abs(c));
        const dw = 520 * squash;
        ctx.save();
        ctx.translate(480, 250);
        ctx.scale(c < 0 ? -1 : 1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -dw / 2, -180, dw, 340);
        ctx.restore();
        if (t < 4.2) requestAnimationFrame(frame);
        else rec.stop();
      };
      requestAnimationFrame(frame);
    };
    img.onerror = () => reject(new Error("imagem"));
    img.src = spec.image || paintSide(spec);
  });
}
