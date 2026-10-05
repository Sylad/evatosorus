// Couleur du chiffre des clusters et pins de la carte : noir ou ivoire, selon
// celui qui contraste le mieux avec la couleur de période. Le fond est un dégradé
// radial (couleur + 5 % de blanc au point de lumière) : on prend le pire des deux.
const IVORY = '#ebd9c5';
const BLACK = '#000000';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export const contrastRatio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export const gradientStops = (hex) => {
  const c = rgb(hex);
  return [c, c.map((v) => v * 0.95 + 255 * 0.05)];
};

export function labelColor(hex) {
  const worst = (fg) => Math.min(...gradientStops(hex).map((bg) => contrastRatio(rgb(fg), bg)));
  return worst(BLACK) >= worst(IVORY) ? BLACK : IVORY;
}
