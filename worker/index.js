import { DurableObject } from "cloudflare:workers";
import { MAX_BOARD_BYTES, normalizeBoard, SHARE_ID } from "../lib/tier-board.js";
import { handleAuth, cleanupAuth } from "./auth.js";

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow", ...headers,
  } });
}

export class TierSnapshot extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), body TEXT NOT NULL)");
  }
  async fetch(request) {
    if (request.method === "POST") {
      const body = await request.text();
      // INSERT only: a published snapshot can never be overwritten.
      this.sql.exec("INSERT INTO snapshot (id, body) VALUES (1, ?)", body);
      return json({ saved: true }, 201);
    }
    const rows = this.sql.exec("SELECT body FROM snapshot WHERE id = 1").toArray();
    return rows.length ? json(JSON.parse(rows[0].body)) : json({ error: "not_found" }, 404);
  }
}

async function readLimited(request) {
  if (Number(request.headers.get("Content-Length")) > MAX_BOARD_BYTES) throw new Error("too_large");
  if (!request.body) throw new Error("invalid_board");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BOARD_BYTES) { await reader.cancel(); throw new Error("too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupAuth(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/") || url.pathname === "/api/account") return handleAuth(request, env);
    if (url.pathname === "/tier-list" || url.pathname === "/tier-list/") {
      url.pathname = "/tier";
      return Response.redirect(url, 308);
    }
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname === "/api/tier-boards") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
      const origin = request.headers.get("Origin");
      if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site")
        return json({ error: "forbidden" }, 403);
      if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json")
        return json({ error: "invalid_content_type" }, 415);
      const { success } = await env.SHARE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") || "local" });
      if (!success) return json({ error: "rate_limited" }, 429, { "Retry-After": "60" });
      let board;
      try {
        board = normalizeBoard(await readLimited(request));
        // Unplaced stickers stay private in the local draft.
        board.stickers = board.stickers.filter((s) => s.zone !== "tray");
        if (!board.stickers.length) return json({ error: "empty_board" }, 400);
      } catch (error) {
        return json({ error: error.message === "too_large" ? "too_large" : "invalid_board" }, error.message === "too_large" ? 413 : 400);
      }
      try {
        const id = crypto.randomUUID();
        const snapshot = env.TIER_SNAPSHOTS.get(env.TIER_SNAPSHOTS.idFromName(id));
        const saved = await snapshot.fetch(new Request("https://snapshot/", {
          method: "POST", body: JSON.stringify({ ...board, createdAt: new Date().toISOString() }),
        }));
        if (!saved.ok) throw new Error("save_failed");
        return json({ id, path: `/tier?share=${id}` }, 201);
      } catch { return json({ error: "unavailable" }, 503); }
    }
    const id = url.pathname.slice("/api/tier-boards/".length);
    if (url.pathname.startsWith("/api/tier-boards/") && SHARE_ID.test(id)) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      try {
        return await env.TIER_SNAPSHOTS.get(env.TIER_SNAPSHOTS.idFromName(id)).fetch("https://snapshot/");
      } catch { return json({ error: "unavailable" }, 503); }
    }
    return json({ error: "not_found" }, 404);
  },
};
