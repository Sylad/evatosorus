# Evatosorus — Comment ça marche

Notes techniques sur les choix d'archi et les pièges contournés.

## Pourquoi Astro (et pas React + Vite comme finance/ol) ?

Comme [Eywa](https://github.com/sylad/avatar-pandora), Evatosorus est :
- **rich-info + images** → pages lourdes en contenu prérendu, SEO important
- **statique pur** → pas de backend, ni d'API live, données figées au build
- **Cloudflare Pages first** → SSG idéal pour la CDN edge

Astro coche les 3 cases mieux que React+Vite SPA. On garde React pour les
îlots interactifs (filtres codex, carte Leaflet) via `client:load` /
`client:only="react"`.

## Le pipeline data : seed + PBDB

Deux sources fusionnées au runtime :

1. **`species.seed.ts`** — 24 espèces curées à la main, blurbs vulgarisés
   "BBC documentaire", paleo-art Wikimedia validé.
2. **`scripts/import-paleobiodb.mjs`** — appelle l'API PBDB
   (`/data1.2/occs/list.json?base_name=Dinosauria,Pterosauria,...&interval=Mesozoic`),
   collapse les ~30 k occurrences en ~3 k espèces uniques, écrit
   `frontend/src/data/generated/species.generated.json`.

Le merge (`data/species.ts`) garde le seed prioritaire en cas de collision —
les fiches manuelles ont toujours raison sur l'auto-import.

**Pourquoi pas Astro Content Collections ?** Les content collections
veulent un fichier par entrée. À 1500 entrées ça gonfle inutilement le
build. Un JSON unique à la racine est plus rapide à parser.

## La landing cinématique 75s

Reproduit le pattern Eywa avec deux couches :

- **`CycleBackdrop`** — 3 phases (Trias → Jurassique → Crétacé), chacune
  un layered radial gradient évoquant l'ambiance période (charbon
  volcanique, fougère luxuriante, ambre fin de règne). 25s par phase,
  cross-fade 4.5s. Le label en bas affiche la période courante.
- **`DustField`** — particle field 2D canvas. 90 motes ambre dérivant
  vers le haut (cendre volcanique + pollen primitif), `mix-blend-mode:
  screen` pour rester subtil sur les fonds clairs.

Pas de R3F ici. R3F était overkill pour des particles. Si on ajoute un
species 3D viewer plus tard, là on bascule sur R3F.

## La carte paléo-monde

Leaflet + tuiles CARTO Dark No Labels (free tier OK pour < 200 k req/jour).

**Choix anti-pattern :** on n'utilise PAS `react-leaflet`. Le UMD
`leaflet@1.9.4` est chargé via `<link>` + `<script>` (CDN unpkg avec
SRI), et `PaleoMap.tsx` consomme `window.L` directement. Avantages :
- pas d'hydratation react-leaflet → -40 KB
- code plus court, moins de dépendances
- popups stylés via CSS scoped (la palette ambre/jade s'applique direct)

**Regroupement des markers :** species sur (lat, lng) arrondis à 0.1°
sont fusionnés en un seul `circleMarker` dont le rayon croît avec le
nombre d'espèces (cap à +8 px). Le popup liste les 5 premières + un
"+ N autres".

## Les filtres codex (1500 cards visibles)

`CodexFilters.tsx` est un composant React contrôlant uniquement les
inputs. Les cards elles-mêmes sont rendues par Astro côté serveur avec
des `data-period`, `data-diet`, `data-group`, `data-haystack`. Quand le
state filter change, on parcourt les cards en DOM et on toggle
`display: none`.

**Pourquoi pas un re-render React ?** Hydrater 1500 cards React =
catastrophe perf (~3 MB JS, +500ms TBT). Ce pattern garde le HTML
statique côté serveur et n'hydrate QUE le panneau de contrôle.

## La palette ambre / jade / rust

Différenciation explicite vs Eywa :

| | Eywa | Evatosorus |
|---|---|---|
| Bg | `#0a0a1f` (charbon bleu) | `#0d0a06` (charbon volcanique) |
| Primary | `#5fffe6` cyan bio | `#d4a55e` ambre fossile |
| Secondary | `#7fff8f` vert sacré | `#5e8f6e` jade fougère |
| Danger | `#ff5dc4` rose toxique | `#c75131` rust terre rouge |
| Display | Orbitron | Cinzel |
| Body | Cormorant Garamond | Crimson Text |

L'effet `amber-word` reprend le `bio-word` d'Eywa : split des
paragraphes en `<span>` par mot, glow ambre au hover. Détail luxe qui
récompense le scroll.

## Cloudflare Pages

Pas de Functions, pas de KV, pas de Durable Objects. Un build statique
pur, déployé via le connecteur Pages → GitHub. Coût zéro tant qu'on
reste sous les 20 k req/jour gratuits.

Les variables d'environnement sont vides à ce stade (rien de privé).
Si on ajoute plus tard un endpoint commenté/feedback, on bascule sur
Cloudflare Workers + KV.

## Pièges connus

- **PBDB rate limit** : pas de quota dur public mais soyez gentil, ne
  spammez pas. Le script tape une seule requête bulk.
- **Wikimedia images** : URL hot-link OK, mais préférer une copie locale
  pour les top 50 espèces (plus rapide CDN, image cache invalide moins).
  TODO post-MVP.
- **PaleoBioDB taxonomy** : une espèce peut avoir plusieurs synonymes.
  Le script utilise `tna` (accepted name) plutôt que `idn` (identified
  name) pour dédupliquer.
- **Coords lat/lng 0,0** : PBDB encode parfois "coord inconnue" comme
  null mais rarement comme (0, 0). Le script filtre les null only.

## Stack précise

- Astro 6.2 · React 19.2 · Tailwind 4.2 · Leaflet 1.9
- Cinzel + Crimson Text (Google Fonts)
- Node 22 (engines.node)
- Cloudflare Pages (build statique, edge CDN)
