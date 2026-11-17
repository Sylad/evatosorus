// L22 — titres ajustés sur leur plus long mot (frontend/src/lib/title-fit.mjs) : calcul de
// la largeur en em, et planchers tirés des DONNÉES (tous les titres du site construit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { longestWordEm, wordEm, fitStyle, LS, SHY, syllableBreaks, softHyphenate, SPECIES_TITLE, SPECIES_TITLE_MAX_EM } from '../frontend/src/lib/title-fit.mjs';

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

// L30 — plancher 1,5rem du titre de fiche, césures douces posées au build.
test('césure : coupures syllabiques, attaques gardées entières, rien près des bords', () => {
  const show = (w) => softHyphenate(w, LS.heading, SPECIES_TITLE_MAX_EM).replaceAll(SHY, '·');
  assert.equal(show('Micropachycephalosaurus'), 'Mi·cro·pa·chy·ce·pha·lo·sau·rus');
  assert.equal(show('Longchengpterus'), 'Long·cheng·pte·rus');
  assert.equal(show('Chinshakiangosaurus'), 'Chin·sha·kian·go·sau·rus');
  assert.equal(show('Harpactognathus'), 'Har·pac·to·gna·thus');
  // Un mot qui tient n'est pas touché, ni les autres mots du titre.
  assert.equal(softHyphenate('Tyrannosaurus rex', LS.heading, SPECIES_TITLE_MAX_EM), 'Tyrannosaurus rex');
  assert.equal(show('Dispersituberoolithus exilis'), 'Dis·per·si·tu·be·roo·li·thus exilis');
  // Jamais à moins de deux lettres d'un bord, jamais entre deux voyelles.
  for (const w of ['Aepyornithomimus', 'Archaeornithomimus', 'Coeluro']) {
    for (const b of syllableBreaks(w)) {
      assert.ok(b >= 2 && w.length - b >= 2, `${w} @${b}`);
      assert.ok(!/[aeiouy]{2}/i.test(w.slice(b - 1, b + 1)), `${w} coupé entre deux voyelles @${b}`);
    }
  }
  // La césure ne compte pas dans la largeur.
  assert.equal(wordEm(`Mi${SHY}cro`, 0.06), wordEm('Micro', 0.06));
  // Une syllabe plus large que la ligne est recoupée entre lettres.
  assert.ok(softHyphenate('Mmmmmmmmmmmmmmmm', 0.06, 5).split(SHY).every((p) => wordEm(`${p}-`, 0.06) <= 5));
});

test('fiche espèce : le plancher CSS vaut SPECIES_TITLE.floorRem (1,5rem) et dépasse le nom scientifique', () => {
  const src = read('pages/especes/[id].astro');
  assert.equal(floorRem(src, '.detail-header h1 {'), 1.5);
  assert.equal(SPECIES_TITLE.floorRem, 1.5);
  assert.ok((CONTENT_320 / (SPECIES_TITLE.floorRem * ROOT_PX)).toFixed(6) === SPECIES_TITLE_MAX_EM.toFixed(6));
  const sci = Number(src.slice(src.indexOf('.sci-name {')).match(/font-size:\s*([\d.]+)rem/)[1]);
  assert.ok(SPECIES_TITLE.floorRem > sci, `plancher ${SPECIES_TITLE.floorRem}rem ≤ nom scientifique ${sci}rem`);
});

test('fiche espèce : au plancher, chaque morceau des 1 511 titres (entre césures) tient dans 320 px', (t) => {
  const all = titles(t);
  if (!all) return;
  assert.ok(all.length > 1000);
  const floor = SPECIES_TITLE.floorRem * ROOT_PX;
  const tooWide = [];
  let hyphenated = 0;
  for (const title of all) {
    for (const word of title.split(/\s+/).flatMap((w) => w.split(/(?<=-)/)).filter(Boolean)) {
      const parts = word.split(SHY);
      if (parts.length > 1) hyphenated++;
      // Morceau suivi d'un trait d'union, sauf le dernier.
      parts.forEach((p, i) => {
        if (wordEm(i < parts.length - 1 ? `${p}-` : p, LS.heading) * floor > CONTENT_320) tooWide.push(word);
      });
    }
  }
  assert.deepEqual([...new Set(tooWide)], [], `plancher ${floor} px : mots sans césure suffisante`);
  assert.ok(hyphenated > 50, `césures posées dans ${hyphenated} mots seulement`);
  // Le nom de Micropachycephalosaurus porte bien ses césures dans la page construite.
  assert.ok(all.includes(softHyphenate('Micropachycephalosaurus', LS.heading, SPECIES_TITLE_MAX_EM)));
});

test('cartes d\'espèces : au plancher, seul Micropachycephalosaurus dépasse la carte la plus étroite du codex', (t) => {
  const all = titles(t)?.map((s) => s.replaceAll(SHY, '')); // cartes : titre sans césure
  if (!all) return;
  for (const [file, sel] of [['components/SpeciesCard.astro', '.card-title {'], ['components/codex-browser.css', '.species-card .card-title {']]) {
    const floor = floorRem(read(file), sel) * ROOT_PX;
    const tooWide = [...new Set(all.filter((s) => longestWordEm(s, LS.card) * floor > NARROWEST_CARD))];
    assert.deepEqual(tooWide, ['Micropachycephalosaurus'], file);
  }
});
