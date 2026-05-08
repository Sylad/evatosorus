# Evatosorus — guide Claude Code

5ème site Sylad, **suite naturelle d'Eywa** (Avatar pour Eva). Codex paléontologique premium, ton documentaire BBC, ~1500 espèces auto-importées de PaleoBioDB. Build statique Cloudflare Pages, **pas de NAS**.

## Architecture

| | |
|---|---|
| Stack | Astro 6 + R3F + GSAP + Tailwind 4 (reproduit pattern Eywa) |
| Backend | **AUCUN** — build statique pur, données figées au build |
| Déploiement | Cloudflare Pages (https://evatosorus.pages.dev). Build : `cd frontend && npm install && npm run build`, output `frontend/dist`, NODE_VERSION=22 |
| Pages | 1527 pages (1 landing + 1 codex + 4 périodes + 1511 espèces + 7 films + 1 carte + 1 about). Dist ~27 MB |

## Public + ton

- **Destinataire symbolique** : Eva (nièce, 18 ans). Dédicace dans le About comme Eywa.
- **Ton** : documentaire BBC sérieux mais accessible, ado/adulte passionné. Pas vulgarisation enfantine, pas jargon académique.
- Mot-valise du nom : Eva + saurus. Échos d'Eywa (cadeau pour Eva), mais identité visuelle distincte (cf section suivante).

## openart.ai PAS ChatGPT — important

**Crédits IA pour Evatosorus** :

- ✅ **Claude Code** (code).
- ✅ **openart.ai** (image hero T-Rex + 3 vidéos MP4 boucle).
- ❌ **PAS de ChatGPT.** Confirmé 2026-05-06 : *"je n'ai pas utilisé chatgpt pour ce site"*.

À mentionner dans About / README : "humain + Claude Code + openart.ai". Ne pas copier-coller le crédit warhammer/finance/OL (qui mentionne ChatGPT).

## Identité visuelle distincte d'Eywa

❌ **Ne PAS dupliquer le pattern UX Avatar verbatim.** Evatosorus doit avoir son identité :

- **Eywa** = cyan / bioluminescent / océan / forêt
- **Evatosorus** = ambre / sable / terre / fossile

Mêmes briques techniques (Astro + R3F + GSAP + Tailwind), palettes opposées.

## Source de vérité curée : species.seed.ts

`frontend/src/data/species.seed.ts` est la **source de vérité** des espèces (curée à la main depuis PaleoBioDB API). **Ne jamais l'écraser sans raison** — toute regen automatique doit préserver les espèces déjà curées (merge, pas overwrite).

Avant de modifier le seed, `git -C ~/projects/developpeur/evatosorus log --oneline -5 frontend/src/data/species.seed.ts` pour voir ce qui a été curé.

## Sources de données

- **PaleoBioDB API** (https://paleobiodb.org/data1.2/) — gratuit, taxonomie + occurrences fossiles + datations. Source principale.
- **Wikimedia Commons** — paleo-art **domaine public** (≥ 1923) + illustrations historiques. **Toujours vérifier la licence** avant inclusion.
- **Wikipedia FR/EN** — descriptions narratives.
- **GBIF Occurrence API** — pour la carte des fossiles trouvés.

## Anti-patterns

- ❌ Importer 1500 espèces **sans paleo-art** → fiches creuses. Toujours fallback `"Pas d'illustration disponible"` propre + placeholder design (silhouette stylisée).
- ❌ Ajouter NestJS backend si évitable — build statique strict pour Cloudflare Pages.
- ❌ Dupliquer l'UX Eywa (cf section identité).

## Hero MP4 — cap Cloudflare 25 MB/file

- 3 vidéos MP4 hero générées openart.ai : `hero-trex-1.mp4` (landing), `hero-trex-2.mp4` (films hero), `hero-trex-3.mp4` (about). 40 MB total, **chaque fichier sous 25 MB** (cap Cloudflare Pages par fichier).
- Si un MP4 dépasse, ré-encoder via skill `optimize-mp4-web` (ffmpeg H.264 web-optimisé, réduction 80-95% sans perte visuelle perceptible).
- Toujours fournir un **poster fallback** (`hero-trex.jpg`) — utilisé pour les og-image / favicons (cropés au PIL).

## Versions épinglées

`frontend/package.json` override : `"vite": "7.3.2"`, `"astro": "6.2.1"` épinglés. Sinon tailwind+rolldown crash sur tsconfigPaths. **Ne pas bumper aveuglément** — vérifier que le combo build encore avant.

## Sections livrées (V1, 2026-05-06)

- **Codex** — filtres React-driven sur 1500 cards SSR.
- **Voyage temporel** — 4 périodes (Trias / Jurassique / Crétacé / + transition K-Pg) avec 3 périodes détaillées.
- **Carte** — Leaflet + CARTO Dark, occurrences fossiles GBIF.
- **Films Jurassic Park** — 7 films + détails + cross-link espèces.
- **About** — dédicace Eva.

## Repo

GitHub public : https://github.com/Sylad/evatosorus. Cloudflare Pages connection à brancher côté dashboard Sylvain (action manuelle, pas automatisable côté CLI).
