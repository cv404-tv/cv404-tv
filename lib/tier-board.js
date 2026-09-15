import { getAiSticker } from "./ai-stickers.js";

export const MAX_STICKERS = 40;
export const MAX_CUSTOM_LOGOS = 6;
export const MAX_BOARD_BYTES = 1_000_000;
export const MAX_IMAGE_LENGTH = 65_000;
export const TIERS = ["s", "a", "b", "c", "d"];
export const COLORS = ["paper", "red", "yellow", "green", "blue", "pink"];
export const SHARE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function emptyBoard() {
  return { version: 1, title: "", stickers: [] };
}

// Used on both sides of the API boundary. Never accept external image URLs or SVG.
export function normalizeBoard(value) {
  if (!value || value.version !== 1 || typeof value.title !== "string" ||
      value.title.length > 80 || !Array.isArray(value.stickers) ||
      value.stickers.length > MAX_STICKERS) throw new Error("invalid_board");
  const ids = new Set();
  let customLogoCount = 0;
  const stickers = value.stickers.map((s) => {
    if (!s || typeof s.id !== "string" || !/^[\w-]{1,64}$/.test(s.id) || ids.has(s.id) ||
        ![...TIERS, "tray"].includes(s.zone)) throw new Error("invalid_sticker");
    ids.add(s.id);
    if (s.type === "ai") {
      const preset = getAiSticker(s.presetId);
      if (!preset) throw new Error("invalid_ai_sticker");
      // Resolve appearance from the server catalog, never from user-supplied fields.
      return { id: s.id, type: "ai", presetId: preset.id, text: preset.text, color: preset.color, zone: s.zone };
    }
    if (
        typeof s.text !== "string" || !s.text.trim() || s.text.length > 30 ||
        !["text", "image"].includes(s.type) || !COLORS.includes(s.color) ||
        ![...TIERS, "tray"].includes(s.zone)) throw new Error("invalid_sticker");
    const clean = { id: s.id, type: s.type, text: s.text.trim(), color: s.color, zone: s.zone };
    if (s.type === "image") {
      customLogoCount += 1;
      if (customLogoCount > MAX_CUSTOM_LOGOS) throw new Error("too_many_custom_logos");
      if (typeof s.image !== "string" || s.image.length > MAX_IMAGE_LENGTH) throw new Error("invalid_image");
      const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(s.image);
      if (!match || match[2].length % 4 !== 0) throw new Error("invalid_image");
      const bytes = atob(match[2]);
      const valid = match[1] === "png" ? bytes.startsWith("\x89PNG\r\n\x1a\n") :
        match[1] === "jpeg" ? bytes.startsWith("\xff\xd8\xff") :
        bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
      if (!valid) throw new Error("invalid_image");
      clean.image = s.image;
    }
    return clean;
  });
  const board = { version: 1, title: value.title.trim(), stickers };
  if (new TextEncoder().encode(JSON.stringify(board)).length > MAX_BOARD_BYTES) throw new Error("too_large");
  return board;
}

export function moveSticker(board, id, zone, beforeId) {
  const sticker = board.stickers.find((s) => s.id === id);
  if (!sticker || ![...TIERS, "tray"].includes(zone) || beforeId === id) return board;
  const stickers = board.stickers.filter((s) => s.id !== id);
  const index = stickers.findIndex((s) => s.id === beforeId && s.zone === zone);
  stickers.splice(index < 0 ? stickers.length : index, 0, { ...sticker, zone });
  return { ...board, stickers };
}
