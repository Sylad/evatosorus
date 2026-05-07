import { useEffect, useMemo, useState } from 'react';

type FilterState = {
  q: string;
  period: 'all' | 'trias' | 'jurassique' | 'cretace';
  diet: 'all' | 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';
  group: string;
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
  });
  const [matchCount, setMatchCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const filterFn = useMemo(() => {
    const needle = state.q.trim().toLowerCase();
    return (el: HTMLElement) => {
      const periodId = el.dataset.period ?? '';
      const diet = el.dataset.diet ?? '';
      const group = el.dataset.group ?? '';
      const haystack = (el.dataset.haystack ?? '').toLowerCase();
      if (state.period !== 'all' && periodId !== state.period) return false;
      if (state.diet !== 'all' && diet !== state.diet) return false;
      if (state.group !== 'all' && group !== state.group) return false;
      if (needle && !haystack.includes(needle)) return false;
      return true;
    };
  }, [state]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-species-card]'));
    let matching = 0;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    for (const c of cards) {
      const ok = filterFn(c);
      if (!ok) {
        c.style.display = 'none';
        continue;
      }
      if (matching >= startIdx && matching < endIdx) {
        c.style.display = '';
      } else {
        c.style.display = 'none';
      }
      matching++;
    }
    setMatchCount(matching);
    // Si on a dépassé le total après un filtre, revenir à la dernière page valide
    const maxPage = Math.max(1, Math.ceil(matching / PAGE_SIZE));
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [filterFn, currentPage]);

  // Reset à page 1 quand un filtre change (sinon on peut tomber sur une page vide).
  useEffect(() => {
    setCurrentPage(1);
  }, [state.q, state.period, state.diet, state.group]);

  const totalPages = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const startNum = matchCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endNum = Math.min(currentPage * PAGE_SIZE, matchCount);

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
        <span className="filter-count">
          {startNum}-{endNum}<span className="of-total"> sur {matchCount}</span>
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

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button type="button" className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} aria-label="Première page">«</button>
          <button type="button" className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} aria-label="Page précédente">‹</button>
          <span className="page-indicator">
            Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong>
          </span>
          <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} aria-label="Page suivante">›</button>
          <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Dernière page">»</button>
        </nav>
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
        .of-total {
          color: var(--color-evato-bone-muted);
          font-size: 0.7rem;
          margin-left: 0.25rem;
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding-top: 1.2rem;
          border-top: 1px solid rgba(212, 165, 94, 0.18);
        }
        .page-btn {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(212, 165, 94, 0.4);
          border-radius: 4px;
          background: rgba(13, 10, 6, 0.6);
          color: var(--color-evato-amber);
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 200ms, color 200ms, background 200ms, transform 150ms;
        }
        .page-btn:hover:not(:disabled) {
          border-color: var(--color-evato-amber-bright);
          color: var(--color-evato-amber-bright);
          background: rgba(13, 10, 6, 0.85);
          transform: translateY(-1px);
        }
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .page-indicator {
          padding: 0 0.8rem;
          font-family: var(--font-display);
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          color: var(--color-evato-bone-muted);
        }
        .page-indicator strong {
          color: var(--color-evato-amber-bright);
          font-weight: 700;
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
