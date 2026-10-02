// L27 — pastille « nouveau » du lien Nouveautés (repris d'AetherWX, news-badge) :
// combien d'entrées le visiteur n'a pas vues depuis sa dernière visite de /nouveautes.
// Mémoire localStorage simulée ; dates comparées en millisecondes, jamais en chaînes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NEWS_SEEN_KEY, seenSeparatorLabel, seenSeparatorIndex, ensureBaseline, badgeLabel, countUnseen, isUnseen, markAllSeen, readSeen, unseenLabel } from '../frontend/src/lib/news-badge.ts';

class MemoryStorage {
  map = new Map();
  getItem(k) { return this.map.get(k) ?? null; }
  setItem(k, v) { this.map.set(k, v); }
  removeItem(k) { this.map.delete(k); }
}

const entries = [
  { slug: 'c', date: '2026-09-10' },
  { slug: 'b', date: '2026-09-10' },
  { slug: 'a', date: '2026-09-09' },
];

test('premier visiteur (aucune visite mémorisée) : rien n’est marqué nouveau', () => {
  assert.equal(countUnseen(entries, null), 0);
  assert.ok(!entries.some((e) => isUnseen(e, null)));
  assert.equal(readSeen(null), null);
  assert.equal(readSeen(new MemoryStorage()), null);
});

test('visiter marque tout vu ; la pastille tombe à zéro', () => {
  const st = new MemoryStorage();
  const seen = markAllSeen(st, entries, new Date('2026-09-25T11:57:30Z'));
  // Tous les slugs vus sont mémorisés (all: true), pas seulement ceux de la date la plus récente.
  assert.deepEqual(seen, { date: '2026-09-10', slugs: ['a', 'b', 'c'], at: '2026-09-25T11:57:30.000Z', all: true });
  assert.deepEqual(readSeen(st), seen);
  assert.equal(countUnseen(entries, readSeen(st)), 0);
});

