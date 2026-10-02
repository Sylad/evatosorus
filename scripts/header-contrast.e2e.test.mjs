// L13 (revue UX) — WCAG 1.4.3 : sur-titre et chapeau des pages Nouveautés et À propos,
// posés sur l'image de fond animée (.codex-bg, scale 1,04 ↔ 1,10), mesurés au PIRE PIXEL
// sous les glyphes, fond figé aux deux bornes de l'animation, à 1440 et 390 px.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

const CASES = [
  ['/nouveautes/', '.news .codex-eyebrow'],
  ['/nouveautes/', '.news .lede'],
  ['/about/', '.about .codex-eyebrow'],
  ['/about/', '.about .lede'],
  ['/plan-de-travail/', '.plan .codex-eyebrow'],
  ['/plan-de-travail/', '.plan .lede'],
];

test('sur-titre et chapeau ≥ 4,5:1 au pire pixel du fond (1440/390 px, scale 1,04, 1,07 et 1,10)', { timeout: 180_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const report = [];
  const failures = [];
  for (const width of [1440, 390]) {
    const context = await env.browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const scale of [1.04, 1.07, 1.1]) {
      for (const [path, sel] of CASES) {
        await page.goto(env.base + path, { waitUntil: 'load' });
        await page.addStyleTag({ content: `.codex-bg { animation: none !important; transform: scale(${scale}) !important; }` });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const { worst, glyphs } = await worstPixelContrast(page, sel);
        const where = `${path} ${sel} @${width}px scale ${scale}`;
        report.push(`${where} : ${worst.toFixed(2)}:1 (${glyphs} px)`);
        assert.ok(glyphs > 20, `${where} : glyphes non détectés`);
        if (worst < 4.5) failures.push(`${where} : ${worst.toFixed(2)}:1`);
      }
    }
    await context.close();
  }
  for (const line of report) t.diagnostic(line);
  assert.deepEqual(failures, []);
});
