import { createFileRoute } from "@tanstack/react-router";

type Kind = "offer" | "answer" | "ice";

type Peer = { id: string; name: string; seen: number };
type Sig = { id: number; from: string; to: string; kind: Kind; payload: unknown };
type Room = { peers: Map<string, Peer>; signals: Sig[]; seq: number };

const rooms = new Map<string, Room>();

function roomOf(code: string): Room {
  let room = rooms.get(code);
  if (!room) {
    room = { peers: new Map(), signals: [], seq: 0 };
    rooms.set(code, room);
  }
  return room;
}

function sweep(room: Room) {
  const now = Date.now();
  for (const [id, peer] of room.peers) {
    if (now - peer.seen > 15000) room.peers.delete(id);
  }
}

type Waiter = { id: string; name: string; at: number; stake: number };
const queue: Waiter[] = [];
const paired = new Map<string, { room: string; at: number; stake: number }>();

function pairOrWait(id: string, name: string, stake: number): { room?: string; waiting?: boolean; stake?: number } {
  const now = Date.now();
  const bet = Math.max(0, Math.round(stake));
  for (let i = queue.length - 1; i >= 0; i--) if (now - queue[i]!.at > 20000) queue.splice(i, 1);
  for (const [peer, seat] of paired) if (now - seat.at > 60000) paired.delete(peer);
  const already = paired.get(id);
  if (already && already.stake === bet) return { room: already.room, stake: bet };
  const other = queue.find((item) => item.id !== id && item.stake === bet);
  if (other) {
    const room = `q${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i]!.id === other.id || queue[i]!.id === id) queue.splice(i, 1);
    }
    paired.set(id, { room, at: now, stake: bet });
    paired.set(other.id, { room, at: now, stake: bet });
    return { room, stake: bet };
  }
  const mine = queue.find((item) => item.id === id);
  if (mine) {
    mine.stake = bet;
    mine.at = now;
    mine.name = name || mine.name;
  } else queue.push({ id, name: name || "Piloto", at: now, stake: bet });
  return { waiting: true, stake: bet };
}

function openTables(self: string) {
  const now = Date.now();
  for (let i = queue.length - 1; i >= 0; i--) if (now - queue[i]!.at > 20000) queue.splice(i, 1);
  return queue
    .filter((item) => item.id !== self)
    .map((item) => ({ id: item.id, name: item.name, stake: item.stake }));
}

function sitTable(id: string, name: string, tableId: string) {
  const now = Date.now();
  for (let i = queue.length - 1; i >= 0; i--) if (now - queue[i]!.at > 20000) queue.splice(i, 1);
  const already = paired.get(id);
  if (already) return { room: already.room, stake: already.stake };
  const other = queue.find((item) => item.id === tableId);
  if (!other) return { missing: true };
  const room = `q${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i]!.id === other.id || queue[i]!.id === id) queue.splice(i, 1);
  }
  paired.set(id, { room, at: now, stake: other.stake });
  paired.set(other.id, { room, at: now, stake: other.stake });
  return { room, stake: other.stake };
}

function cleanCode(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}

type CityPilot = {
  id: string;
  name: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  aim: string;
  seen: number;
};

const city = new Map<string, CityPilot>();

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function citySweep() {
  const now = Date.now();
  for (const [id, pilot] of city) if (now - pilot.seen > 2800) city.delete(id);
}

function cityPublic(pilot: CityPilot) {
  return { id: pilot.id, name: pilot.name, x: pilot.x, y: pilot.y, heading: pilot.heading, speed: pilot.speed };
}