test('une entrée du même jour non vue compte comme nouvelle ; une plus récente aussi', () => {
  const st = new MemoryStorage();
  markAllSeen(st, entries);
  const later = [{ slug: 'e', date: '2026-09-11' }, { slug: 'd', date: '2026-09-10' }, ...entries];
  assert.equal(countUnseen(later, readSeen(st)), 2);
  assert.deepEqual(later.map((e) => isUnseen(e, readSeen(st))), [true, true, false, false, false]);
  markAllSeen(st, later);
  assert.equal(readSeen(st).date, '2026-09-11');
  assert.deepEqual(readSeen(st).slugs, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(countUnseen(later, readSeen(st)), 0);
});

test('instants comparés en millisecondes : 13:15:00Z et 13:15Z sont le même instant', () => {
  const st = new MemoryStorage();
  st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-28T13:15:00Z', slugs: ['soir'] }));
  assert.equal(countUnseen([{ slug: 'soir', date: '2026-09-28T13:15Z' }, { slug: 'matin', date: '2026-09-28T07:20Z' }], readSeen(st)), 0);
  assert.equal(countUnseen([{ slug: 'nuit', date: '2026-09-28T21:05Z' }], readSeen(st)), 1);
});

test('mémoire corrompue ou stockage en panne : pas d’exception', () => {
  const st = new MemoryStorage();
  st.setItem(NEWS_SEEN_KEY, '{pas du json');
  assert.equal(readSeen(st), null);
  st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: 'hier', slugs: [] }));
  assert.equal(readSeen(st), null);
  st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b', 3], at: 42 }));
  assert.deepEqual(readSeen(st), { date: '2026-09-10', slugs: ['b'] });
  st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b'], all: 'oui' }));
  assert.deepEqual(readSeen(st), { date: '2026-09-10', slugs: ['b'] });
  const broken = { getItem: () => { throw new Error('quota'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  assert.equal(readSeen(broken), null);
  assert.equal(markAllSeen(broken, entries).date, '2026-09-10');
  assert.equal(markAllSeen(st, []), null);
});

test('journal réel (nouveautes.json) : visite puis relecture → pastille éteinte', () => {
  const data = JSON.parse(readFileSync(new URL('../frontend/public/nouveautes-data/nouveautes.json', import.meta.url), 'utf8'));
  const st = new MemoryStorage();
  markAllSeen(st, data.entries);
  assert.equal(badgeLabel(countUnseen(data.entries, readSeen(st))), '');
});

test('libellés : pastille vide à zéro, « 9+ » au-delà de neuf ; texte pour lecteur d’écran accordé', () => {
  assert.equal(badgeLabel(0), '');
  assert.equal(badgeLabel(3), '3');
  assert.equal(badgeLabel(12), '9+');
  assert.equal(unseenLabel(0), '');
  assert.equal(unseenLabel(1), '1 nouveauté non vue');
  assert.equal(unseenLabel(4), '4 nouveautés non vues');
});

test('clé de stockage propre au site : evato.news.seen-v1', () => {
  assert.equal(NEWS_SEEN_KEY, 'evato.news.seen-v1');
});

test('séparateur : « Déjà vu lors de votre visite du <date longue> à <heure> », repli sans instant', () => {
  assert.match(seenSeparatorLabel('2026-09-25T11:57:30.000Z'), /^Déjà vu lors de votre visite du 25 septembre 2026 à \d{2}:\d{2}$/);
  assert.equal(seenSeparatorLabel(undefined), 'Déjà vu lors d’une visite précédente');
});

// ── Revue L27 : entrée antidatée, mémoire de base, séparateur ───────────────
test('entrée antidatée (date plus ancienne que la dernière vue) mais jamais vue : nouvelle', () => {
  const st = new MemoryStorage();
  markAllSeen(st, entries);
  const backdated = [...entries, { slug: 'vieux', date: '2026-08-01' }];
  assert.equal(countUnseen(backdated, readSeen(st)), 1);
  assert.ok(isUnseen({ slug: 'vieux', date: '2026-08-01' }, readSeen(st)));
});

test('mémoire au format initial (sans all) : règle de date conservée, rien d’ancien ne redevient nouveau', () => {
  const st = new MemoryStorage();
  st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b', 'c'] }));
  assert.equal(countUnseen(entries, readSeen(st)), 0);
  assert.equal(countUnseen([{ slug: 'd', date: '2026-09-10' }, ...entries], readSeen(st)), 1);
});

test('mémoire de base : première page vue (n’importe laquelle) → tout le publié compte comme vu, sans pastille ; les entrées suivantes la lèvent', () => {
  const st = new MemoryStorage();
  assert.equal(ensureBaseline(st, entries, new Date('2026-10-02T08:00:00Z')), true);
  assert.equal(countUnseen(entries, readSeen(st)), 0);
  assert.equal(readSeen(st).at, '2026-10-02T08:00:00.000Z');
  assert.equal(countUnseen([{ slug: 'neuf', date: '2026-10-02' }, ...entries], readSeen(st)), 1);
  // Une mémoire existante n'est jamais écrasée.
  assert.equal(ensureBaseline(st, [{ slug: 'neuf', date: '2026-10-02' }, ...entries]), false);
  assert.equal(countUnseen([{ slug: 'neuf', date: '2026-10-02' }, ...entries], readSeen(st)), 1);
});

test('mémoire de base sans aucune nouveauté publiée : la première publiée ensuite est nouvelle', () => {
  const st = new MemoryStorage();
  assert.equal(ensureBaseline(st, []), true);
  assert.equal(countUnseen([{ slug: 'premiere', date: '2026-10-02' }], readSeen(st)), 1);
});

test('mémoire de base : stockage absent ou en panne → pas d’exception, rien d’écrit', () => {
  assert.equal(ensureBaseline(null, entries), false);
  const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  assert.equal(ensureBaseline(broken, entries), false);
});

test('séparateur « Déjà vu » : avant la première entrée vue seulement si les nouvelles sont toutes au-dessus', () => {
  assert.equal(seenSeparatorIndex([true, true, false, false]), 2);
  assert.equal(seenSeparatorIndex([true, false, true, false]), -1, 'nouvelles non contiguës : pas de séparateur trompeur');
  assert.equal(seenSeparatorIndex([false, false]), -1, 'rien de nouveau');
  assert.equal(seenSeparatorIndex([true, true]), -1, 'rien de déjà vu');
  assert.equal(seenSeparatorIndex([]), -1);
});
