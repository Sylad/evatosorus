/**
 * L22 — titres dimensionnés sur leur plus long mot. La chasse de chaque caractère de
 * Cinzel 400 (em) est mesurée une fois dans Chromium (scripts/measure-cinzel-advances.mjs →
 * cinzel-advances.json). Au build, chaque titre reçoit --word-em : largeur de son plus
 * long mot en em, espacement des lettres compris ; la CSS en déduit la taille
 * calc(100cqi / var(--word-em)), bornée par un plancher et la taille d'origine. Ainsi un
 * mot ne passe jamais à la ligne en son milieu ni ne déborde, sans rapetisser les titres
 * qui tiennent. Module pur, testé par node --test (scripts/title-fit.test.mjs).
 */
import ADV from './cinzel-advances.json' with { type: 'json' };

/** Caractère absent de la table : chasse prudente (celle d'un M). */
const UNKNOWN = 0.95;
/** Marge pour l'approche et l'arrondi de rendu (la table ignore le crénage, qui resserre). */
const MARGIN = 1.03;

/**
 * Largeur d'un mot en em.
 * @param {string} word @param {number} letterSpacingEm @returns {number}
 */
export function wordEm(word, letterSpacingEm) {
  let w = 0;
  for (const c of word) w += (ADV[c] ?? UNKNOWN) + letterSpacingEm;
  return w * MARGIN;
}

/**
 * Largeur en em du plus long mot d'un texte (mots séparés par des espaces ; un trait
 * d'union est une coupure permise, il reste avec la partie qui le précède).
 * @param {string} text @param {number} letterSpacingEm @returns {number}
 */
export function longestWordEm(text, letterSpacingEm) {
  const words = String(text).split(/\s+/).flatMap((w) => w.split(/(?<=-)/)).filter(Boolean);
  return Math.max(0, ...words.map((w) => wordEm(w, letterSpacingEm)));
}

/**
 * Attribut style d'un titre ajusté : « --word-em:11.234 ».
 * @param {string} text @param {number} letterSpacingEm @returns {string}
 */
export function fitStyle(text, letterSpacingEm) {
  return `--word-em:${longestWordEm(text, letterSpacingEm).toFixed(3)}`;
}

/** Espacement des lettres (em) par contexte — doit suivre la CSS correspondante. */
export const LS = { heading: 0.06, card: 0.04, vitrine: 0.03, vitrineHero: 0.02 };
