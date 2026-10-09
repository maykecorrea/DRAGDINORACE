import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

type Claim = {
  id: string;
  signature: string;
  prompt: string;
  image: string;
  video: string;
};

export const signatureFree = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { signature: string }) => data)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ hit: number }>`
      select 1 as hit from forged_nft where signature = ${data.signature} limit 1
    `;
    return rows.length === 0;
  });

export const claimForge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Claim) => data)
  .handler(async ({ context, data }) => {
    if (!data.id.startsWith("SAUR-") || data.video.length < 32 || data.image.length < 16) {
      return { ok: false as const, reason: "incompleto" };
    }
    const sql = await getSql();
    try {
      await sql`
        insert into forged_nft (id, user_id, signature, prompt, image, video)
        values (${data.id}, ${context.userId}, ${data.signature}, ${data.prompt}, ${data.image}, ${data.video})
      `;
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const taken = /unique|duplicate|23505/i.test(message);
      return { ok: false as const, reason: taken ? ("taken" as const) : ("db" as const) };
    }
  });

export const loadForgeVideo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ video: string }>`
      select video from forged_nft where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    return rows[0]?.video ?? null;
  });
