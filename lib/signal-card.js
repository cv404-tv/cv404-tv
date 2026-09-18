import { ISSUE, scoreGame } from "./signal-game";

export async function createSignalCard(game, copy, locale, origin) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
  ctx.fillStyle = "#f2ebdd";
  ctx.fillRect(0, 0, 1080, 1440);
  const text = (value, x, y, size, color = "#22272a", weight = 500, family = sans) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillText(value, x, y);
  };
  text(locale === "zh" ? "云谷404" : "CLOUD VALLEY 404", 76, 110, 36, "#22272a", 700);
  text(`SIGNAL SEARCH / VOL.${ISSUE}`, 76, 160, 20, "#64685f", 500, mono);
  ctx.fillStyle = "#22272a";
  ctx.fillRect(76, 203, 928, 2);
  text("404", 64, 445, 250, "#c83832", 800, mono);
  text("→ FOUND", 76, 560, 105, "#22272a", 800, mono);
  text(copy.won, 76, 650, locale === "zh" ? 46 : 43, "#22272a", 700);
  // A waveform, sampled from a clean signal, echoes the in-game receiver.
  ctx.strokeStyle = "#c83832";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 76; x <= 1004; x++) {
    const envelope = Math.sin((x - 76) / 928 * Math.PI);
    const y = 747 + Math.sin(x / 17) * envelope * 45;
    if (x === 76) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  text(copy.score.toUpperCase(), 76, 873, 20, "#64685f");
  text(String(scoreGame(game)).padStart(4, "0"), 70, 974, 95, "#22272a", 700, mono);
  text(copy.time.toUpperCase(), 620, 873, 20, "#64685f");
  text(`${game.elapsed.toFixed(1)} s`, 614, 974, 75, "#22272a", 700, mono);
  ["BUILD", "MEET", "MAKE"].forEach((word, i) => {
    const x = 76 + i * 318;
    ctx.fillStyle = "#22272a";
    ctx.fillRect(x, 1040, 292, 126);
    text(`0${i + 1} / FOUND`, x + 20, 1076, 16, "#d0c8b9", 500, mono);
    text(word, x + 20, 1136, 38, "#f2ebdd", 700, mono);
  });
  text(copy.allFound, 76, 1240, 28);
  const url = `${origin}/`;
  ctx.font = `500 24px ${mono}`;
  const urlSize = Math.min(24, 24 * 928 / Math.max(1, ctx.measureText(url).width));
  text(url, 76, 1320, urlSize, "#c83832", 500, mono);
  text("GOOD IDEAS ON AIR.", 76, 1367, 17, "#64685f", 500, mono);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed")), "image/png"));
}
