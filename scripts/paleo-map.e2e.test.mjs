// L24 — carte paléo-monde : fond de carte réellement servi (CARTO répondait la tuile
// « API KEY REQUIRED » sur les 4 sous-domaines, constaté le 2026-10-05) et clusters
// stylés (les règles `:global(...)` d'un <style> React sont du CSS invalide : les
// clusters s'affichaient en chiffres nus).
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, gradientStops, labelColor } from '../frontend/src/data/label-color.mjs';
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
  // Attribution = copyrightText du service Esri ; ODbL impose « © OpenStreetMap contributors ».
  const attribution = await page.locator('.leaflet-control-attribution').innerText();
  assert.match(attribution, /OpenStreetMap/);
  assert.match(attribution, /Esri/);
  assert.match(attribution, /HERE/);
  assert.match(attribution, /Garmin/);
  assert.equal(await page.locator('.leaflet-control-attribution a[href="https://www.openstreetmap.org/copyright"]').count(), 1);
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

  // Contraste du chiffre rendu (≥ 4,5:1, 1.4.3) : éléments réels, puis une étiquette par
  // période de periods.ts (couleur de texte rendue lue dans le DOM, fond = couleur + dégradé).
  const periods = [...readFileSync(new URL('../frontend/src/data/periods.ts', import.meta.url), 'utf8')
    .matchAll(/accentColor:\s*'(#[0-9a-f]{6})'/gi)].map((m) => m[1]);
  assert.equal(periods.length, 3);
  const rendered = await page.evaluate((cols) => {
    const out = [];
    const read = (el, sel) => {
      const span = el.querySelector(sel) ?? el;
      return { c: getComputedStyle(el).getPropertyValue('--c').trim(), fg: getComputedStyle(span).color };
    };
    document.querySelectorAll('.evato-cluster').forEach((el) => out.push(read(el, 'span')));
    document.querySelectorAll('.evato-pin').forEach((el) => { if (el.querySelector('.evato-pin-count')) out.push(read(el, '.evato-pin-count')); });
    return out;
  }, periods);
  const all = [...rendered];
  for (const [i, hex] of periods.entries()) {
    // Étiquette de test : mêmes classes et même construction que PaleoMap (--c, --fg).
    await page.evaluate(([h, fg, n]) => {
      const d = document.createElement('div');
      d.className = 'evato-cluster'; d.id = `t${n}`;
      d.style.cssText = `--c:${h}; --fg:${fg}; position:fixed; top:0; left:${n * 50}px;`;
      d.innerHTML = '<span>2</span>';
      document.body.appendChild(d);
    }, [hex, labelColor(hex), i]);
    all.push(await page.evaluate((n) => {
      const el = document.getElementById(`t${n}`);
      return { c: getComputedStyle(el).getPropertyValue('--c').trim(), fg: getComputedStyle(el.querySelector('span')).color };
    }, i));
  }
  for (const { c, fg } of all) {
    const rgb = fg.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    for (const bg of gradientStops(c)) {
      assert.ok(contrastRatio(rgb, bg) >= 4.5, `${c} / ${fg} : ${contrastRatio(rgb, bg).toFixed(2)}:1`);
    }
  }
  await context.close();
});
