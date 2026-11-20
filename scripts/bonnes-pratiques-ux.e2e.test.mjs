// L52 — Revue UX « bonnes pratiques d'une appli web standard » : rejoue les écarts corrigés dans le lot.
// Rapport complet : docs/qa/revue-L52-bonnes-pratiques.md. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — taille de texte : la racine suit le réglage du navigateur (pas de font-size en px sur html, WCAG 1.4.4),
//      et toute hauteur 100vh a sa reprise en 100dvh (barre du navigateur mobile).
// R2 — /periodes/ : plages des cartes atténuées ≥ 4,5:1 (WCAG 1.4.3) ; graduations, plages des bandes,
//      libellés d'ère et pastilles d'espèces ≥ 12 px à 320, 390 et 1440 px.
// R3 — /codex/ : la liste « Groupe » a un nom accessible (WCAG 4.1.2) ; bord des boutons radio ≥ 3:1 (WCAG 1.4.11).
// R4 — /carte/ : légende et attribution ≥ 12 px, liens de l'attribution soulignés (WCAG 1.4.1).
// R5 — fiche espèce : image des espèces voisines en alt="" (le nom suit dans le lien), pas d'aside imbriqué.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupBrowser } from './lib/e2e-dist.mjs';

const SRC = fileURLToPath(new URL('../frontend/src/', import.meta.url));

function fichiers(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name === 'node_modules') return [];
    const p = join(dir, d.name);
    return d.isDirectory() ? fichiers(p) : /\.(astro|css|tsx)$/.test(d.name) ? [p] : [];
  });
}

async function ouvre(env, w, path, h = 844) {
  const context = await env.browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}${path}`, { waitUntil: 'load' });
  return page;
}

const tailles = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
  .filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none')
  .map((e) => [e.textContent.trim().slice(0, 30), parseFloat(getComputedStyle(e).fontSize)]), sel);

const contraste = (page, sel) => page.evaluate((s) => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const rgb = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
  return [...document.querySelectorAll(s)].map((e) => {
    // Couleur du texte composée avec l'opacité cumulée des ancêtres, sur le fond de page.
    let a = 1; for (let n = e; n; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity);
    const fg = rgb(getComputedStyle(e).color); const bg = rgb(getComputedStyle(document.documentElement).backgroundColor);
    const mix = fg.slice(0, 3).map((v, i) => a * v + (1 - a) * bg[i]);
    const [l1, l2] = [lum(mix), lum(bg)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
}, sel);

test('R1 — racine en %, et 100vh toujours repris en 100dvh', () => {
  const css = readFileSync(join(SRC, 'styles/global.css'), 'utf8');
  const html = css.match(/html\s*\{[^}]*\}/)[0];
  assert.doesNotMatch(html, /font-size:\s*[\d.]+px/, 'html { font-size } en px ignore la taille choisie dans le navigateur');
  const manque = [];
  for (const f of fichiers(SRC)) {
    const lignes = readFileSync(f, 'utf8').split('\n');
    lignes.forEach((l, i) => {
      const m = l.match(/^\s*((?:min-|max-)?height):\s*100vh;/);
      if (m && !new RegExp(`${m[1]}:\\s*100dvh`).test(lignes[i + 1] ?? '')) manque.push(`${f.slice(SRC.length)}:${i + 1}`);
    });
  }
  assert.deepEqual(manque, [], '100vh sans 100dvh juste après');
});

test('R2 — /periodes/ : plages atténuées ≥ 4,5:1, textes de la frise et pastilles ≥ 12 px', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [320, 390, 1440]) {
    const page = await ouvre(env, w, '/periodes/');
    const ratios = await contraste(page, '.meso-iconic:not(.meso-iconic--lit) .meso-iconic-range');
    assert.ok(ratios.length > 0, `${w}px : au moins une carte atténuée`);
    for (const r of ratios) assert.ok(r >= 4.5, `${w}px : plage atténuée à ${r.toFixed(2)}:1`);
    const petits = (await tailles(page, '.meso-tick-label, .meso-band-range, .meso-band-label, .meso-iconic-range, .iconic-pill')).filter(([, f]) => f < 12);
    assert.deepEqual(petits, [], `${w}px : textes sous 12 px`);
  }
});

test('R3 — /codex/ : liste « Groupe » nommée, bord des boutons radio ≥ 3:1', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 1440, '/codex/', 900);
  await page.waitForSelector('select.filter-select');
  assert.equal(await page.getAttribute('select.filter-select', 'aria-label'), 'Groupe');
  const bord = await page.evaluate(() => getComputedStyle(document.querySelector(".codex-filters input[type='radio']:not(:checked)")).borderTopColor);
  const alpha = Number((bord.match(/rgba\([^)]*,\s*([\d.]+)\)/) ?? [0, 1])[1]);
  assert.ok(alpha >= 0.75, `bord des radios à alpha ${alpha} (≈ 2,2:1 à 0,4)`);
});

test('R4 — /carte/ : légende et attribution ≥ 12 px, liens soulignés', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [390, 1440]) {
    const page = await ouvre(env, w, '/carte/');
    await page.waitForSelector('.leaflet-control-attribution a');
    const petits = (await tailles(page, '.legend-item, .leaflet-control-attribution, .leaflet-control-attribution a')).filter(([, f]) => f < 12);
    assert.deepEqual(petits, [], `${w}px : textes sous 12 px`);
    const deco = await page.evaluate(() => [...document.querySelectorAll('.leaflet-control-attribution a')].map((a) => getComputedStyle(a).textDecorationLine));
    for (const d of deco) assert.match(d, /underline/, `${w}px : lien d'attribution non souligné`);
  }
});

test('R5 — fiche espèce : voisines en alt="", aucun aside dans main', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 1440, '/especes/tyrannosaurus-rex/', 900);
  const r = await page.evaluate(() => ({
    alts: [...document.querySelectorAll('.related-card img')].map((i) => i.getAttribute('alt')),
    aside: document.querySelectorAll('main aside').length,
  }));
  assert.ok(r.alts.length > 0, 'au moins une espèce voisine illustrée');
  assert.deepEqual([...new Set(r.alts)], [''], 'image d’une voisine avec un alt qui répète son nom');
  assert.equal(r.aside, 0);
});
