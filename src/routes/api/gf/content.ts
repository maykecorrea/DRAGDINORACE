import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { contentBody } from "../../../../gf-engine/content.ts";

const etag = `"${createHash("sha256").update(contentBody).digest("hex")}"`;
const gzip = gzipSync(Buffer.from(contentBody));

export const Route = createFileRoute("/api/gf/content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Encoding": "gzip",
          "Cache-Control": "public, max-age=86400",
          ETag: etag,
          Vary: "Accept-Encoding",
        };
        if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
        return new Response(gzip, { headers });
      },
    },
  },
});
