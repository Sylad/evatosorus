// L4 — Revue UX des Films (liste + fiche). Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — cibles tactiles : chaque lien de la fiche d'un film (retour, bande-annonce, Wikipedia, précédent/suivant) fait au moins 44 px de haut (WCAG 2.5.5), à 1440 et 390 px.
// R2 — ordre des titres de la fiche : aucun saut de niveau (h1, puis h2 ; jamais h1 → h3) (WCAG 1.3.1).
// R3 — lisibilité : aucun texte de la liste ni de la fiche sous 12 px, à 1440 et 390 px.
// R4 — aucun défilement horizontal de la liste et de la fiche, à 1440 et 390 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const WIDTHS = [1440, 390];
const PAGES = ['/films/', '/films/lost-world-1997/'];

async function parcourt(t, fn) {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(`${env.base}${path}`, { waitUntil: 'load' });
      await fn(page, `${w}px ${path}`);
    }
    await context.close();
  }
}

test('R1 — les liens de la fiche font au moins 44 px de haut', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/films/lost-world-1997/`, { waitUntil: 'load' });
    const liens = await page.evaluate(() =>
      [...document.querySelectorAll('.back-link, .film-link, .film-nav-link')].map((e) => ({ t: e.textContent.trim(), h: e.getBoundingClientRect().height })));
    assert.ok(liens.length >= 5, `${w}px : retour, 2 liens, précédent et suivant attendus (${liens.length})`);
    for (const l of liens) assert.ok(l.h >= 44, `${w}px : « ${l.t} » fait ${l.h} px de haut`);
    await context.close();
  }
});

test('R2 — la fiche ne saute aucun niveau de titre', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await (await env.browser.newContext()).newPage();
  for (const path of ['/films/lost-world-1997/', '/films/jurassic-park-iii-2001/', '/films/rebirth-2025/']) {
    await page.goto(`${env.base}${path}`, { waitUntil: 'load' });
    const niveaux = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map((h) => Number(h.tagName[1])));
    assert.equal(niveaux[0], 1, `${path} : premier titre ${niveaux[0]}`);
    niveaux.forEach((n, i) => { if (i) assert.ok(n <= niveaux[i - 1] + 1, `${path} : saut h${niveaux[i - 1]} → h${n}`); });
  }
});

test('R3 — aucun texte sous 12 px dans la liste ni la fiche', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const petits = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('main *').forEach((e) => {
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        const f = parseFloat(getComputedStyle(e).fontSize);
        if (f < 12) r.push(`${e.className || e.tagName} ${f}px`);
      });
      return r;
    });
    assert.deepEqual(petits, [], `${ou} : textes sous 12 px`);
  });
});

test('R4 — pas de défilement horizontal de la liste ni de la fiche', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    assert.ok(m.sw <= m.vw, `${ou} : ${m.sw} > ${m.vw}`);
  });
});
