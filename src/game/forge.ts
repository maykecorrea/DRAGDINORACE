import { driverById, CATALOG, type DriverId, type NftCar, type Rarity } from "./data";
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

export const RARITY_WHEEL: { rarity: (typeof RARITY_BAG)[number]; pct: number; color: string }[] = [
  { rarity: "Comum", pct: 70, color: "#efe6d2" },
  { rarity: "Normal", pct: 23.9, color: "#d6ff3f" },
  { rarity: "Raro", pct: 5, color: "#7fd7ff" },
  { rarity: "Épico", pct: 1, color: "#ff4bd8" },
  { rarity: "Lendário", pct: 0.1, color: "#ffd24a" },
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

type CardArt = { no: string; car: string; pilot?: string; spin?: string };

const LEGEND_ART: Record<string, CardArt> = {
  pepe: { no: "001", car: "/game/legend/car-pepe.png", pilot: "/game/legend/pilot-pepe.png", spin: "/game/legend/spin-pepe.mp4" },
  doge: { no: "002", car: "/game/legend/car-doge.png", pilot: "/game/legend/pilot-doge.png", spin: "/game/legend/spin-doge.mp4" },
  binance: { no: "003", car: "/game/legend/car-binance.png", pilot: "/game/legend/pilot-binance.png", spin: "/game/legend/spin-binance.mp4" },
  mexc: { no: "004", car: "/game/legend/car-mexc.png", pilot: "/game/legend/pilot-mexc.png", spin: "/game/legend/spin-mexc.mp4" },
  btc: { no: "005", car: "/game/legend/car-btc.png", pilot: "/game/legend/pilot-btc.png", spin: "/game/legend/spin-btc.mp4" },
  neuro: { no: "006", car: "/game/legend/car-neuro.png", pilot: "/game/legend/pilot-neuro.png", spin: "/game/legend/spin-neuro.mp4" },
  ronin: { no: "007", car: "/game/legend/car-ronin.png", pilot: "/game/legend/pilot-ronin.png", spin: "/game/legend/spin-ronin.mp4" },
  trex: { no: "008", car: "/game/legend/car-trex.png", pilot: "/game/legend/pilot-trex.png", spin: "/game/legend/spin-trex.mp4" },
};

const EPIC_ART: Record<string, CardArt> = {
  cinza: { no: "009", car: "/game/epic/car-cinza.jpg", spin: "/game/epic/spin-cinza.mp4" },
  viuva: { no: "010", car: "/game/epic/car-viuva.jpg", spin: "/game/epic/spin-viuva.mp4" },
  rebite: { no: "011", car: "/game/epic/car-rebite.jpg", spin: "/game/epic/spin-rebite.mp4" },
  luz: { no: "012", car: "/game/epic/car-luz.jpg", spin: "/game/epic/spin-luz.mp4" },
  queixo: { no: "013", car: "/game/epic/car-queixo.jpg", spin: "/game/epic/spin-queixo.mp4" },
  unha: { no: "014", car: "/game/epic/car-unha.jpg", spin: "/game/epic/spin-unha.mp4" },
  friso: { no: "015", car: "/game/epic/car-friso.jpg", spin: "/game/epic/spin-friso.mp4" },
};

const RARE_ART: Record<string, CardArt> = {
  prato: { no: "016", car: "/game/rare/car-prato.jpg?v=2", spin: "/game/rare/spin-prato.mp4" },
  vassoura: { no: "017", car: "/game/rare/car-vassoura.jpg?v=2", spin: "/game/rare/spin-vassoura.mp4" },
  barril: { no: "018", car: "/game/rare/car-barril.jpg?v=2", spin: "/game/rare/spin-barril.mp4" },
  gaiola: { no: "019", car: "/game/rare/car-gaiola.jpg?v=2", spin: "/game/rare/spin-gaiola.mp4" },
  lanterna: { no: "020", car: "/game/rare/car-lanterna.jpg?v=2", spin: "/game/rare/spin-lanterna.mp4" },
  telha: { no: "021", car: "/game/rare/car-telha.jpg?v=2", spin: "/game/rare/spin-telha.mp4" },
  sino: { no: "022", car: "/game/rare/car-sino.jpg?v=2", spin: "/game/rare/spin-sino.mp4" },
  placa: { no: "023", car: "/game/rare/car-placa.jpg?v=2", spin: "/game/rare/spin-placa.mp4" },
  clava: { no: "024", car: "/game/rare/car-clava.jpg?v=2", spin: "/game/rare/spin-clava.mp4" },
  vela: { no: "025", car: "/game/rare/car-vela.jpg?v=2", spin: "/game/rare/spin-vela.mp4" },
  pescoco: { no: "026", car: "/game/rare/car-pescoco.jpg?v=2", spin: "/game/rare/spin-pescoco.mp4" },
  babado: { no: "027", car: "/game/rare/car-babado.jpg?v=2", spin: "/game/rare/spin-babado.mp4" },
  bico: { no: "028", car: "/game/rare/car-bico.jpg?v=2", spin: "/game/rare/spin-bico.mp4" },
  casco: { no: "029", car: "/game/rare/car-casco.jpg?v=2", spin: "/game/rare/spin-casco.mp4" },
};

function cardArt(id: string): CardArt | undefined {
  return LEGEND_ART[id] ?? EPIC_ART[id] ?? RARE_ART[id];
}

const LEGENDS: Model[] = [
  {
    id: "pepe",
    name: "PEPE",
    driver: "geck",
    speciesId: "geck",
    chassisId: "hatch",
    paintId: "musgo",
    secondaryId: "acido",
    neonId: "acido",
    eyeId: "acido",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "gm",
    extraId: "nenhum",
    prompt: "Figurinha pixel, fundo preto. Balsa improvisada: cara do Pepe é o cockpit, olho branco é a janela, boca vermelha é o aríete. Chapa humana parafusada em escama e costela. Sem roda. Flutua em dois pontões de gosma. Placa PEPE.",
  },
  {
    id: "doge",
    name: "DOGE",
    driver: "claw",
    speciesId: "raptor",
    chassisId: "hatch",
    paintId: "areia",
    secondaryId: "ouro",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "lisa",
    patternId: "solido",
    decalId: "moon",
    extraId: "nenhum",
    prompt: "Figurinha pixel, fundo preto. Barril improvisado: cara de Shiba é o nariz, orelha é antena. Lata, costela e cabo de ouro. Sem roda. Dois anéis de luz embaixo. Placa DOGE.",
  },
  {
    id: "binance",
    name: "BINANCE",
    driver: "nyx",
    speciesId: "rex",
    chassisId: "wedge",
    paintId: "ouro",
    secondaryId: "noite",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "disco",
    patternId: "solido",
    decalId: "hodl",
    extraId: "nenhum",
    prompt: "Figurinha pixel, fundo preto. Cunha amarela de sucata com um cristal losango preto no meio. Costela e cabo entre as chapas. Sem roda, sem cabeça. Quatro sinos de empuxo. Placa BNB.",
  },
  {
    id: "mexc",
    name: "MEXC",
    driver: "lua",
    speciesId: "ptero",
    chassisId: "wedge",
    paintId: "noite",
    secondaryId: "uva",
    neonId: "ciano",
    eyeId: "gelo",
    wheelId: "lisa",
    patternId: "faixa",
    decalId: "wagmi",
    extraId: "asa",
    prompt: "Figurinha pixel, fundo preto. Asa de sucata com a marca da corretora no flanco. Cabo, osso e chapa. Sem roda. Dois anéis ciano. Placa MEXC.",
  },
  {
    id: "btc",
    name: "BTC",
    driver: "shell",
    speciesId: "shell",
    chassisId: "truck",
    paintId: "ouro",
    secondaryId: "noite",
    neonId: "ouro",
    eyeId: "ambar",
    wheelId: "disco",
    patternId: "solido",
    decalId: "hodl",
    extraId: "moeda",
    prompt: "Figurinha pixel, fundo preto. Cofre laranja de sucata. O nariz é uma moeda rachada. Sem roda. Empuxo âmbar e esqui de osso. Placa BTC.",
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
    name: "UNHA",
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
    prompt: "Dinocar. Garra de raptor é o aríete. O corpo é uma costela aberta com gosma roxa e um cockpit âmbar no peito. Cauda de escapamento. Anéis lima, sem roda. Figurinha 014.",
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

const DINO_IDS = new Set(["queixo", "unha", "friso", "placa", "clava", "vela", "pescoco", "babado", "bico", "casco"]);

export function legendStickers() {
  return LEGENDS.map((model) => ({ id: model.id, name: model.name, ...LEGEND_ART[model.id]! }));
}

export function epicStickers() {
  return EPICS.map((model) => ({ id: model.id, name: model.name, kind: DINO_IDS.has(model.id) ? "dinocar" : "humano", ...EPIC_ART[model.id]! }));
}

export function rareStickers() {
  return RARES.map((model) => ({ id: model.id, name: model.name, kind: DINO_IDS.has(model.id) ? "dinocar" : "humano", ...RARE_ART[model.id]! }));
}

export function legendOf(image?: string) {
  if (!image) return undefined;
  const clean = image.split("?")[0];
  return [...legendStickers(), ...epicStickers(), ...rareStickers()].find((card) => card.car.split("?")[0] === clean);
}

function rollTier(): (typeof RARITY_BAG)[number] {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let roll = (buf[0]! / 4294967296) * 100;
  for (const slice of RARITY_WHEEL) {
    if (roll < slice.pct) return slice.rarity;
    roll -= slice.pct;
  }
  return "Normal";
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
  pilot?: string;
  stickerNo?: string;
  modelId?: string;
};

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

export function inventSpec(blocked: Set<string>): ForgeSpec {
  const tier = rollTier();
  if (tier === "Lendário") return fromModel(pick(LEGENDS), tier);
  if (tier === "Épico") return fromModel(pick(EPICS), tier);
  if (tier === "Raro") return fromModel(pick(RARES), tier);
  if (tier === "Normal") {
    const item = pick(CATALOG);
    const driver = driverById(item.driverId);
    const spec = fromModel(
      {
        id: (item.name ?? driver.id).toLowerCase(),
        name: item.name ?? driver.name,
        driver: item.driverId,
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
        prompt: item.note,
      },
      "Normal",
    );
    spec.image = item.image ?? `/game/car-${driver.sprite}.png`;
    spec.pilot = item.image ? undefined : `/game/pilot-${driver.sprite}.png`;
    spec.stickerNo = undefined;
    return spec;
  }
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const species = pick(SPECIES);
    let secondary = pick(PAINT);
    const paint = pick(PAINT);
    if (secondary.id === paint.id) secondary = PAINT[(PAINT.indexOf(paint) + 3) % PAINT.length]!;
    const spec: ForgeSpec = {
      id: mintId(),
      signature: "",
      name: "",
      prompt: "",
      rarity: tier,
      driverId: species.driver ?? "vex",
      speciesId: species.id,
      chassisId: pick(["hatch", "muscle", "wagon"] as const),
      paintId: paint.id,
      secondaryId: secondary.id,
      neonId: "branco",
      eyeId: pick(EYE).id,
      wheelId: tier === "Comum" ? "lisa" : pick(WHEEL).id,
      patternId: tier === "Comum" ? "solido" : "faixa",
      decalId: pick(DECAL).id,
      extraId: "nenhum",
    };
    spec.signature = [tier, spec.speciesId, spec.chassisId, spec.paintId, spec.secondaryId, spec.patternId, spec.decalId, spec.extraId, spec.wheelId].join(".");
    if (blocked.has(spec.signature)) continue;
    const decal = byId(DECAL, spec.decalId);
    spec.name = `${species.tag}-${decal.tag}`;
    spec.prompt = writePrompt(spec);
    return spec;
  }
  const fallback = fromModel(EPICS[0]!, "Épico");
  fallback.signature = `${fallback.signature}.X`;
  return fallback;
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
    exclusive: {
      signature: spec.signature,
      prompt: spec.prompt,
      name: spec.name,
      image: spec.image ?? "",
    },
  };
}

export function carArt(car: NftCar): string {
  if (car.exclusive?.image) return car.exclusive.image;
  return `/game/car-${driverById(car.driverId).sprite}.png`;
}

export function sideMark(car: NftCar): { src: string; flip: boolean } {
  const image = (car.exclusive?.image ?? "").split("?")[0];
  if (image.includes("/legend/") || image.includes("/epic/") || image.includes("/rare/")) {
    return { src: image, flip: true };
  }
  const normal = image.match(/\/normal\/car-([a-z0-9]+)/);
  if (normal) return { src: `/game/side/normal-${normal[1]}.png`, flip: false };
  return { src: `/game/side/car-${driverById(car.driverId).sprite}.png`, flip: false };
}

export function carLabel(car: NftCar): string {
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

const plates = new Map<string, HTMLCanvasElement>();

export function cockpitPlate(car: NftCar, art: Art): CanvasImageSource {
  const sticker = legendOf(car.exclusive?.image);
  if (sticker && art.cockpits[sticker.id]) return art.cockpits[sticker.id]!;
  if (!car.exclusive && art.cockpits[car.driverId]) return art.cockpits[car.driverId]!;
  const key = car.tokenId;
  const cached = plates.get(key);
  if (cached) return cached;
  const canvas = paintCockpitCanvas(key, car.driverId);
  plates.set(key, canvas);
  return canvas;
}

function hash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function paintCockpitCanvas(tokenId: string, driverId: DriverId): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const h = hash32(tokenId + driverId);
  const scale = 8;
  const cols = 160;
  const rows = 90;
  const tone = ["#14161c", "#1c2420", "#2a261c", "#10140f"][h % 4]!;
  const trim = ["#d6ff3f", "#ff3b1f", "#39f3ff", "#ffd15c", "#b388ff"][h % 5]!;
  const bone = "#e6dcc4";
  const cell = (c: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(c * scale, r * scale, scale, scale);
  };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const roof = r < 8;
      const pillar = c < 22 || c > 138;
      const dash = r > 52;
      const glass = r >= 8 && r <= 52 && c >= 22 && c <= 138;
      if (glass) continue;
      if (roof || pillar) cell(c, r, (c + r + (h & 3)) % 9 === 0 ? bone : tone);
      else if (dash) cell(c, r, (r + c) % 11 === 0 ? "#2c2416" : "#0c0e0a");
    }
  }
  for (let c = 24; c < 136; c += 6) cell(c, 7, trim);
  for (let i = 0; i < 8; i += 1) {
    const c = 30 + ((h >> (i * 2)) & 31);
    cell(c, 58 + (i % 3), trim);
  }
  const gx = 82;
  const gy = 68;
  for (let a = 0; a < 12; a += 1) {
    const ang = Math.PI * 0.7 + (a / 11) * Math.PI * 1.4;
    cell(gx + Math.round(Math.cos(ang) * 14), gy + Math.round(Math.sin(ang) * 8), bone);
  }
  const mark = driverId.slice(0, 1).toUpperCase();
  ctx.fillStyle = trim;
  ctx.font = "bold 28px monospace";
  ctx.fillText(mark, 70, 560);
  ctx.fillText(tokenId.slice(-4), 1040, 640);
  return canvas;
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
        reject(new Error("giro"));
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
