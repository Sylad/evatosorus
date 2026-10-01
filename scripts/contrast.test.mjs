// L20 — contraste du texte du pied de page latéral (et « 252 → 66 Ma » du tiroir,
// même élément) : ≥ 4,5:1 (WCAG 2.2 AA, 1.4.3) sur le fond mesuré #0D0B06.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (fg, bg) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
const over = (rgb, alpha, bg) => rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const BG = [0x0d, 0x0b, 0x06];
const read = (p) => readFileSync(new URL(`../frontend/src/${p}`, import.meta.url), 'utf8');

test('ratio : valeurs de référence WCAG', () => {
  assert.equal(ratio([0, 0, 0], [255, 255, 255]).toFixed(2), '21.00');
  // Mesure de la revue UX L18 : rgba(235,217,197,.35) sur #0D0B06 = 2,6:1.
  assert.equal(ratio(over([235, 217, 197], 0.35, BG), BG).toFixed(1), '2.6');
});

test('--color-evato-bone-ghost atteint 4,5:1 sur #0D0B06, en restant le beige chaud', () => {
  const m = read('styles/global.css').match(/--color-evato-bone-ghost:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  assert.ok(m, 'token rgba introuvable');
  const [r, g, b, a] = m.slice(1).map(Number);
  assert.deepEqual([r, g, b], [235, 217, 197]);
  assert.ok(ratio(over([r, g, b], a, BG), BG) >= 4.5, `ratio ${ratio(over([r, g, b], a, BG), BG).toFixed(2)}`);
});

test('pied du tiroir / de la barre latérale (« 252 → 66 Ma ») porte ce token', () => {
  const src = read('layouts/CodexLayout.astro');
  assert.match(src, /class="text-xs text-evato-bone-ghost italic">\s*252 → 66 Ma/);
});
