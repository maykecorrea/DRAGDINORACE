import type { GameState } from "../../../gf-engine/state.ts";

export type Seal = { key: string; title: string; line: string };

export const SEALS: Seal[] = [
  { key: "gf_adesivo_ferrugem", title: "Adesivo Ferrugem & Filho", line: "Em breve no Dino Drag." },
  { key: "gf_titulo_sem_medo", title: "Sem Medo da Mandíbula", line: "Título de piloto. Em breve no Dino Drag." },
  { key: "gf_faro_fino", title: "Faro Fino", line: "Emblema de quem farejou cinco golpes. Em breve no Dino Drag." },
  { key: "gf_pistao_velho_osso", title: "Pistão do Velho Osso", line: "Peça cosmética. Em breve no Dino Drag." },
  { key: "gf_liberdade", title: "Liberdade", line: "1.000 fósseis guardados. O crédito na corrida ainda está desligado." },
];

export function sealByKey(key: string): Seal | undefined {
  return SEALS.find((seal) => seal.key === key);
}

export function sealsFromState(state: Pick<GameState, "garage" | "flags" | "ending">): Seal[] {
  const dodged = state.flags.scams_dodged;
  const rows: Seal[] = [];
  if (state.garage.level >= 3) rows.push(SEALS[0]!);
  if (state.flags.gangDown === true) rows.push(SEALS[1]!);
  if (typeof dodged === "number" && dodged >= 5) rows.push(SEALS[2]!);
  if (state.ending === "prosperidade") rows.push(SEALS[3]!);
  if (state.ending === "liberdade") rows.push(SEALS[4]!);
  return rows;
}
