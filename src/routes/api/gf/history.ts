import { createFileRoute } from "@tanstack/react-router";
import { GfError } from "@/game/gf/errors";
import { gfRunService } from "@/game/gf/run.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/gf/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const header = request.headers.get("authorization");
          const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          const id = await requireUserId(bearer);
          return Response.json(await gfRunService.history(id));
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
