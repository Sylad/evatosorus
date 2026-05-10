import { useEffect, useRef } from 'react';

type Marker = {
  speciesId: string;
  name: string;
  commonName?: string;
  lat: number;
  lng: number;
  country: string;
  periodId: 'trias' | 'jurassique' | 'cretace';
  imageUrl?: string;
};

const PERIOD_COLOR: Record<Marker['periodId'], string> = {
  trias: '#c75131',
  jurassique: '#5e8f6e',
  cretace: '#d4a55e',
};

// We render via the global L from Leaflet's UMD bundle (loaded via <link>
// + <script> in the page). Avoids react-leaflet hydration headaches and
// keeps the component small.
declare global {
  interface Window { L: any; }
}

// HTML escape helper to safely inject user/data strings into popup HTML.
const escHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function PaleoMap({ markers }: { markers: Marker[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let mounted = true;
    let map: any = null;

    const init = () => {
      if (!mounted || !ref.current || !window.L) return false;
      const L = window.L;
      // Wait for the markercluster plugin to attach as well — it patches L
      // with markerClusterGroup. Without this we'd render before clustering
      // is ready and fall back to plain layer (still works, but ugly).
      if (typeof L.markerClusterGroup !== 'function') return false;

      map = L.map(ref.current, {
        center: [10, 10],
        zoom: 2,
        worldCopyJump: true,
        scrollWheelZoom: true,
      });

      // Dark base layer matching the Mésozoïque mood. CARTO Dark No Labels
      // is free (subject to usage limits) and renders nicely against amber.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 8,
      }).addTo(map);

      // Regroupe les marqueurs co-localisés sur la même demi-degré pour éviter
      // d'empiler plusieurs popups au même endroit. Les vrais clusters de
      // proximité sont gérés par leaflet.markercluster (chargé via CDN) qui
      // dégroupe automatiquement quand on zoome.
      const grouped = new Map<string, Marker[]>();
      for (const m of markers) {
        const k = `${m.lat.toFixed(1)},${m.lng.toFixed(1)}`;
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k)!.push(m);
      }

      // markerClusterGroup est ajouté par le plugin leaflet.markercluster
      // (CDN dans carte.astro). Si absent (CDN failed), fallback sur layer
      // standard pour ne pas casser la carte.
      const cluster: any = typeof L.markerClusterGroup === 'function'
        ? L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            iconCreateFunction: (c: any) => {
              // Calcule la couleur dominante du cluster (période la plus
              // représentée parmi ses enfants) pour cohérence visuelle.
              const counts: Record<string, number> = { trias: 0, jurassique: 0, cretace: 0 };
              for (const child of c.getAllChildMarkers()) {
                const pid = child.options.evatoPeriod as keyof typeof counts;
                if (pid) counts[pid] = (counts[pid] ?? 0) + 1;
              }
              let dom: keyof typeof counts = 'cretace';
              let max = -1;
              (Object.keys(counts) as (keyof typeof counts)[]).forEach((k) => {
                if (counts[k] > max) { max = counts[k]; dom = k; }
              });
              const color = PERIOD_COLOR[dom];
              const total = c.getChildCount();
              return L.divIcon({
                html: `<div class="evato-cluster" style="--c:${color};"><span>${total}</span></div>`,
                className: 'evato-cluster-wrap',
                iconSize: [40, 40],
              });
            },
          })
        : L.layerGroup();

      for (const [, group] of grouped) {
        const first = group[0];
        const color = PERIOD_COLOR[first.periodId];
        const size = group.length > 1 ? 30 : 24;
        const icon = L.divIcon({
          html: `<div class="evato-pin" style="--c:${color}; --size:${size}px;">
            ${group.length > 1 ? `<span class="evato-pin-count">${group.length}</span>` : '<span class="evato-pin-dot"></span>'}
          </div>`,
          className: 'evato-pin-wrap',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([first.lat, first.lng], {
          icon,
          // Custom prop forwarded so iconCreateFunction can pick the dominant period.
          evatoPeriod: first.periodId,
        } as any);

        const popupContent = `
          <div class="evato-popup">
            <div class="evato-popup-loc">${escHtml(first.country)}${group.length > 1 ? ` · ${group.length} espèces` : ''}</div>
            ${group.slice(0, 5).map((g) => `
              <a class="evato-popup-link" href="/especes/${encodeURIComponent(g.speciesId)}/">
                ${g.imageUrl ? `<img src="${escHtml(g.imageUrl)}" alt="" />` : '<span class="popup-fallback">𓆗</span>'}
                <span>
                  <strong>${escHtml(g.commonName ?? g.name)}</strong>
                  <em>${escHtml(g.name)}</em>
                </span>
              </a>
            `).join('')}
            ${group.length > 5 ? `<div class="evato-popup-more">+ ${group.length - 5} autres</div>` : ''}
          </div>`;
        marker.bindPopup(popupContent, { maxWidth: 280 });
        cluster.addLayer(marker);
      }
      map.addLayer(cluster);

      return true;
    };

    if (init()) {
      return () => {
        mounted = false;
        map?.remove();
      };
    }

    // Leaflet UMD pas encore prêt — on poll toutes les 50ms (max 5s)
    // jusqu'à ce que window.L soit dispo.
    const interval = setInterval(() => {
      if (init()) clearInterval(interval);
    }, 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!map) console.error('PaleoMap: Leaflet failed to load (window.L undefined after 5s)');
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
      map?.remove();
    };
  }, [markers]);

  return (
    <>
      <div ref={ref} className="paleo-map" />
      <style>{`
        .paleo-map {
          height: 600px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(212, 165, 94, 0.25);
          background: #0d0a06;
        }
        :global(.leaflet-popup-content-wrapper) {
          background: rgba(13, 10, 6, 0.96);
          color: var(--color-evato-bone);
          border: 1px solid rgba(212, 165, 94, 0.35);
          border-radius: 6px;
          box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.7);
        }
        :global(.leaflet-popup-tip) { background: rgba(13, 10, 6, 0.96); }
        :global(.leaflet-popup-close-button) { color: var(--color-evato-amber) !important; }
        :global(.evato-popup-loc) {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-evato-amber);
          margin-bottom: 0.5rem;
          border-bottom: 1px solid rgba(212, 165, 94, 0.2);
          padding-bottom: 0.4rem;
        }
        :global(.evato-popup-link) {
          display: flex;
          gap: 0.6rem;
          align-items: center;
          padding: 0.3rem 0;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px dashed rgba(212, 165, 94, 0.12);
        }
        :global(.evato-popup-link:last-child) { border-bottom: 0; }
        :global(.evato-popup-link img),
        :global(.evato-popup-link .popup-fallback) {
          width: 44px;
          height: 44px;
          object-fit: cover;
          border-radius: 3px;
          flex-shrink: 0;
          background: #1a120a;
          display: grid;
          place-items: center;
          color: rgba(212, 165, 94, 0.4);
        }
        :global(.evato-popup-link strong) {
          display: block;
          font-family: 'Cinzel', serif;
          font-size: 0.85rem;
          color: var(--color-evato-amber-bright);
        }
        :global(.evato-popup-link em) {
          display: block;
          font-style: italic;
          font-size: 0.78rem;
          color: var(--color-evato-bone-muted);
        }
        :global(.evato-popup-more) {
          font-size: 0.75rem;
          color: var(--color-evato-bone-muted);
          padding-top: 0.4rem;
        }
        :global(.leaflet-control-attribution) {
          background: rgba(13, 10, 6, 0.65) !important;
          color: var(--color-evato-bone-muted) !important;
          font-size: 0.65rem;
        }
        :global(.leaflet-control-attribution a) { color: var(--color-evato-amber) !important; }

        /* ── Pins divIcon colorés par période ──────────────────────── */
        :global(.evato-pin-wrap) { background: transparent !important; border: 0 !important; }
        :global(.evato-pin) {
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--c) 92%, white 8%), var(--c) 75%);
          border: 2px solid color-mix(in srgb, var(--c) 50%, #0d0a06);
          box-shadow:
            0 0 0 2px rgba(13, 10, 6, 0.85),
            0 0 12px color-mix(in srgb, var(--c) 60%, transparent);
          display: grid;
          place-items: center;
          color: #0d0a06;
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        :global(.evato-pin:hover) {
          transform: scale(1.18);
          box-shadow:
            0 0 0 2px rgba(13, 10, 6, 0.85),
            0 0 22px color-mix(in srgb, var(--c) 80%, transparent);
        }
        :global(.evato-pin-count) {
          color: rgba(13, 10, 6, 0.92);
          font-weight: 800;
        }
        :global(.evato-pin-dot) {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(13, 10, 6, 0.85);
        }

        /* ── Clusters (leaflet.markercluster) ──────────────────────── */
        :global(.evato-cluster-wrap) { background: transparent !important; border: 0 !important; }
        :global(.evato-cluster) {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--c) 95%, white 5%), var(--c) 70%);
          border: 2px solid color-mix(in srgb, var(--c) 60%, #0d0a06);
          box-shadow:
            0 0 0 3px rgba(13, 10, 6, 0.55),
            0 0 18px color-mix(in srgb, var(--c) 65%, transparent);
          display: grid;
          place-items: center;
          color: rgba(13, 10, 6, 0.92);
          font-family: 'Cinzel', serif;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          transition: transform 180ms ease;
        }
        :global(.evato-cluster:hover) { transform: scale(1.08); }
        /* Override par défaut du plugin (.marker-cluster-small / -medium / -large
           qui appliquent un fond bleu standard). */
        :global(.marker-cluster) { background: transparent !important; }
        :global(.marker-cluster div) { background: transparent !important; }
      `}</style>
    </>
  );
}