function citySync(body: { peer?: string; name?: string; x?: number; y?: number; heading?: number; speed?: number; aim?: string }) {
  citySweep();
  const id = String(body.peer ?? "").slice(0, 40);
  if (!id) return Response.json({ ok: false }, { status: 400 });
  const prev = city.get(id);
  const aim = String(body.aim ?? "").slice(0, 40);
  city.set(id, {
    id,
    name: String(body.name ?? "Piloto").slice(0, 24) || "Piloto",
    x: clamp(body.x, 0, 20000, prev?.x ?? 900),
    y: clamp(body.y, 0, 20000, prev?.y ?? 900),
    heading: clamp(body.heading, -20, 20, prev?.heading ?? 0),
    speed: clamp(body.speed, 0, 400, prev?.speed ?? 0),
    aim: aim && aim !== id ? aim : "",
    seen: Date.now(),
  });
  const me = city.get(id)!;
  const pilots = [...city.values()].filter((pilot) => pilot.id !== id).map(cityPublic);
  const inviter = [...city.values()].find((pilot) => pilot.id !== id && pilot.aim === id);
  const target = me.aim ? city.get(me.aim) : undefined;
  const race = target && target.aim === id ? `rua-${[id, target.id].sort().join("-").slice(0, 48)}` : null;
  return Response.json({
    pilots,
    online: city.size,
    invite: inviter && inviter.aim === id && me.aim !== inviter.id ? { id: inviter.id, name: inviter.name } : null,
    race,
  });
}

export const Route = createFileRoute("/api/rtc")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const code = cleanCode(url.searchParams.get("room"));
        const peer = String(url.searchParams.get("peer") ?? "").slice(0, 40);
        const name = String(url.searchParams.get("name") ?? "Piloto").slice(0, 24);
        const since = Number(url.searchParams.get("since") ?? 0);
        if (!code || !peer) return Response.json({ peers: [], signals: [] });
        const room = roomOf(code);
        sweep(room);
        room.peers.set(peer, { id: peer, name: name || "Piloto", seen: Date.now() });
        const signals = room.signals.filter((sig) => sig.to === peer && sig.id > since);
        return Response.json({
          peers: [...room.peers.values()].map((item) => ({ id: item.id, name: item.name })),
          signals: signals.map((sig) => ({ id: sig.id, from: sig.from, kind: sig.kind, payload: sig.payload })),
        });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          op?: string;
          room?: string;
          peer?: string;
          from?: string;
          to?: string;
          name?: string;
          stake?: number;
          table?: string;
          aim?: string;
          x?: number;
          y?: number;
          heading?: number;
          speed?: number;
          kind?: Kind;
          payload?: unknown;
        } | null;
        if (!body) return Response.json({ ok: false }, { status: 400 });
        if (body.op === "city") return citySync(body);
        if (body.op === "city-leave") {
          city.delete(String(body.peer ?? "").slice(0, 40));
          return Response.json({ ok: true });
        }
        if (body.op === "tables") {
          return Response.json({ tables: openTables(String(body.peer ?? "").slice(0, 40)) });
        }
        if (body.op === "sit") {
          const peer = String(body.peer ?? "").slice(0, 40);
          const table = String(body.table ?? "").slice(0, 40);
          if (!peer || !table) return Response.json({ ok: false }, { status: 400 });
          return Response.json(sitTable(peer, String(body.name ?? "Piloto").slice(0, 24), table));
        }
        if (body.op === "queue") {
          const peer = String(body.peer ?? "").slice(0, 40);
          if (!peer) return Response.json({ ok: false }, { status: 400 });
          return Response.json(pairOrWait(peer, String(body.name ?? "Piloto").slice(0, 24), Number(body.stake) || 0));
        }
        if (body.op === "unqueue") {
          const peer = String(body.peer ?? "");
          for (let i = queue.length - 1; i >= 0; i--) if (queue[i]!.id === peer) queue.splice(i, 1);
          paired.delete(peer);
          return Response.json({ ok: true });
        }
        const code = cleanCode(body.room);
        const room = roomOf(code);
        if (body.op === "leave") {
          const peer = String(body.peer ?? "");
          room.peers.delete(peer);
          return Response.json({ ok: true });
        }
        if (body.op === "signal") {
          const from = String(body.from ?? "").slice(0, 40);
          const to = String(body.to ?? "").slice(0, 40);
          const kind = body.kind;
          if (!from || !to || (kind !== "offer" && kind !== "answer" && kind !== "ice")) {
            return Response.json({ ok: false }, { status: 400 });
          }
          room.seq += 1;
          room.signals.push({ id: room.seq, from, to, kind, payload: body.payload });
          if (room.signals.length > 240) room.signals.splice(0, room.signals.length - 240);
          return Response.json({ ok: true });
        }
        return Response.json({ ok: false }, { status: 400 });
      },
    },
  },
});
