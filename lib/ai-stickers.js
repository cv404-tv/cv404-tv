// System-owned catalog. Keep published IDs, names and colors stable.
// Logos are trusted local display assets, never accepted from user input.
// The persisted type remains "ai" so existing drafts and shares keep working.
export const LOGO_STICKERS = Object.freeze([
  { id: "yungu404-v1", text: "云谷404", color: "paper", logoSrc: "/assets/brand-header.svg" },
  { id: "deepseek-v1", text: "DeepSeek", color: "blue", logo: "deepseek-color" },
  { id: "qwen-v1", text: "千问 Qwen", color: "pink", logo: "qwen-color" },
  { id: "doubao-v1", text: "豆包", color: "blue", logo: "doubao-color" },
  { id: "glm-v1", text: "智谱 GLM", color: "paper", logo: "zhipu-color" },
  { id: "claude-v1", text: "Claude", color: "red", logo: "claude-color" },
  { id: "chatgpt-v1", text: "ChatGPT", color: "green", logo: "openai" },
  { id: "gemini-v1", text: "Gemini", color: "blue", logo: "gemini-color" },
  { id: "grok-v1", text: "Grok", color: "paper", logo: "grok" },
  { id: "kimi-v1", text: "Kimi", color: "green", logo: "kimi-color" },
  { id: "minimax-v1", text: "MiniMax", color: "pink", logo: "minimax-color" },
  { id: "ernie-v1", text: "文心一言", color: "blue", logo: "wenxin-color" },
  { id: "hunyuan-v1", text: "腾讯混元", color: "green", logo: "hunyuan-color" },
  { id: "spark-v1", text: "讯飞星火", color: "red", logo: "spark-color" },
  { id: "mistral-v1", text: "Mistral", color: "yellow", logo: "mistral-color" },
].map(Object.freeze));

// Removed from the picker; still decode existing drafts and published snapshots.
const RETIRED_STICKERS = Object.freeze([
  { id: "llama-v1", text: "Llama", color: "blue" },
  { id: "gemma-v1", text: "Gemma", color: "pink" },
].map(Object.freeze));

export function getAiSticker(id) {
  return LOGO_STICKERS.find((sticker) => sticker.id === id) || RETIRED_STICKERS.find((sticker) => sticker.id === id);
}

// Ranked presets leave the picker. Retired presets remain recoverable in old drafts.
export function availableLogoStickers(stickers) {
  const owned = new Set(stickers.filter((s) => s.type === "ai").map((s) => s.presetId));
  const ranked = new Set(stickers.filter((s) => s.type === "ai" && s.zone !== "tray").map((s) => s.presetId));
  return [...LOGO_STICKERS, ...RETIRED_STICKERS.filter((preset) => owned.has(preset.id))]
    .filter((preset) => !ranked.has(preset.id));
}
