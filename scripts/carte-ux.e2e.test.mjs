// L10 — revue UX de la carte paléo-monde (/carte/), à 1440 et 390 px.
// Mesuré avant correction : légende Trias à 3,8:1 (texte #c75131, 1.4.3) ; repères
// focalisables sans nom (role=button, nom = « 2 » ou vide, 4.1.2) ; boutons
// « Zoom in / Zoom out » et « Close popup » en anglais ; Échap sans effet quand le
// focus est sur un repère ; légende en « sites » (couples espèce × lieu) alors que la
// carte compte autre chose ; au téléphone, Amériques et Asie hors champ à l'ouverture.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

// Tuile PNG 1×1 : la page ne dépend pas du réseau.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function open(env, width, height) {
  const context = await env.browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await page.goto(`${env.base}/carte/`, { waitUntil: 'load' });
  await page.waitForSelector('.evato-cluster, .evato-pin');
  await page.waitForTimeout(500);
  return { context, page };
}

// Espèces distinctes par période, lues dans les props de l'îlot (même source que la carte).
async function speciesByPeriod(page) {
  return page.evaluate(() => {
    const island = [...document.querySelectorAll('astro-island')].find((i) => i.getAttribute('props')?.includes('speciesId'));
    const rev = (v) => (Array.isArray(v) ? (v[0] === 1 ? v[1].map(rev) : rev(v[1])) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rev(x)])) : v);
    const { markers } = rev(JSON.parse(island.getAttribute('props')));
    const out = {};
    for (const m of markers) (out[m.periodId] ??= new Set()).add(m.speciesId);
    return Object.fromEntries(Object.entries(out).map(([k, s]) => [k, s.size]));
  });
}

test('carte : légende lisible (≥ 4,5:1) et en espèces distinctes, comme les chiffres de la carte', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await open(env, 1440, 900);
  const items = page.locator('.legend-item');
  assert.equal(await items.count(), 3);
  for (let i = 0; i < 3; i++) {
    const sel = `.legend-item:nth-child(${i + 1})`;
    await page.locator(sel).scrollIntoViewIfNeeded();
    const { worst, glyphs } = await worstPixelContrast(page, sel, { edges: true });
    assert.ok(glyphs > 50, `${sel} : texte non mesuré`);
    assert.ok(worst >= 4.5, `${sel} : ${worst.toFixed(2)}:1`);
  }
  const counts = await speciesByPeriod(page);
  const texts = await items.allInnerTexts();
  for (const [name, id] of [['Trias', 'trias'], ['Jurassique', 'jurassique'], ['Crétacé', 'cretace']]) {
    const txt = texts.find((x) => x.toLowerCase().startsWith(name.toLowerCase()));
    assert.ok(txt, `${name} absent de la légende`);
    assert.match(txt, new RegExp(`${counts[id]} espèces?$`, 'i'), txt);
  }
  // La pastille de la légende a la couleur de période des repères (une seule source : periods.ts).
  const swatches = await page.$$eval('.legend-item', (els) => els.map((el) => getComputedStyle(el).getPropertyValue('--c').trim()));
  const pins = await page.$$eval('.evato-pin, .evato-cluster', (els) => [...new Set(els.map((el) => getComputedStyle(el).getPropertyValue('--c').trim()))]);
  for (const c of pins) assert.ok(swatches.includes(c), `couleur ${c} de la carte absente de la légende`);
  await context.close();
});

test('carte : repères nommés, chiffres en espèces, contrôles en français, Échap referme la fiche', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await open(env, 1440, 900);
  const icons = await page.$$eval('.leaflet-marker-icon', (els) => els.map((el) => ({
    role: el.getAttribute('role'),
    shown: el.querySelector('[aria-hidden="true"]')?.textContent.trim() ?? '',
    name: el.querySelector('.evato-sr')?.textContent.trim() ?? '',
  })));
  assert.ok(icons.length > 0);
  for (const i of icons) {
    assert.equal(i.role, 'button');
    assert.ok(i.name.length >= 10, `repère sans nom accessible (« ${i.name} »)`);
    // Le chiffre affiché est celui que donne le nom : N espèces.
    if (i.shown) assert.match(i.name, new RegExp(`\\b${i.shown} espèces\\b`), i.name);
  }
  assert.equal(await page.getAttribute('.leaflet-control-zoom-in', 'aria-label'), 'Zoomer');
  assert.equal(await page.getAttribute('.leaflet-control-zoom-out', 'aria-label'), 'Dézoomer');
  assert.match(await page.getAttribute('.paleo-map', 'aria-label'), /Carte des sites fossiles/);

  // Fiche ouverte au clavier depuis un repère simple, puis Échap : fermée, focus rendu au repère.
  const pin = page.locator('.evato-pin-wrap').first();
  await pin.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('.leaflet-popup');
  assert.equal(await page.getAttribute('.leaflet-popup-close-button', 'aria-label'), 'Fermer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.leaflet-popup').count(), 0, 'Échap ne ferme pas la fiche');
  assert.ok(await pin.evaluate((el) => el === document.activeElement), 'le focus ne revient pas au repère');
  await context.close();
});

test('carte au téléphone (390 px) : tous les repères dans le cadre à l’ouverture', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await open(env, 390, 844);
  const { inside, outside } = await page.evaluate(() => {
    const map = document.querySelector('.paleo-map').getBoundingClientRect();
    const res = { inside: 0, outside: [] };
    for (const el of document.querySelectorAll('.leaflet-marker-icon')) {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2; const cy = b.top + b.height / 2;
      if (cx >= map.left && cx <= map.right && cy >= map.top && cy <= map.bottom) res.inside++;
      else res.outside.push(el.textContent.trim());
    }
    return res;
  });
  assert.deepEqual(outside, [], `repères hors cadre : ${outside.join(' | ')}`);
  assert.ok(inside >= 4, `${inside} repères seulement`);
  await context.close();
});
