// L20 — contraste du texte du pied de page latéral (et « 252 → 66 Ma » du tiroir,
// même élément) : ≥ 4,5:1 (WCAG 2.2 AA, 1.4.3) sur le fond mesuré #0D0B06.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, gradientStops, labelColor } from '../frontend/src/data/label-color.mjs';

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (fg, bg) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
const over = (rgb, alpha, bg) => rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const BG = [0x0d, 0x0b, 0x06];
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
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

// L24 — chiffres des clusters (.evato-cluster) et des pins groupés (.evato-pin-count) :
// ≥ 4,5:1 (1.4.3 ; ni 18,66 px gras, donc pas « grand texte ») sur chaque couleur de période
// de periods.ts (source unique), sur les deux extrémités du dégradé radial.
test('carte : une seule source de couleurs de période (periods.ts)', () => {
  const src = read('components/PaleoMap.tsx');
  assert.doesNotMatch(src, /PERIOD_COLOR[^;]*#[0-9a-f]{6}/i);
  assert.match(src, /PERIODS\.map/);
});

test('carte : chiffres des clusters et pins ≥ 4,5:1 sur chaque couleur de période', () => {
  const colors = [...read('data/periods.ts').matchAll(/accentColor:\s*'(#[0-9a-f]{6})'/gi)].map((m) => m[1]);
  assert.equal(colors.length, 3);
  for (const hex of colors) {
    const fg = rgbOf(labelColor(hex));
    for (const bg of gradientStops(hex)) {
      assert.ok(contrastRatio(fg, bg) >= 4.5, `${hex} : ${contrastRatio(fg, bg).toFixed(2)}:1`);
    }
  }
});
