// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
import farmacia from "../../../../../content/garagem-falida/v1/farmacia.json" with { type: "json" };
import { RECIPES, foodById, foodsAt, stallHours, stallOpen } from "../../../../../gf-engine/body.ts";
import { nextOpenLabel, partsOf, placeOpen } from "../../../../../gf-engine/clock.ts";
import { here, illnessOffer, lockReason, medOffer, placeById, supplierAt, tollMul, walkMinutes } from "../../../../../gf-engine/district.ts";
import { officeBays, faceName } from "../../../../../gf-engine/hands.ts";
import { MOLDURA } from "./molduras";
import { art } from "./scene";

function faceSrc(id, photo, taken) {
  let n = photo >= 1 && photo <= 25 ? photo : 0;
  if (!n) {
    let hash = 0;
    for (const ch of id) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
    n = (hash % 25) + 1;
    if (taken.has(n)) {
      for (let step = 1; step <= 25; step += 1) {
        const alt = ((n - 1 + step) % 25) + 1;
        if (!taken.has(alt)) { n = alt; break; }
      }
    }
  }
  taken.add(n);
  return `/assets/gf/v2/funcionarios/func_${String(n).padStart(2, "0")}.webp`;
}


var UI = "/assets/gf/v2/ui2";
var BG = "/assets/gf/v2/lugares";
var NPC = "/assets/gf/v2/npcs";
var GRID = {
  casco_tech: { d: [2, 2], m: [2, 2] },
  ferro_velho: { d: [2, 1], m: [2, 1] },
  megaosso: { d: [2, 1], m: [2, 1] },
  rato: { d: [2, 1], m: [1, 2] },
  leilao: { d: [1, 1], m: [1, 1] },
  banco: { d: [2, 1], m: [1, 2] },
  coliseu: { d: [2, 1], m: [1, 2] },
  hospital: { d: [2, 2], m: [1, 2] },
  farmacia: { d: [2, 2], m: [1, 2] },
  posto: { d: [1, 1], m: [1, 1] },
  tenda: { d: [1, 1], m: [1, 1] },
  praca: { d: [2, 1], m: [1, 2] },
  posto_cometa: { d: [1, 1], m: [1, 1] },
  galpao: { d: [2, 1], m: [1, 2] },
  padaria: { d: [4, 2], m: [2, 2] },
  feira: { d: [4, 2], m: [2, 2] },
  filtro: { d: [4, 2], m: [2, 2] },
  sopao: { d: [4, 2], m: [2, 2] },
  dimas: { d: [4, 2], m: [2, 2] },
  faixa: { d: [2, 1], m: [2, 1] }
};
var DARK = /* @__PURE__ */ new Set(["padaria", "sopao", "dimas", "leilao", "coliseu", "galpao", "faixa"]);
var LOOK = {
  casco_tech: { title: "Casco-Tech", npc: "npc_seu_casco_corpo.png", nome: "Seu Casco", line: "Pe\xE7a nova. D\xE1 para pagar em 14 dias.", panel: "casco_painel_vitrine.png", bg: `${BG}/bg_lugar_cascotech.webp?v=23` },
  ferro_velho: { title: "Ferro-Velho", npc: "npc_ze_femur_corpo.png", nome: "Z\xE9 F\xEAmur", line: "O lixo de um \xE9 o ouro de outros.\nAqueles que conseguem enxergar\no valor aonde os outros n\xE3o.\nEsses s\xE3o felizes!", panel: "ferrovelho_placa_precos.png", bg: `${BG}/bg_lugar_ferrovelho.webp?v=23` },
  megaosso: { title: "Megaosso", npc: "npc_promo_corpo.png", nome: "Promo", line: "Aqui \xE9 lote. O m\xEDnimo \xE9 alto.", panel: "megaosso_painel_atacado.png", bg: `${BG}/bg_lugar_megaosso.webp?v=23` },
  rato: { title: "Beco do Rato", npc: "npc_rato_corpo.png", nome: "El Rato", line: "Eu tenho os produtos que vc quiser.\nSomente os melhores!\nMas n\xE3o garanto nada hahaha!", panel: "rato_painel_caixote.png", bg: `${BG}/bg_lugar_beco_rato.webp?v=23` },
  leilao: { title: "Cais do Leil\xE3o", npc: "npc_martelo_corpo.png", nome: "Martelo", line: "Dois carros por semana. O martelo decide.", panel: "leilao_placa_lote.png", bg: `${BG}/bg_lugar_leilao.webp?v=23` },
  banco: { title: "Banco F\xF3ssil", npc: "npc_gerente_banco_corpo.png", nome: "Gerente", line: "Eu empresto. No domingo eu cobro.", panel: "banco_painel_contrato.png", bg: art.interior("int_banco.png") },
  coliseu: { title: "Coliseu", npc: "npc_turbao_corpo.png?v=29", nome: "Turb\xE3o", line: "Duas pistas. Um pr\xEAmio. Sem aposta.", panel: "coliseu_painel_corrida.png", bg: art.interior("int_coliseu.png") },
  hospital: { title: "Hospital", npc: "npc_dr_braquio_corpo.png", nome: "Dr. Br\xE1quio", line: "Ol\xE1, muitas vezes a doen\xE7a \xE9 um aviso\npara algo ainda mais grave que est\xE1 por vir.\nN\xE3o que eu seja pessimista...", panel: "hospital_painel_prontuario.png", bg: art.interior("int_hospital_recepcao.png"), bgPos: "left center" },
  farmacia: { title: "Farm\xE1cia", npc: "npc_seu_gotardo_corpo.png", nome: "Seu Gotardo", line: "A Solange guarda o rem\xE9dio. Escolha o seu.", panel: "farmacia_painel_balcao.png", bg: art.interior("int_farmacia.png") },
  posto: { title: "Posto de Sa\xFAde", npc: "npc_posto_saude.png", nome: "Dona Sal", line: "Check-up gr\xE1tis. S\xF3 ter\xE7a e quinta.", panel: "hospital_painel_prontuario.png", bg: art.interior("int_posto_saude.png") },
  tenda: { title: "Tenda do Raiz\xE3o", npc: "npc_raizao_corpo.png", nome: "Raiz\xE3o", line: "Oi eu sou Raiz\xE3o.\nTrabalho com Ch\xE1s, Ervas e Cristais.\nO que voc\xEA precisar eu vou te ajudar!", panel: "tenda_painel_cha.png", bg: `${BG}/bg_lugar_tenda_raizao.webp?v=23` },
  praca: { title: "Pra\xE7a do F\xF3ssil", npc: "npc_jornaleira_praca.png", nome: "Dona Pena", line: "Ol\xE1, sou a Dona Pena, eu sou a social m\xEDdia da nossa cidade.\nSe voc\xEA precisar encontrar clientes ou funcion\xE1rios,\n\xE9 aqui mesmo.", panel: "praca_mural_cortica.png", bg: `${BG}/bg_lugar_praca.webp?v=23` },
  posto_cometa: { title: "Posto Cometa", npc: "npc_frentista_cometa.png", nome: "Nando Nafta", line: "O tanque cheio. Cada arrancada gasta um.", panel: "posto_cometa_painel_bomba.png", bg: `${BG}/bg_lugar_posto_cometa.webp?v=23` },
  galpao: { title: "Galp\xE3o", npc: "npc_rex_navalha_corpo.png", nome: "Rex Navalha", line: "Sem briga. O desafio \xE9 no Coliseu.", panel: "galpao_placa_desafio.png", bg: art.interior("int_galpao_mandibula.png") },
  padaria: { title: "Padaria", npc: "npc_padeiro_corpo.png", nome: "Sancho Bread", line: "Caf\xE9, sonho e p\xE3o com ovo.", panel: "padaria_painel_menu.png", bg: `${BG}/bg_lugar_padaria.webp?v=23` },
  feira: { title: "Feira", npc: "npc_feirante_corpo.png", nome: "Feirante", line: "Pastel, miojo e a sacola. Das 7 \xE0s 17.", panel: "feira_placa_precos.png", bg: `${BG}/bg_lugar_feira.webp?v=23` },
  filtro: { title: "Filtro", npc: "npc_vendedor_filtro.png", nome: "Vendedor", line: "\xC1gua o dia todo. Quatro f\xF3sseis.", panel: "filtro_placa_menu.png", bg: `${BG}/bg_lugar_filtro.webp?v=23` },
  sopao: { title: "Sop\xE3o", npc: "npc_vendedora_sopao.png", nome: "Tia Sop\xE3o", line: "Sop\xE3o quente. Das 11 \xE0s 15.", panel: "sopao_painel_menu.png", bg: `${BG}/bg_lugar_sopao.webp?v=23` },
  dimas: { title: "Dimas", npc: "npc_dimas_corpo.png", nome: "Dimas", line: "Oi, eu sou o Dimas.\nSou o melhor cozinheiro da cidade, pode apostar.\nEi, n\xE3o esquece: se precisar, eu entrego.", panel: "dimas_menu_truck.png", bg: `${BG}/bg_lugar_dimas.webp?v=23` },
  faixa: { title: "Faixa de Arrancada", npc: "npc_bandeirinha_largada.png?v=30", nome: "Fa\xEDsca", line: "A reta \xE9 aqui. Largue no Coliseu.", panel: "faixa_placa_trofeus.png", bg: `${BG}/bg_lugar_faixa_arrancada.webp?v=23` }
};
var HOLE = {
  casco_tech: { t: 12, r: 14, b: 8, l: 12, w: 485, h: 859 },
  ferro_velho: { t: 30, r: 16, b: 24, l: 16, w: 1097, h: 871 },
  megaosso: { t: 30, r: 14, b: 22, l: 14, w: 1090, h: 852 },
  rato: { t: 32, r: 18, b: 22, l: 16, w: 1098, h: 837 },
  leilao: { t: 32, r: 14, b: 14, l: 14, w: 1166, h: 860 },
  banco: { t: 24, r: 16, b: 20, l: 14, w: 1165, h: 848 },
  coliseu: { t: 30, r: 12, b: 12, l: 12, w: 1166, h: 800 },
  hospital: { t: 26, r: 24, b: 12, l: 16, w: 818, h: 1121 },
  farmacia: { t: 34, r: 14, b: 22, l: 14, w: 1154, h: 866 },
  posto: { t: 26, r: 24, b: 12, l: 16, w: 818, h: 1121 },
  tenda: { t: 32, r: 20, b: 18, l: 18, w: 835, h: 1134 },
  praca: { t: 36, r: 18, b: 24, l: 18, w: 1047, h: 815 },
  posto_cometa: { t: 38, r: 31, b: 18, l: 31, w: 799, h: 1071 },
  galpao: { t: 28, r: 12, b: 14, l: 12, w: 395, h: 320 },
  padaria: { t: 11, r: 12, b: 12, l: 12, w: 3, h: 4 },
  feira: { t: 11, r: 12, b: 12, l: 12, w: 3, h: 4 },
  filtro: { t: 11, r: 12, b: 12, l: 12, w: 3, h: 4 },
  sopao: { t: 11, r: 12, b: 12, l: 12, w: 3, h: 4 },
  dimas: { t: 11, r: 12, b: 12, l: 12, w: 3, h: 4 },
  faixa: { t: 24, r: 16, b: 16, l: 16, w: 1103, h: 819 }
};
function isStall(id) {
  return id === "padaria" || id === "feira" || id === "filtro" || id === "dimas" || id === "sopao";
}
export function LugarTela({
  id,
  state,
  pack,
  busy,
  focus,
  onAct,
  onClose,
  onClients,
  onJump
}) {
  const look = LOOK[id] ?? LOOK.praca;
  const [phone, setPhone] = useState(false);
  const [wellBox, setWellBox] = useState({ w: 320, h: 210 });
  const wellRef = useRef(null);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(0);
  const [qty, setQty] = useState(1);
  const [term, setTerm] = useState("cash");
  const [medTab, setMedTab] = useState("remedio");
  const [talk, setTalk] = useState(false);
  const [shown, setShown] = useState("");
  const [vagas, setVagas] = useState(false);
  const [tip, setTip] = useState(null);
  const swipe = useRef(0);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const read = () => setWellBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id]);
  useEffect(() => {
    setPage(0);
    setPicked(0);
    setQty(1);
    setTerm("cash");
    setTalk(true);
    const timer = window.setTimeout(() => setTalk(false), 700);
    return () => window.clearTimeout(timer);
  }, [id]);
  const spot = here(state);
  const t = state.clock.t;
  const day = partsOf(t).day;
  const place = placeById(id);
  const minutes = place ? walkMinutes(spot, place.id) : id === "faixa" ? walkMinutes(spot, "coliseu") : 0;
  const locked = place ? lockReason(state, place.id) : id === "leilao" ? lockReason(state, "leilao") : null;
  const open = isStall(id) ? stallOpen(id, t) : id === "faixa" ? true : place ? placeOpen(pack, place.id, t) : true;
  const there = place ? minutes === 0 : id === "faixa" ? spot === "coliseu" : true;
  const fuel = typeof state.flags.fuel === "number" ? state.flags.fuel : 1;
  const week = state.calendar.week + 1;
  const tourney = week === 18 || week === 30 || week === 44;
  const drank = state.flags.chaDay === `${state.calendar.week}-${state.calendar.day}`;
  const rumorSaid = state.flags.rumorWeek === state.calendar.week;
  const checkupDay = day === 2 || day === 4;
  const supplierId = place ? supplierAt(place.id) : null;
  const supplier = supplierId ? pack.suppliers.find((item) => item.id === supplierId) : void 0;
  const cards = useMemo(() => buildCards(), [id, state, pack, medTab, term, focus, fuel, week, tourney]);
  const mold = MOLDURA[id];
  const grid = GRID[id] ?? { d: [2, 2], m: [2, 2] };
  const compact = id === "casco_tech" || id === "farmacia" || id === "hospital";
  let cols = phone ? grid.m[0] : grid.d[0];
  let rows = phone ? grid.m[1] : grid.d[1];
  if (mold) {
    const head = 22 + (id === "farmacia" || (id === "casco_tech" || id === "ferro_velho" || id === "megaosso") ? 30 : 0);
    const availH = Math.max(36, wellBox.h - head - 58);
    const availW = Math.max(112, wellBox.w);
    if (compact) {
      cols = 1;
      rows = Math.max(1, Math.floor(availH / (id === "hospital" ? 72 : 36)));
    } else {
      cols = Math.max(1, Math.floor((availW + 6) / 118));
      rows = Math.max(1, Math.floor((availH + 6) / 80));
    }
  }
  const per = Math.max(1, cols * rows);
  const pages = Math.max(1, Math.ceil(cards.length / per));
  const safePage = Math.min(page, pages - 1);
  const slice = cards.slice(safePage * per, safePage * per + per);
  const globalIndex = Math.min(picked, Math.max(0, cards.length - 1));
  const card = cards[globalIndex];
  function spell(item) {
    const food = foodById(item.id);
    if (food) {
      const bits = [];
      if (food.hunger > 0) bits.push(`desce ${food.hunger} de fome`);
      if (food.thirst > 0) bits.push(`desce ${food.thirst} de sede`);
      if (food.thirst < 0) bits.push(`aumenta ${-food.thirst} de sede`);
      if (food.energy > 0) bits.push(`sobe ${food.energy} de energia`);
      if (food.energy === 0) bits.push("não mexe na energia");
      const cooks = RECIPES.filter((recipe) => (recipe.need[food.id] ?? 0) > 0).map((recipe) => recipe.nome);
      const stove = cooks.length > 0 ? ` No fogão vira ingrediente de ${cooks.join(" e ")}.` : "";
      return `${food.nome} vai para a despensa. Quando come, ${bits.join(", ")} e dá ${food.xp} de xp.${stove} Não cura doença.`;
    }
    if (supplier && pack.materials.some((mat) => mat.id === item.id)) {
      const use = {
        kit: "Entra no reparo, na funilaria, na elétrica e no motor.",
        oleo: "A troca de óleo gasta 1. O reparo e o motor também pedem.",
        chapa: "A funilaria gasta 2 chapas. A peça custom de arrancada também.",
        cabo: "A elétrica gasta 2. O motor e a custom também usam.",
        osso: "A revisão de motor pede 1. A peça custom pede 2.",
        bobina: "Só a peça custom de arrancada usa. Sem ela, o serviço não começa."
      }[item.id] ?? "Fica na prateleira até um serviço pedir.";
      const shop = supplier.id === "ferro_velho" ? "Peça usada, mais barata." : supplier.id === "megaosso" ? "Aqui é lote: o mínimo da compra é alto." : supplier.id === "rato" ? "Peça rara, sem garantia." : "Peça nova. Dá para pagar à vista, em 14 dias ou em 3 vezes.";
      return `${item.nome}. ${use} Sem a peça na prateleira, o carro não sobe no elevador. ${shop}`;
    }
    if (id === "farmacia") {
      if (String(item.id).startsWith("epi_")) return `${item.nome}. Equipamento de proteção. Fica na mochila. Não trata doença e não sobe a saúde.`;
      const cases = farmacia.doencas.filter((row) => row.rx === item.id).map((row) => row.nome);
      const who = cases.length > 0 ? `No hospital cobre: ${cases.join(", ")}.` : "Leva no hospital quando o doutor pedir esse nome.";
      return `${item.nome} vai para a mochila. ${who} Se você chegar com ele, a consulta desse caso sai de graça.`;
    }
    if (id === "hospital") {
      const ill = illnessOffer(item.id);
      if (ill) {
        const rx = medOffer(ill.rx);
        return `${ill.nome}. Grau ${ill.grau}. A consulta custa ${ill.preco} fósseis. Se for a doença do Téo, a saúde sobe ${ill.animo}. Com ${rx?.nome ?? "o remédio"} na mochila, não paga a consulta.`;
      }
    }
    if (item.id === "checkup") return checkupDay ? "Check-up grátis, só terça e quinta. Gasta 1 ação e sobe 5 de saúde. Não trata doença e não gasta fóssil." : "Hoje não tem check-up. Volta terça ou quinta, de graça, e a saúde sobe 5. Gasta 1 ação.";
    if (item.id === "cha") return drank ? "O chá de hoje já foi tomado. Amanhã sobe de novo 15 de energia, por 10 fósseis, sem passar do máximo. Não cura doença." : "Custa 10 fósseis e só sai um por dia. Sobe 15 de energia na hora, sem passar do máximo. Não cura doença e não gasta ação.";
    if (item.id === "fuel") return `Custa 15 fósseis e soma 1 tanque. Cada arrancada no Coliseu gasta um. Agora o tanque está em ${fuel}.`;
    if (id === "leilao") {
      if (item.id === "vazio") return "Esta semana não tem carro no cais. O leilão volta na próxima, com dois lotes.";
      return `${item.nome} por ${item.price}. Paga e o carro vai para o pátio. Sem ver, o defeito fica escondido. Se vier torto, o conserto come peça da prateleira.`;
    }
    if (id === "banco") {
      if (item.id === "microcredito") return "Empréstimo de 1000 fósseis. A parcela sai no fechamento, por 20 semanas. Não é o contrato inteiro de uma vez.";
      if (item.id === "pre_aprovado") return "Empréstimo de 2000 fósseis. A parcela sai no fechamento, por 26 semanas. O banco cobra mesmo sem serviço na oficina.";
      return `${item.nome}. Saldo em aberto: ${item.price}. No fechamento do mês sai a parcela, não o contrato inteiro. Paga aqui, no banco.`;
    }
    if (item.id === "arrancada") return tourney ? "Semana de torneio. O prêmio é 1000 fósseis, fixo, sem aposta. Abre das 18h às 23h e gasta 1 combustível." : "Arrancada das 18h às 23h. O prêmio é 400 fósseis, fixo, sem aposta. Gasta 1 combustível. Sem tanque, não larga.";
    if (item.id === "trofeu") return "Os troféus saem nas semanas 18, 30 e 44, se você ganhar o torneio. Ainda não tem nenhum na estante.";
    if (String(item.id).startsWith("t") && id === "coliseu") return `Troféu da semana ${item.price.replace("sem ", "")}. Fica na estante. Não vende e não paga conta.`;
    if (item.id === "rex") return "O Rex Navalha aceita a final no Coliseu. O prêmio é fixo, sem aposta e sem briga. A largada é lá, não aqui.";
    if (item.id === "agora") return "Aceita o desafio deste piloto. A corrida é no Coliseu, com prêmio fixo e sem aposta. Gasta 1 combustível na largada.";
    if (item.id === "panfleto") return "Gasta 1 ação e só uma vez por dia. Precisa de 10 de fama. Um cliente novo entra na fila na semana seguinte.";
    if (item.id === "fila") return `Quadro de quem quer baía. Nível 1 cabe 1, nível 2 cabe 3, nível 3 cabe 7. O salário sai depois de 30 dias trabalhados, no fechamento.`;
    if (item.detail) return item.detail;
    return `${item.nome}${item.price ? `. ${item.price}` : ""}${item.note ? `. ${item.note}` : ""}.`;
  }
  useEffect(() => {
    setShown("");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setShown(look.line.slice(0, i));
      if (i >= look.line.length) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [look.line, id]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPage((n) => Math.min(pages - 1, n + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPage((n) => Math.max(0, n - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages]);
  function go(next) {
    setPage(Math.max(0, Math.min(pages - 1, next)));
  }
  function buyShop() {
    if (!supplier || !card) return;
    const min = supplier.minOrder?.[card.id] ?? 1;
    const count = Math.max(min, qty);
    onAct({ type: "BUY", supplier: supplier.id, terms: term, items: [{ material: card.id, qty: count }] });
  }
  const buttons = [];
  if (place && minutes > 0 && id !== "faixa") {
    buttons.push({
      label: `A p\xE9 \xB7 ${minutes} min`,
      icon: "/assets/gf/v2/ui/icone_viagem_ape.png",
      go: true,
      ride: true,
      disabled: busy || !!locked,
      title: locked ?? (!open ? `Fecha quando voc\xEA chegar. Abre ${nextOpenLabel(pack, place.id, t)}.` : `Caminhada de ${minutes} min.`),
      act: () => onAct({ type: "TRAVEL", place: place.id })
    });
    buttons.push({
      label: "Ossobus \xB7 5 \u20A3",
      icon: "/assets/gf/v2/ui/icone_viagem_ossobus.png",
      ride: true,
      disabled: busy || state.cash < 5 || !!locked,
      title: state.cash < 5 ? "O Ossobus custa 5 f\xF3sseis." : "Dez minutos.",
      act: () => onAct({ type: "OSSOBUS", place: place.id })
    });
  } else if (isStall(id)) {
    const food = foodsAt(id).find((item) => item.id === card?.id) ?? foodsAt(id)[0];
    buttons.push({
      label: "Comprar",
      go: true,
      clip: true,
      disabled: busy || !open || !food || state.cash < (food?.price ?? 0),
      title: !open ? `Abre ${stallHours(id)}.` : food ? `${food.price} f\xF3sseis. Vai para a despensa.` : "A comida vai para a despensa.",
      act: () => food && onAct({ type: "BUY_FOOD", food: food.id })
    });
  } else if (supplier && there) {
    const min = card ? supplier.minOrder?.[card.id] ?? 1 : 1;
    buttons.push({
      label: id === "megaosso" ? "Comprar lote" : "Comprar",
      go: true,
      clip: true,
      disabled: busy || !open || !card || qty < (id === "megaosso" ? min : 1) || !!locked,
      title: !open ? "Fechado." : id === "megaosso" ? `M\xEDnimo ${min}.` : "\xC0 vista, ou no prazo da loja.",
      act: buyShop
    });
    if (id === "ferro_velho") {
      buttons.push({
        label: "Garimpar",
        disabled: busy || !open || state.calendar.apLeft < 1 || state.flags.garimpoDay === `${state.calendar.week}-${state.calendar.day}`,
        title: "Uma vez por dia. Gasta 1 a\xE7\xE3o.",
        act: () => onAct({ type: "GARIMPO" })
      });
    }
    if (id === "rato") {
      buttons.push({
        label: rumorSaid ? "Rumor ouvido" : "Ouvir rumor",
        disabled: busy || !open || rumorSaid,
        title: !open ? "O beco abre \xE0s 22h." : "Um rumor por semana.",
        act: () => onAct({ type: "RUMOR" })
      });
    }
  } else if (id === "leilao" && there) {
    buttons.push({
      label: "Dar lance",
      go: true,
      clip: true,
      disabled: busy || !!locked || !open || !card || card.id === "vazio",
      title: locked ?? "O carro vem para o p\xE1tio.",
      act: () => card && onAct({ type: "BUY_LOT", id: card.id })
    });
    buttons.push({ label: "Passar", act: () => go(safePage + 1 >= pages ? 0 : safePage + 1) });
  } else if (id === "banco" && there) {
    buttons.push({
      label: "Pegar empr\xE9stimo",
      go: true,
      clip: true,
      disabled: busy || !open || !card || card.id.startsWith("debt:"),
      title: "O valor entra no caixa. A d\xEDvida fica.",
      act: () => {
        if (!card || card.id.startsWith("debt:")) return;
        const value = card.id === "pre_aprovado" ? 2e3 : 1e3;
        const weeks = card.id === "pre_aprovado" ? 26 : card.id === "microcredito" ? 20 : void 0;
        onAct({ type: "TAKE_LOAN", template: card.id, value, weeks });
      }
    });
    buttons.push({
      label: "Renegociar",
      disabled: busy || !open || state.debts.every((debt) => debt.balance <= 0),
      title: "Corta um pouco da maior d\xEDvida. Uma vez por semana.",
      act: () => onAct({ type: "RENEGOCIAR" })
    });
  } else if (id === "hospital") {
    const owned = typeof state.flags.meds === "string" && card?.rx ? state.flags.meds.split(",").some((part) => part.startsWith(`${card.rx}:`) && Number(part.split(":")[1]) > 0) : false;
    buttons.push({
      label: owned ? "Tratar \xB7 gr\xE1tis" : `Tratar \xB7 ${card?.price ?? ""}`.trim(),
      go: true,
      clip: true,
      disabled: busy || !there || !card,
      title: !there ? "Chegue no hospital para tratar." : card ? `${card.nome}. ${card.note ?? ""}.` : "Escolha a doen\xE7a.",
      act: () => card && there && onAct({ type: "TREAT", illness: card.id })
    });
  } else if (id === "farmacia" && there) {
    buttons.push({
      label: "Comprar",
      go: true,
      clip: true,
      disabled: busy || !open || !card,
      act: () => card && onAct({ type: "BUY_MED", med: card.id })
    });
  } else if (id === "posto" && there) {
    buttons.push({
      label: "Fazer check-up",
      go: true,
      disabled: busy || !checkupDay || !open || state.calendar.apLeft < 1,
      title: checkupDay ? "Gr\xE1tis. Gasta 1 a\xE7\xE3o." : "S\xF3 ter\xE7a e quinta.",
      act: () => onAct({ type: "CHECKUP" })
    });
  } else if (id === "tenda" && there) {
    buttons.push({
      label: drank ? "Ch\xE1 de hoje j\xE1 foi" : "Tomar ch\xE1 \xB7 10 \u20A3",
      go: true,
      clip: true,
      disabled: busy || !open || drank || state.cash < 10,
      title: drank ? "O Raiz\xE3o s\xF3 serve um por dia." : "Sobe a energia.",
      act: () => onAct({ type: "CHA" })
    });
  } else if (id === "praca" && there) {
    buttons.push({
      label: "Distribuir panfleto",
      go: true,
      disabled: busy || !open || state.rep < 10,
      title: state.rep < 10 ? "Precisa de 10 de fama." : "Gasta 1 a\xE7\xE3o.",
      act: () => onAct({ type: "PANFLETO" })
    });
    buttons.push({
      label: "Empregos",
      disabled: busy,
      title: "Contratar gente para as ba\xEDas.",
      act: () => setVagas(true)
    });
  } else if (id === "posto_cometa" && there) {
    buttons.push({
      label: "Abastecer \xB7 15 \u20A3",
      go: true,
      clip: true,
      disabled: busy || state.cash < 15,
      title: `Tanque: ${fuel}.`,
      act: () => onAct({ type: "COMBUSTIVEL" })
    });
  } else if (id === "galpao" && there) {
    buttons.push({
      label: "Aceitar desafio",
      go: true,
      disabled: busy,
      title: "A corrida \xE9 no Coliseu.",
      act: () => onAct({ type: "DESAFIO" })
    });
    buttons.push({ label: "Agora n\xE3o", act: onClose });
  } else if (id === "coliseu" && there) {
    buttons.push({
      label: tourney ? "Correr \xB7 1000 \u20A3" : "Correr \xB7 400 \u20A3",
      go: true,
      disabled: busy || !open || fuel < 1,
      title: !open ? "Abre \xE0s 18h." : fuel < 1 ? "Sem combust\xEDvel." : "Sem aposta.",
      act: () => onAct({ type: "COLISEU" })
    });
    buttons.push({ label: "Ver chaves", act: () => go(safePage + 1 >= pages ? 0 : safePage + 1) });
  } else if (id === "faixa") {
    const ready = spot === "coliseu" && placeOpen(pack, "coliseu", t) && fuel >= 1;
    buttons.push({
      label: "Arrancar!",
      go: true,
      disabled: busy || !ready,
      title: spot !== "coliseu" ? "A largada \xE9 no Coliseu." : !placeOpen(pack, "coliseu", t) ? "O Coliseu abre \xE0s 18h." : fuel < 1 ? "Sem combust\xEDvel." : "Sem aposta.",
      act: () => onAct({ type: "COLISEU" })
    });
    buttons.push({ label: "Ver o Coliseu", act: () => onJump("coliseu") });
  }
  const sub = isStall(id) ? `${stallOpen(id, t) ? "Aberto" : "Fechado"} \xB7 ${stallHours(id)}` : id === "faixa" ? tourney ? `Semana ${week} \xB7 torneio` : `Semana ${week} \xB7 arrancada` : locked ? locked : !open && place ? `Fechado \xB7 abre ${nextOpenLabel(pack, place.id, t)}` : there ? "Voc\xEA est\xE1 aqui" : `${minutes} min a p\xE9`;
  const showClosed = isStall(id) && !open || id === "rato" && !open || id === "posto" && !checkupDay || !!place && !isStall(id) && id !== "faixa" && id !== "hospital" && !open;
  function buildCards() {
    if (isStall(id)) {
      return foodsAt(id).map((food) => ({
        id: food.id,
        nome: food.nome,
        price: `${food.price} \u20A3`,
        icon: `/assets/gf/map/itens/comida/${food.file}?v=19`,
        art: "food"
      }));
    }
    if (supplier) {
      const mul = tollMul(state, supplier.id);
      return pack.materials.filter((item) => supplier.prices[item.id] != null).map((item) => ({
        id: item.id,
        nome: item.nome,
        price: `${Math.round(Number(supplier.prices[item.id]) * mul)} \u20A3`,
        note: supplier.id === "ferro_velho" ? "usada" : focus?.material === item.id ? "falta" : void 0,
        icon: `/assets/gf/v2/pecas/peca_${item.id}.png`,
        art: "item"
      }));
    }
    if (id === "hospital") {
      return farmacia.doencas.map((row) => ({ did: row.id, offer: illnessOffer(row.id) })).filter((row) => !!row.offer).map((row) => ({
        id: row.did,
        nome: row.offer.nome,
        price: `${row.offer.preco} \u20A3`,
        note: row.offer.grau,
        rx: row.offer.rx,
        icon: `/assets/gf/v2/doencas/${row.did}.png`,
        art: "item"
      }));
    }
    if (id === "farmacia") {
      return farmacia.itens.map((row) => ({ id: row.id, item: medOffer(row.id) })).filter((row) => row.item && (medTab === "epi" ? row.id.startsWith("epi_") : !row.id.startsWith("epi_"))).map((row) => ({
        id: row.id,
        nome: row.item.nome,
        price: `${row.item.price} \u20A3`,
        icon: `/assets/gf/v2/saude/${row.id}.png`,
        art: "item"
      }));
    }
    if (id === "posto") {
      return [{ id: "checkup", nome: checkupDay ? "Check-up de hoje" : "Sem check-up hoje", price: "gr\xE1tis", note: "ter\xE7a e quinta", art: "plain" }];
    }
    if (id === "tenda") {
      return [{ id: "cha", nome: "Ch\xE1 do Raiz\xE3o", price: "10 \u20A3", note: drank ? "j\xE1 tomou" : "+energia", icon: "/assets/gf/v2/saude/rx_cha_calmaria.png", art: "food", detail: "Custa 10 f\xF3sseis e s\xF3 sai um por dia. Sobe 15 de energia na hora, sem passar do m\xE1ximo. N\xE3o cura doen\xE7a e n\xE3o gasta a\xE7\xE3o." }];
    }
    if (id === "posto_cometa") {
      return [{ id: "fuel", nome: "Combust\xEDvel", price: "15 \u20A3", note: `tanque ${fuel}`, art: "plain" }];
    }
    if (id === "leilao") {
      const lots = state.auctionLots ?? [];
      if (lots.length === 0) return [{ id: "vazio", nome: "Sem lote", price: "\u2014", note: "volta na semana", art: "lot" }];
      return lots.map((lot) => {
        const def = pack.carcasses.find((item) => item.id === lot.type);
        return { id: lot.id, nome: def?.nome ?? "Carro", price: `${lot.price} \u20A3`, note: lot.revealed ? lot.defect ? "defeito" : "limpa" : "sem ver", art: "lot" };
      });
    }
    if (id === "banco") {
      const debts = state.debts.filter((debt) => debt.balance > 0);
      if (debts.length > 0) {
        return debts.map((debt) => ({ id: `debt:${debt.id}`, nome: debt.creditor || "D\xEDvida", price: `${debt.balance} \u20A3`, note: "em aberto", art: "plain" }));
      }
      return [
        { id: "microcredito", nome: "Microcr\xE9dito", price: "1000 \u20A3", note: "20 semanas", art: "plain" },
        { id: "pre_aprovado", nome: "Pr\xE9-aprovado", price: "2000 \u20A3", note: "26 semanas", art: "plain" }
      ];
    }
    if (id === "coliseu" || id === "faixa") {
      const trophies = trophyWeeks(state.flags);
      const rows2 = [
        { id: "arrancada", nome: tourney ? "Torneio" : "Arrancada", price: tourney ? "1000 \u20A3" : "400 \u20A3", note: fuel < 1 ? "sem tanque" : "18h\u201323h", art: "plain" }
      ];
      if (trophies.length === 0) rows2.push({ id: "trofeu", nome: "Trof\xE9us", price: "nenhum", note: "semanas 18, 30, 44", art: "plain" });
      for (const mark of trophies) rows2.push({ id: `t${mark}`, nome: `Trof\xE9u`, price: `sem ${mark}`, art: "plain" });
      return rows2;
    }
    if (id === "galpao") {
      return [
        { id: "rex", nome: "Final do Rex", price: "Coliseu", note: "pr\xEAmio fixo", art: "plain" },
        { id: "agora", nome: "Desafio", price: "sem aposta", note: "aceite e corra", art: "plain" }
      ];
    }
    if (id === "praca") {
      return [
        { id: "panfleto", nome: "Panfleto", price: "1 a\xE7\xE3o", note: state.rep < 10 ? "fama 10" : "hoje", art: "plain", icon: "/assets/gf/v2/ui2/praca_panfleto.png" },
        { id: "fila", nome: "Empregos", price: `${(state.hands ?? []).length}/${officeBays(state.garage.level)}`, note: "ba\xEDas", art: "plain", icon: "/assets/gf/v2/ui2/praca_clientes.png" }
      ];
    }
    return [{ id: "olhar", nome: look.title, price: "", art: "plain" }];
  }
  const cardSrc = (item, on) => {
    if (item.art === "sketch" && item.icon) return item.icon;
    if (item.art === "food") return `${UI}/ui_cartao_comida${on ? "_on" : ""}.png`;
    if (item.art === "lot") return `${UI}/leilao_cartao_lote.png`;
    return `${UI}/ui_cartao_item_loja${on ? "_on" : ""}.png`;
  };
  const hole = HOLE[id] ?? HOLE.praca;
  const shutText = id === "posto" && !checkupDay ? "S\xF3 ter\xE7a e quinta" : isStall(id) ? stallHours(id) : place && !open ? `Abre ${nextOpenLabel(pack, place.id, t)}` : "Fechado";
  const ride = buttons.filter((btn) => btn.ride);
  const actions = buttons.filter((btn) => !btn.ride);
  const faces = new Set();
  const clipActs = actions.filter((btn) => btn.clip);
  const dockBtns = ride;
  const dock = (dockBtns.length > 0 || there) && /* @__PURE__ */ jsxs2("aside", { className: "gf-dock", children: [
    /* @__PURE__ */ jsx2("b", { children: there ? "Voc\xEA est\xE1 aqui" : minutes > 0 ? `${minutes} min longe` : look.title }),
    dockBtns.map((btn) => /* @__PURE__ */ jsxs2("button", { type: "button", className: `gf-dockbtn${btn.ride ? " is-ride" : ""}`, disabled: btn.disabled, title: btn.title, onClick: btn.act, children: [
      btn.icon && /* @__PURE__ */ jsx2("img", { src: btn.icon, alt: "" }),
      /* @__PURE__ */ jsx2("span", { children: btn.label })
    ] }, btn.label))
  ] });
  return /* @__PURE__ */ jsx2("div", { className: `gf-lugar2${showClosed ? " is-shut" : ""}${DARK.has(id) ? " is-dark" : ""}${isStall(id) && !mold ? " is-foods" : ""}`, role: "dialog", "aria-label": look.title, "data-place": id, children: /* @__PURE__ */ jsxs2("div", { className: `gf-lugar2-stage${ride.length ? " has-ride" : ""}`, children: [
    /* @__PURE__ */ jsx2("img", { className: "gf-lugar2-bg", src: look.bg, srcSet: `${look.bg.replace("/lugares/", "/lugares/half/")} 1376w, ${look.bg} 2752w`, sizes: "100vw", alt: "", style: look.bgPos ? { objectPosition: look.bgPos } : void 0 }),
    /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-lugar2-back", "aria-label": "Voltar", onClick: onClose, children: /* @__PURE__ */ jsx2("img", { src: `${UI}/ui_btn_voltar.png`, alt: "" }) }),
    dock,
    /* @__PURE__ */ jsx2("img", { className: `gf-lugar2-npc${talk ? " is-talk" : ""}`, src: `${NPC}/${look.npc}`, alt: "" }),
    id === "farmacia" && /* @__PURE__ */ jsx2("img", { className: "gf-lugar2-solange", src: `${NPC}/npc_solange_neutro.png`, alt: "" }),
    /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-say", children: [
      /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-name", children: [
        /* @__PURE__ */ jsx2("img", { src: `${UI}/ui_placa_nome_npc.png`, alt: "" }),
        /* @__PURE__ */ jsx2("b", { children: look.nome })
      ] }),
      /* @__PURE__ */ jsx2("img", { src: `${UI}/ui_painel_fala_lugar.png`, alt: "" }),
      /* @__PURE__ */ jsx2("p", { children: shown })
    ] }),
    mold ? /* @__PURE__ */ jsxs2(
      "section",
      {
        className: "gf-lugar2-panel is-moldura",
        onPointerDown: (event) => {
          swipe.current = event.clientX;
        },
        onPointerUp: (event) => {
          if (event.target.closest("button")) return;
          const dx = event.clientX - swipe.current;
          if (dx < -48) go(safePage + 1);
          if (dx > 48) go(safePage - 1);
        },
        children: [
          /* @__PURE__ */ jsx2("div", { className: "gf-moldura", style: { ["--ar"]: String(mold.aspect), ["--mold"]: `url("${mold.src}")` }, children: /* @__PURE__ */ jsxs2(
            "div",
            {
              ref: wellRef,
              className: `gf-conteudo${showClosed ? " is-shut" : ""}${id === "casco_tech" ? " is-glass" : ""}`,
              style: { left: `${mold.conteudo.x}%`, top: `${mold.conteudo.y}%`, width: `${mold.conteudo.w}%`, height: `${mold.conteudo.h}%` },
              children: [
                sub !== "Voc\xEA est\xE1 aqui" && !(minutes > 0 && !there) && /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: locked && id === "leilao" ? "Remende a oficina (n\xEDvel 1) para abrir" : sub }),
                id === "rato" && /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: rumorSaid ? "Rumor: a gangue cobra ped\xE1gio." : "Rumor: o Rato ainda n\xE3o falou." }),
                supplier && (supplier.creditDays != null || supplier.installments != null) && there && /* @__PURE__ */ jsxs2("div", { className: "gf-moldura-tabs", role: "group", "aria-label": "Como pagar", children: [
                  /* @__PURE__ */ jsx2("button", { type: "button", className: term === "cash" ? "is-on" : "", onClick: () => setTerm("cash"), children: "\xC0 vista" }),
                  supplier.creditDays != null && /* @__PURE__ */ jsx2("button", { type: "button", className: term === "prazo14" ? "is-on" : "", onClick: () => setTerm("prazo14"), children: "14 dias" }),
                  supplier.installments != null && /* @__PURE__ */ jsx2("button", { type: "button", className: term === "3x" ? "is-on" : "", onClick: () => setTerm("3x"), children: "3 vezes" })
                ] }),
                id === "farmacia" && /* @__PURE__ */ jsxs2("div", { className: "gf-moldura-tabs", role: "group", "aria-label": "Tipo", children: [
                  /* @__PURE__ */ jsx2("button", { type: "button", className: medTab === "remedio" ? "is-on" : "", onClick: () => {
                    setMedTab("remedio");
                    setPage(0);
                  }, children: "Rem\xE9dios" }),
                  /* @__PURE__ */ jsx2("button", { type: "button", className: medTab === "epi" ? "is-on" : "", onClick: () => {
                    setMedTab("epi");
                    setPage(0);
                  }, children: "EPI" })
                ] }),
                /* @__PURE__ */ jsx2("div", { className: `gf-moldura-grid${compact ? " is-rows" : ""}${id === "hospital" ? " is-ill" : ""}`, style: { ["--cols"]: cols }, children: slice.map((item, index) => {
                  const at = safePage * per + index;
                  const on = at === globalIndex;
                  if (id === "hospital") {
                    const grau = ({ leve: "leve", moderada: "moderada", seria: "s\xE9ria", grave: "grave", critica: "cr\xEDtica" })[item.note] ?? item.note;
                    return /* @__PURE__ */ jsxs2("div", { role: "button", tabIndex: 0, className: `gf-illrow${on ? " is-on" : ""}`, "aria-pressed": on, onClick: () => setPicked(at), onKeyDown: (event) => {
                      if (event.key === "Enter" || event.key === " ") setPicked(at);
                    }, children: [
                      item.icon && /* @__PURE__ */ jsx2("img", { src: item.icon, alt: "" }),
                      /* @__PURE__ */ jsxs2("span", { className: "gf-ill-copy", children: [
                        /* @__PURE__ */ jsx2("b", { children: item.nome }),
                        /* @__PURE__ */ jsxs2("span", { children: [
                          /* @__PURE__ */ jsx2("small", { children: item.price }),
                          /* @__PURE__ */ jsx2("small", { children: grau })
                        ] })
                      ] })
                    ] }, item.id);
                  }
                  return /* @__PURE__ */ jsxs2("button", { type: "button", className: `${compact ? "gf-mrow" : "gf-mcard"}${on ? " is-on" : ""}`, "aria-pressed": on, disabled: showClosed, style: { "--gf-btn-ink": "#111" }, onClick: () => {
                    setPicked(at);
                    if (id !== "praca") return;
                    const act = item.id === "panfleto" ? actions.find((btn) => btn.label.startsWith("Distribuir")) : item.id === "fila" ? actions.find((btn) => btn.label === "Empregos") : null;
                    if (act && !act.disabled) act.act();
                  }, children: [
                    item.icon && !compact && /* @__PURE__ */ jsx2("img", { src: item.icon, alt: "" }),
                    /* @__PURE__ */ jsxs2("span", { className: "gf-prodline", children: [
                      /* @__PURE__ */ jsx2("b", { className: "gf-prod", children: item.nome }),
                      /* @__PURE__ */ jsxs2("small", { className: "gf-prod", children: [
                        item.price,
                        item.note ? ` \xB7 ${item.note}` : ""
                      ] })
                    ] })
                  ] }, item.id);
                }) }),
                (id === "hospital" || (supplier && there) || pages > 1 || clipActs.length > 0) && /* @__PURE__ */ jsxs2("div", { className: "gf-moldura-foot", children: id === "hospital" ? [
                  pages > 1 && /* @__PURE__ */ jsxs2("div", { className: "gf-hosp-pages", children: [
                    /* @__PURE__ */ jsx2("div", { role: "button", tabIndex: 0, className: `gf-hosp-nav${safePage === 0 ? " is-off" : ""}`, "aria-label": "P\xE1gina anterior", onClick: () => safePage > 0 && go(safePage - 1), children: "\u2039" }),
                    /* @__PURE__ */ jsxs2("span", { children: [safePage + 1, "/", pages] }),
                    /* @__PURE__ */ jsx2("div", { role: "button", tabIndex: 0, className: `gf-hosp-nav${safePage >= pages - 1 ? " is-off" : ""}`, "aria-label": "Pr\xF3xima p\xE1gina", onClick: () => safePage < pages - 1 && go(safePage + 1), children: "\u203A" })
                  ] }),
                  clipActs.map((btn) => /* @__PURE__ */ jsx2("div", { role: "button", tabIndex: 0, className: `gf-hosp-buy${btn.disabled ? " is-off" : ""}`, title: btn.title, onClick: () => !btn.disabled && btn.act(), children: btn.label }, btn.label))
                ] : [
                  supplier && there && /* @__PURE__ */ jsxs2("div", { className: "gf-moldura-step", children: [
                    /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn", "aria-label": "Menos", onClick: () => setQty((n) => Math.max(1, n - 1)), children: "\u2212" }),
                    /* @__PURE__ */ jsx2("b", { children: qty }),
                    /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn", "aria-label": "Mais", onClick: () => setQty((n) => n + 1), children: "+" })
                  ] }),
                  pages > 1 && /* @__PURE__ */ jsxs2("div", { className: "gf-moldura-pages", children: [
                    /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn gf-turn is-prev", "aria-label": "P\xE1gina anterior", disabled: safePage === 0, onPointerDown: (event) => event.stopPropagation(), onClick: () => go(safePage - 1), children: "\u2039" }),
                    /* @__PURE__ */ jsxs2("span", { children: [
                      safePage + 1,
                      "/",
                      pages
                    ] }),
                    /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn gf-turn is-next", "aria-label": "Pr\xF3xima p\xE1gina", disabled: safePage >= pages - 1, onPointerDown: (event) => event.stopPropagation(), onClick: () => go(safePage + 1), children: "\u203A" })
                  ] }),
                  clipActs.map((btn) => /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-treat", disabled: btn.disabled, title: btn.title, onClick: btn.act, children: btn.label }, btn.label))
                ] }),
                showClosed && /* @__PURE__ */ jsx2("b", { className: "gf-stamp", children: id === "posto" && !checkupDay ? "S\xF3 ter\xE7a e quinta" : "Fechado" })
              ]
            }
          ) })
        ]
      }
    ) : /* @__PURE__ */ jsxs2(
      "section",
      {
        className: "gf-lugar2-panel",
        style: { ["--ar"]: `${hole.w} / ${hole.h}`, ["--aw"]: String(hole.w), ["--ah"]: String(hole.h) },
        onPointerDown: (event) => {
          swipe.current = event.clientX;
        },
        onPointerUp: (event) => {
          if (event.target.closest("button")) return;
          const dx = event.clientX - swipe.current;
          if (dx < -48) go(safePage + 1);
          if (dx > 48) go(safePage - 1);
        },
        children: [
          /* @__PURE__ */ jsx2("img", { className: "gf-lugar2-skin", src: isStall(id) ? "/assets/gf/v2/ui2/ui_painel_produtos.png?v=24" : `${UI}/${look.panel}`, alt: "" }),
          showClosed && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-shut", children: [
            /* @__PURE__ */ jsx2("img", { src: `${UI}/ui_placa_fechado.png`, alt: "" }),
            /* @__PURE__ */ jsx2("b", { children: shutText })
          ] }),
          /* @__PURE__ */ jsxs2("div", { className: `gf-lugar2-well${id === "praca" && vagas ? " is-vagas" : ""}`, style: { top: `${hole.t + (showClosed ? 8 : 0)}%`, right: `${hole.r}%`, bottom: `${hole.b}%`, left: `${hole.l}%` }, children: [
            !showClosed && !(minutes > 0 && !there) && /* @__PURE__ */ jsx2("p", { className: "gf-lugar2-sub", children: sub }),
            id === "rato" && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-note", children: [
              /* @__PURE__ */ jsx2("img", { src: `${UI}/rato_bilhete_rumor.png`, alt: "" }),
              /* @__PURE__ */ jsx2("p", { children: rumorSaid ? "A gangue cobra ped\xE1gio. O Coliseu tira a placa." : "O Rato ainda n\xE3o falou esta semana." })
            ] }),
            supplier && (supplier.creditDays != null || supplier.installments != null) && there && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-tabs", role: "group", "aria-label": "Como pagar", children: [
              /* @__PURE__ */ jsx2("button", { type: "button", className: term === "cash" ? "gf-artbtn is-on" : "gf-artbtn", onClick: () => setTerm("cash"), children: "\xC0 vista" }),
              supplier.creditDays != null && /* @__PURE__ */ jsx2("button", { type: "button", className: term === "prazo14" ? "gf-artbtn is-on" : "gf-artbtn", onClick: () => setTerm("prazo14"), children: "14 dias" }),
              supplier.installments != null && /* @__PURE__ */ jsx2("button", { type: "button", className: term === "3x" ? "gf-artbtn is-on" : "gf-artbtn", onClick: () => setTerm("3x"), children: "3 vezes" })
            ] }),
            id === "farmacia" && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-tabs", role: "group", "aria-label": "Tipo", children: [
              /* @__PURE__ */ jsx2("button", { type: "button", className: medTab === "remedio" ? "gf-artbtn is-on" : "gf-artbtn", onClick: () => {
                setMedTab("remedio");
                setPage(0);
              }, children: "Rem\xE9dios" }),
              /* @__PURE__ */ jsx2("button", { type: "button", className: medTab === "epi" ? "gf-artbtn is-on" : "gf-artbtn", onClick: () => {
                setMedTab("epi");
                setPage(0);
              }, children: "EPI" })
            ] }),
            id === "praca" && vagas ? /* @__PURE__ */ jsxs2("div", { className: "gf-vagas", children: [
              /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: "O primeiro pagamento é em 30 dias." }),
              /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: "Todo dia, às 7h atualiza a lista de funcionários." }),
              /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: "Cada ba\xEDa livre d\xE1 direito a 1 funcion\xE1rio." }),
              (state.offers ?? []).length === 0 && /* @__PURE__ */ jsx2("p", { className: "gf-moldura-sub", children: "As vagas abrem \xE0s 7h." }),
              (state.offers ?? []).slice(0, 3).map((offer) => /* @__PURE__ */ jsxs2("button", { type: "button", className: "gf-vaga", disabled: busy || !there || (state.hands ?? []).length + state.employees.filter((person) => person.apPerDay > 0).length >= officeBays(state.garage.level), title: !there ? "Chegue na pra\xE7a para contratar." : (state.hands ?? []).length + state.employees.filter((person) => person.apPerDay > 0).length >= officeBays(state.garage.level) ? "N\xE3o tem ba\xEDa livre." : "Entra numa ba\xEDa livre.", onClick: () => onAct({ type: "HIRE_HAND", offerId: offer.id }), children: [
                /* @__PURE__ */ jsx2("img", { className: "gf-face", src: faceSrc(offer.id, offer.photo, faces), alt: "" }),
                /* @__PURE__ */ jsx2("b", { children: faceName(offer.photo, offer.nome) }),
                /* @__PURE__ */ jsxs2("small", { children: [
                  offer.yieldPct,
                  "% do T\xE9o \xB7 ",
                  offer.salary,
                  " \u20A3 em 30 dias"
                ] })
              ] }, offer.id)),
              (state.hands ?? []).map((hand) => /* @__PURE__ */ jsxs2("div", { className: "gf-vaga is-crew", children: [
                /* @__PURE__ */ jsx2("img", { className: "gf-face", src: faceSrc(hand.id, hand.photo, faces), alt: "" }),
                /* @__PURE__ */ jsx2("b", { children: faceName(hand.photo, hand.nome) }),
                /* @__PURE__ */ jsxs2("small", { children: [
                  "ba\xEDa ",
                  hand.bay,
                  " \xB7 dia ",
                  hand.daysWorked ?? 0,
                  "/30 \xB7 ",
                  hand.yieldPct,
                  "% \xB7 ",
                  hand.salary,
                  " \u20A3"
                ] }),
                (hand.pay ?? 0) > 0 && /* @__PURE__ */ jsxs2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "PAY_HAND", handId: hand.id }), children: [
                  "Pagar ",
                  hand.pay,
                  " \u20A3"
                ] }),
                hand.excuse && /* @__PURE__ */ jsx2("small", { children: hand.excuse }),
                hand.advance > 0 && /* @__PURE__ */ jsxs2("span", { children: [
                  /* @__PURE__ */ jsxs2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "HAND_ADVANCE", handId: hand.id, accept: true }), children: [
                    "Adiantar ",
                    hand.advance
                  ] }),
                  /* @__PURE__ */ jsx2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "HAND_ADVANCE", handId: hand.id, accept: false }), children: "Agora n\xE3o" })
                ] }),
                hand.raise && /* @__PURE__ */ jsxs2("span", { children: [
                  /* @__PURE__ */ jsx2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "HAND_RAISE", handId: hand.id, accept: true }), children: "Aumento" }),
                  /* @__PURE__ */ jsx2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "HAND_RAISE", handId: hand.id, accept: false }), children: "Negar" })
                ] }),
                /* @__PURE__ */ jsx2("button", { type: "button", disabled: busy, onClick: () => onAct({ type: "FIRE_HAND", handId: hand.id }), children: "Demitir" })
              ] }, hand.id)),
              /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-vaga", onClick: () => setVagas(false), children: "Voltar" })
            ] }) : /* @__PURE__ */ jsx2("div", { className: "gf-lugar2-grid", style: { ["--cols"]: cols, ["--rows"]: rows }, children: slice.map((item, index) => {
              const at = safePage * per + index;
              const on = at === globalIndex;
              const praca = id === "praca";
              const kind = item.art === "food" ? "food" : item.art === "lot" ? "lot" : item.art === "sketch" ? "sketch" : "item";
              return /* @__PURE__ */ jsx2("div", { className: "gf-lslot", children: /* @__PURE__ */ jsxs2(
                "button",
                {
                  type: "button",
                  className: `gf-lcard gf-artbtn ${praca ? "is-praca" : `is-${kind}`}${on ? " is-on" : ""}`,
                  "aria-pressed": on,
                  onMouseEnter: (event) => {
                    const text = spell(item);
                    if (!text) return;
                    const box = event.currentTarget.getBoundingClientRect();
                    setTip({ text, x: box.left + box.width / 2, y: box.top });
                  },
                  onMouseLeave: () => setTip(null),
                  onClick: () => {
                    if (id === "praca" && item.id === "fila") setVagas(true);
                    else if (id === "praca" && item.id === "panfleto") onAct({ type: "PANFLETO" });
                    else setPicked(at);
                  },
                  children: praca ? [
                    item.icon && /* @__PURE__ */ jsx2("img", { className: "gf-lico", src: item.icon, alt: "" }),
                    /* @__PURE__ */ jsxs2("span", { className: "gf-praca-txt", children: [
                      /* @__PURE__ */ jsx2("b", { children: item.nome }),
                      /* @__PURE__ */ jsxs2("small", { children: [item.price, item.note ? ` \xB7 ${item.note}` : ""] })
                    ] })
                  ] : [
                    /* @__PURE__ */ jsx2("img", { className: "gf-lskin", src: cardSrc(item, on), alt: "" }),
                    item.icon && /* @__PURE__ */ jsx2("img", { className: "gf-lico", src: item.icon, alt: "" }),
                    /* @__PURE__ */ jsxs2("span", { className: "gf-prodline", children: [
                      /* @__PURE__ */ jsx2("b", { className: "gf-prod", children: item.nome }),
                      /* @__PURE__ */ jsxs2("small", { className: "gf-prod", children: [
                        item.price,
                        item.note ? ` \xB7 ${item.note}` : ""
                      ] })
                    ] })
                  ]
                }
              ) }, item.id);
            }) }),
            supplier && there && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-step", children: [
              /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-page gf-artbtn", "aria-label": "Menos", onClick: () => setQty((n) => Math.max(1, n - 1)), children: "\u2212" }),
              /* @__PURE__ */ jsx2("b", { children: qty }),
              /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-page gf-artbtn", "aria-label": "Mais", onClick: () => setQty((n) => n + 1), children: "+" })
            ] }),
            pages > 1 && /* @__PURE__ */ jsxs2("div", { className: "gf-lugar2-pages", children: [
              /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn gf-turn is-prev", "aria-label": "P\xE1gina anterior", disabled: safePage === 0, onPointerDown: (event) => event.stopPropagation(), onClick: () => go(safePage - 1), children: "\u2039" }),
              /* @__PURE__ */ jsxs2("span", { children: [
                safePage + 1,
                "/",
                pages
              ] }),
              /* @__PURE__ */ jsx2("button", { type: "button", className: "gf-pagebtn gf-turn is-next", "aria-label": "Pr\xF3xima p\xE1gina", disabled: safePage >= pages - 1, onPointerDown: (event) => event.stopPropagation(), onClick: () => go(safePage + 1), children: "\u203A" })
            ] })
          ] }),
        ]
      }
    ),
    tip && /* @__PURE__ */ jsx2("p", { className: "gf-itemtip", style: { left: tip.x, top: tip.y }, children: tip.text })
  ] }) });
}

export type LugarKey = keyof typeof LOOK;
