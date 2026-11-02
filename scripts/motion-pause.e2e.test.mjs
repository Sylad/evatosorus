// L16 — Bouton Pause des vidéos automatiques hors accueil (WCAG 2.2.2). Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — chaque page à vidéo automatique (about, films, vitrines, codex, périodes, carte, fiche espèce) porte le bouton Pause, et ses vidéos marquées data-pausable jouent au départ.
// R2 — un clic sur le bouton fige toutes les vidéos de la page (aria-pressed=true) et un second clic les relance.
// R3 — la pause est mémorisée : après rechargement la page repart en pause et le bouton est enfoncé.
// R4 — en prefers-reduced-motion, les vidéos sont figées d'office et le bouton reste masqué (comme l'accueil).
// R5 — le bouton reste une cible d'au moins 44 px (WCAG 2.5.8) à 1440 et 390 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const PAGES = ['about', 'films', 'vitrines', 'codex', 'periodes', 'carte', 'especes/tyrannosaurus-rex'];
const etat = (page) => page.evaluate(() => [...document.querySelectorAll('video[data-pausable]')].map((v) => v.paused));
const attendJoue = (page) => page.waitForFunction(() => {
  const vs = [...document.querySelectorAll('video[data-pausable]')];
  return vs.length > 0 && vs.some((v) => !v.paused);
}, null, { timeout: 15_000 });

async function ouvre(env, chemin, opts = {}) {
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await context.newPage();
  await page.goto(`${env.base}/${chemin}/`, { waitUntil: 'load' });
  return { context, page };
}

test('R1 — chaque page à vidéo automatique a le bouton Pause et des vidéos qui jouent', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t, { args: ['--autoplay-policy=no-user-gesture-required'] });
  if (!env) return;
  for (const p of PAGES) {
    const { context, page } = await ouvre(env, p);
    assert.equal(await page.locator('#evato-motion-toggle').count(), 1, `${p} : un seul bouton Pause`);
    assert.equal(await page.locator('#evato-motion-toggle').isVisible(), true, `${p} : bouton visible`);
    assert.ok((await etat(page)).length > 0, `${p} : vidéos data-pausable attendues`);
    await context.close();
  }
});

test('R2 — le clic fige toutes les vidéos, un second clic les relance', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const p of PAGES) {
    const { context, page } = await ouvre(env, p);
    await attendJoue(page);
    await page.click('#evato-motion-toggle');
    assert.equal(await page.getAttribute('#evato-motion-toggle', 'aria-pressed'), 'true', `${p}`);
    const v = await etat(page);
    assert.ok(v.length > 0 && v.every(Boolean), `${p} : toutes les vidéos figées`);
    await page.click('#evato-motion-toggle');
    assert.equal(await page.getAttribute('#evato-motion-toggle', 'aria-pressed'), 'false', `${p}`);
    await attendJoue(page);
    await context.close();
  }
});

test('R3 — la pause est mémorisée au rechargement', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await ouvre(env, 'films');
  await page.click('#evato-motion-toggle');
  await page.reload({ waitUntil: 'load' });
  assert.equal(await page.getAttribute('#evato-motion-toggle', 'aria-pressed'), 'true');
  await page.waitForTimeout(500);
  const v = await etat(page);
  assert.ok(v.length > 0 && v.every(Boolean), 'vidéos figées après rechargement');
  await context.close();
});

test('R4 — mouvement réduit : vidéos figées, bouton masqué', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const p of PAGES) {
    const { context, page } = await ouvre(env, p, { reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    const v = await etat(page);
    assert.ok(v.length > 0 && v.every(Boolean), `${p} : vidéos figées (${v.length})`);
    assert.equal(await page.locator('#evato-motion-toggle').isVisible(), false, `${p} : bouton masqué`);
    await context.close();
  }
});

test('R5 — le bouton fait au moins 44 px, à 1440 et 390 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390]) {
    for (const p of ['about', 'vitrines']) {
      const context = await env.browser.newContext({ viewport: { width: w, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${env.base}/${p}/`, { waitUntil: 'load' });
      const b = await page.locator('#evato-motion-toggle').boundingBox();
      assert.ok(b && b.width >= 44 && b.height >= 44, `${p} ${w}px : ${JSON.stringify(b)}`);
      await context.close();
    }
  }
});
