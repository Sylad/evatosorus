import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCount } from '../frontend/src/lib/format-count.mjs';

test('formatCount : séparateur de milliers fr-FR en espace insécable U+00A0', () => {
  assert.equal(formatCount(1511), '1 511');
  assert.equal(formatCount(1500), '1 500');
});

test('formatCount : pas de séparateur sous 1000, jamais d\'U+202F', () => {
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(0), '0');
  assert.ok(!formatCount(1234567).includes(' '));
  assert.equal(formatCount(1234567), '1 234 567');
});

import { readFileSync } from 'node:fs';

test('meta/pied de page : « plus de 1 500 » (U+00A0), plus de « 1500+ » ni « 1500 espèces »', () => {
  const read = (p) => readFileSync(new URL(`../frontend/src/${p}`, import.meta.url), 'utf8');
  for (const p of ['pages/index.astro', 'layouts/CodexLayout.astro', 'pages/about.astro', 'pages/codex.astro']) {
    assert.ok(!/1500\+|1500 espèces/.test(read(p)), p);
  }
  assert.ok(read('pages/index.astro').includes('lus de 1 500 espèces'));
  assert.ok(read('layouts/CodexLayout.astro').includes('lus de 1 500 espèces'));
});

import { formatRange } from '../frontend/src/lib/format-count.mjs';

test('formatRange (L19) : tiret demi-cadratin U+2013 entouré d\'espaces insécables', () => {
  assert.equal(formatRange(1501, 1511), '1\u00a0501\u00a0\u2013\u00a01\u00a0511');
  assert.equal(formatRange(1, 60), '1\u00a0\u2013\u00a060');
  assert.ok(!formatRange(1501, 1511).includes('-'));
});

test('compteur du codex (L19) : bornes via formatRange, plus de trait d\'union entre bornes', () => {
  const src = readFileSync(new URL('../frontend/src/components/CodexBrowser.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('{formatRange(startNum, endNum)}'));
  assert.ok(!/formatCount\(startNum\)\}-\{formatCount\(endNum\)/.test(src));
});
