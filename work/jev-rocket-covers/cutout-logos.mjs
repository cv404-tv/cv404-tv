import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('outputs/jev-rocket-covers');
await mkdir(output, { recursive: true });

const sources = [
  { input: resolve('work/jev-rocket-covers/source-logo-01.png'), name: 'logo-01-aoa.png', background: 'black' },
  { input: resolve('work/jev-rocket-covers/source-logo-02.png'), name: 'logo-02-hangzhou-ai-workshop.png', background: 'white' },
  { input: resolve('work/jev-rocket-covers/source-logo-03.png'), name: 'logo-03-your-space.png', background: 'white' },
];

for (const source of sources) {
  const { data, info } = await sharp(source.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let alpha;
      if (source.background === 'black') {
        alpha = Math.max(r, g, b) <= 8 ? 0 : 255;
      } else {
        const matte = Math.min(r, g, b);
        alpha = 255 - matte;
        if (alpha > 0) {
          data[i] = Math.max(0, Math.min(255, Math.round((r - matte) * 255 / alpha)));
          data[i + 1] = Math.max(0, Math.min(255, Math.round((g - matte) * 255 / alpha)));
          data[i + 2] = Math.max(0, Math.min(255, Math.round((b - matte) * 255 / alpha)));
        }
      }
      data[i + 3] = alpha;
      if (alpha > 0) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
    }
  }

  const padding = 12;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(info.width, right + padding); bottom = Math.min(info.height, bottom + padding);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toFile(resolve(output, source.name));
}

console.log('Wrote 3 cropped RGBA logo PNGs in source order.');
