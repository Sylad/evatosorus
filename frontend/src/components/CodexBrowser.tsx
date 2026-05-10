import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Species } from '../data/species.types';

// Subset minimum nécessaire pour afficher une card. Pour préserver les
// optimisations bandwidth (codex.astro trim ~60% des champs avant de passer
// les props au island), on type explicitement ce sous-ensemble plutôt que
// de prendre `Species` complet.
export type SpeciesCardData = Pick<
  Species,
  'id' | 'name' | 'commonName' | 'taxonGroup' | 'diet' | 'periodId' | 'lengthM' | 'weightKg' | 'iconic' | 'imageUrl' | 'lifeRestorationUrl'
>;

const PAGE_SIZE = 60;

type FilterState = {
  q: string;
  period: 'all' | 'trias' | 'jurassique' | 'cretace';
  diet: 'all' | 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';
  group: string;
};

interface Props {
  species: SpeciesCardData[];
  taxonGroups: { id: string; label: string }[];
  taxonGroupLabels: Record<string, string>;
  dietLabels: Record<string, string>;
  dietIcons: Record<string, string>;
}

// Card height constants tuned with the existing CSS. cardHeight = card-image
// (16:10 ratio @ ~268px wide → ~167px tall) + body (~145px) + gap. We round to
// a constant tall enough for any card to avoid measurement loops.
const CARD_HEIGHT_PX = 360;
const COLUMN_MIN_WIDTH = 260;
const ROW_GAP_PX = 22;

export function CodexBrowser({
  species,
  taxonGroups,
  taxonGroupLabels,
  dietLabels,
  dietIcons,
}: Props) {
  const [state, setState] = useState<FilterState>({
    q: '',
    period: 'all',
    diet: 'all',
    group: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  // Filtre + tri (iconic > avec image > alpha) appliqué au dataset complet.
  // Recomputé seulement quand `state` change.
  const filtered = useMemo(() => {
    const needle = state.q.trim().toLowerCase();
    return species.filter((s) => {
      if (state.period !== 'all' && s.periodId !== state.period) return false;
      if (state.diet !== 'all' && s.diet !== state.diet) return false;
      if (state.group !== 'all' && s.taxonGroup !== state.group) return false;
      if (needle) {
        const haystack = `${s.name} ${s.commonName ?? ''} ${taxonGroupLabels[s.taxonGroup] ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [species, state, taxonGroupLabels]);

  // Pagination de la liste filtrée
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, endIdx);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset à page 1 quand un filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [state.q, state.period, state.diet, state.group]);

  // Si on dépasse maxPage après un filtre, revenir à la dernière page valide
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Détecte le nombre de colonnes selon la largeur du conteneur, pour aligner
  // la virtualization (rows × columns) sur le grid CSS.
  useEffect(() => {
    const compute = () => {
      const w = scrollRef.current?.clientWidth ?? window.innerWidth;
      const cols = Math.max(1, Math.floor(w / COLUMN_MIN_WIDTH));
      setColumns(cols);
      // Cache l'offset top du conteneur scroll pour useWindowVirtualizer
      offsetRef.current = scrollRef.current?.getBoundingClientRect().top ?? 0;
      offsetRef.current += window.scrollY;
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const rowCount = Math.ceil(pageItems.length / columns);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => CARD_HEIGHT_PX + ROW_GAP_PX,
    overscan: 4,
    scrollMargin: offsetRef.current,
  });

  const startNum = filtered.length === 0 ? 0 : startIdx + 1;
  const endNum = Math.min(endIdx, filtered.length);

  return (
    <div className="codex-browser">
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
            {startNum}-{endNum}<span className="of-total"> sur {filtered.length}</span>
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
      </div>

      <div ref={scrollRef} className="virtual-scroll" role="region" aria-label="Liste des espèces">
        {pageItems.length === 0 ? (
          <p className="empty-state">Aucune espèce ne match ces filtres.</p>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowStart = virtualRow.index * columns;
              const rowItems = pageItems.slice(rowStart, rowStart + columns);
              return (
                <div
                  key={virtualRow.key}
                  className="virtual-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: `${ROW_GAP_PX}px`,
                  }}
                >
                  {rowItems.map((s) => (
                    <Card
                      key={s.id}
                      species={s}
                      taxonGroupLabels={taxonGroupLabels}
                      dietLabels={dietLabels}
                      dietIcons={dietIcons}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  species: s,
  taxonGroupLabels,
  dietLabels,
  dietIcons,
}: {
  species: SpeciesCardData;
  taxonGroupLabels: Record<string, string>;
  dietLabels: Record<string, string>;
  dietIcons: Record<string, string>;
}) {
  const periodLabel = s.periodId === 'trias' ? 'Trias' : s.periodId === 'jurassique' ? 'Jurassique' : 'Crétacé';
  const periodColor = s.periodId === 'trias' ? '#c75131' : s.periodId === 'jurassique' ? '#5e8f6e' : '#d4a55e';
  const groupSilhouette = `/silhouettes/group-${s.taxonGroup}.png`;
  const primaryImage = s.lifeRestorationUrl ?? s.imageUrl;
  const isSilhouette = !primaryImage;
  const sizeText = s.lengthM
    ? `${s.lengthM} m${s.weightKg ? ` · ${(s.weightKg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t` : ''}`
    : null;

  return (
    <a href={`/especes/${s.id}/`} className="species-card tap-bloom group">
      <div className="card-image">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={`${s.commonName ?? s.name} — ${taxonGroupLabels[s.taxonGroup] ?? s.taxonGroup}${s.lengthM ? `, ~${s.lengthM} m` : ''}`}
            loading="lazy"
            decoding="async"
            width="416"
            height="260"
          />
        ) : (
          <div className="card-image-silhouette">
            <img
              src={groupSilhouette}
              alt={`Silhouette ${taxonGroupLabels[s.taxonGroup] ?? s.taxonGroup} (illustration non disponible)`}
              loading="lazy"
              decoding="async"
              width="200"
              height="200"
            />
          </div>
        )}
        <span className="card-period" style={{ ['--p' as never]: periodColor } as React.CSSProperties}>
          {periodLabel}
        </span>
        {isSilhouette && <span className="card-silhouette-tag">silhouette</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{s.commonName ?? s.name}</h3>
        <p className="card-sci">{s.name}</p>
        <div className="card-meta">
          <span title={dietLabels[s.diet]}>{dietIcons[s.diet]} {dietLabels[s.diet]}</span>
          <span className="dot">·</span>
          <span>{taxonGroupLabels[s.taxonGroup] ?? s.taxonGroup}</span>
        </div>
        {sizeText ? <p className="card-size">{sizeText}</p> : null}
      </div>
    </a>
  );
}
