export type GameMode = {
  id: "garagem_falida" | "dino_drag";
  title: string;
  route: "/garagem-falida" | "/dashboard";
  badge?: "NOVO";
  progress?: { week: number; day: number } | null;
};

/** Liga o modo Plus. `GF_ENABLED=false` (ou 0/off) devolve o login antigo. */
export function gfEnabled(): boolean {
  const raw = (process.env.GF_ENABLED ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export function listModes(
  enabled = gfEnabled(),
  progress: { week: number; day: number } | null = null,
): { modes: GameMode[] } {
  const dino: GameMode = { id: "dino_drag", title: "Dino Drag Race", route: "/dashboard" };
  if (!enabled) return { modes: [dino] };
  return {
    modes: [
      {
        id: "garagem_falida",
        title: "Garagem Falida",
        route: "/garagem-falida",
        badge: "NOVO",
        progress,
      },
      dino,
    ],
  };
}
