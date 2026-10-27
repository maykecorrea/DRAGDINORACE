export type RaceArt = {
  missilTras: HTMLImageElement;
  missilFrente: HTMLImageElement;
  impacto: HTMLImageElement;
  minaOsso: HTMLImageElement;
  minaLuz: HTMLImageElement;
  minaBoom: HTMLImageElement;
  caixaMuni: HTMLImageElement;
  caixaNitro: HTMLImageElement;
  caixaReparo: HTMLImageElement;
  piche: HTMLImageElement;
  ossada: HTMLImageElement;
  fumaca: HTMLImageElement;
  taco: HTMLImageElement;
  alertaMissil: HTMLImageElement;
  alertaMina: HTMLImageElement;
  alertaVacuo: HTMLImageElement;
  bloqueado: HTMLImageElement;
  mira: HTMLImageElement;
  fantasma: HTMLImageElement;
  ovo: HTMLImageElement;
  filhote: HTMLImageElement;
  raptor: HTMLImageElement;
  rex: HTMLImageElement;
  alfa: HTMLImageElement;
  longe: HTMLImageElement;
  perto: HTMLImageElement;
  beira: HTMLImageElement;
  iconeEscudo: HTMLImageElement;
  iconeCuspe: HTMLImageElement;
  escudoSheet: HTMLImageElement;
  empSheet: HTMLImageElement;
  trasComum: HTMLImageElement;
  trasNormal: HTMLImageElement;
  trasRaro: HTMLImageElement;
  trasEpico: HTMLImageElement;
  trasLendario: HTMLImageElement;
};

const FILES = [
  "race_missil_tras.png",
  "race_missil_frente.png",
  "race_impacto_sheet.png",
  "race_mina_osso.png",
  "race_mina_luz.png",
  "race_mina_explosao_sheet.png",
  "race_caixa_municao.png",
  "race_caixa_nitro.png",
  "race_caixa_reparo.png",
  "race_obst_piche.png",
  "race_obst_ossada.png",
  "race_fumaca_sheet.png",
  "race_tacometro_base.png",
  "race_alerta_missil.png",
  "race_alerta_mina.png",
  "race_alerta_vacuo.png",
  "race_icone_bloqueado.png",
  "race_mira_sheet.png",
  "race_fantasma_icone.png",
  "race_rank_ovo.png",
  "race_rank_filhote.png",
  "race_rank_raptor.png",
  "race_rank_rex.png",
  "race_rank_alfa.png",
  "race_parallax_longe.png",
  "race_parallax_perto.png",
  "race_parallax_beira.png",
  "race_icone_escudo.png",
  "race_icone_cuspe.png",
  "race_escudo_sheet.png",
  "race_emp_sheet.png",
  "race_carro_tras_comum.png",
  "race_carro_tras_normal.png",
  "race_carro_tras_raro.png",
  "race_carro_tras_epico.png",
  "race_carro_tras_lendario.png",
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

const KEYS = [
  "missilTras",
  "missilFrente",
  "impacto",
  "minaOsso",
  "minaLuz",
  "minaBoom",
  "caixaMuni",
  "caixaNitro",
  "caixaReparo",
  "piche",
  "ossada",
  "fumaca",
  "taco",
  "alertaMissil",
  "alertaMina",
  "alertaVacuo",
  "bloqueado",
  "mira",
  "fantasma",
  "ovo",
  "filhote",
  "raptor",
  "rex",
  "alfa",
  "longe",
  "perto",
  "beira",
  "iconeEscudo",
  "iconeCuspe",
  "escudoSheet",
  "empSheet",
  "trasComum",
  "trasNormal",
  "trasRaro",
  "trasEpico",
  "trasLendario",
] as const;

export function loadRaceArt(): Promise<RaceArt> {
  return Promise.all(FILES.map((file) => loadImage(`/assets/race/${file}`))).then((imgs) => {
    const art = {} as RaceArt;
    KEYS.forEach((key, i) => {
      art[key] = imgs[i]!;
    });
    return art;
  });
}

export function sheetFrame(img: HTMLImageElement, index: number, count: number) {
  const frame = ((index % count) + count) % count;
  const w = img.width / count;
  return { sx: frame * w, sy: 0, sw: w, sh: img.height };
}
