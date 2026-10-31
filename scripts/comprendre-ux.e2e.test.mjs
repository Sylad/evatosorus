// L8 — Revue UX de la page Comprendre. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — cibles tactiles : le lien « Explorer le voyage temporel » fait au moins 44 px de haut (WCAG 2.5.5), à 1440 et 390 px.
// R2 — ordre des titres : aucun saut de niveau (h1, puis h2 ; jamais h1 → h3) (WCAG 1.3.1).
// R3 — lisibilité : aucun texte de la page sous 12 px (étiquettes « comprendre », « fiction vs science », lien), à 1440 et 390 px.
// R4 — aucun défilement horizontal de la page, à 1440 et 390 px.
// R5 — contraste (WCAG 1.4.3) : étiquettes, repères, textes des cartes et lien ≥ 4,5:1 au pire pixel, à 1440 et 390 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

const WIDTHS = [1440, 390];

async function parcourt(t, fn) {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/comprendre/`, { waitUntil: 'load' });
    await fn(page, `${w}px`);
    await context.close();
  }
}

test('R1 — les liens de la page font au moins 44 px de haut', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const liens = await page.evaluate(() =>
      [...document.querySelectorAll('main a')].map((e) => ({ t: e.textContent.trim().slice(0, 30), h: e.getBoundingClientRect().height })));
    assert.ok(liens.some((l) => l.t.includes('voyage temporel')), `${ou} : lien du voyage temporel attendu`);
    for (const l of liens) assert.ok(l.h >= 44, `${ou} : « ${l.t} » fait ${l.h} px de haut`);
  });
});

test('R2 — la page ne saute aucun niveau de titre', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const niveaux = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map((h) => Number(h.tagName[1])));
    assert.equal(niveaux[0], 1, `${ou} : premier titre h${niveaux[0]}`);
    assert.ok(niveaux.filter((n) => n === 2).length >= 5, `${ou} : titres h2 des cartes attendus`);
    niveaux.forEach((n, i) => { if (i) assert.ok(n <= niveaux[i - 1] + 1, `${ou} : saut h${niveaux[i - 1]} → h${n}`); });
  });
});

test('R3 — aucun texte sous 12 px dans la page', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const { petits, vus } = await page.evaluate(() => {
      const petits = [];
      let vus = 0;
      document.querySelectorAll('main *').forEach((e) => {
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        vus++;
        const f = parseFloat(getComputedStyle(e).fontSize);
        if (f < 12) petits.push(`${e.className || e.tagName} ${f}px`);
      });
      return { petits, vus };
    });
    assert.ok(vus > 15, `${ou} : textes de la page attendus (${vus})`);
    assert.deepEqual([...new Set(petits)], [], `${ou} : textes sous 12 px`);
  });
});

test('R4 — pas de défilement horizontal de la page', { timeout: 60_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    assert.ok(m.sw <= m.vw, `${ou} : ${m.sw} > ${m.vw}`);
  });
});

test('R5 — étiquettes, repères, cartes et lien ≥ 4,5:1', { timeout: 120_000 }, async (t) => {
  await parcourt(t, async (page, ou) => {
    await page.evaluate(() => document.fonts.ready);
    const echecs = [];
    for (const sel of ['.learn-hero .page-kicker', '.learn-hero p:not(.page-kicker)', '.truth-strip strong', '.truth-strip span',
      '.learn-card.wide .page-kicker', '.learn-card p', '.timeline-note .page-kicker', '.timeline-note p:not(.page-kicker)', '.learn-link']) {
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      const { worst, glyphs } = await worstPixelContrast(page, sel);
      assert.ok(glyphs > 5, `${ou} ${sel} : glyphes non détectés (${glyphs})`);
      if (worst < 4.5) echecs.push(`${sel} ${worst.toFixed(2)}:1`);
    }
    assert.deepEqual(echecs, [], `${ou} : contraste insuffisant`);
  });
});
