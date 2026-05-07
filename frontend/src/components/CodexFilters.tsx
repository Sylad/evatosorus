import { useEffect, useMemo, useState } from 'react';

type FilterState = {
  q: string;
  period: 'all' | 'trias' | 'jurassique' | 'cretace';
  diet: 'all' | 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';
  group: string;
  withImageOnly: boolean;
};

const PAGE_SIZE = 60;

// Driven entirely by data attributes on the species cards rendered by
// Astro — keeps the "1500 cards in DOM" path working without ever
// hydrating the cards themselves. Only the controls are interactive.
export function CodexFilters({ taxonGroups }: { taxonGroups: { id: string; label: string }[] }) {
  const [state, setState] = useState<FilterState>({
    q: '',
    period: 'all',
    diet: 'all',
    group: 'all',
    withImageOnly: true, // par défaut on cache les fiches sans image
  });
  const [count, setCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const filterFn = useMemo(() => {
    const needle = state.q.trim().toLowerCase();
    return (el: HTMLElement) => {
      const periodId = el.dataset.period ?? '';
      const diet = el.dataset.diet ?? '';
      const group = el.dataset.group ?? '';
      const hasImage = el.dataset.hasImage === 'true';
      const haystack = (el.dataset.haystack ?? '').toLowerCase();
      if (state.period !== 'all' && periodId !== state.period) return false;
      if (state.diet !== 'all' && diet !== state.diet) return false;
      if (state.group !== 'all' && group !== state.group) return false;
      if (state.withImageOnly && !hasImage) return false;
      if (needle && !haystack.includes(needle)) return false;
      return true;
    };
  }, [state]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-species-card]'));
    let matching = 0;
    let shown = 0;
    for (const c of cards) {
      const ok = filterFn(c);
      if (!ok) {
        c.style.display = 'none';
        continue;
      }
      matching++;
      if (shown < visibleLimit) {
        c.style.display = '';
        shown++;
      } else {
        c.style.display = 'none';
      }
    }
    setCount(shown);
    setMatchCount(matching);
  }, [filterFn, visibleLimit]);

  // Reset la limite quand le filtre change (sinon "voir plus" deviendrait
  // bizarre si on filtre puis on charge plus).
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [state.q, state.period, state.diet, state.group, state.withImageOnly]);

  const canLoadMore = count < matchCount;

  return (
    <div className="codex-filters">
      <div className="filter-row">
        <input
          type="search"
          placeholder="Rechercher (T-Rex, Diplodocus, théropode...)"
          value={state.q}
          onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))}
          className="filter-search"
          aria-label="Recherche par nom"
        />
        <label className="toggle-image">
          <input
            type="checkbox"
            checked={state.withImageOnly}
            onChange={(e) => setState((s) => ({ ...s, withImageOnly: e.target.checked }))}
          />
          <span>Avec image</span>
        </label>
        <span className="filter-count">
          {count}<span className="of-total"> / {matchCount}</span>
        </span>
      </div>

      <div className="filter-row">
        <fieldset>
          <legend>Période</legend>
          {(['all', 'trias', 'jurassique', 'cretace'] as const).map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="period"
                checked={state.period === p}
                onChange={() => setState((s) => ({ ...s, period: p }))}
              />
              <span>{p === 'all' ? 'Toutes' : p === 'trias' ? 'Trias' : p === 'jurassique' ? 'Jurassique' : 'Crétacé'}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Régime</legend>
          {(['all', 'carnivore', 'herbivore', 'omnivore', 'piscivore'] as const).map((d) => (
            <label key={d}>
              <input
                type="radio"
                name="diet"
                checked={state.diet === d}
                onChange={() => setState((s) => ({ ...s, diet: d }))}
              />
              <span>{d === 'all' ? 'Tous' : d.charAt(0).toUpperCase() + d.slice(1)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Groupe</legend>
          <select
            value={state.group}
            onChange={(e) => setState((s) => ({ ...s, group: e.target.value }))}
            className="filter-select"
          >
            <option value="all">Tous</option>
            {taxonGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </fieldset>
      </div>

      {canLoadMore && (
        <button
          type="button"
          className="load-more"
          onClick={() => setVisibleLimit((l) => l + PAGE_SIZE)}
        >
          Voir plus ({Math.min(PAGE_SIZE, matchCount - count)} de plus, {matchCount - count} restantes)
        </button>
      )}

      <style>{`
        .codex-filters {
          background: rgba(26, 18, 10, 0.55);
          border: 1px solid rgba(212, 165, 94, 0.18);
          border-radius: 6px;
          padding: 1.2rem 1.4rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .toggle-image {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          background: rgba(13, 10, 6, 0.5);
          border: 1px solid rgba(212, 165, 94, 0.25);
          border-radius: 4px;
          color: var(--color-evato-bone-muted);
          cursor: pointer;
          font-size: 0.85rem;
          transition: border-color 200ms, color 200ms;
        }
        .toggle-image:hover { color: var(--color-evato-bone); border-color: var(--color-evato-amber); }
        .toggle-image input { accent-color: var(--color-evato-amber); }
        .of-total {
          color: var(--color-evato-bone-muted);
          font-size: 0.7rem;
          margin-left: 0.25rem;
        }
        .load-more {
          margin: 1.5rem auto 0;
          padding: 0.7rem 1.6rem;
          background: rgba(13, 10, 6, 0.78);
          border: 2px solid var(--color-evato-amber);
          border-radius: 4px;
          color: var(--color-evato-amber);
          font-family: var(--font-display);
          font-size: 0.78rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          cursor: pointer;
          transition: transform 200ms, box-shadow 200ms, color 200ms;
          align-self: center;
        }
        .load-more:hover {
          transform: translateY(-2px);
          color: var(--color-evato-amber-bright);
          box-shadow: 0 0 0 1px var(--color-evato-amber-bright), 0 0 28px rgba(255, 200, 121, 0.5);
        }
        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1.2rem;
          align-items: center;
        }
        .filter-search {
          flex: 1;
          min-width: 280px;
          background: rgba(13, 10, 6, 0.5);
          border: 1px solid rgba(212, 165, 94, 0.25);
          color: var(--color-evato-bone);
          padding: 0.55rem 0.9rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          border-radius: 4px;
        }
        .filter-search:focus {
          outline: none;
          border-color: var(--color-evato-amber);
          box-shadow: 0 0 0 3px rgba(212, 165, 94, 0.18);
        }
        .filter-count {
          font-family: var(--font-display);
          font-size: 0.78rem;
          letter-spacing: 0.22em;
          color: var(--color-evato-amber);
        }
        fieldset {
          border: 0;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 0.6rem;
          align-items: center;
          flex-wrap: wrap;
        }
        legend {
          font-family: var(--font-display);
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          color: var(--color-evato-bone-muted);
          text-transform: uppercase;
          padding: 0;
          margin-right: 0.6rem;
        }
        fieldset label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.85rem;
          color: var(--color-evato-bone-muted);
          cursor: pointer;
          transition: color 200ms ease;
        }
        fieldset label:hover { color: var(--color-evato-bone); }
        fieldset input[type="radio"] {
          appearance: none;
          width: 14px; height: 14px;
          border: 1px solid rgba(212, 165, 94, 0.4);
          border-radius: 50%;
          margin: 0;
          cursor: pointer;
          transition: background 180ms ease, border-color 180ms ease;
        }
        fieldset input[type="radio"]:checked {
          background: var(--color-evato-amber);
          border-color: var(--color-evato-amber-bright);
          box-shadow: 0 0 0 2px rgba(212, 165, 94, 0.2);
        }
        .filter-select {
          background: rgba(13, 10, 6, 0.5);
          border: 1px solid rgba(212, 165, 94, 0.25);
          color: var(--color-evato-bone);
          padding: 0.4rem 0.6rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
