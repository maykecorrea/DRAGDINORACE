import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

type Claim = {
  id: string;
  signature: string;
  prompt: string;
  image: string;
  video: string;
  name?: string;
  rarity?: string;
  modelId?: string;
  driverId?: string;
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
    const videoOk = data.video.startsWith("/game/") || data.video.length >= 32;
    const imageOk = data.image.startsWith("/game/") || data.image.startsWith("data:");
    if (!data.id.startsWith("SAUR-") || !videoOk || !imageOk) {
      return { ok: false as const, reason: "incompleto" };
    }
    const sql = await getSql();
    try {
      await sql`
        insert into forged_nft (id, user_id, signature, prompt, image, video, name, rarity, model_id, driver_id)
        values (
          ${data.id},
          ${context.userId},
          ${data.signature},
          ${data.prompt},
          ${data.image},
          ${data.video},
          ${data.name ?? ""},
          ${data.rarity ?? ""},
          ${data.modelId ?? ""},
          ${data.driverId ?? ""}
        )
      `;
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const taken = /unique|duplicate|23505/i.test(message);
      return { ok: false as const, reason: taken ? ("taken" as const) : ("db" as const) };
    }
  });

export const claimForgeBatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { items: Claim[] }) => {
    if (!data || !Array.isArray(data.items) || data.items.length > 1000) throw new Error("lote");
    return data;
  })
  .handler(async ({ context, data }) => {
    const items = data.items.filter((item) => {
      const videoOk = item.video.startsWith("/game/") || item.video.length >= 32;
      const imageOk = item.image.startsWith("/game/") || item.image.startsWith("data:");
      return item.id.startsWith("SAUR-") && videoOk && imageOk;
    });
    if (!items.length) return { ok: true as const, saved: 0 };
    const sql = await getSql();
    let saved = 0;
    for (let i = 0; i < items.length; i += 200) {
      const slice = items.slice(i, i + 200);
      const rows = await sql.query<{ id: string }>(
        `insert into forged_nft (id, user_id, signature, prompt, image, video, name, rarity, model_id, driver_id)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[])
         on conflict (signature) do nothing
         returning id`,
        [
          slice.map((item) => item.id),
          slice.map(() => context.userId),
          slice.map((item) => item.signature),
          slice.map((item) => item.prompt),
          slice.map((item) => item.image),
          slice.map((item) => item.video),
          slice.map((item) => item.name ?? ""),
          slice.map((item) => item.rarity ?? ""),
          slice.map((item) => item.modelId ?? ""),
          slice.map((item) => item.driverId ?? ""),
        ],
      );
      saved += rows.length;
    }
    return { ok: true as const, saved };
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
