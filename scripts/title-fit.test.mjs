// L22 — titres ajustés sur leur plus long mot (frontend/src/lib/title-fit.mjs) : calcul de
// la largeur en em, et planchers tirés des DONNÉES (tous les titres du site construit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { longestWordEm, wordEm, fitStyle, LS } from '../frontend/src/lib/title-fit.mjs';

const ROOT_PX = 17.5; // police racine du site
const CONTENT_320 = 320 - 2 * 1.25 * ROOT_PX; // contenu à 320 px : 276,25 px
// Carte du codex la plus étroite : 4 colonnes dans 1 050 px (bureau), moins bordures et
// retraits : ≈ 203 px de titre.
const NARROWEST_CARD = 203;

test('wordEm / longestWordEm : somme des chasses + espacement, mots séparés par espaces et traits d\'union', () => {
  assert.ok(wordEm('MM', 0) > wordEm('ii', 0));
  assert.equal(wordEm('ab', 0.1).toFixed(3), (wordEm('ab', 0) + 0.2 * 1.03).toFixed(3));
  assert.equal(longestWordEm('Tyrannosaurus rex', 0.06), wordEm('Tyrannosaurus', 0.06));
  assert.equal(longestWordEm('Carnosaure-géant', 0.06), Math.max(wordEm('Carnosaure-', 0.06), wordEm('géant', 0.06)));
  assert.match(fitStyle('Aardonyx', LS.heading), /^--word-em:\d+\.\d{3}$/);
});

const read = (p) => readFileSync(new URL(`../frontend/src/${p}`, import.meta.url), 'utf8');
const floorRem = (src, sel) => Number(src.slice(src.indexOf(sel)).match(/--fit-floor:\s*([\d.]+)rem/)[1]);

const DIST = new URL('../frontend/dist/especes/', import.meta.url);
function titles(t) {
  if (!existsSync(DIST)) { t.skip('frontend/dist absent : lancer `npx astro build` avant'); return null; }
  return readdirSync(DIST).map((id) => readFileSync(new URL(`${id}/index.html`, DIST), 'utf8').match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1]).filter(Boolean);
}

test('fiche espèce : au plancher, le plus long mot des 1 511 titres tient dans 320 px', (t) => {
  const all = titles(t);
  if (!all) return;
  assert.ok(all.length > 1000);
  const floor = floorRem(read('pages/especes/[id].astro'), '.detail-header h1 {') * ROOT_PX;
  const tooWide = all.filter((s) => longestWordEm(s, LS.heading) * floor > CONTENT_320);
  assert.deepEqual(tooWide, [], `plancher ${floor} px trop grand`);
});

test('cartes d\'espèces : au plancher, seul Micropachycephalosaurus dépasse la carte la plus étroite du codex', (t) => {
  const all = titles(t);
  if (!all) return;
  for (const [file, sel] of [['components/SpeciesCard.astro', '.card-title {'], ['components/codex-browser.css', '.species-card .card-title {']]) {
    const floor = floorRem(read(file), sel) * ROOT_PX;
    const tooWide = [...new Set(all.filter((s) => longestWordEm(s, LS.card) * floor > NARROWEST_CARD))];
    assert.deepEqual(tooWide, ['Micropachycephalosaurus'], file);
  }
});
