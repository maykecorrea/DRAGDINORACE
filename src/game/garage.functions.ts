import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { liveStats } from "./data";
import { hullAfter } from "./hp";
import type { WeaponId } from "./weapons";
import type { Save } from "./save";

function asSave(raw: unknown): Save | null {
  try {
    const value = typeof raw === "string" ? (JSON.parse(raw) as Save) : (raw as Save);
    if (!value || value.version !== 1 || !Array.isArray(value.cars) || value.cars.length === 0) return null;
    return value;
  } catch {
    return null;
  }
}

export const loadGarage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ payload: string }>`
      select payload from player_save where user_id = ${context.userId} limit 1
    `;
    return asSave(rows[0]?.payload ?? null);
  });

export const saveGarage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Save) => data)
  .handler(async ({ context, data }) => {
    const save = asSave(data);
    if (!save) return;
    const sql = await getSql();
    const payload = JSON.stringify(save);
    await sql`
      insert into player_save (user_id, payload, updated_at)
      values (${context.userId}, ${payload}, now())
      on conflict (user_id) do update set payload = excluded.payload, updated_at = now()
    `;
  });

export const resolveHull = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { tokenId: string; walls: number; bumps: number; taken?: Partial<Record<WeaponId, number>>; poisonTime?: number }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ payload: string }>`
      select payload from player_save where user_id = ${context.userId} limit 1
    `;
    const save = asSave(rows[0]?.payload ?? null);
    const car = save?.cars.find((item) => item.tokenId === data.tokenId) ?? save?.cars[0];
    if (!save || !car) return null;
    const stats = liveStats(car, save.pilot, save.kit);
    const hull = { ...hullAfter(stats.durability, data.walls, data.bumps, data.taken, data.poisonTime ?? 0), at: Date.now() };
    return hull;
  });
