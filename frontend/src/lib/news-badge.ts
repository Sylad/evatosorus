/**
 * L27 — pastille « nouveau » du lien Nouveautés (repris d’AetherWX news-badge via claude-code-codex) :
 * combien d'entrées le visiteur n'a pas encore vues depuis sa dernière visite de
 * /nouveautes. Module pur, testé par node --test (scripts/news-badge.test.mjs).
 *
 * On mémorise dans localStorage TOUS les slugs vus (`all: true`), la date de l'entrée
 * la plus récente vue et l'instant de la visite : une entrée est « nouvelle » si son
 * slug n'a jamais été vu, même antidatée (revue L27). Une mémoire au format initial
 * (sans `all`, slugs de la seule date la plus récente) garde l'ancienne règle : nouvelle
 * si absente des slugs ET pas plus ancienne que cette date — dates comparées en
 * millisecondes, jamais en chaînes (`13:15:00Z` < `13:15Z` en chaîne).
 */
import { formatLongDate, formatTime } from "./format-date.mjs";

export const NEWS_SEEN_KEY = "evato.news.seen-v1";

export interface NewsSeen {
  /** Date (YYYY-MM-DD) ou instant (YYYY-MM-DDTHH:MM[:SS]Z) de l'entrée la plus récente vue. */
  date: string;
  /** Slugs vus portant cette date. */
  slugs: string[];
  /** Instant de la visite (ISO), pour le séparateur « Déjà vu lors de votre visite du … ». */
  at?: string;
  /** Vrai : `slugs` porte TOUS les slugs vus (sinon format initial, slugs de `date` seulement). */
  all?: true;
}

export interface DatedEntry {
  slug: string;
  date: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DATE_OR_INSTANT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z)?$/;

/** Millisecondes UTC d'une date ou d'un instant ; NaN si illisible. */
function instant(d: string): number {
  return DATE_OR_INSTANT.test(d) ? Date.parse(d) : NaN;
}

export function readSeen(storage: StorageLike | null): NewsSeen | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(NEWS_SEEN_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { date, slugs, at, all } = parsed as { date?: unknown; slugs?: unknown; at?: unknown; all?: unknown };
    if (typeof date !== "string" || Number.isNaN(instant(date)) || !Array.isArray(slugs)) return null;
    return {
      date,
      slugs: slugs.filter((s): s is string => typeof s === "string"),
      ...(typeof at === "string" && !Number.isNaN(Date.parse(at)) ? { at } : {}),
      ...(all === true ? { all: true as const } : {}),
    };
  } catch {
    return null;
  }
}

/** Marque toutes les entrées comme vues ; retourne ce qui a été mémorisé. */
export function markAllSeen(
  storage: StorageLike | null,
  entries: readonly DatedEntry[],
  now: Date = new Date(),
): NewsSeen | null {
  if (!entries.length) return null;
  const date = entries.reduce((max, e) => (instant(e.date) > instant(max) ? e.date : max), entries[0].date);
  const seen: NewsSeen = {
    date,
    slugs: entries.map((e) => e.slug).sort(),
    at: now.toISOString(),
    all: true,
  };
  write(storage, seen);
  return seen;
}

function write(storage: StorageLike | null, seen: NewsSeen): boolean {
  if (!storage) return false;
  try {
    storage.setItem(NEWS_SEEN_KEY, JSON.stringify(seen));
    return true;
  } catch {
    return false; /* stockage indisponible : la pastille restera */
  }
}

/**
 * Mémoire de base (revue L27) : à la toute première page vue — n'importe laquelle —
 * tout ce qui est déjà publié compte comme vu, sans pastille ; les entrées publiées
 * ensuite la lèveront même si le visiteur n'ouvre jamais /nouveautes/. Une mémoire
 * existante n'est jamais écrasée. Retourne vrai si une mémoire a été écrite.
 */
export function ensureBaseline(
  storage: StorageLike | null,
  entries: readonly DatedEntry[],
  now: Date = new Date(),
): boolean {
  if (!storage || readSeen(storage)) return false;
  if (entries.length) {
    const seen = markAllSeen(null, entries, now)!;
    return write(storage, seen);
  }
  return write(storage, { date: "1970-01-01", slugs: [], at: now.toISOString(), all: true });
}

/** Entrée non vue lors de la visite `seen` ; premier visiteur (null) : rien n'est nouveau. */
export function isUnseen(entry: DatedEntry, seen: NewsSeen | null): boolean {
  if (!seen) return false;
  if (seen.slugs.includes(entry.slug)) return false;
  return seen.all === true || instant(entry.date) >= instant(seen.date);
}

/**
 * Où poser le séparateur « Déjà vu … » (liste du plus récent au plus ancien) : avant la
 * première entrée vue, seulement si toutes les nouvelles sont au-dessus ; sinon (entrée
 * antidatée plus bas) -1, pas de séparateur trompeur — les marques « Nouveau » suffisent.
 */
export function seenSeparatorIndex(fresh: readonly boolean[]): number {
  const first = fresh.indexOf(false);
  if (first <= 0) return -1;
  return fresh.slice(first).includes(true) ? -1 : first;
}

export function countUnseen(entries: readonly DatedEntry[], seen: NewsSeen | null): number {
  return entries.filter((e) => isUnseen(e, seen)).length;
}

/** Libellé de la pastille : vide à zéro, « 9+ » au-delà de neuf. */
export function badgeLabel(count: number): string {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}

/** Texte pour lecteur d'écran (la pastille seule n'est qu'une forme colorée). */
export function unseenLabel(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 nouveauté non vue" : `${count} nouveautés non vues`;
}

/** localStorage, ou null s'il est inaccessible (navigation privée stricte, iframe…). */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Événement émis après la visite de /nouveautes : la barre (persistée) relit la mémoire. */
export const NEWS_SEEN_EVENT = "evato:news-seen";

/** Texte du séparateur posé avant la première entrée déjà vue (fuseau du navigateur par défaut). */
export function seenSeparatorLabel(at: string | undefined, timeZone?: string): string {
  if (!at || Number.isNaN(Date.parse(at))) return "Déjà vu lors d’une visite précédente";
  const d = new Date(at);
  return `Déjà vu lors de votre visite du ${formatLongDate(d, timeZone)} à ${formatTime(d, timeZone)}`;
}
