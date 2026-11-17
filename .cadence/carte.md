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
