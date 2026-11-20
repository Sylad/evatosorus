# Revue UX L52 — bonnes pratiques d'une appli web standard (2026-11-20)

Demande d'origine : D-13 du registre parent. Référentiels : WCAG 2.2 AA, heuristiques de Nielsen, skill
`interface-utilisable` (texte en rem ≥ 12 px, cibles ≥ 24 px — 44 visés —, contrastes, focus visible, états vides
et d'erreur).

## Méthode

Site construit (`astro build`, 1533 pages) servi en local, Chromium 1255 (playwright-core 1.65.1).
15 pages : `/`, `/codex/`, `/comprendre/`, `/periodes/`, `/periodes/cretace/`, `/especes/tyrannosaurus-rex/`,
`/films/`, `/films/jurassic-park-1993/`, `/carte/`, `/videos/`, `/vitrines/`, `/nouveautes/`, `/plan-de-travail/`,
`/about/`, `/404.html`. Six fenêtres : 320×700, 390×844, 600×900, 840×900, 1440×900 et paysage 844×390.

Pour chaque page et chaque fenêtre (90 passages) :

- **axe-core 4.10.3**, tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa best-practice` (dont `color-contrast`,
  `target-size`, `meta-viewport`, `button-name`, `select-name`, `link-in-text-block`) ;
- **boîtes** (`getBoundingClientRect`) : débordement horizontal (`scrollWidth − clientWidth`), texte visible sous
  12 px, cibles interactives sous 24 px (liens en ligne dans un paragraphe exclus, exception WCAG 2.5.8) ;
- **clavier** (390 et 1440 px) : 25 appuis sur Tab, élément actif sans anneau (`outline` ou `box-shadow`) ou hors écran ;
- **console** : erreurs JS et réponses HTTP ≥ 400.

Plus : espacement de texte élargi (WCAG 1.4.12 : interligne 1,5, lettres 0,12 em, mots 0,16 em) sur les 15 pages à
390 px ; recherche de `100vh` et `user-scalable` dans le code ; carte avec les tuiles bloquées ; regard sur les
captures 390 et 1440 px.

## Résultat d'ensemble

| Contrôle | Avant | Après L52 |
|---|---|---|
| Violations axe (pages × fenêtres touchées) | 4 pages : codex (`select-name`, critique), périodes (`color-contrast` ×19, sérieux), fiche espèce (`image-redundant-alt` ×6, `landmark-complementary-is-top-level`), carte (`link-in-text-block` ×2, sérieux) | **0** sur les 90 passages |
| Texte visible sous 12 px | périodes (41 éléments : graduations, plages, pastilles), cartes d'espèce (`card-period` 11,4 px, `silhouette` 9,6 px), carte (légende 11,9 px, attribution 11,4 px) | 1 reste : nom « Pachycéphalosaure » ajusté à 11,4–11,96 px (sous-lot L52/t2) |
| Débordement horizontal | 0 partout | 0 partout |
| Erreurs console / HTTP ≥ 400 | 0 | 0 |
| `user-scalable` / zoom bloqué | absent | absent |
| `100vh` sans `dvh` | 7 (body, gabarit ×4, visionneuse ×2) | 0 (test R1) |
| Racine en px (`html { font-size: 17.5px }`) | ignore la taille de police choisie dans le navigateur (WCAG 1.4.4) | `109.375%` (= 17,5 px par défaut, suit le réglage) |
| Espacement de texte élargi (1.4.12) | aucun débordement ni texte coupé (2 px de débord des cartes de période et de chaîne : bordure, pas de texte) | idem |
| Focus visible | aucun élément sans anneau (voir notes) | idem |

## Écarts corrigés dans ce lot (simples et sûrs)

| # | Page | Écart mesuré | Règle | Correction |
|---|---|---|---|---|
| C1 | toutes | `html { font-size: 17.5px }` : la taille choisie par le visiteur est ignorée | WCAG 1.4.4, skill (texte en rem) | `font-size: 109.375%` — rendu identique au réglage par défaut |
| C2 | gabarit, visionneuse | `100vh` (le bas du tiroir et de la visionneuse passe sous la barre du navigateur mobile) | skill §5 | reprise `100dvh` après chaque `100vh` |
| C3 | `/codex/` | `<select>` « Groupe » sans nom accessible (axe `select-name`, critique) | WCAG 4.1.2 | `aria-label="Groupe"` |
| C4 | `/codex/` | bord des boutons radio vides à 2,32:1 au pixel sur le fond réel (`rgba(212,165,94,.4)`) | WCAG 1.4.11 (3:1) | alpha 0,75 → 5,3:1 |
| C5 | `/periodes/` | plages « 231—228 Ma » des cartes atténuées à **3,21:1** (opacité 0,55) sur le fond uni ; mesurées au pixel sur le fond réel (photo fixe `.codex-bg` vue à travers la carte) : **2,74:1** encore à opacité 0,75 (revue r1) | WCAG 1.4.3 | plus d'opacité sur la carte atténuée (son image s'assombrit : `saturate(.6) brightness(.65)`), fond de carte `rgba(26,18,10,.7)` au lieu de `.4` → **5,97:1 au pire pixel** (1440 px), ≥ 6:1 à 320 et 390 ; la carte allumée reste distincte (bordure, halo et nom ambre) |
| C6 | `/periodes/` | graduations et plages des bandes à 10,85 px, libellés d'ère à 11,55 px (320 px), pastilles d'espèces à 11,4 px | skill (≥ 12 px) | 0,6875 rem (12,03 px) ; graduations espacées d'au moins 4,1 px à 320 px, plages et libellés dans leur bande sur une ligne (mesuré 320–1440) |
| C7 | cartes d'espèce (`SpeciesCard`, fiches des périodes) | étiquette de période 11,4 px, « silhouette » 9,6 px | skill (≥ 12 px) | 0,6875 rem |
| C8 | `/carte/` | légende 11,9 px, attribution 11,4 px ; liens de l'attribution distingués par la seule couleur (1,04:1 avec le texte voisin) | skill (≥ 12 px), WCAG 1.4.1 | 0,6875 rem ; liens soulignés |
| C9 | fiche espèce | images des espèces voisines avec un `alt` égal au nom qui suit dans le même lien (lu deux fois) ; `aside` imbriqué dans `main` | WCAG 1.1.1 (bonne pratique axe), landmarks | `alt=""` ; `aside` → `div` |
| C10 | fiche espèce | règle d'anneau de focus pour `video` (Chromium n'en dessine pas sur l'hôte) | WCAG 2.4.7 | `video:focus-visible { outline: 2px solid ambre }` |

Garde : `scripts/bonnes-pratiques-ux.e2e.test.mjs` (R1–R7), vérifié rouge sur l'état d'avant pour R2 (3,23:1).
Après la revue r1, chaque garde a été vérifiée rouge en retirant sa correction : R2 (fond de carte à 0,4 → 4,13:1
sur la photo), R3 (bord à 0,4 → 2,32:1, contraste mesuré au pixel et non plus l'alpha), R6 (règle
`video:focus-visible` retirée → anneau `auto` que Chromium ne dessine pas), R7 (étiquette de période ou
« silhouette » à 0,55 rem). R2 et R3 mesurent le pire pixel du fond réel (élément effacé, capture de sa boîte).

| Garde | Écart couvert |
|---|---|
| R1 | C1, C2 |
| R2 | C5 (fond uni et fond réel), C6 |
| R3 | C3, C4 |
| R4 | C8 |
| R5 | C9 |
| R6 | C10 |
| R7 | C7 (`/periodes/cretace/` : SpeciesCard, silhouettes comprises ; `/codex/` : CodexBrowser) |

## Écarts proposés en sous-lots (non corrigés ici)

| Sous-lot | Écart mesuré | Règle | Pourquoi pas dans ce lot | Proposition |
|---|---|---|---|---|
| **L52/t1** — Carte : état d'erreur des fonds | Tuiles Esri bloquées (`server.arcgisonline.com`) : fond noir uni, aucun message (constaté en capture à 390 px, non versionnée : la carte entière est une zone noire) ; sans JS (`client:only`, pas de `<noscript>`), la carte est une zone vide | Nielsen 1 (état du système) et 9, skill §6, invariant de carte n° 12 | comportement à concevoir (texte, bascule OSM, réessai) | écouter `tileerror` sur la couche de fond ; au-delà de N échecs, bandeau « Fond de carte indisponible — les repères restent cliquables » et bascule sur OSM ; `<noscript>` avec la liste des sites |
| **L52/t2** — Nom des cartes de la frise sous 12 px | « Pachycéphalosaure » ajusté à 11,4–11,96 px selon la largeur (`--fit-floor: 0.65rem`) ; un plancher à 12 px coupe le mot à 736 et 920 px (`headings-fit.e2e`) | skill (≥ 12 px) | demande de changer la grille (largeur mini des cartes) ou d'autoriser une césure | `minmax(min(10rem, 100%), 1fr)` ou césure `hyphens: auto` + `lang`, puis plancher 0,6875 rem |
| **L52/t3** — Boutons de zoom de la carte à 44 px | `+` / `−` Leaflet à 30×30 px (≥ 24, minimum tenu ; < 44 visés) | WCAG 2.5.5 (AAA), skill §3 | réglage visuel de la carte à revoir avec la légende | `.leaflet-control-zoom a { width/height: 44px; line-height: 44px }` |

## Notes de mesure (non-écarts)

- **Curseur de la frise** (`[data-meso-cursor]`, `role="slider"`) : signalé « sans anneau » par la mesure automatique
  parce que l'élément fait 0 px de large ; l'anneau est porté par `.meso-cursor-line` (`:focus-visible`, double halo ambre).
- **Vidéos de la fiche espèce** : le focus clavier entre dans les contrôles natifs (lecture, barre de temps) que
  Chromium dessine avec son propre anneau ; l'hôte `video` reçoit l'anneau ajouté en C10 quand il a le focus.
- **Boutons radio du codex** : 20×20 px, mais la cible est le `label` qui les enveloppe (65–97 × 48 px).
- **Liens d'attribution de la carte** : 12 px de haut, dans une ligne de texte — exception « en ligne » de WCAG 2.5.8.
- **Repères de la carte** : 24×24 à 40×40 px — exception « essentielle » des épingles denses (skill §3).
- **États vides** : codex sans résultat déjà couvert (message, compteur, bouton « tout réafficher », `codex-empty-state.e2e`).
- **Mise en page carte « plein écran + feuille en bas »** (skill §1–2) : non appliquée, `/carte/` est une page de
  contenu avec une carte incluse et une fiche Leaflet ; hors du périmètre d'une correction, à rediscuter seulement
  si la carte devient l'écran principal.

## Non contrôlé

- Lecteur d'écran réel (NVDA, VoiceOver) : seules les propriétés ARIA ont été vérifiées par axe.
- Réglage réel de la taille de police du navigateur (le passage en % est vérifié par le code et le test R1, pas par
  un profil Chromium à 20 px).
- Contraste des contrôles posés sur la carte au pixel près sur chaque fond (fond Esri sombre seul mesuré à l'œil).
- Safari / iOS (`dvh`, encoche) : Chromium seulement.
