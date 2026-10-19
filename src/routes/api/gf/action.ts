import { createFileRoute } from "@tanstack/react-router";
import { GfError } from "@/game/gf/errors";
import { gfRunService } from "@/game/gf/run.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/gf/action")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const header = request.headers.get("authorization");
          const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          const id = await requireUserId(bearer);
          const body = (await request.json().catch(() => null)) as {
            rev?: unknown;
            idempotencyKey?: unknown;
            action?: unknown;
          } | null;
          if (!body) return Response.json({ error: "Pedido inválido." }, { status: 422 });
          const result = await gfRunService.applyAction(id, {
            rev: body.rev,
            idempotencyKey: body.idempotencyKey,
            action: body.action,
          });
          return Response.json(result);
        } catch (err) {
          if (err instanceof UnauthorizedError) {
            return Response.json({ error: "Faça login para continuar." }, { status: 401 });
          }
          if (err instanceof GfError) return Response.json(err.body, { status: err.status });
          throw err;
        }
      },
    },
  },
});
