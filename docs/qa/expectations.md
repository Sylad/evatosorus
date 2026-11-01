# Attendus QA — Evatosorus

Ce que le visiteur anonyme doit trouver sur https://evatosorus.pages.dev. Brouillon écrit le 29-10-2026 (lot L42)
à partir de la QA de L39 ; lu par l'agent `qa-reviewer` de cadence après chaque livraison. Site 100 % statique :
pas d'API, donc aucune ligne `api:`. Les mesures de la frise et des entrées de Nouveautés sont rejouées à chaque
build par `scripts/qa-expectations.test.mjs` (`cd frontend && npm run test:scripts`) ; le défilement horizontal l'est par
`scripts/reflow-320.e2e.test.mjs` et `scripts/frise-etiquettes.e2e.test.mjs`, l'ordre antichronologique et `naturalWidth`
des images par `scripts/nouveautes-page.e2e.test.mjs`. la pagination du codex par
`scripts/codex-pagination.e2e.test.mjs` et l'absence d'`<img>` sans `src` par `scripts/codex-img.e2e.test.mjs`. Non couvert ici : l'accueil,
les fiches d'espèces, la carte, `/films/`, `/about/` et `/plan-de-travail/` (leurs tests vivent dans `scripts/`).

## *
- never: défilement horizontal de la page (`scrollWidth` ≤ `clientWidth`) à 390 et à 1440 px

## /periodes/
- shows: la frise des périodes avec son curseur (`[data-meso-cursor]`) et son étiquette de valeur (`[data-meso-readout]`, « 145 Ma à l'ouverture, 252 Ma après Début, 66 Ma après Fin ») ; au-dessus, le titre de la frise (`.meso-timeline-title`) et l'indication d'ère (`.meso-timeline-hint`)
- never: l'étiquette du curseur recouvre le libellé de l'ère (« 145 MA — JURASSIQUE ») ; contrôler à 252 Ma (touche Début) et à 66 Ma (touche Fin), à 1440 et à 390 px — les rectangles de l'étiquette et du libellé ne se chevauchent pas (défaut L39, déjà présent avant L3)
- shows: l'étiquette du curseur entièrement dans l'écran aux deux extrémités (`left` ≥ 0 et `right` ≤ largeur de la fenêtre), sans défilement horizontal
- shows: à 390 px, la plage de dates du Trias (« 252 — 201 Ma », `.meso-band-range`) sur une seule ligne (1 ligne : hauteur ≈ 20 px, pas 40 px) et dans sa bande

## /nouveautes/
- shows: au moins une entrée `.news-entry` (`article` avec son `h2`), en ordre antichronologique
- shows: chaque `.news-entry` non vide (texte rendu > 0 caractère) à 390 et à 1440 px
- never: entrée sans texte, ni image cassée (`naturalWidth` > 0 pour toute `img` chargée)

## /codex/
- shows: la pagination (`.pagination`) avec ses 4 boutons (`.page-btn` : première, précédente, suivante, dernière page) d'au moins 44×44 px, et l'indicateur de page (`.page-indicator`, « Page 1 sur N ») ; à 430 px et moins, l'indicateur seul sur sa ligne puis les 4 boutons groupés sur une autre
- never: `<img>` sans `src` (donc `naturalWidth` 0) dans la page, à 1440, 390 et 320 px — la visionneuse n'insère son `<img>` qu'à l'ouverture
- never: pagination qui sort de la fenêtre ou fait défiler la page horizontalement (rejoué par `scripts/codex-pagination.e2e.test.mjs`)
