import { readFile, writeFile, cp } from "node:fs/promises";
// Next emits /guide.html for the clean /guide route. Keep the legacy incoming URL working.
await cp("public/_headers", "out/_headers");
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://cv404.tv/</loc></url><url><loc>https://cv404.tv/guide</loc></url><url><loc>https://cv404.tv/tier</loc></url><url><loc>https://cv404.tv/events</loc></url><url><loc>https://cv404.tv/tokens</loc></url></urlset>\n';
await writeFile("out/sitemap.xml", sitemap.replace("</urlset>", "<url><loc>https://cv404.tv/privacy</loc></url></urlset>"));
// Next's optional .txt payloads must remain available for App Router navigation.
const html = await readFile("out/index.html", "utf8");
if (!html.includes("_next/"))
  throw new Error("Expected a Next.js static export");
console.log("Verified Next.js static export for Cloudflare Workers.");
