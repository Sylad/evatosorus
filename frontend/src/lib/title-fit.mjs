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

/** Césure douce (U+00AD) : invisible tant que la ligne ne se coupe pas là. */
export const SHY = '\u00AD';

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
  for (const c of word) if (c !== SHY) w += (ADV[c] ?? UNKNOWN) + letterSpacingEm;
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

/**
 * L30 — titre de fiche espèce : plancher 1,5rem. Largeur la plus étroite du titre : contenu
 * d'un écran de 320 px, 320 px moins deux marges de 1,25rem (police racine 17,5 px), soit
 * 276,25 px ; au plancher (26,25 px) elle vaut ≈ 10,52 em. Un mot plus large reçoit des
 * césures douces (softHyphenate). La CSS (.detail-header h1, --fit-floor) suit FLOOR_REM.
 */
export const SPECIES_TITLE = { floorRem: 1.5, rootPx: 17.5, narrowestPx: 320 - 2 * 1.25 * 17.5 };
export const SPECIES_TITLE_MAX_EM = SPECIES_TITLE.narrowestPx / (SPECIES_TITLE.floorRem * SPECIES_TITLE.rootPx);

const VOWEL = /[aeiouyàâäéèêëîïôöùûüÿœæ]/i;
/** Attaques indissociables : digrammes (ch, ph, th, rh, gh, kh, sh), gn, consonne + r ou l ;
 *  pt et ps (racines grecques -pterus, -psis) au bout d'un groupe d'au moins trois consonnes. */
const ONSET = /^(?:[cpgtrks]h|gn|[bcdfgkpstv][rl])$/i;
const ONSET_LONG = /^p[ts]$/i;

/**
 * Coupures syllabiques d'un mot (indices où une césure est permise) : entre deux voyelles,
 * avant la dernière consonne du groupe, ou avant les deux dernières si elles forment une
 * attaque indissociable (Mi-cro-pa-chy-ce-pha-lo-sau-rus). Jamais à moins de deux lettres
 * d'un bord, jamais entre deux voyelles (au, eu, oo restent ensemble).
 * @param {string} word @returns {number[]}
 */
export function syllableBreaks(word) {
  const breaks = [];
  const letters = [...word];
  let i = 0;
  while (i < letters.length && !VOWEL.test(letters[i])) i++;
  while (i < letters.length) {
    // i : une voyelle ; on saute le noyau vocalique, puis le groupe de consonnes.
    while (i < letters.length && VOWEL.test(letters[i])) i++;
    const start = i;
    while (i < letters.length && !VOWEL.test(letters[i]) && /\p{L}/u.test(letters[i])) i++;
    if (i >= letters.length || !VOWEL.test(letters[i])) break; // fin du mot ou non-lettre
    const n = i - start;
    if (n === 0) continue;
    const last2 = letters.slice(i - 2, i).join('');
    const at = (n >= 2 && ONSET.test(last2)) || (n >= 3 && ONSET_LONG.test(last2)) ? i - 2 : i - 1;
    if (at >= 2 && letters.length - at >= 2) breaks.push(at);
  }
  return breaks;
}

/**
 * Pose des césures douces dans les mots plus larges que maxEm : à chaque coupure
 * syllabique, plus des coupures entre lettres si une syllabe (trait d'union compris) ne
 * tenait pas seule. Le navigateur coupe à la dernière césure qui tient sur la ligne. Les
 * autres mots, et les mots qui tiennent, sont rendus tels quels.
 * @param {string} text @param {number} letterSpacingEm @param {number} maxEm @returns {string}
 */
export function softHyphenate(text, letterSpacingEm, maxEm) {
  return String(text).replace(/[^\s-]+/g, (word) => {
    if (wordEm(word, letterSpacingEm) <= maxEm) return word;
    const letters = [...word];
    const cuts = [0, ...syllableBreaks(word), letters.length];
    const out = [];
    for (let k = 0; k < cuts.length - 1; k++) {
      let piece = '';
      for (const c of letters.slice(cuts[k], cuts[k + 1])) {
        if (piece && wordEm(`${piece}${c}-`, letterSpacingEm) > maxEm) { out.push(piece); piece = ''; }
        piece += c;
      }
      out.push(piece);
    }
    return out.join(SHY);
  });
}
