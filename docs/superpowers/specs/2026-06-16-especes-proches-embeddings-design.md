# Espèces proches — recherche sémantique offline (embeddings locaux)

**Date** : 2026-06-16
**App** : evatosorus (Astro statique, Cloudflare Pages)
**Doc associée** : page pédagogique sur claude-code-codex (voir §6)

## 1. But

Ajouter un bloc « Espèces similaires » (top 5) sur chaque fiche espèce, calculé par
similarité sémantique. Premier usage *générique* d'IA locale en mode embeddings
(≠ génération de texte) dans la stack. 100 % précalculé offline → livraison
statique, zéro modèle ML dans le navigateur, zéro serveur.

## 2. Pourquoi local

- **Volume + répétitif** : ~1500 fiches à vectoriser une fois. Gratuit sur la RTX 4080.
- **Réutilise le pattern existant** : `scripts/enrich-species.mjs` appelle déjà Ollama
  (`ollamaBlurb`). On clone ce pattern offline + resumable + cache + commit.
- Pas de qualité-Claude requise : les embeddings sont une brique mécanique.

## 3. Architecture

```
species.generated.json  ──(offline, Ollama nomic-embed-text, GPU)──▶  vecteurs 768-dim
        │                                                                     │
        │                                              cosine + top-5 par espèce
        ▼                                                                     ▼
[id].astro  ◀──(build, lecture JSON)──  species-neighbors.generated.json (committé)
```

### Composants

1. **`scripts/embed-species.mjs`** (jumeau de `enrich-species.mjs`)
   - Lit `frontend/src/data/generated/species.generated.json`.
   - Texte embedché par espèce : `commonName + nom scientifique + taxonGroup + diet + blurb`.
   - `POST http://localhost:11434/api/embeddings` modèle `nomic-embed-text` (768-dim).
   - Resumable + cache par espèce dans `scripts/.cache/embed/` (réutilise le pattern cache).
   - Brute-force cosine, top-5 voisins par espèce (~2.25M comparaisons = quelques secondes).
   - Écrit `frontend/src/data/generated/species-neighbors.generated.json` :
     `{ "<id>": [{ "id": "...", "score": 0.87 }, … ×5] }`. **Committé** (comme la donnée enrichie).
   - Flags : `--limit N`, `--ids a,b`, `--top K` (défaut 5).

2. **`scripts/lib/embed-pure.mjs`** (logique pure testable)
   - `cosineSimilarity(a, b)` → number.
   - `topKNeighbors(targetId, vectorsById, k)` → `[{id, score}]`.
   - Tests dans `scripts/embed-species.test.mjs` (même runner que `enrich-species.test.mjs`).

3. **Affichage — `frontend/src/pages/especes/[id].astro`**
   - Bloc « Espèces similaires » : lit `species-neighbors.generated.json` au build,
     résout chaque id → carte (miniature + nom commun + lien `/especes/<id>`).
   - 100 % statique, zéro JS client. Masqué si l'espèce n'a pas de voisins (edge case).

## 4. Données / invariants

- Le JSON voisins est un artefact **committé**, pas régénéré à chaque build (pas de
  dépendance Ollama au build CF Pages). Régénéré manuellement quand le corpus change.
- Ne touche jamais `species.generated.json` (lecture seule).
- Si un voisin référence un id absent du corpus → filtré au build (pas de carte morte).

## 5. Hors scope (YAGNI v1)

- Pas de barre de recherche texte libre (pas de modèle navigateur / transformers.js).
- Pas de re-embedding au build CI.
- Pas de filtrage par groupe taxo (l'embedding gère la pertinence ; cross-groupe = OK).

## 6. Documentation pédagogique (claude-code-codex)

Nouvelle page `frontend/src/pages/embeddings-pour-les-nuls.astro`, même gabarit que
`argocd-k8s-pour-les-nuls.astro` (PageHero + TheorySection + CodeBlock + TheoryTOC,
wrapper `mx-auto max-w-3xl px-5 sm:px-8 py-12 space-y-12`). Entrée dans `Navbar.vue`.

Plan de la page :
1. C'est quoi un embedding (un vecteur = du sens, schéma intuitif).
2. Embeddings vs génération de texte (deux usages distincts d'un LLM local).
3. Similarité cosinus + top-K = la brique de toute recherche sémantique / RAG.
4. Le cas concret evatosorus : pipeline offline Ollama → JSON voisins → bloc statique.
5. Quand choisir local vs cloud (la règle privé/volumineux/répétitif vs rare/qualité-critique).

## 7. Tests / validation

- Unit : `embed-pure.mjs` (cosine connu, top-K ordre décroissant, k > n).
- Manuel : lancer `embed-species.mjs --limit 20`, vérifier la cohérence des voisins
  (un T-rex proche d'autres théropodes, pas d'une fougère).
- Build evatosorus OK + visuel d'une fiche avec le bloc.
