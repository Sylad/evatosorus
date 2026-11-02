// L16 — Bouton Pause des vidéos automatiques hors accueil (WCAG 2.2.2). Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — chaque page à vidéo automatique (about, films, vitrines, codex, périodes, carte, fiche espèce) porte le bouton Pause, et ses vidéos marquées data-pausable jouent au départ.
// R2 — un clic sur le bouton fige toutes les vidéos de la page (aria-pressed=true) et un second clic les relance.
// R3 — la pause est mémorisée : après rechargement la page repart en pause et le bouton est enfoncé.
// R4 — en prefers-reduced-motion, les vidéos sont figées d'office et le bouton reste masqué (comme l'accueil).
// R5 — le bouton reste une cible d'au moins 44 px (WCAG 2.5.8) à 1440 et 390 px.
// R6 — le bouton reste cliquable à 320 px : rien ne le recouvre (le burger de navigation, en haut à droite, inclus).
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
    await attendJoue(page);
    await page.waitForTimeout(500);
    const lecture = await etat(page);
    assert.ok(lecture.some((x) => !x), `${p} : au moins une vidéo joue au départ`);
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

test('R6 — à 320 px, le bouton n\'est recouvert par rien et son clic bascule la pause', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const p of ['about', 'films', 'codex', 'especes/tyrannosaurus-rex']) {
    const context = await env.browser.newContext({ viewport: { width: 320, height: 568 } });
    const page = await context.newPage();
    await page.goto(`${env.base}/${p}/`, { waitUntil: 'load' });
    const dessus = await page.evaluate(() => {
      const r = document.getElementById('evato-motion-toggle').getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return el && el.closest('#evato-motion-toggle') ? 'bouton' : (el?.id || el?.className || 'autre');
    });
    assert.equal(dessus, 'bouton', `${p} 320px : recouvert par ${dessus}`);
    await page.click('#evato-motion-toggle', { timeout: 5000 });
    assert.equal(await page.getAttribute('#evato-motion-toggle', 'aria-pressed'), 'true', `${p} 320px`);
    await context.close();
  }
});

test('R7 — accueil à 320 px : le bouton reste en haut à droite, sans recouvrir « À propos »', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 320, height: 568 } });
  const page = await context.newPage();
  await page.goto(`${env.base}/`, { waitUntil: 'load' });
  const b = await page.locator('#evato-motion-toggle').boundingBox();
  assert.ok(b && b.y < 100, `bouton en haut : ${JSON.stringify(b)}`);
  const dessus = await page.evaluate(() => {
    const r = document.getElementById('evato-motion-toggle').getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el && el.closest('#evato-motion-toggle') ? 'bouton' : 'autre';
  });
  assert.equal(dessus, 'bouton');
  await context.close();
});

test('R8 — pages internes : la pause fige aussi l\'animation du fond .codex-bg', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await ouvre(env, 'films');
  const etatFond = () => page.evaluate(() => getComputedStyle(document.querySelector('.codex-bg')).animationPlayState);
  assert.equal(await etatFond(), 'running');
  await page.click('#evato-motion-toggle');
  assert.equal(await etatFond(), 'paused');
  await page.click('#evato-motion-toggle');
  assert.equal(await etatFond(), 'running');
  await context.close();
});

const fondAnime = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.codex-bg')).animationName !== 'none');

test('R9 — une fiche espèce sans galerie vidéo n\'a pas de bouton Pause, et son fond .codex-bg reste fixe', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const sans = await ouvre(env, 'especes/aardonyx-celestae');
  assert.equal(await sans.page.locator('video').count(), 0, 'fiche témoin sans vidéo');
  assert.equal(await sans.page.locator('#evato-motion-toggle').count(), 0, 'aucun bouton Pause');
  assert.equal(await fondAnime(sans.page), false, 'fond fixe sans bouton pour le figer');
  await sans.context.close();
  const avec = await ouvre(env, 'especes/tyrannosaurus-rex');
  assert.equal(await avec.page.locator('#evato-motion-toggle').count(), 1, 'fiche à vidéos : bouton présent');
  assert.equal(await fondAnime(avec.page), true, 'fond animé quand le bouton peut le figer');
  await avec.context.close();
});

test('R10 — toute page CodexLayout sans bouton Pause a un fond .codex-bg fixe', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const p of ['films/jurassic-park-1993', 'plan-de-travail', 'nouveautes', 'videos', 'comprendre', 'periodes/cretace']) {
    const { context, page } = await ouvre(env, p);
    assert.equal(await page.locator('#evato-motion-toggle').count(), 0, `${p} : pas de bouton`);
    assert.equal(await fondAnime(page), false, `${p} : fond fixe`);
    await context.close();
  }
});
