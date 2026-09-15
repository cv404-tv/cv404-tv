import assert from "node:assert/strict";
// Run against local Wrangler only; this writes disposable local snapshots.
const origin = process.argv[2] || "http://127.0.0.1:8787";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw new Error("Local preview required");
const board = { version: 1, title: "API test", stickers: [
  { id: "ranked", type: "text", text: "Hello", color: "paper", zone: "s" },
  { id: "private", type: "text", text: "Private tray", color: "paper", zone: "tray" },
] };
const post = (value, extra = {}) => fetch(`${origin}/api/tier-boards`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...extra }, body: JSON.stringify(value) });
const first = await post(board);
assert.equal(first.status, 201, await first.clone().text());
const a = await first.json();
const second = await post(board);
assert.equal(second.status, 201);
const b = await second.json();
assert.notEqual(a.id, b.id);
const read = await fetch(`${origin}/api/tier-boards/${a.id}`);
assert.equal(read.status, 200);
const saved = await read.json();
assert.equal(saved.title, "API test");
assert.deepEqual(saved.stickers.map((s) => s.id), ["ranked"]);
board.title = "Changed draft";
assert.equal((await (await fetch(`${origin}/api/tier-boards/${a.id}`)).json()).title, "API test");
for (const method of ["PUT", "POST", "DELETE"]) assert.equal((await fetch(`${origin}/api/tier-boards/${a.id}`, { method })).status, 405);
assert.equal((await post(board, { Origin: "https://other.example" })).status, 403);
assert.equal((await post({ ...board, stickers: [] })).status, 400);
assert.equal((await post({ ...board, stickers: [{ ...board.stickers[0], type: "image", image: "https://example.com/x.svg" }] })).status, 400);
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0FoAAAAASUVORK5CYII=";
const customLogos = Array.from({ length: 7 }, (_, index) => ({ id: `logo-${index}`, type: "image", text: `Logo ${index}`, color: "paper", zone: "s", image: png }));
assert.equal((await post({ ...board, stickers: customLogos })).status, 400);
assert.equal((await post({ ...board, title: "x".repeat(1_000_001) })).status, 413);
assert.equal((await fetch(`${origin}/api/tier-boards/${crypto.randomUUID()}`)).status, 404);
assert.equal((await fetch(`${origin}${a.path}`)).status, 200);
assert.equal((await fetch(`${origin}/guide`)).status, 200);
assert.equal((await fetch(`${origin}/not-a-real-route`)).status, 404);
const ai = await post({ ...board, stickers: [{ id: "ai", type: "ai", presetId: "claude-v1", text: "Custom name", color: "blue", zone: "a" }] });
assert.equal(ai.status, 201);
const aiId = (await ai.json()).id;
const aiSaved = (await (await fetch(`${origin}/api/tier-boards/${aiId}`)).json()).stickers[0];
assert.equal(aiSaved.text, "Claude");
assert.equal(aiSaved.color, "red");
assert.equal(aiSaved.presetId, "claude-v1");
assert.equal((await post({ ...board, stickers: [{ id: "ai", type: "ai", presetId: "user-model", zone: "a" }] })).status, 400);
console.log("PASS: unique snapshots, anonymous reads, immutable contents, private tray, input and custom-logo limits, origin checks, static routes and system-owned AI stickers.");
