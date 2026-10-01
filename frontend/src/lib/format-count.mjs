// Formatage unique des nombres d'espèces/fiches affichés sur le site (fr-FR).
// Intl.NumberFormat('fr-FR') sépare les milliers par U+202F (espace fine
// insécable), absente de Cinzel et Crimson Text : « 1 511 » s'affichait
// « 1511 ». On la remplace par U+00A0, présente dans ces polices.

const FR = new Intl.NumberFormat('fr-FR');

/** @param {number} n */
export function formatCount(n) {
  return FR.format(n).replace(/ /g, ' ');
}
