/**
 * L27 — pastille « nouveau » du lien Nouveautés (repris d’AetherWX news-badge via claude-code-codex) :
 * combien d'entrées le visiteur n'a pas encore vues depuis sa dernière visite de
 * /nouveautes. Module pur, testé par node --test (scripts/news-badge.test.mjs).
 *
 * On mémorise dans localStorage la date de l'entrée la plus récente vue et les slugs
 * de cette date : une entrée est « nouvelle » si elle est postérieure, ou de la même
 * date mais absente des slugs vus. Dates comparées en millisecondes, jamais en chaînes
 * (`13:15:00Z` < `13:15Z` en chaîne).
 */
export const NEWS_SEEN_KEY = "evato.news.seen-v1";

export interface NewsSeen {
  /** Date (YYYY-MM-DD) ou instant (YYYY-MM-DDTHH:MM[:SS]Z) de l'entrée la plus récente vue. */
  date: string;
  /** Slugs vus portant cette date. */
  slugs: string[];
  /** Instant de la visite (ISO), pour le séparateur « Déjà vu lors de votre visite du … ». */
  at?: string;
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
    const { date, slugs, at } = parsed as { date?: unknown; slugs?: unknown; at?: unknown };
    if (typeof date !== "string" || Number.isNaN(instant(date)) || !Array.isArray(slugs)) return null;
    return {
      date,
      slugs: slugs.filter((s): s is string => typeof s === "string"),
      ...(typeof at === "string" && !Number.isNaN(Date.parse(at)) ? { at } : {}),
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
    slugs: entries.filter((e) => instant(e.date) === instant(date)).map((e) => e.slug).sort(),
    at: now.toISOString(),
  };
  try {
    storage?.setItem(NEWS_SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* stockage indisponible : la pastille restera */
  }
  return seen;
}

/** Entrée non vue lors de la visite `seen` ; premier visiteur (null) : rien n'est nouveau. */
export function isUnseen(entry: DatedEntry, seen: NewsSeen | null): boolean {
  if (!seen) return false;
  return !seen.slugs.includes(entry.slug) && instant(entry.date) >= instant(seen.date);
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

/** Texte du séparateur posé avant la première entrée déjà vue. */
export function seenSeparatorLabel(at: string | undefined): string {
  if (!at || Number.isNaN(Date.parse(at))) return "Déjà vu lors d’une visite précédente";
  const d = new Date(at);
  const day = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Déjà vu lors de votre visite du ${day} à ${time}`;
}
