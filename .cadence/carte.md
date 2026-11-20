# Carte du dépôt (écrans, workflows, décisions)

## Nouveautés (`/nouveautes/`) et visionneuse — L13, L26
- Écran : `frontend/src/pages/nouveautes.astro` lit `frontend/public/nouveautes-data/nouveautes.json`
  (généré par `npm run news` depuis `docs/nouveautes/*.md`, versionné).
- Visionneuse plein écran : `frontend/src/components/Lightbox.astro` (toutes les pages ; `[data-lightbox] img`).
  La légende = l'alt de l'image ; au-delà de 60 caractères, casse normale (`.is-long`).
- Décision L26 : chaque capture s'écrit `captures: [{ file: …, alt: "…" }]`, alt ≥ 30 caractères,
  différent du titre, sans « capture/image » en tête. Le build échoue sans alt ; documenté dans
  CLAUDE.md § Nouveautés, et un test vérifie que cette doc reste là.
- Décision L26 (revue) : la hauteur de la légende (`--evato-cap-h`) suit ses changements de taille
  (ResizeObserver, repli `resize`), pas seulement l'ouverture : écran tourné visionneuse ouverte.
- Décision L32 (revue) : `cadence news` ne rend que `**gras**` ; un `*italique*` sort avec ses astérisques.
  Nommer une page en texte simple ou entre guillemets « … » (U+202F). Test : `scripts/nouveautes.test.mjs`
  refuse tout astérisque restant dans le html rendu du JSON.
- Workflow de test : les e2e lisent `frontend/dist` ; toujours `npx astro build` avant
  `npm run test:scripts`, sinon un dist périmé fait échouer les tests de la page (vécu revue L26).

## Carte paléo-monde (`/carte/`) — L10
- Écran : `frontend/src/pages/carte.astro` (légende, chapeau, note) + îlot `PaleoMap.tsx` (Leaflet + markercluster).
- Décision L10 : tout chiffre de la carte compte des **espèces distinctes** (légende, pins, regroupements),
  et la couleur suit la période majoritaire **en espèces distinctes** ; un site de périodes mixtes les nomme
  toutes (« Crétacé et Jurassique »). Une seule fonction : `frontend/src/data/map-counts.mjs` (`tally`).
- Tests : `scripts/map-counts.test.mjs` (unitaire) ; `scripts/carte-ux.e2e.test.mjs` capte la carte
  (`window.L` → `Map.addInitHook`) et compare le chiffre de chaque regroupement aux espèces des repères
  enfants relues dans les props de l'îlot — échoue si `getChildCount()` revient (8 affiché / 13 espèces).
- Environnement (2026-11-18) : sous WSLg, Chromium headless se connecte au compositeur Wayland
  (`XDG_RUNTIME_DIR/wayland-0`) dès qu'une page porte une `<video>` et reste bloqué (`page.goto` expire,
  ~7 lancements sur 10). Tous les tests lancent Chromium avec `env: headlessEnv()`
  (`scripts/lib/e2e-dist.mjs` : sans DISPLAY, WAYLAND_DISPLAY vers un socket inexistant) ;
  `scripts/e2e-headless-env.test.mjs` refuse un `chromium.launch` qui ne le passe pas.

## À propos (`/about/`) — L11
- Écran : `frontend/src/pages/about.astro`. Voile sombre `.about::before` (rgba(13,10,6,.74)) sous la
  colonne de texte : corps et liens ambre ≥ 4,5:1 au pire pixel sur l'image de fond fixe (mesuré : liens
  6,95:1, corps 11:1). Liens `target=_blank` suivis de « ↗ » (`content: … / ' (nouvel onglet)'`, en ligne
  pour ne jamais passer seule à la ligne). Paragraphes séparés de 1em.
- `MotionToggle placement="top-mobile"` : sous 1024 px, bouton Pause en haut à gauche du burger (bande
  réservée de `.codex-main`) au lieu du bas, où il masquait la fin des lignes. Autres pages inchangées.
- Décision L11 : `compressHTML: true` dans `astro.config.mjs`. Astro 7 (L51) passait par défaut à 'jsx',
  qui supprime l'espace porté par un saut de ligne autour de `<a>/<strong>/<em>` (mots collés sur tout le
  site). Test : `scripts/html-espaces.test.mjs` (toutes les pages de dist + aucun lien eywa-eywa.pages.dev ;
  Eywa = https://avatar-pandora-12q.pages.dev).
- Icône crâne : auteur **Delapouite** (pas Lorc), https://game-icons.net/1x1/delapouite/t-rex-skull.html
  (tracé identique vérifié). Tests de la page : `scripts/about-ux.e2e.test.mjs` (R1 contraste … R5).

## Revue « bonnes pratiques » (toutes pages) — L52
- Rapport : `docs/qa/revue-L52-bonnes-pratiques.md` (C1–C10 corrigés, sous-lots L52/t1–t3) ; garde
  `scripts/bonnes-pratiques-ux.e2e.test.mjs` R1–R7 (une ligne du rapport relie chaque garde à son écart).
- Décision L52 (revue r1) : un contraste se mesure aussi **au pire pixel du fond réel** — la page porte une
  photo fixe (`.codex-bg`) derrière le contenu. Méthode `contrasteFondReel` : effacer l'élément (couleur
  transparente, ou `opacity: 0` pour un contrôle), capturer sa boîte, composer la couleur sur chaque pixel.
- Décision L52 (revue r1) : frise de `/periodes/`, plus d'`opacity` sur les vignettes atténuées (elle laissait
  passer la photo à travers le texte : 2,7:1) ; l'image s'assombrit (`saturate(.6) brightness(.65)`), fond de
  vignette `rgba(26,18,10,.7)` → 6:1 au pire pixel. La vignette allumée garde bordure, halo et nom ambre.
- `SpeciesCard.astro` sert les fiches des périodes (`/periodes/<id>/`, silhouettes comprises) ; le codex a ses
  propres cartes (`CodexBrowser.tsx` + `codex-browser.css`).
