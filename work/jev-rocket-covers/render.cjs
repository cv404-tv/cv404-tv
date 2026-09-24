const { chromium } = require('/Users/ailln/Workspace/work/git-vervn/franchisee-system/node_modules/playwright');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

const output = resolve(__dirname, '../../outputs/jev-rocket-covers');

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const errors = [];
    const requested = process.argv[2] ? String(Number(process.argv[2])).padStart(2, '0') : null;
    const outputIds = requested ? [requested] : ['02', '04'];
    for (const outputId of outputIds) {
      const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(resolve(output, 'index.html')).href);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(activeOutput => {
        document.querySelector('.preview-heading').remove();
        document.querySelector('.gallery').style.cssText = 'display:block;width:1080px;max-width:none;padding:0;margin:0';
        document.querySelectorAll('.preview').forEach(item => { if (item.dataset.output !== activeOutput) item.remove(); });
        const frame = document.querySelector('.frame');
        frame.style.cssText = 'width:1080px;height:1920px;box-shadow:none';
        frame.querySelector('.poster').style.transform = 'none';
        document.body.style.margin = '0';
      }, outputId);
      const poster = page.locator('.poster');
      const check = await poster.evaluate(element => {
        const image = element.querySelector('.background');
        const logos = [...element.querySelectorAll('.organizer-card img, .registration-qr img')];
        const panel = element.querySelector('.bottom-panel');
        const panelRect = panel.getBoundingClientRect();
        const children = [...panel.children].map(child => ({ text: child.textContent.slice(0, 20), bottom: child.getBoundingClientRect().bottom }));
        const overflow = [...element.querySelectorAll('h2, .theme, .pitch, .directions, .audience, .signup, footer')]
          .filter(node => node.scrollWidth > node.clientWidth + 2)
          .map(node => node.textContent.slice(0, 30));
        return { width: element.clientWidth, height: element.clientHeight, image: image.complete && image.naturalWidth > 0, logos: logos.every(logo => logo.complete && logo.naturalWidth > 0), panelBottom: panelRect.bottom, lastChildBottom: children.at(-1).bottom, overflow };
      });
      assert.equal(check.width, 1080);
      assert.equal(check.height, 1920);
      assert(check.image && check.logos, `poster ${outputId}: image missing`);
      assert.deepEqual(check.overflow, [], `poster ${outputId}: text overflow`);
      assert(check.lastChildBottom <= check.panelBottom - 20, `poster ${outputId}: bottom panel clipped`);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: resolve(output, `poster-${outputId}.png`), animations: 'disabled' });
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${outputIds.length} poster(s) at 1080×1920; background, organizer logos, and registration QR loaded; no text overflow or clipped footer.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
