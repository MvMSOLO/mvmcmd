import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql, type Sql } from "@/lib/db";

const MAX_ROOM = 128;
const MAX_PEER = 128;
const MAX_NAME = 80;
const MAX_SIGNAL_BYTES = 64 * 1024;
const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 120;

type SignalKind = "offer" | "answer" | "ice";

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME) : "";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 32 && value.length <= 256;
}

async function cleanup(sql: Sql): Promise<void> {
  await sql.query(
    "delete from rtc_peers where touched_at < now() - ($1::text || ' seconds')::interval",
    [PEER_TTL_SECONDS],
  );
  await sql.query(
    "delete from rtc_signals where created_at < now() - ($1::text || ' seconds')::interval",
    [SIGNAL_TTL_SECONDS],
  );
}

async function touchPeer(
  sql: Sql,
  room: string,
  peer: string,
  token: string,
  name: string,
): Promise<void> {
  await sql.query(
    "insert into rtc_peers (room, peer_id, session_token_hash, name, touched_at) values ($1, $2, $3, $4, now()) " +
      "on conflict (room, peer_id) do update set session_token_hash = excluded.session_token_hash, " +
      "name = excluded.name, touched_at = now()",
    [room, peer, hashToken(token), name],
  );
}

export const Route = createFileRoute("/api/rtc")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const room = cleanString(url.searchParams.get("room"), MAX_ROOM);
        const peer = cleanString(url.searchParams.get("peer"), MAX_PEER);
        const name = cleanName(url.searchParams.get("name"));
        const token = url.searchParams.get("token") ?? "";
        const sinceRaw = url.searchParams.get("since") ?? "0";
        const since = Number(sinceRaw);

        if (!room || !peer || !validToken(token) || !Number.isSafeInteger(since) || since < 0) {
          return json(400, { error: "INVALID_REQUEST" });
        }

        const sql = await getSql();
        await touchPeer(sql, room, peer, token, name);
        await cleanup(sql);

        const peers = await sql.query<{ id: string; name: string }>(
          "select peer_id as id, name from rtc_peers where room = $1 order by peer_id",
          [room],
        );
        const signals = await sql.query<{ id: number; from: string; kind: SignalKind; payload: unknown }>(
          'select id, from_peer as "from", kind, payload from rtc_signals ' +
            "where room = $1 and to_peer = $2 and id > $3 order by id limit 100",
          [room, peer, since],
        );

        return Response.json({ peers, signals });
      },

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json(400, { error: "INVALID_JSON" });
        }

        const op = cleanString(body.op, 16);
        const room = cleanString(body.room, MAX_ROOM);
        const peer = cleanString(body.peer ?? body.from, MAX_PEER);
        const token = body.token;

        if (!op || !room || !peer || !validToken(token)) {
          return json(400, { error: "INVALID_REQUEST" });
        }

        const sql = await getSql();
        await cleanup(sql);

        if (op === "leave") {
          await sql.query(
            "delete from rtc_peers where room = $1 and peer_id = $2 and session_token_hash = $3",
            [room, peer, hashToken(token as string)],
          );
          await sql.query(
            "delete from rtc_signals where room = $1 and (from_peer = $2 or to_peer = $2)",
            [room, peer],
          );
          return Response.json({ ok: true });
        }

        if (op !== "signal") {
          return json(400, { error: "UNKNOWN_OPERATION" });
        }

        const to = cleanString(body.to, MAX_PEER);
        const kind = body.kind;
        if (!to || (kind !== "offer" && kind !== "answer" && kind !== "ice")) {
          return json(400, { error: "INVALID_SIGNAL" });
        }

        let serialized: string;
        try {
          serialized = JSON.stringify(body.payload);
        } catch {
          return json(400, { error: "INVALID_PAYLOAD" });
        }
        if (serialized.length > MAX_SIGNAL_BYTES) {
          return json(413, { error: "SIGNAL_TOO_LARGE" });
        }

        const sender = await sql.query<{ session_token_hash: string }>(
          "select session_token_hash from rtc_peers where room = $1 and peer_id = $2",
          [room, peer],
        );
        if (sender.length === 0 || sender[0]?.session_token_hash !== hashToken(token as string)) {
          return json(403, { error: "UNAUTHORIZED_PEER" });
        }

        const target = await sql.query<{ peer_id: string }>(
          "select peer_id from rtc_peers where room = $1 and peer_id = $2",
          [room, to],
        );
        if (target.length === 0) {
          return json(404, { error: "TARGET_PEER_NOT_FOUND" });
        }

        await sql.query(
          "insert into rtc_signals (room, from_peer, to_peer, kind, payload) values ($1, $2, $3, $4, $5::jsonb)",
          [room, peer, to, kind, serialized],
        );
        return Response.json({ ok: true });
      },
    },
  },
});
