// L22 — décimales en français sur la fiche espèce (et la carte du codex) : virgule
// décimale, espace insécable des milliers, par le formateur partagé format-count.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { formatDecimal } from '../frontend/src/lib/format-count.mjs';

test('formatDecimal : virgule décimale, milliers en U+00A0, entiers sans décimale', () => {
  assert.equal(formatDecimal(201.4), '201,4');
  assert.equal(formatDecimal(12), '12');
  assert.equal(formatDecimal(1234.5), '1 234,5');
  assert.equal(formatDecimal(8.8, 1), '8,8');
  assert.equal(formatDecimal(1.7000000000000028, 1), '1,7');
  assert.equal(formatDecimal(0.125), '0,125');
  assert.ok(!formatDecimal(12345.6).includes(' '));
});

test('sources : plus de nombre brut ni de toLocaleString isolé pour longueur, hauteur, poids, datations', () => {
  const read = (p) => readFileSync(new URL(`../frontend/src/${p}`, import.meta.url), 'utf8');
  const fiche = read('pages/especes/[id].astro');
  for (const raw of ['{s.lengthM} m', '{s.heightM} m', '{s.earlyMa} →', '→ {s.lateMa} Ma', "toLocaleString('fr-FR'"]) {
    assert.ok(!fiche.includes(raw), `fiche espèce : ${raw}`);
  }
  const carte = read('components/CodexBrowser.tsx');
  assert.ok(!carte.includes('`${s.lengthM} m'), 'carte du codex : longueur brute');
  assert.ok(!carte.includes("toLocaleString('fr-FR'"), 'carte du codex : toLocaleString isolé');
  assert.ok(!carte.includes('~${s.lengthM} m'), 'carte du codex : longueur brute dans le texte alternatif');
  const carteAstro = read('components/SpeciesCard.astro');
  assert.ok(!carteAstro.includes('{s.lengthM} m'), 'carte des périodes : longueur brute');
});

const DIST = new URL('../frontend/dist/especes/', import.meta.url);
test('site construit : aucune fiche espèce n\'affiche de décimale à point', (t) => {
  if (!existsSync(DIST)) { t.skip('frontend/dist absent : lancer `npx astro build` avant'); return; }
  const bad = [];
  let pages = 0;
  for (const id of readdirSync(DIST)) {
    const f = new URL(`${id}/index.html`, DIST);
    if (!existsSync(f)) continue;
    pages++;
    const html = readFileSync(f, 'utf8');
    // Valeurs des repères (dd) et des notes de terrain : texte entre balises.
    const m = html.match(/<dd[^>]*>[^<]*\d\.\d[^<]*<\/dd>/);
    if (m) bad.push(`${id} : ${m[0].replace(/<[^>]+>/g, '')}`);
  }
  assert.ok(pages > 1000, `${pages} fiches lues`);
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} fiches à point décimal`);
  // Cartes d'espèces des pages de période (SpeciesCard).
  for (const p of ['jurassique', 'cretace', 'trias']) {
    const f = new URL(`../periodes/${p}/index.html`, DIST);
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/class="card-size"[^>]*>[^<]*\d\.\d[^<]*</);
    assert.equal(m, null, `/periodes/${p}/ : ${m?.[0]}`);
  }
  const aardonyx = readFileSync(new URL('aardonyx-celestae/index.html', DIST), 'utf8');
  assert.ok(aardonyx.includes('201,4 → 192,9 Ma'), 'Aardonyx : « 201,4 → 192,9 Ma »');
});
