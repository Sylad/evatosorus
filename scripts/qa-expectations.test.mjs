// L42 — docs/qa/expectations.md : le fichier existe, décrit la frise de /periodes/ et /nouveautes/,
// et ses deux mesures (étiquette du curseur à 252 et 66 Ma, `.news-entry` non vide) tiennent sur le site
// construit. Le volet navigateur lit frontend/dist ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setupBrowser } from './lib/e2e-dist.mjs';

const DOC = fileURLToPath(new URL('../docs/qa/expectations.md', import.meta.url));
const lire = () => readFileSync(DOC, 'utf8');
const sections = (md) => md.split(/^## /m).slice(1);
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test('R1 — expectations.md décrit /periodes/ et /nouveautes/, chacun avec une ligne « shows: »', () => {
  assert.ok(existsSync(DOC), 'docs/qa/expectations.md est absent');
  const blocs = sections(lire());
  for (const route of ['/periodes/', '/nouveautes/']) {
    const b = blocs.find((x) => x.split('\n')[0].trim() === route);
    assert.ok(b, `section « ## ${route} » absente`);
    assert.match(b, /^- shows: /m, `« ## ${route} » sans ligne shows:`);
  }
});

test('R2 — la section /periodes/ nomme les seuils mesurés : 252 et 66 Ma, 390 px, une ligne, recouvrement', () => {
  const b = sections(lire()).find((x) => x.startsWith('/periodes/')) ?? '';
  for (const motif of [/252/, /66 Ma/, /390/, /une seule ligne|1 ligne/, /recouvr/, /\[data-meso-readout\]/]) {
    assert.match(b, motif, `« ## /periodes/ » ne contient pas ${motif}`);
  }
});

test('R3 — la section /nouveautes/ nomme `.news-entry` non vide', () => {
  const b = sections(lire()).find((x) => x.startsWith('/nouveautes/')) ?? '';
  assert.match(b, /\.news-entry/);
  assert.match(b, /non vide/);
});

test('R6 — la ligne readout de /periodes/ donne 145 Ma à l’ouverture, 252 après Début, 66 après Fin (pas « 252 Ma au départ »), et l’en-tête nomme les tests qui rejouent défilement, tri et naturalWidth', () => {
  const md = lire();
  const b = sections(md).find((x) => x.startsWith('/periodes/')) ?? '';
  assert.match(b, /145 Ma à l'ouverture, 252 Ma après Début, 66 Ma après Fin/);
  assert.doesNotMatch(b, /252 Ma » au départ/);
  const entete = md.split(/^## /m)[0];
  for (const fichier of ['frise-etiquettes.e2e.test.mjs', 'nouveautes-page.e2e.test.mjs', 'reflow-320.e2e.test.mjs']) {
    assert.ok(entete.includes(fichier), `l'en-tête ne nomme pas ${fichier}`);
    assert.ok(existsSync(fileURLToPath(new URL(`./${fichier}`, import.meta.url))), `${fichier} n'existe pas`);
  }
});

test('R4 — frise à 252 et 66 Ma : étiquette sans recouvrement de l’ère, dans l’écran ; Trias sur 1 ligne à 390', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [1440, 390]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
    for (const key of ['Home', 'End']) {
      await page.locator('[data-meso-cursor]').focus();
      await page.keyboard.press(key);
      const m = await page.evaluate(() => {
        const box = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
        return {
          vw: document.documentElement.clientWidth,
          readout: box(document.querySelector('[data-meso-readout]')),
          text: document.querySelector('[data-meso-readout]').textContent.trim(),
          era: [...document.querySelectorAll('.meso-timeline-title, .meso-timeline-hint')].filter((e) => !e.hidden).map((e) => box(e)),
        };
      });
      assert.match(m.text, key === 'Home' ? /252/ : /66/, `${w}px ${key} : valeur lue « ${m.text} »`);
      assert.ok(m.era.length >= 1, `${w}px ${key} : libellé d'ère absent`);
      assert.ok(m.readout.left >= 0 && m.readout.right <= m.vw, `${w}px ${key} : étiquette hors de l'écran`);
      for (const e of m.era) assert.ok(!overlap(m.readout, e), `${w}px ${key} : l'étiquette recouvre l'ère`);
    }
    if (w === 390) {
      const lignes = await page.evaluate(() => {
        const r = document.querySelector('.meso-band[data-period] .meso-band-range');
        return Math.round(r.getBoundingClientRect().height / parseFloat(getComputedStyle(r).lineHeight));
      });
      assert.equal(lignes, 1, 'plage du Trias sur plusieurs lignes à 390 px');
    }
    await context.close();
  }
});

test('R5 — /nouveautes/ : chaque `.news-entry` a un texte non vide', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await env.browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'load' });
  const longueurs = await page.evaluate(() => [...document.querySelectorAll('.news-entry')].map((e) => e.innerText.trim().length));
  assert.ok(longueurs.length >= 1, 'aucune .news-entry');
  assert.ok(longueurs.every((n) => n > 0), `entrées vides : ${longueurs}`);
});
