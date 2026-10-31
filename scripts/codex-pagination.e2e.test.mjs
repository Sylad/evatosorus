// L45 — Pagination du codex. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — les 4 boutons de pagination font au moins 44 px de large ET de haut, à 1440, 390, 360 et 320 px.
// R2 — la pagination ne fait pas défiler la page horizontalement et reste dans la fenêtre, à ces mêmes largeurs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const WIDTHS = [1440, 390, 360, 320];

async function parcourt(t, fn) {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
    await page.waitForSelector('.pagination .page-btn');
    await fn(page, `${w}px`, w);
    await context.close();
  }
}

test('R1 — les boutons de pagination font au moins 44 px de large et de haut', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const boutons = await page.evaluate(() =>
      [...document.querySelectorAll('.pagination .page-btn')].map((b) => {
        const r = b.getBoundingClientRect();
        return { t: b.getAttribute('aria-label'), w: r.width, h: r.height };
      }));
    assert.equal(boutons.length, 4, `${ou} : 4 boutons attendus`);
    for (const b of boutons) {
      assert.ok(b.w >= 44, `${ou} : « ${b.t} » fait ${b.w} px de large`);
      assert.ok(b.h >= 44, `${ou} : « ${b.t} » fait ${b.h} px de haut`);
    }
  });
});

test('R2 — la pagination reste dans la fenêtre, sans défilement horizontal', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou, w) => {
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth,
      hors: [...document.querySelectorAll('.pagination > *')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > document.documentElement.clientWidth; }).length,
    }));
    assert.ok(m.sw <= m.vw, `${ou} : ${m.sw} > ${m.vw}`);
    assert.equal(m.hors, 0, `${ou} : éléments de pagination hors fenêtre`);
  });
});
