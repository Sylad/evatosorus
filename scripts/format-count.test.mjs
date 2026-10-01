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
