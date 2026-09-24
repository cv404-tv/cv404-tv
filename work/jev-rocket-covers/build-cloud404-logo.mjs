import sharp from 'sharp';
import { resolve } from 'node:path';

const source = resolve('work/jev-rocket-covers/source-logo-01.png');
const output = resolve('outputs/jev-rocket-covers/logo-01-aoa.png');

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width;
let top = info.height;
let right = 0;
let bottom = 0;

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const alpha = Math.max(data[i], data[i + 1], data[i + 2]) <= 20 ? 0 : 255;
    data[i + 3] = alpha;
    if (alpha > 0) {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
}

const symbol = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .extract({ left, top, width: right - left, height: bottom - top })
  .resize(190, 140, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const label = Buffer.from(`
  <svg width="390" height="240" xmlns="http://www.w3.org/2000/svg">
    <rect width="390" height="240" fill="#ffffff"/>
    <text x="18" y="148" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="76" font-weight="800" letter-spacing="-4">
      <tspan fill="#111111">云谷</tspan><tspan fill="#cf3731">404</tspan>
    </text>
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
    { input: symbol, left: 82, top: 50 },
    { input: label, left: 292, top: 0 },
  ])
  .png()
  .toFile(output);

console.log(`Wrote ${output}`);
