/**
 * L28 — ce que la page « Plan de travail » publie du plan (docs/plan/raf.yaml, tenu par raf).
 *
 * LISTE BLANCHE : de chaque lot on ne recopie que l'identifiant, le titre, l'état, la
 * date de livraison et le décompte des sous-tâches. Notes, verdicts UX, raisons
 * d'abandon et titres de sous-tâches peuvent contenir des informations privées : ils
 * ne sont jamais lus ici, donc jamais rendus. Module pur, testé par node --test
 * (scripts/plan-public.test.mjs) ; la page l'appelle au build.
 */
import { parse } from 'yaml';

export type PublicStatus = 'doing' | 'todo' | 'done';

export interface PublicLot {
  id: string;
  title: string;
  status: PublicStatus;
  /** Lot terminé : date de livraison (YYYY-MM-DD) si le plan la connaît. */
  finished?: string;
  /** Sous-tâches non abandonnées : combien sont faites sur combien. */
  tasks?: { done: number; total: number };
}

export interface PublicPlan {
  doing: PublicLot[];
  todo: PublicLot[];
  /** Les RECENT_DONE derniers lots terminés, le plus récent en haut. */
  done: PublicLot[];
  counts: { doing: number; todo: number; done: number };
}

/** Nombre de lots livrés affichés (« récemment livré »). */
export const RECENT_DONE = 8;

const STATUSES: ReadonlySet<string> = new Set(['doing', 'todo', 'done']);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown): string | undefined => (typeof v === 'string' && DAY.test(v) ? v : undefined);

function toPublic(raw: unknown): (PublicLot & { sortKey: string }) | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || !r.title.trim()) return null;
  if (typeof r.status !== 'string' || !STATUSES.has(r.status)) return null;
  const lot: PublicLot & { sortKey: string } = {
    id: r.id,
    title: r.title,
    status: r.status as PublicStatus,
    sortKey: day(r.finished) ?? day(r.started) ?? day(r.created) ?? '',
  };
  if (lot.status === 'done' && day(r.finished)) lot.finished = day(r.finished);
  if (Array.isArray(r.tasks)) {
    const states = r.tasks
      .map((t) => (typeof t === 'object' && t !== null ? (t as Record<string, unknown>).status : null))
      .filter((s) => s !== 'dropped');
    if (states.length) lot.tasks = { done: states.filter((s) => s === 'done').length, total: states.length };
  }
  return lot;
}

const strip = ({ sortKey: _sortKey, ...lot }: PublicLot & { sortKey: string }): PublicLot => lot;

export function publicPlan(plan: unknown): PublicPlan {
  const rawLots = typeof plan === 'object' && plan !== null ? (plan as { lots?: unknown }).lots : null;
  const lots = (Array.isArray(rawLots) ? rawLots : []).map(toPublic).filter((l) => l !== null);
  const doing = lots.filter((l) => l.status === 'doing');
  const todo = lots.filter((l) => l.status === 'todo');
  // Tri stable : à date égale, le lot le plus loin dans le plan (le plus récent) d'abord.
  const done = lots
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.status === 'done')
    .sort((a, b) => b.l.sortKey.localeCompare(a.l.sortKey) || b.i - a.i)
    .map(({ l }) => l);
  return {
    doing: doing.map(strip),
    todo: todo.map(strip),
    done: done.slice(0, RECENT_DONE).map(strip),
    counts: { doing: doing.length, todo: todo.length, done: done.length },
  };
}

/** Lit le texte de raf.yaml (dates laissées en texte, schéma YAML 1.2 core). */
export function parsePublicPlan(yamlText: string): PublicPlan {
  return publicPlan(parse(yamlText));
}
