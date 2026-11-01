// L47 — Aucune <img> sans src sur /codex/. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — à 1440, 390 et 320 px, toute <img> de /codex/ porte un src non vide (la visionneuse n'en garde pas une vide au repos).
// R2 — la visionneuse crée son <img> à l'ouverture et la retire à la fermeture : jamais d'<img> sans src, ouverte ou refermée.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const sansSrc = (page) => page.evaluate(() =>
  [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('src')).map((i) => i.className || i.outerHTML));

test('R1 — aucune <img> sans src sur /codex/ à 1440, 390 et 320 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390, 320]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
    await page.waitForSelector('.species-card img');
    assert.deepEqual(await sansSrc(page), [], `${w}px : <img> sans src`);
    await context.close();
  }
});

test('R2 — la visionneuse ouverte puis refermée ne laisse aucune <img> sans src', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${env.base}/especes/tyrannosaurus-rex/`, { waitUntil: 'load' });
  await page.locator('[data-lightbox] img').first().click();
  await page.waitForFunction(() => document.getElementById('evato-lightbox').hasAttribute('open'));
  const ouverte = await page.evaluate(() => {
    const i = document.querySelector('#evato-lightbox img');
    return i ? i.getAttribute('src') : null;
  });
  assert.ok(ouverte, 'visionneuse ouverte sans image');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('evato-lightbox').hasAttribute('open'));
  assert.deepEqual(await sansSrc(page), [], 'visionneuse refermée : <img> sans src');
  await context.close();
});

test('R3 — expectations.md décrit /codex/ : pagination à 4 boutons de 44×44 px, indicateur, aucune image sans src', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../docs/qa/expectations.md', import.meta.url), 'utf8');
  const b = md.split(/^## /m).slice(1).find((x) => x.split('\n')[0].trim() === '/codex/') ?? '';
  assert.match(b, /^- shows: /m, 'sans ligne shows:');
  for (const motif of [/4 boutons/, /44×44/, /\.page-indicator/, /\.pagination/, /sans `src`/, /codex-pagination\.e2e\.test\.mjs/]) {
    assert.match(b, motif, `« ## /codex/ » ne contient pas ${motif}`);
  }
});
