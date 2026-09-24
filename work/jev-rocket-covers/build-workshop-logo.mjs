import sharp from 'sharp';
import { resolve } from 'node:path';

const source = resolve('work/jev-rocket-covers/source-logo-02-symbol.png');
const output = resolve('outputs/jev-rocket-covers/logo-02-hangzhou-ai-workshop.png');

const symbol = await sharp(source)
  .resize(182, 182, { fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer();

const label = Buffer.from(`
  <svg width="430" height="240" xmlns="http://www.w3.org/2000/svg">
    <rect width="430" height="240" fill="#ffffff"/>
    <text x="24" y="104" fill="#111111" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="62" font-weight="800" letter-spacing="-2">杭州AI工坊</text>
    <text x="26" y="169" fill="#333333" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="700" letter-spacing="1.5">AI Builder Lab</text>
  </svg>
`);

await sharp({
  create: {
    width: 720,
    height: 240,
    channels: 4,
    background: '#ffffff',
  },
})
  .composite([
    { input: symbol, left: 95, top: 29 },
    { input: label, left: 290, top: 0 },
  ])
  .png()
  .toFile(output);

console.log(`Wrote ${output}`);
