import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GameApp } from "@/game/GameApp";

export const Route = createFileRoute("/pista")({
  validateSearch: (search: Record<string, unknown>): { rival?: string; story?: boolean; treino?: boolean; racha?: string; duel?: string } => ({
    rival: typeof search.rival === "string" ? search.rival : undefined,
    story: search.story === 1 || search.story === "1" || search.story === true || search.story === "true",
    treino: search.treino === 1 || search.treino === "1" || search.treino === true || search.treino === "true",
    racha: typeof search.racha === "string" ? search.racha : undefined,
    duel: typeof search.duel === "string" ? search.duel : undefined,
  }),
  component: Pista,
});

function Pista() {
  const { user, isPending } = useCurrentUserState();
  const { rival, story, treino, racha, duel } = Route.useSearch();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">Esquentando o motor…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <GameApp rivalId={rival} story={story} treino={treino} racha={racha} duel={duel} selfKey={user.id} />;
}
