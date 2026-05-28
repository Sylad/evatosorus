import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  stripHtml,
  classifyTaxonGroupFromChain,
  dietFromGroup,
  cleanBlurb,
  buildImageCredit,
  fillIfEmpty,
} from './lib/enrich-pure.mjs';

test('slugify: binomial → kebab', () => {
  assert.equal(slugify('Tyrannosaurus rex'), 'tyrannosaurus-rex');
  assert.equal(slugify('  Aardonyx  celestae '), 'aardonyx-celestae');
});

test('stripHtml: enlève balises et espaces', () => {
  assert.equal(stripHtml('<a href="x">John   Doe</a>'), 'John Doe');
  assert.equal(stripHtml(undefined), '');
});

test('classifyTaxonGroupFromChain: clade le plus spécifique gagne', () => {
  assert.equal(classifyTaxonGroupFromChain(['Tyrannosauridae', 'Theropoda', 'Saurischia', 'Dinosauria']), 'theropod');
  assert.equal(classifyTaxonGroupFromChain(['Diplodocidae', 'Sauropoda', 'Saurischia']), 'sauropod');
  assert.equal(classifyTaxonGroupFromChain(['Ankylosauria', 'Thyreophora', 'Ornithischia']), 'thyreophoran');
  assert.equal(classifyTaxonGroupFromChain(['Mosasauridae', 'Squamata']), 'marine-reptile');
  assert.equal(classifyTaxonGroupFromChain(['Saurischia', 'Dinosauria']), 'other-saurischian');
  assert.equal(classifyTaxonGroupFromChain(['Ornithischia']), 'other-ornithischian');
  assert.equal(classifyTaxonGroupFromChain(['Archosauria']), 'other');
  assert.equal(classifyTaxonGroupFromChain([]), 'other');
});

test('dietFromGroup: heuristique clade', () => {
  assert.equal(dietFromGroup('theropod'), 'carnivore');
  assert.equal(dietFromGroup('sauropod'), 'herbivore');
  assert.equal(dietFromGroup('ceratopsian'), 'herbivore');
  assert.equal(dietFromGroup('other-ornithischian'), 'herbivore');
  assert.equal(dietFromGroup('pterosaur'), 'unknown');
  assert.equal(dietFromGroup('marine-reptile'), 'unknown');
  assert.equal(dietFromGroup('other'), 'unknown');
});

test('cleanBlurb: enlève préambule llama et guillemets', () => {
  const raw = 'Voici deux phrases qui reformulent votre texte :\n\nLe Stegosaurus est un dinosaure. Il vivait au Jurassique.';
  assert.equal(cleanBlurb(raw), 'Le Stegosaurus est un dinosaure. Il vivait au Jurassique.');
  assert.equal(cleanBlurb('"Un texte entre guillemets."'), 'Un texte entre guillemets.');
  assert.equal(cleanBlurb(''), '');
});

test('buildImageCredit: licence présente → crédit, absente → null', () => {
  const ok = buildImageCredit({ LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Jane</a>' } });
  assert.equal(ok.license, 'CC BY-SA 4.0');
  assert.equal(ok.credit, 'Jane — CC BY-SA 4.0 via Wikimedia Commons');
  assert.equal(buildImageCredit({ Artist: { value: 'Jane' } }), null);
  assert.equal(buildImageCredit(null), null);
});

test('fillIfEmpty: ne remplit que vides + placeholders other/unknown', () => {
  const t = { name: 'X', taxonGroup: 'other', diet: 'unknown', blurb: 'déjà là' };
  fillIfEmpty(t, { taxonGroup: 'theropod', diet: 'carnivore', blurb: 'NOUVEAU', commonName: 'Truc' });
  assert.equal(t.taxonGroup, 'theropod'); // 'other' est un placeholder → remplacé
  assert.equal(t.diet, 'carnivore');      // 'unknown' placeholder → remplacé
  assert.equal(t.blurb, 'déjà là');       // déjà rempli → conservé
  assert.equal(t.commonName, 'Truc');     // absent → ajouté
});
