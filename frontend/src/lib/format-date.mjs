/**
 * Revue UX L27/L28 — mise en forme UNIQUE des dates en français : Nouveautés, séparateur
 * « Déjà vu lors de votre visite du … », Plan de travail. Le premier du mois s'écrit
 * « 1er » (« 1er octobre 2026 »), ce que Intl ne fait pas. Module pur, testé par
 * node --test (scripts/format-date.test.mjs). En .mjs, comme format-count.mjs : importable tel quel
 * par node --test depuis les modules .ts.
 */
/** @type {Intl.DateTimeFormatOptions} */
const LONG = { day: 'numeric', month: 'long', year: 'numeric' };

/**
 * Date longue d'un instant dans un fuseau (par défaut celui du navigateur).
 * @param {Date} date @param {string} [timeZone] @returns {string}
 */
export function formatLongDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('fr-FR', { ...LONG, ...(timeZone ? { timeZone } : {}) }).formatToParts(date);
  return parts.map((p) => (p.type === 'day' && p.value === '1' ? '1er' : p.value)).join('');
}

/**
 * Jour calendaire « YYYY-MM-DD » (sans fuseau : midi UTC, jamais la veille).
 * @param {string} day @returns {string}
 */
export function formatDay(day) {
  return formatLongDate(new Date(`${day}T12:00:00Z`), 'UTC');
}

/**
 * Heure « 10:30 » d'un instant, dans un fuseau (par défaut celui du navigateur).
 * @param {Date} date @param {string} [timeZone] @returns {string}
 */
export function formatTime(date, timeZone) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) });
}
