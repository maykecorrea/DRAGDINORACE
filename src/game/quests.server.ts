import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, getRequest, getRequestHeader, getRequestIP, setCookie } from "@tanstack/react-start/server";
import { verifyMessage } from "ethers";
import { getSql } from "@/lib/db";
import { DAILY_CAP, QUEST_BY_ID, QUESTS, RAFFLE_COST, SPIN_COST, type QuestId } from "./quests";
import { isPrivateIp } from "@/lib/locale";

type UserRow = {
  wallet: string;
  discord_id: string | null;
  discord_name: string | null;
  x_handle: string | null;
  ig_handle: string | null;
  points: number;
  spins: number;
  streak: number;
  last_checkin: string | null;
  referred_by: string | null;
};

const COOKIE = "ddr-quest";
const ADMIN = "ddr-quest-admin";

function secret() {
  return process.env.QUESTS_SECRET || process.env.BETTER_AUTH_SECRET || "ddr-quest-local";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

function clientIp() {
  const socketIp = getRequestIP() ?? "";
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = isPrivateIp(socketIp) && forwarded && !isPrivateIp(forwarded) ? forwarded : socketIp;
  return ip && !isPrivateIp(ip) ? ip : "";
}

function ipHash() {
  const ip = clientIp();
  if (!ip) return "";
  return createHash("sha256").update(`${ip}|${secret()}`).digest("hex").slice(0, 32);
}

export function readWallet(): string | null {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  const [wallet, exp, mac] = raw.split(".");
  if (!wallet || !exp || !mac) return null;
  if (Number(exp) < Date.now()) return null;
  const good = sign(`${wallet}.${exp}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(good);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return wallet;
}

function writeWallet(wallet: string) {
  const exp = Date.now() + 30 * 86400000;
  const body = `${wallet}.${exp}`;
  const secure = (getRequest()?.url ?? "").startsWith("https:");
  setCookie(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, path: "/", sameSite: "lax", secure, maxAge: 30 * 86400 });
}

function adminOk() {
  const raw = getCookie(ADMIN);
  if (!raw) return false;
  const pass = process.env.QUESTS_ADMIN_PASSWORD ?? "";
  if (!pass) return false;
  const [exp, mac] = raw.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const good = sign(`admin.${exp}.${pass}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cleanHandle(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase().slice(0, 32);
}

function isQuest(id: string): id is QuestId {
  return id in QUEST_BY_ID;
}

async function taskPaused(quest: string) {
  const sql = await getSql();
  const rows = await sql<{ paused: number }>`select paused from quest_config where id = ${quest} limit 1`;
  return Number(rows[0]?.paused ?? 0) === 1;
}

async function credit(wallet: string, quest: QuestId, note = "") {
  const def = QUEST_BY_ID[quest];
  const sql = await getSql();
  const day = dayKey();
  if (def.repeat !== "once") {
    const spent = await sql<{ n: number }>`
      select coalesce(sum(points), 0) as n from quest_completion
      where wallet = ${wallet} and status = 'approved' and day = ${day}
        and quest_id in ('checkin', 'race', 'win', 'x-like', 'x-rt', 'ig-like', 'ig-comment')
    `;
    if (Number(spent[0]?.n ?? 0) + def.points > DAILY_CAP) return { ok: false as const, reason: "limite do dia" };
  }
  if (def.cap) {
    const span = def.repeat === "month" ? monthKey() : day;
    const rows = await sql<{ n: number }>`
      select count(*) as n from quest_completion
      where wallet = ${wallet} and quest_id = ${quest} and status = 'approved' and day like ${span + "%"}
    `;
    if (Number(rows[0]?.n ?? 0) >= def.cap) return { ok: false as const, reason: "limite da tarefa" };
  }
  if (def.repeat === "once") {
    const prior = await sql<{ id: string }>`
      select id from quest_completion where wallet = ${wallet} and quest_id = ${quest} and status = 'approved' limit 1
    `;
    if (prior[0]) return { ok: false as const, reason: "já feita" };
  } else if (def.repeat === "day" && !def.cap) {
    const prior = await sql<{ id: string }>`
      select id from quest_completion where wallet = ${wallet} and quest_id = ${quest} and day = ${day} and status = 'approved' limit 1
    `;
    if (prior[0]) return { ok: false as const, reason: "já feita hoje" };
  }
  const id = randomBytes(12).toString("hex");
  await sql`
    insert into quest_completion (id, wallet, quest_id, status, points, day, note, sample)
    values (${id}, ${wallet}, ${quest}, 'approved', ${def.points}, ${day}, ${note}, 0)
  `;
  await sql`update quest_user set points = points + ${def.points} where wallet = ${wallet}`;
  return { ok: true as const, points: def.points };
}

export async function questChallenge(data: { wallet?: string }) {
    const wallet = String(data.wallet ?? "").toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) return { ok: false as const, reason: "carteira inválida" };
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const nonce = randomBytes(16).toString("hex");
    const sql = await getSql();
    await sql`
      insert into quest_nonce (wallet, nonce, answer, exp)
      values (${wallet}, ${nonce}, ${a + b}, now() + interval '10 minutes')
      on conflict (wallet) do update set nonce = excluded.nonce, answer = excluded.answer, exp = excluded.exp
    `;
    return { ok: true as const, nonce, a, b };
}

export async function questLogin(data: { wallet?: string; signature?: string; answer?: number; ref?: string }) {
    const wallet = String(data.wallet ?? "").toLowerCase();
    const signature = String(data.signature ?? "");
    if (!/^0x[a-f0-9]{40}$/.test(wallet) || signature.length < 10) return { ok: false as const, reason: "assinatura inválida" };
    const sql = await getSql();
    const rows = await sql<{ nonce: string; answer: number }>`
      select nonce, answer from quest_nonce where wallet = ${wallet} and exp > now() limit 1
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, reason: "captcha vencido" };
    if (Number(data.answer) !== Number(row.answer)) return { ok: false as const, reason: "captcha errado" };
    const message = `Dino Drag Race\nCarteira: ${wallet}\nNonce: ${row.nonce}`;
    let recovered = "";
    try {
      recovered = verifyMessage(message, signature).toLowerCase();
    } catch {
      return { ok: false as const, reason: "assinatura recusada" };
    }
    if (recovered !== wallet) return { ok: false as const, reason: "a assinatura não é dessa carteira" };
    const hash = ipHash();
    if (hash) {
      const clash = await sql<{ wallet: string }>`
        select wallet from quest_user where ip_hash = ${hash} and wallet <> ${wallet} limit 1
      `;
      if (clash[0]) return { ok: false as const, reason: "esse IP já tem uma carteira" };
    }
    const ref = String(data.ref ?? "").toLowerCase();
    const referred = /^0x[a-f0-9]{40}$/.test(ref) && ref !== wallet ? ref : null;
    await sql`
      insert into quest_user (wallet, referred_by, ip_hash)
      values (${wallet}, ${referred}, ${hash || null})
      on conflict (wallet) do update set ip_hash = excluded.ip_hash
    `;
    await sql`delete from quest_nonce where wallet = ${wallet}`;
    await credit(wallet, "wallet");
    writeWallet(wallet);
    return { ok: true as const };
}

export async function questBoard() {
  const sql = await getSql();
  const wallet = readWallet();
  const configs = await sql<{ id: string; href: string | null; paused: number }>`select id, href, paused from quest_config`;
  const config = new Map(configs.map((item) => [item.id, item]));
  const top = await sql<{ wallet: string; points: number }>`
    select wallet, coalesce(sum(points), 0) as points from quest_completion
    where status = 'approved' and points > 0 and created_at >= date_trunc('week', now())
    group by wallet order by points desc limit 10
  `;
  let me: UserRow | null = null;
  let done = new Set<string>();
  let pending = new Set<string>();
  const counts: Record<string, number> = {};
  if (wallet) {
    const users = await sql<UserRow>`
      select wallet, discord_id, discord_name, x_handle, ig_handle, points, spins, streak, last_checkin, referred_by
      from quest_user where wallet = ${wallet} limit 1
    `;
    me = users[0] ?? null;
    const rows = await sql<{ quest_id: string; status: string; day: string }>`
      select quest_id, status, day from quest_completion where wallet = ${wallet}
    `;
    const today = dayKey();
    for (const row of rows) {
      const def = isQuest(row.quest_id) ? QUEST_BY_ID[row.quest_id] : null;
      if (!def) continue;
      const current = def.repeat === "day" ? row.day === today : def.repeat === "month" ? row.day.startsWith(monthKey()) : true;
      if (!current) continue;
      if (row.status === "approved") done.add(row.quest_id);
      if (row.status === "pending") pending.add(row.quest_id);
      if (row.status === "approved") counts[row.quest_id] = (counts[row.quest_id] ?? 0) + 1;
    }
  }
  return {
    wallet,
    me,
    discordReady: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    top: top.map((item) => ({ wallet: item.wallet, points: Number(item.points) })),
    tasks: QUESTS.map((quest) => {
      const cfg = config.get(quest.id);
      const hits = counts[quest.id] ?? 0;
      const status = Number(cfg?.paused) ? "paused" : pending.has(quest.id) ? "pending" : done.has(quest.id) && (!quest.cap || hits >= quest.cap) ? "done" : "open";
      return { ...quest, href: cfg?.href ?? "", status, hits };
    }),
  };
}

export async function questCheckin() {
  const wallet = readWallet();
  if (!wallet) return { ok: false as const, reason: "entra com a carteira" };
  if (await taskPaused("checkin")) return { ok: false as const, reason: "pausada" };
  const sql = await getSql();
  const today = dayKey();
  const rows = await sql<{ last_checkin: string | null; streak: number }>`
    select last_checkin, streak from quest_user where wallet = ${wallet} limit 1
  `;
  const row = rows[0];
  if (!row) return { ok: false as const, reason: "sem cadastro" };
  if (row.last_checkin === today) return { ok: false as const, reason: "já fez hoje" };
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const streak = row.last_checkin === yesterday ? Number(row.streak) + 1 : 1;
  await sql`update quest_user set last_checkin = ${today}, streak = ${streak} where wallet = ${wallet}`;
  const base = await credit(wallet, "checkin");
  let bonus = 0;
  if (streak > 0 && streak % 7 === 0) {
    await sql`update quest_user set points = points + 5 where wallet = ${wallet}`;
    bonus = 5;
  }
  return { ok: true as const, points: (base.ok ? base.points : 0) + bonus, streak };
}

export async function questManual(data: { quest?: string; handle?: string }) {
    const wallet = readWallet();
    if (!wallet) return { ok: false as const, reason: "entra com a carteira" };
    const quest = String(data.quest ?? "");
    if (!isQuest(quest) || QUEST_BY_ID[quest].check !== "manual") return { ok: false as const, reason: "tarefa inválida" };
    if (await taskPaused(quest)) return { ok: false as const, reason: "pausada" };
    const handle = cleanHandle(String(data.handle ?? ""));
    if ((quest.startsWith("x-") || quest.startsWith("ig-")) && handle.length < 2) return { ok: false as const, reason: "informa o @" };
    const sql = await getSql();
    const taken = quest.startsWith("x-")
      ? await sql<{ wallet: string }>`select wallet from quest_user where x_handle = ${handle} and wallet <> ${wallet} limit 1`
      : await sql<{ wallet: string }>`select wallet from quest_user where ig_handle = ${handle} and wallet <> ${wallet} limit 1`;
    if (taken[0]) return { ok: false as const, reason: "esse @ já está em outra carteira" };
    if (quest.startsWith("x-")) await sql`update quest_user set x_handle = ${handle} where wallet = ${wallet}`;
    else await sql`update quest_user set ig_handle = ${handle} where wallet = ${wallet}`;
    const day = dayKey();
    const prior = await sql<{ id: string }>`
      select id from quest_completion where wallet = ${wallet} and quest_id = ${quest} and day = ${day} and status = 'pending' limit 1
    `;
    if (prior[0]) return { ok: true as const };
    const id = randomBytes(12).toString("hex");
    const sample = Math.random() < 0.2 ? 1 : 0;
    await sql`
      insert into quest_completion (id, wallet, quest_id, status, points, day, note, sample)
      values (${id}, ${wallet}, ${quest}, 'pending', ${QUEST_BY_ID[quest].points}, ${day}, ${handle}, ${sample})
    `;
    return { ok: true as const };
}

export async function questRedeem(data: { kind?: string }) {
    const wallet = readWallet();
    if (!wallet) return { ok: false as const, reason: "entra com a carteira" };
    const kind = data.kind === "raffle" ? "raffle" : data.kind === "spin" ? "spin" : "";
    if (!kind) return { ok: false as const, reason: "troca inválida" };
    const cost = kind === "spin" ? SPIN_COST : RAFFLE_COST;
    const sql = await getSql();
    const rows =
      kind === "spin"
        ? await sql<{ points: number }>`
            update quest_user set points = points - ${cost}, spins = spins + 1
            where wallet = ${wallet} and points >= ${cost}
            returning points
          `
        : await sql<{ points: number }>`
            update quest_user set points = points - ${cost}
            where wallet = ${wallet} and points >= ${cost}
            returning points
          `;
    if (!rows[0]) return { ok: false as const, reason: "pontos insuficientes" };
    await sql`
      insert into quest_completion (id, wallet, quest_id, status, points, day, note, sample)
      values (${randomBytes(12).toString("hex")}, ${wallet}, ${kind}, 'approved', ${-cost}, ${dayKey()}, ${kind}, 0)
    `;
    return { ok: true as const, points: Number(rows[0].points) };
}

export async function reportQuestRace(data: { won?: boolean }) {
    const wallet = readWallet();
    if (!wallet) return { ok: false as const };
    if (!(await taskPaused("race"))) await credit(wallet, "race");
    if (data.won && !(await taskPaused("win"))) await credit(wallet, "win");
    const sql = await getSql();
    const users = await sql<{ referred_by: string | null }>`select referred_by from quest_user where wallet = ${wallet} limit 1`;
    const host = users[0]?.referred_by;
    if (host && !(await taskPaused("referral"))) {
      const known = await sql<{ wallet: string }>`select wallet from quest_user where wallet = ${host} limit 1`;
      const already = await sql<{ id: string }>`
        select id from quest_completion where quest_id = 'referral' and note = ${wallet} limit 1
      `;
      if (known[0] && !already[0]) await credit(host, "referral", wallet);
    }
    return { ok: true as const };
}

export async function questSpins() {
  const wallet = readWallet();
  if (!wallet) return 0;
  const sql = await getSql();
  const rows = await sql<{ spins: number }>`select spins from quest_user where wallet = ${wallet} limit 1`;
  return Number(rows[0]?.spins ?? 0);
}

export async function useQuestSpin(data: { n?: number }) {
    const wallet = readWallet();
    if (!wallet) return { ok: false as const, used: 0, left: 0 };
    const n = Math.max(1, Math.min(1000, Math.floor(Number(data?.n ?? 1)) || 1));
    const sql = await getSql();
    const have = await sql<{ spins: number }>`select spins from quest_user where wallet = ${wallet} limit 1`;
    const used = Math.min(n, Number(have[0]?.spins ?? 0));
    if (!used) return { ok: false as const, used: 0, left: 0 };
    const rows = await sql<{ spins: number }>`
      update quest_user set spins = spins - ${used} where wallet = ${wallet} and spins >= ${used} returning spins
    `;
    if (!rows[0]) return { ok: false as const, used: 0, left: 0 };
    return { ok: true as const, used, left: Number(rows[0].spins) };
}

export async function attachDiscord(wallet: string, discordId: string, name: string, joined: boolean, role: boolean) {
  const sql = await getSql();
  const clash = await sql<{ wallet: string }>`
    select wallet from quest_user where discord_id = ${discordId} and wallet <> ${wallet} limit 1
  `;
  if (clash[0]) return { ok: false as const, reason: "esse Discord já está em outra carteira" };
  await sql`update quest_user set discord_id = ${discordId}, discord_name = ${name} where wallet = ${wallet}`;
  if (joined) await credit(wallet, "discord-join");
  if (role) await credit(wallet, "discord-role");
  return { ok: true as const };
}

export async function questAdminLogin(data: { password?: string }) {
    const pass = process.env.QUESTS_ADMIN_PASSWORD ?? "";
    const given = String(data.password ?? "");
    if (!pass || given.length !== pass.length || !timingSafeEqual(Buffer.from(given), Buffer.from(pass))) {
      return { ok: false as const };
    }
    const exp = Date.now() + 12 * 3600000;
    const secure = (getRequest()?.url ?? "").startsWith("https:");
    setCookie(ADMIN, `${exp}.${sign(`admin.${exp}.${pass}`)}`, { httpOnly: true, path: "/", sameSite: "lax", secure, maxAge: 12 * 3600 });
    return { ok: true as const };
}

export async function questAdminBoard() {
  if (!adminOk()) return { ok: false as const };
  const sql = await getSql();
  const pending = await sql<{ id: string; wallet: string; quest_id: string; note: string | null; sample: number; created_at: string }>`
    select id, wallet, quest_id, note, sample, created_at from quest_completion
    where status = 'pending' order by created_at asc limit 200
  `;
  const configs = await sql<{ id: string; href: string | null; paused: number }>`select id, href, paused from quest_config order by id`;
  const top = await sql<{ wallet: string; points: number }>`
    select wallet, coalesce(sum(points), 0) as points from quest_completion
    where status = 'approved' and points > 0 and created_at >= date_trunc('week', now())
    group by wallet order by points desc limit 10
  `;
  return { ok: true as const, pending, configs, top };
}

export async function questAdminAct(data: { id?: string; op?: string; href?: string; quest?: string }) {
    if (!adminOk()) return { ok: false as const, reason: "sem acesso" };
    const sql = await getSql();
    if (data.op === "approve" || data.op === "reject") {
      const rows = await sql<{ wallet: string; quest_id: string; status: string }>`
        select wallet, quest_id, status from quest_completion where id = ${String(data.id ?? "")} limit 1
      `;
      const row = rows[0];
      if (!row || row.status !== "pending" || !isQuest(row.quest_id)) return { ok: false as const, reason: "fila vazia" };
      if (data.op === "reject") {
        await sql`update quest_completion set status = 'rejected' where id = ${String(data.id)}`;
        return { ok: true as const };
      }
      const paid = await credit(row.wallet, row.quest_id);
      if (!paid.ok && paid.reason !== "já feita") {
        await sql`update quest_completion set status = 'rejected', note = ${paid.reason} where id = ${String(data.id)}`;
        return { ok: false as const, reason: paid.reason };
      }
      await sql`delete from quest_completion where id = ${String(data.id)} and status = 'pending'`;
      return { ok: true as const };
    }
    if (data.op === "save" && data.quest) {
      await sql`
        insert into quest_config (id, href, paused) values (${String(data.quest)}, ${String(data.href ?? "")}, 0)
        on conflict (id) do update set href = excluded.href
      `;
      return { ok: true as const };
    }
    if (data.op === "pause" && data.quest) {
      await sql`
        insert into quest_config (id, href, paused) values (${String(data.quest)}, '', 1)
        on conflict (id) do update set paused = 1 - quest_config.paused
      `;
      return { ok: true as const };
    }
    return { ok: false as const, reason: "ação inválida" };
}
