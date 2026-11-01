// L45 — Pagination du codex. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — les 4 boutons de pagination font au moins 44 px de large ET de haut, à 1440, 430, 412, 390, 360 et 320 px.
// R3 — la pagination garde ses 4 boutons groupés : une seule ligne à 1440 px, deux lignes à 430 px et moins (indicateur seul, puis les 4 boutons ensemble).
// L46 — R3 est aussi mesuré sur la dernière page (« Page 26 sur 26 », indicateur plus large) et de 481 à seuil + 1 px.
// R2 — la pagination ne fait pas défiler la page horizontalement et reste dans la fenêtre, à ces mêmes largeurs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const WIDTHS = [1440, 491, 490, 484, 481, 430, 412, 390, 360, 320];
const SEUIL_ETROIT = 490; // doit suivre le max-width de la media query de codex-browser.css

// Barre de défilement classique de 17 px (Windows) : Playwright la masque par défaut, et sans elle
// « Dernière page » tient sur la ligne jusqu'à 470 px — le défaut de L46 n'apparaît pas.
async function parcourt(t, fn) {
  const env = await setupBrowser(t, { scrollbar: true });
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
    await page.addStyleTag({ content: '::-webkit-scrollbar{width:17px}' });
    await page.waitForSelector('.pagination .page-btn');
    await fn(page, `${w}px`, w);
    await page.click('.pagination [aria-label="Dernière page"]');
    await page.waitForFunction(() => { const s = document.querySelectorAll('.pagination .page-indicator strong'); return s[0].textContent === s[1].textContent; });
    await fn(page, `${w}px, dernière page`, w);
    await context.close();
  }
}

test('R1 — les boutons de pagination font au moins 44 px de large et de haut', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const boutons = await page.evaluate(() =>
      [...document.querySelectorAll('.pagination .page-btn')].map((b) => {
        const r = b.getBoundingClientRect();
        return { t: b.getAttribute('aria-label'), w: r.width, h: r.height };
      }));
    assert.equal(boutons.length, 4, `${ou} : 4 boutons attendus`);
    for (const b of boutons) {
      assert.ok(b.w >= 44, `${ou} : « ${b.t} » fait ${b.w} px de large`);
      assert.ok(b.h >= 44, `${ou} : « ${b.t} » fait ${b.h} px de haut`);
    }
  });
});

test('R2 — la pagination reste dans la fenêtre, sans défilement horizontal', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou, w) => {
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth,
      hors: [...document.querySelectorAll('.pagination > *')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > document.documentElement.clientWidth; }).length,
    }));
    assert.ok(m.sw <= m.vw, `${ou} : ${m.sw} > ${m.vw}`);
    assert.equal(m.hors, 0, `${ou} : éléments de pagination hors fenêtre`);
  });
});

test('R3 — les 4 boutons restent sur une même ligne, l\'indicateur seul sur la sienne en écran étroit', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou, w) => {
    const m = await page.evaluate(() => ({
      boutons: [...document.querySelectorAll('.pagination .page-btn')].map((b) => { const r = b.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }),
      indic: (() => { const r = document.querySelector('.pagination .page-indicator').getBoundingClientRect(); return Math.round(r.top + r.height / 2); })(),
    }));
    assert.equal(new Set(m.boutons).size, 1, `${ou} : les 4 boutons sont répartis sur plusieurs lignes (${m.boutons})`);
    if (w <= SEUIL_ETROIT) assert.notEqual(m.indic, m.boutons[0], `${ou} : l'indicateur doit avoir sa propre ligne`);
    else assert.equal(m.indic, m.boutons[0], `${ou} : une seule ligne attendue`);
  });
});
