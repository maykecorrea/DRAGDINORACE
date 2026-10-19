import { createFileRoute } from "@tanstack/react-router";
import { GfError } from "@/game/gf/errors";
import { gfRunService } from "@/game/gf/run.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";

async function account(request: Request): Promise<string> {
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
  return requireUserId(bearer);
}

function failed(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  if (err instanceof GfError) return Response.json(err.body, { status: err.status });
  return null;
}

export const Route = createFileRoute("/api/gf/run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const id = await account(request);
          const run = await gfRunService.getActive(id);
          return Response.json({ run });
        } catch (err) {
          const response = failed(err);
          if (response) return response;
          throw err;
        }
      },
      POST: async ({ request }) => {
        try {
          const id = await account(request);
          const body = (await request.json().catch(() => null)) as { playerName?: unknown } | null;
          const run = await gfRunService.create(id, body?.playerName);
          return Response.json({ run }, { status: 201 });
        } catch (err) {
          const response = failed(err);
          if (response) return response;
          throw err;
        }
      },
      DELETE: async ({ request }) => {
        try {
          const id = await account(request);
          const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
          if (body?.confirm !== "APAGAR") {
            return Response.json({ error: "Digite APAGAR para apagar a campanha." }, { status: 422 });
          }
          const result = await gfRunService.abandon(id);
          return Response.json(result);
        } catch (err) {
          const response = failed(err);
          if (response) return response;
          throw err;
        }
      },
    },
  },
});
