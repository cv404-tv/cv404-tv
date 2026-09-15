import test from "node:test";
import assert from "node:assert/strict";
import { emptyBoard, normalizeBoard, moveSticker, MAX_STICKERS, MAX_CUSTOM_LOGOS } from "../lib/tier-board.js";

const sticker = (id, zone = "tray") => ({ id, zone, type: "text", text: "Coffee", color: "yellow" });
const board = (stickers) => ({ ...emptyBoard(), title: "My ranking", stickers });

test("AI sticker identity and style are resolved from the system catalog", () => {
  const result = normalizeBoard(board([{ ...sticker("ai"), type: "ai", presetId: "deepseek-v1", text: "Renamed by user", color: "red", image: "https://example.com/fake.png" }]));
  assert.deepEqual(result.stickers[0], { id: "ai", type: "ai", presetId: "deepseek-v1", text: "DeepSeek", color: "blue", zone: "tray" });
  assert.throws(() => normalizeBoard(board([{ ...sticker("ai"), type: "ai", presetId: "user-created" }])));
});

test("normalization whitelists fields and treats user text as data", () => {
  const result = normalizeBoard({ ...board([{ ...sticker("one"), text: " <script>alert(1)</script> " }]), admin: true });
  assert.equal(result.admin, undefined);
  assert.equal(result.stickers[0].text, "<script>alert(1)</script>");
});
test("rejects duplicate IDs, invalid tiers, oversized titles and too many stickers", () => {
  assert.throws(() => normalizeBoard(board([sticker("x"), sticker("x")])));
  assert.throws(() => normalizeBoard(board([sticker("x", "unknown")])));
  assert.throws(() => normalizeBoard({ ...emptyBoard(), title: "x".repeat(81) }));
  assert.throws(() => normalizeBoard(board(Array.from({ length: MAX_STICKERS + 1 }, (_, i) => sticker(String(i))))));
});
test("accepts raster image data, rejects external URLs, SVG and forged MIME", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0FoAAAAASUVORK5CYII=";
  const input = { ...sticker("logo"), type: "image", image: png };
  assert.equal(normalizeBoard(board([input])).stickers[0].image, png);
  for (const image of ["https://example.com/logo.png", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "data:image/png;base64,PHN2Zz48L3N2Zz4="]) {
    assert.throws(() => normalizeBoard(board([{ ...input, image }])));
  }
});
test("accepts at most six custom logos", () => {
  const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0FoAAAAASUVORK5CYII=";
  const logos = Array.from({ length: MAX_CUSTOM_LOGOS }, (_, index) => ({ ...sticker(`logo-${index}`), type: "image", image }));
  assert.equal(normalizeBoard(board(logos)).stickers.length, MAX_CUSTOM_LOGOS);
  assert.throws(() => normalizeBoard(board([...logos, { ...sticker("logo-over"), type: "image", image }])), /too_many_custom_logos/);
});
test("moves and reorders stickers without mutating the draft", () => {
  const initial = board([sticker("one", "s"), sticker("two", "s"), sticker("three")]);
  const moved = moveSticker(initial, "three", "s", "two");
  assert.deepEqual(moved.stickers.map((s) => s.id), ["one", "three", "two"]);
  assert.equal(initial.stickers[2].zone, "tray");
  const returned = moveSticker(moved, "three", "tray");
  assert.equal(returned.stickers.at(-1).zone, "tray");
  assert.equal(moveSticker(initial, "one", "invalid"), initial);
});

test("official logos leave the picker on ranking and return in catalog order without losing identity", async () => {
  const { availableLogoStickers, LOGO_STICKERS } = await import("../lib/ai-stickers.js");
  const initial = normalizeBoard(board([
    { id: "brand", type: "ai", presetId: "yungu404-v1", zone: "tray" },
    { id: "kimi", type: "ai", presetId: "kimi-v1", zone: "b" },
  ]));
  const ranked = moveSticker(initial, "brand", "s");
  assert.ok(!availableLogoStickers(ranked.stickers).some((p) => ["yungu404-v1", "kimi-v1"].includes(p.id)));
  const returned = moveSticker(ranked, "brand", "tray");
  assert.deepEqual(availableLogoStickers(returned.stickers).map((p) => p.id), LOGO_STICKERS.filter((p) => p.id !== "kimi-v1").map((p) => p.id));
  assert.equal(returned.stickers.length, initial.stickers.length);
  assert.deepEqual(returned.stickers.find((s) => s.id === "brand"), initial.stickers[0]);
  assert.equal(availableLogoStickers(moveSticker(returned, "brand", "a").stickers).some((p) => p.id === "yungu404-v1"), false);
});

test("old retired logos return to the official picker while custom image data survives a round trip", async () => {
  const { availableLogoStickers } = await import("../lib/ai-stickers.js");
  const image = { ...sticker("custom"), type: "image", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0FoAAAAASUVORK5CYII=" };
  const initial = normalizeBoard(board([image, { id: "legacy", type: "ai", presetId: "llama-v1", zone: "s" }]));
  assert.ok(!availableLogoStickers(initial.stickers).some((p) => p.id === "llama-v1"));
  const returned = moveSticker(moveSticker(moveSticker(initial, "custom", "a"), "custom", "tray"), "legacy", "tray");
  assert.equal(availableLogoStickers(returned.stickers).filter((p) => p.id === "llama-v1").length, 1);
  assert.ok(!availableLogoStickers([]).some((p) => p.id === "llama-v1"));
  assert.deepEqual(returned.stickers.filter((s) => s.type !== "ai" && s.zone === "tray"), [image]);
});
