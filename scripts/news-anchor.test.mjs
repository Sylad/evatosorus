// L27 — lien permanent `/nouveautes/#<slug>` (repris d'AetherWX, news-anchor) :
// quel slug viser pour un fragment d'URL, et l'URL à copier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entryForFragment, permalink } from '../frontend/src/lib/news-anchor.ts';

const entries = [{ slug: 'zones-de-donnees' }, { slug: 'données-synop' }];

test('fragment exact, avec ou sans « # » → slug', () => {
  assert.equal(entryForFragment('zones-de-donnees', entries), 'zones-de-donnees');
  assert.equal(entryForFragment('#zones-de-donnees', entries), 'zones-de-donnees');
});

test('fragment encodé (copié depuis une barre d’adresse) → slug décodé', () => {
  assert.equal(entryForFragment('#donn%C3%A9es-synop', entries), 'données-synop');
});

test('fragment absent, vide, inconnu ou mal encodé → null', () => {
  for (const f of [null, undefined, '', '#', 'inconnu', '%E0%A4%A']) assert.equal(entryForFragment(f, entries), null, String(f));
});

test('permalink : URL absolue de la page, fragment encodé', () => {
  assert.equal(permalink('https://evatosorus.pages.dev', 'zones-de-donnees'), 'https://evatosorus.pages.dev/nouveautes/#zones-de-donnees');
  assert.equal(permalink('http://localhost:4334', 'données-synop'), 'http://localhost:4334/nouveautes/#donn%C3%A9es-synop');
});
