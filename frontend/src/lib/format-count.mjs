// Formatage unique des nombres d'espèces/fiches affichés sur le site (fr-FR).
// Intl.NumberFormat('fr-FR') sépare les milliers par U+202F (espace fine
// insécable), absente de Cinzel et Crimson Text : « 1 511 » s'affichait
// « 1511 ». On la remplace par U+00A0, présente dans ces polices.

const FR = new Intl.NumberFormat('fr-FR');

/** @param {number} n */
export function formatCount(n) {
  return FR.format(n).replace(/ /g, ' ');
}

/**
 * Intervalle « 1 501 – 1 511 » (L19) : tiret demi-cadratin U+2013 entre bornes,
 * entouré d'espaces insécables pour que la plage ne se coupe pas en fin de ligne.
 * @param {number} start
 * @param {number} end
 */
export function formatRange(start, end) {
  return `${formatCount(start)} – ${formatCount(end)}`;
}
