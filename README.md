# Evatosorus — Codex Mésozoïque

[![Vibed with Claude Code](https://img.shields.io/badge/vibed_with-Claude_Code-d4a55e?style=flat-square)](https://claude.com/claude-code)
[![Mockups by ChatGPT](https://img.shields.io/badge/visuals-ChatGPT-c75131?style=flat-square)](https://chatgpt.com)
[![Astro](https://img.shields.io/badge/built_with-Astro_6-5e8f6e?style=flat-square)](https://astro.build)
[![Cloudflare Pages](https://img.shields.io/badge/deploys_to-Cloudflare_Pages-d4a55e?style=flat-square)](https://pages.cloudflare.com)

> Un codex visuel des dinosaures, du Mésozoïque tout entier — Trias,
> Jurassique, Crétacé. 1500+ espèces, paléo-art domaine public, voyage
> temporel cinématique, carte des fossiles trouvés.

5ᵉ site personnel de Sylad, suite naturelle d'[Eywa](https://github.com/sylad/avatar-pandora) (codex de Pandora).
**Cadeau pour ma nièce Eva, 18 ans.**

## Vibe

Trois ères, trois climats, trois géographies. Une atmosphère ambre/sable/terre
qui change toutes les 25 secondes sur la landing. Un codex filtrable de
1500 fiches. Une carte interactive du paléo-monde. Une page À propos qui
assume la collab humain × Claude Code × ChatGPT.

## Stack

- **Astro 6** + **React 19** (composants interactifs : filtres, carte)
- **Tailwind 4** (palette ambre fossile / jade fougère / rust terre rouge)
- **Leaflet** + tuiles CARTO Dark No Labels (carte paléo-monde)
- **Cinzel** + **Crimson Text** (typographies lapidaires + lecture serif)
- Build statique pur, déployé sur **Cloudflare Pages**

## Sources de données

- **PBDB** — [Paleobiology Database](https://paleobiodb.org), CC0 / CC-BY
  (taxonomie, occurrences fossiles, datations stratigraphiques)
- **Wikimedia Commons** — paleo-art domaine public ou CC-BY-SA
- **ICS 2024** — International Chronostratigraphic Chart pour les bornes Ma
- **OpenStreetMap + CARTO** — fond de carte

## Architecture

```
evatosorus/
├── frontend/                      # site Astro
│   ├── src/
│   │   ├── pages/                 # routes : / · /codex · /periodes · /carte · /about
│   │   │   ├── index.astro        # landing cinématique 75s loop
│   │   │   ├── codex.astro        # grid filtrable
│   │   │   ├── periodes/[id].astro
│   │   │   └── especes/[id].astro
│   │   ├── components/
│   │   │   ├── EvatoLogo.astro
│   │   │   ├── SpeciesCard.astro
│   │   │   ├── CodexFilters.tsx   # client:load (filtres réactifs)
│   │   │   ├── PaleoMap.tsx       # client:only react (Leaflet)
│   │   │   └── cinema/            # CycleBackdrop + DustField
│   │   ├── data/
│   │   │   ├── periods.ts         # 3 ères statiques
│   │   │   ├── species.types.ts   # schéma Zod-ready
│   │   │   ├── species.seed.ts    # 24 stars curées à la main
│   │   │   ├── species.ts         # merge seed + import
│   │   │   └── generated/         # output PBDB (gitignored)
│   │   ├── layouts/               # BaseLayout + CodexLayout (sidebar)
│   │   └── styles/global.css      # @theme tokens + amber-word hover
│   ├── astro.config.mjs
│   └── package.json
├── scripts/
│   └── import-paleobiodb.mjs      # enrichit avec ~1500 espèces PBDB
├── docs/                          # essais éditoriaux (à venir)
├── README.md
├── HOW-IT-WORKS.md
├── DEPLOY.md
└── LICENSE                        # MIT
```

## Dev local

```bash
cd frontend
nvm use         # Node 22
npm install
npm run dev     # http://localhost:4321
```

## Enrichir les données depuis PaleoBioDB

```bash
cd frontend
npm run import:paleobiodb              # 1500 espèces (default)
# ou
node ../scripts/import-paleobiodb.mjs --limit 3000
```

Le script écrit `frontend/src/data/generated/species.generated.json` qui est
mergé au runtime avec le seed manuel. Si le fichier n'existe pas, le site
fonctionne avec les 24 espèces stars du seed — c'est volontaire.

## Build & déploiement

```bash
cd frontend
npm run build   # → dist/
```

Connecte le repo à Cloudflare Pages, build command `cd frontend && npm install && npm run build`,
output directory `frontend/dist`. C'est tout.

## Crédits

Vibé à plusieurs :
- **Sylvain** (humain) — direction artistique, choix éditoriaux, code review
- **Claude Code** (Anthropic, Opus 4.7 1M context) — code Astro/React/CSS, blurbs vulgarisés
- **ChatGPT** — recherches visuelles, idées de palettes, brainstorming des sections
- **[openart.ai](https://openart.ai)** — image hero du T-Rex et les trois vidéos d'animation (landing / films / about)

Toutes les fiches espèce sont CC-BY (texte) ; les images viennent de Wikimedia
Commons avec leur licence d'origine, créditée sur chaque fiche. L'image hero
et les animations vidéo sont des générations openart.ai à partir de prompts curés.

## Licence

MIT — le code, pas les images. Voir [LICENSE](./LICENSE).
