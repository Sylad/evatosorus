// L10 (revue de code) — comptage des repères et regroupements de la carte : en espèces
// distinctes, pour le chiffre comme pour la couleur, même quand un site mêle deux périodes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tally } from '../frontend/src/data/map-counts.mjs';

test('tally : une espèce présente dans deux repères compte une fois', () => {
  const t = tally([
    { id: 'trex', period: 'cretace' },
    { id: 'trex', period: 'cretace' },
    { id: 'tricera', period: 'cretace' },
  ]);
  assert.equal(t.total, 2);
  assert.deepEqual(t.byPeriod, { cretace: 2 });
});

test('tally : couleur = période majoritaire en espèces distinctes, pas en occurrences', () => {
  // Deux occurrences de T. rex ne battent pas deux espèces jurassiques.
  const t = tally([
    { id: 'trex', period: 'cretace' },
    { id: 'trex', period: 'cretace' },
    { id: 'trex', period: 'cretace' },
    { id: 'allo', period: 'jurassique' },
    { id: 'stego', period: 'jurassique' },
  ]);
  assert.equal(t.dominant, 'jurassique');
  assert.equal(t.total, 3);
});

test('tally : site de périodes mixtes — toutes ses périodes, majoritaire en tête', () => {
  const t = tally([
    { id: 'a', period: 'jurassique' },
    { id: 'b', period: 'cretace' },
    { id: 'c', period: 'cretace' },
  ]);
  assert.equal(t.dominant, 'cretace');
  assert.deepEqual(t.periods, ['cretace', 'jurassique']);
  assert.deepEqual(t.byPeriod, { jurassique: 1, cretace: 2 });
});

test('tally : égalité tranchée dans l’ordre chronologique (Trias d’abord), comme avant L10', () => {
  const t = tally([
    { id: 'b', period: 'cretace' },
    { id: 'a', period: 'trias' },
  ]);
  assert.equal(t.dominant, 'trias');
  assert.deepEqual(t.periods, ['trias', 'cretace']);
});
