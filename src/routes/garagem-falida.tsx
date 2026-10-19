import { createFileRoute, redirect } from "@tanstack/react-router";
import { GfPlay } from "@/components/gf-play";
import { gfGate } from "@/game/gf.functions";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/garagem-falida")({
  loader: async () => {
    const gate = await gfGate();
    if (!gate.enabled) throw redirect({ to: "/dashboard" });
    return gate;
  },
  head: () => ({ meta: [{ title: "Garagem Falida" }] }),
  component: GaragemFalida,
});

function GaragemFalida() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">A oficina ainda está esfriando…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <GfPlay />;
}
