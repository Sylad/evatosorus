// L12 — Revue UX du gabarit commun (navigation, en-tête, pied, rendu téléphone). Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — cibles tactiles : à 390 px, chaque bouton « Copier le lien » de /nouveautes/ fait au moins 44 px de haut (WCAG 2.5.5).
// R2 — lisibilité : les chiffres-clés de l'accueil ne passent sous 12 px ni à 1440 ni à 390 px.
// R3 — lisibilité de la navigation : aucun texte du menu (marque, liens, pastille, pied) sous 12 px, à 1440 et 390 px (tiroir ouvert).
// R4 — cibles tactiles du menu : à 390 px, bouton du menu et liens du tiroir font au moins 44 px de haut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

async function ouvre(env, w, path) {
  const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}${path}`, { waitUntil: 'load' });
  return page;
}

const petits = (page, racine) => page.evaluate((sel) => {
  const r = [];
  document.querySelectorAll(`${sel}, ${sel} *`).forEach((e) => {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f < 12) r.push(`${e.className || e.tagName} ${f}px`);
  });
  return r;
}, racine);

test('R1 — « Copier le lien » fait au moins 44 px de haut à 390 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 390, '/nouveautes/');
  const hauteurs = await page.evaluate(() => [...document.querySelectorAll('button.news-copy')].map((b) => b.getBoundingClientRect().height));
  assert.ok(hauteurs.length >= 1, 'au moins un bouton attendu');
  for (const h of hauteurs) assert.ok(h >= 44, `bouton à ${h} px de haut`);
});

test('R2 — les chiffres-clés de l’accueil font au moins 12 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390]) {
    const page = await ouvre(env, w, '/');
    const n = await page.evaluate(() => document.querySelectorAll('.landing-stats span').length);
    assert.equal(n, 3, `${w}px : 3 chiffres-clés attendus`);
    assert.deepEqual(await petits(page, '.landing-stats'), [], `${w}px : textes sous 12 px`);
  }
});

test('R3 — aucun texte du menu sous 12 px (tiroir ouvert à 390 px)', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390]) {
    const page = await ouvre(env, w, '/codex/');
    if (w < 1024) await page.click('#evato-burger');
    assert.deepEqual(await petits(page, '#evato-sidebar'), [], `${w}px : textes du menu sous 12 px`);
    assert.deepEqual(await petits(page, '#evato-burger'), [], `${w}px : pastille du bouton sous 12 px`);
  }
});

test('R4 — le bouton du menu et les liens du tiroir font au moins 44 px à 390 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 390, '/codex/');
  await page.click('#evato-burger');
  const h = await page.evaluate(() => ({
    burger: document.getElementById('evato-burger').getBoundingClientRect().height,
    liens: [...document.querySelectorAll('#evato-sidebar .codex-nav-link')].map((a) => [a.textContent.trim(), a.getBoundingClientRect().height]),
  }));
  assert.ok(h.burger >= 44, `bouton du menu à ${h.burger} px`);
  assert.equal(h.liens.length, 11);
  for (const [l, x] of h.liens) assert.ok(x >= 44, `« ${l} » à ${x} px de haut`);
});
