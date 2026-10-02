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

/**
 * Nombre décimal en français (L22) : virgule décimale, milliers en U+00A0 comme
 * formatCount (U+202F absente des polices). Longueurs, hauteurs, masses, datations.
 * @param {number} n
 * @param {number} [maximumFractionDigits] 3 par défaut (valeur de Intl), 1 pour les masses
 */
export function formatDecimal(n, maximumFractionDigits = 3) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(n).replace(/ /g, ' ');
}

/**
 * Masse courte (L22) : kilogrammes sous la tonne (« 15 kg », « 0,5 kg »), tonnes au-delà
 * (« 8,8 t ») — jamais « 0 t » pour un petit animal. Unité tenue par U+00A0.
 * @param {number} kg
 */
export function formatMass(kg) {
  if (Math.round(kg) < 1000) return `${formatDecimal(kg, kg < 10 ? 1 : 0)} kg`;
  return `${formatDecimal(kg / 1000, 1)} t`;
}

/**
 * Masse en toutes lettres : « 15 kilogrammes », « 1,5 tonne », « 8,8 tonnes » (pluriel à
 * partir de 2, règle du français).
 * @param {number} kg
 */
export function formatMassLong(kg) {
  const small = Math.round(kg) < 1000;
  const n = small ? kg : kg / 1000;
  const shown = formatDecimal(n, small ? (kg < 10 ? 1 : 0) : 1);
  const value = Number(shown.replace(/ /g, '').replace(',', '.'));
  return `${shown} ${small ? 'kilogramme' : 'tonne'}${value >= 2 ? 's' : ''}`;
}

/**
 * Note sur 10 (IMDb) : toujours une décimale, virgule (« 7,0 », « 8,2 »).
 * @param {number} n
 */
export function formatRating(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}
