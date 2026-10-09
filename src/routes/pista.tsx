import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GameApp } from "@/game/GameApp";

export const Route = createFileRoute("/pista")({
  validateSearch: (search: Record<string, unknown>): { rival?: string; story?: boolean } => ({
    rival: typeof search.rival === "string" ? search.rival : undefined,
    story: search.story === 1 || search.story === "1" || search.story === true,
  }),
  component: Pista,
});

function Pista() {
  const { user, isPending } = useCurrentUserState();
  const { rival, story } = Route.useSearch();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">Acendendo o giro…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <GameApp rivalId={rival} story={story} />;
}
