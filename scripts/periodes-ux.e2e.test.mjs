// Revue UX L3 — Voyage temporel (liste) et fiches de période. Lit frontend/dist ;
// skip sans playwright-core/Chromium.
// R1 — texte d'accent des cartes et de la frise ≥ 4,5:1 (WCAG 1.4.3) : le rouille du Trias
//      pur plafonnait à 4,1:1 sur la carte.
// R2 — le curseur de la frise annonce « N Ma — ère » (aria-valuetext, WCAG 4.1.2) et le met à jour au clavier.
// R3 — la grille d'espèces de la frise a un nom accessible (WCAG 1.3.1).
// R4 — étiquette d'ère contenue dans sa bande à 390 et 320 px (pas de chevauchement entre bandes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// color-mix() ressort de getComputedStyle en « color(srgb r g b) » sur 0–1.
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => (s.startsWith('color(') ? v * 255 : v));
const CARD_BG = [26, 18, 10];

test('R1 — texte d’accent des cartes d’ère et des bandes de la frise ≥ 4,5:1', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
  const items = await page.evaluate(() => [...document.querySelectorAll('.period-meta span, .period-cta span:first-child, .meso-band-label')]
    .map((e) => ({ cls: e.className, color: getComputedStyle(e).color, accent: getComputedStyle(e.closest('[style*="--accent"]')).getPropertyValue('--accent').trim() })));
  assert.equal(items.length, 12);
  for (const it of items) {
    const a = [1, 3, 5].map((i) => parseInt(it.accent.slice(i, i + 2), 16));
    // Fond le plus clair possible : carte + halo radial de 20 % de la couleur d'ère.
    const bg = CARD_BG.map((c, i) => c * 0.8 + a[i] * 0.2);
    assert.ok(ratio(rgb(it.color), bg) >= 4.5, `${it.cls} (${it.accent}) ${ratio(rgb(it.color), bg).toFixed(2)}:1`);
  }
  await context.close();
});

test('R2 — le curseur de la frise annonce « N Ma — ère » et suit le clavier', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
  const cur = page.locator('[data-meso-cursor]');
  assert.equal(await cur.getAttribute('aria-valuetext'), '145 Ma — Jurassique');
  await cur.focus();
  await page.keyboard.press('Home');
  const txt = await cur.getAttribute('aria-valuetext');
  const now = await cur.getAttribute('aria-valuenow');
  assert.match(txt, new RegExp(`^${now} Ma — (Trias|Jurassique|Crétacé)$`));
  assert.notEqual(txt, '145 Ma — Jurassique');
  await context.close();
});

test('R3 — la grille d’espèces de la frise a un nom accessible', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
  const g = page.locator('[data-meso-iconics]');
  assert.equal(await g.getAttribute('role'), 'group');
  assert.match(await g.getAttribute('aria-label'), /espèces/i);
  await context.close();
});

test('R4 — étiquette d’ère contenue dans sa bande à 390 et 320 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [390, 320]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
    const m = await page.evaluate(() => [...document.querySelectorAll('.meso-band')].map((b) => {
      const l = b.querySelector('.meso-band-label');
      const range = document.createRange(); range.selectNodeContents(l);
      return { id: b.dataset.period, band: b.getBoundingClientRect().width, text: range.getBoundingClientRect().width };
    }));
    for (const x of m) assert.ok(x.text <= x.band, `${w}px ${x.id} : texte ${x.text.toFixed(0)} > bande ${x.band.toFixed(0)}`);
    await context.close();
  }
});

test('R5 — lien « ← Voyage temporel » des fiches : cible ≥ 24 px de haut (WCAG 2.5.8), à 1440 et 390 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const id of ['trias', 'jurassique', 'cretace']) {
      await page.goto(`${env.base}/periodes/${id}/`, { waitUntil: 'load' });
      const r = await page.locator('.back-link').evaluate((a) => { const b = a.getBoundingClientRect(); return [b.width, b.height]; });
      assert.ok(r[0] >= 24 && r[1] >= 24, `${w}px ${id} : cible ${r[0].toFixed(0)}×${r[1].toFixed(1)}`);
    }
    await context.close();
  }
});
