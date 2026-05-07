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

      const grouped = new Map<string, Marker[]>();
      for (const m of markers) {
        const k = `${m.lat.toFixed(1)},${m.lng.toFixed(1)}`;
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k)!.push(m);
      }

      for (const [, group] of grouped) {
        const first = group[0];
        const color = PERIOD_COLOR[first.periodId];
        const marker = L.circleMarker([first.lat, first.lng], {
          radius: 6 + Math.min(group.length, 8),
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.55,
        }).addTo(map);

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
      }

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
      `}</style>
    </>
  );
}
