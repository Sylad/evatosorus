// Revue UX L27/L28 — accueil : 8 liens secondaires (Nouveautés et Plan de travail ajoutés).
// Bureau (≥ 1024 px) : 4 colonnes × 2 rangées, « Carte paléo-monde » sur une ligne sans
// réduire la police, et l'accueil tient à nouveau dans 1440×900 sans défilement.
// Téléphone : 2 colonnes, inchangé. Lit frontend/dist ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const measure = (page) => page.evaluate(() => {
  const links = [...document.querySelectorAll('.landing-secondary a')];
  const rows = new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size;
  const cols = new Set(links.map((a) => Math.round(a.getBoundingClientRect().left))).size;
  const carte = document.querySelector('.landing-secondary a[href="/carte/"]');
  const r = document.createRange();
  r.selectNodeContents(carte);
  const lines = new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return { n: links.length, rows, cols, lines, font: parseFloat(getComputedStyle(carte).fontSize) / root, scroll: document.documentElement.scrollHeight - innerHeight };
});

test('accueil 1440×900 et 1024×768 : 4 colonnes × 2 rangées, « Carte paléo-monde » sur une ligne, police inchangée ; 1440×900 sans défilement', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const [w, h] of [[1440, 900], [1024, 768]]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/`, { waitUntil: 'load' });
    const m = await measure(page);
    assert.equal(m.n, 8);
    assert.deepEqual([m.cols, m.rows], [4, 2], `${w}px : ${m.cols} colonnes × ${m.rows} rangées`);
    assert.equal(m.lines, 1, `${w}px : « Carte paléo-monde » sur ${m.lines} lignes`);
    assert.ok(m.font >= 0.78 - 1e-6, `${w}px : police réduite (${m.font}rem, 0,78 rem avant)`);
    if (w === 1440) assert.ok(m.scroll <= 0, `1440×900 : ${m.scroll}px de défilement`);
    await context.close();
  }
});

test('accueil téléphone 390 et 320 px : 2 colonnes, inchangé', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [390, 320]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/`, { waitUntil: 'load' });
    const m = await measure(page);
    assert.deepEqual([m.cols, m.rows], [2, 4], `${w}px`);
    await context.close();
  }
});
