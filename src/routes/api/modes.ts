import { createFileRoute } from "@tanstack/react-router";
import { listModes } from "@/game/gf";
import { gfRunService } from "@/game/gf/run.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/modes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const header = request.headers.get("authorization");
        const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
        try {
          const id = await requireUserId(bearer);
          const run = await gfRunService.getActive(id);
          return Response.json(listModes(undefined, run ? { week: run.week, day: run.day } : null));
        } catch (err) {
          if (err instanceof UnauthorizedError) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          throw err;
        }
      },
    },
  },
});
