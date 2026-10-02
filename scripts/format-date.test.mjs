// Revue UX L27/L28 — une seule mise en forme des dates en français pour les Nouveautés,
// le séparateur « Déjà vu lors de votre visite du … » et le Plan de travail :
// « 1er octobre 2026 » (ordinal du premier du mois), jamais « 1 octobre 2026 ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDay, formatLongDate } from '../frontend/src/lib/format-date.mjs';
import { seenSeparatorLabel } from '../frontend/src/lib/news-badge.ts';

test('formatDay (YYYY-MM-DD) : « 1er » le premier du mois, chiffre simple ensuite', () => {
  assert.equal(formatDay('2026-10-01'), '1er octobre 2026');
  assert.equal(formatDay('2026-10-02'), '2 octobre 2026');
  assert.equal(formatDay('2026-09-21'), '21 septembre 2026', '21 n’est pas « 21er »');
  assert.equal(formatDay('2026-01-11'), '11 janvier 2026');
});

test('formatLongDate (instant) : dans le fuseau demandé', () => {
  assert.equal(formatLongDate(new Date('2026-09-30T22:30:00Z'), 'Europe/Paris'), '1er octobre 2026');
  assert.equal(formatLongDate(new Date('2026-09-30T22:30:00Z'), 'UTC'), '30 septembre 2026');
});

test('séparateur « Déjà vu » : même formateur (« 1er »)', () => {
  assert.match(seenSeparatorLabel('2026-10-01T08:30:00.000Z', 'Europe/Paris'), /^Déjà vu lors de votre visite du 1er octobre 2026 à 10:30$/);
});
