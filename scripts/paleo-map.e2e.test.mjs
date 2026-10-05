// L24 — carte paléo-monde : fond de carte réellement servi (CARTO répondait la tuile
// « API KEY REQUIRED » sur les 4 sous-domaines, constaté le 2026-10-05) et clusters
// stylés (les règles `:global(...)` d'un <style> React sont du CSS invalide : les
// clusters s'affichaient en chiffres nus).
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupBrowser } from './lib/e2e-dist.mjs';

const SOURCE = readFileSync(new URL('../frontend/src/components/PaleoMap.tsx', import.meta.url), 'utf8');

test('PaleoMap : plus de fond CARTO, ni de sélecteur :global dans le <style> React', () => {
  assert.doesNotMatch(SOURCE, /cartocdn|carto\.com/i);
  assert.doesNotMatch(SOURCE, /:global\(/);
});

// Tuile PNG 1×1 : la page ne dépend pas du réseau.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('carte : tuiles demandées chez un fournisseur sans clé, clusters et pins stylés', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const tiles = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
    tiles.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
  await page.goto(`${env.base}/carte/`, { waitUntil: 'load' });
  await page.waitForSelector('.evato-cluster, .evato-pin');
  await page.waitForTimeout(500);
  assert.ok(tiles.length > 0, 'aucune tuile demandée');
  for (const u of tiles) assert.doesNotMatch(u, /cartocdn/, u);
  assert.ok(tiles.every((u) => /arcgisonline\.com\/ArcGIS\/rest\/services\/Canvas\/World_Dark_Gray_Base\/MapServer\/tile\/\d+\/\d+\/\d+$/.test(u)), tiles.join('\n'));

  const cluster = await page.evaluate(() => {
    const el = document.querySelector('.evato-cluster');
    if (!el) return null;
    const s = getComputedStyle(el);
    return { w: el.getBoundingClientRect().width, radius: s.borderTopLeftRadius, bg: s.backgroundImage };
  });
  assert.ok(cluster, 'aucun cluster à ce niveau de zoom');
  assert.equal(Math.round(cluster.w), 40);
  assert.notEqual(cluster.radius, '0px');
  assert.match(cluster.bg, /gradient/);
  await context.close();
});
