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
- Environnement (2026-11-18) : Chromium exige `libasound.so.2` (absente) — extraite du .deb Ubuntu dans
  `<worktree>.captures/asound`, `LD_LIBRARY_PATH` dessus. Sous WSL, les pages à vidéo hero (/carte/, /about/)
  bloquent parfois `page.goto` (tout ou rien par lancement de Chromium) : relancer, ce n'est pas le code.
