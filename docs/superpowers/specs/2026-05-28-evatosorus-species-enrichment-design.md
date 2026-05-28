# Enrichissement auto des 1500 espèces — Evatosorus

**Date** : 2026-05-28
**Statut** : design validé, prêt pour plan d'implémentation

## Problème

Le codex evatosorus contient 1524 espèces, mais le contenu est très déséquilibré :

| Source | Espèces | Données |
|---|---|---|
| Seed curé (`species.seed.ts`) | 24 | ✅ blurb BBC, image Wikimedia, paleo-art openart, taille/poids, diète, classification |
| Import PaleoBioDB (`species.generated.json`) | 1500 | ❌ coquilles vides : nom scientifique, `wikipediaUrl`, `locations`, `earlyMa` uniquement |

Mesuré 2026-05-28 sur `species.generated.json` :
- `commonName`, `blurb`, `imageUrl`, `lifeRestorationUrl`, `lengthM`, `weightKg`, `epochs` : **0%**
- `diet` = `unknown` : **100%**
- `taxonGroup` = `other` : 561 ; `other-ornithischian` 294 ; `other-saurischian` 285 ; `marine-reptile` 203 ; `pterosaur` 151 ; `theropod` 6

C'est exactement l'anti-pattern interdit par `CLAUDE.md` (« importer 1500 espèces sans paleo-art → fiches creuses »). Les 1500 fiches s'affichent avec un glyphe `𓆗` en fallback, sans texte ni image, et polluent les filtres du codex (tout en `unknown`/`other`).

## Objectif

Enrichir les 1500 fiches vides avec données structurées + image + blurb, via un pipeline **offline** exécuté en local, dont le résultat est committé. Le build Cloudflare Pages reste 100% statique (aucun appel réseau au build).

## Décisions validées (brainstorming 2026-05-28)

1. **Direction** : enrichir automatiquement les 1500 vides (plus gros ROI).
2. **Blurb** : réécriture ton « documentaire BBC » via **Ollama llama3.1:8b local** (RTX 4080, gratuit, on-brand). Pas qwen3 (cf pitfall thinking-model batch).
3. **Images** : **download local** dans `/public/species/` + crédit/licence enregistrés (self-contained, pas de dépendance runtime externe).

## Prérequis (vérifiés 2026-05-28)

- ✅ Ollama up sur `http://localhost:11434`, modèle `llama3.1:8b` présent et génère.
  - Quirk constaté : llama3.1 ajoute un préambule conversationnel (« Voici deux phrases… »). → Le prompt DOIT exiger une sortie brute, et le parsing strippe toute ligne d'intro / guillemets.
- ✅ `sharp` 0.34.5 déjà installé dans `frontend/node_modules`.

## Architecture

Nouveau script offline : `frontend/scripts/enrich-species.mjs` (Node ESM, même emplacement et conventions que `import-paleobiodb.mjs`).

- **Entrée** : `frontend/src/data/generated/species.generated.json` (les 1500 entrées existantes).
- **Sortie** :
  - `frontend/src/data/generated/species.generated.json` réécrit (champs vides remplis).
  - `frontend/public/species/<id>.jpg` pour chaque image téléchargée.
- **Exécution** : `cd frontend && node scripts/enrich-species.mjs [--limit N] [--ids a,b,c]`.
- Le résultat (JSON + images) est **committé**. Le build ne touche pas le réseau.

### Pipeline par espèce

Les 24 ids du seed sont **skippés** (seed wins au runtime, déjà curées — on ne perd rien et on économise le temps batch).

1. **Résolution Wikidata QID** :
   - via le `wikipediaUrl` existant → API MediaWiki `?prop=pageprops&ppprop=wikibase_item` sur le wiki correspondant ;
   - fallback : recherche Wikidata par nom scientifique (`wbsearchentities`), filtrée sur `instance of` taxon.
2. **Champs structurés depuis Wikidata** :
   - `commonName` : label FR de l'entité (si différent du nom scientifique).
   - `taxonGroup` : remonter la chaîne `P171` (parent taxon) et mapper le premier clade connu (table `Theropoda→theropod`, `Sauropoda→sauropod`, `Ornithopoda→ornithopod`, `Thyreophora→thyreophoran`, `Ceratopsia→ceratopsian`, `Pachycephalosauria→pachycephalosaur`, `Pterosauria→pterosaur`, `Sauropterygia/Ichthyosauria/Mosasauridae→marine-reptile`, `Saurischia→other-saurischian`, `Ornithischia→other-ornithischian`, défaut `other`). Corrige les 561 `other`.
   - image : `P18` (nom de fichier Commons).
3. **Texte source** : Wikipedia REST summary FR (`https://fr.wikipedia.org/api/rest_v1/page/summary/<title>`), fallback EN. Champ `extract`.
4. **blurb BBC** : `extract` Wikipedia → Ollama llama3.1:8b. Prompt strict : « Reformule en 2-3 phrases, ton documentaire factuel et accessible, en français, SANS rien inventer ni ajouter. Réponds UNIQUEMENT avec le texte reformulé, sans introduction ni guillemets. » `temperature: 0.3`. Parsing : strip lignes d'intro (« Voici… », « Voilà… »), guillemets encadrants, espaces. Si `extract` absent → pas de blurb (skip, pas d'invention).
5. **Image** :
   - `P18` → API Commons `imageinfo` (url + `extmetadata`).
   - download de l'original → `sharp` resize largeur max **800px**, JPEG **q80** → `frontend/public/species/<id>.jpg`.
   - `imageUrl = /species/<id>.jpg`, `imageCredit = "<Artist> — <LicenseShortName> via Wikimedia Commons"` (depuis `extmetadata`). Commons n'héberge que du média libre → licence toujours présente ; si `extmetadata` manque la licence, **skip l'image** (sécurité juridique) et fallback silhouette.
6. **diet** : Wikidata n'a pas de propriété diète fiable pour les taxons éteints. → **heuristique par clade** (validée 2026-05-28), appliquée à partir du `taxonGroup` dérivé à l'étape 2 :
   - `theropod` → `carnivore` (exception connue : therizinosaures herbivores, mais marginale et non distinguée ici → acceptable)
   - `sauropod`, `ornithopod`, `thyreophoran`, `ceratopsian`, `pachycephalosaur`, `other-ornithischian` → `herbivore`
   - `pterosaur` → `unknown` (régimes variés : piscivores, insectivores, carnivores)
   - `marine-reptile` → `unknown` (mosasaures carnivores mais ichtyosaures/plésiosaures piscivores : trop hétérogène)
   - `other-saurischian`, `other` → `unknown`
   - Ne s'applique JAMAIS sur une entrée qui a déjà une diète (seed). Rend le filtre diète du codex utilisable sans inventer pour les groupes ambigus.
7. **epochs / lengthM / weightKg** : best-effort uniquement si une source structurée fiable existe ; sinon on laisse vide (pas d'invention). Hors scope prioritaire de cette passe.

### Robustesse

- **Cache/checkpoint par espèce** : `frontend/scripts/.cache/enrich/<id>.json` (gitignored). Au démarrage, si le cache existe et est complet, on le réutilise → le batch (plusieurs heures) est **resumable** sans tout refaire. Les images déjà présentes dans `/public/species/` ne sont pas re-téléchargées.
- **Merge préservant** : on ne remplit QUE les champs vides/absents d'une entrée. On ne touche jamais une entrée du seed curé. On ne réécrit pas une valeur existante.
- **Fallback gracieux** : pas de QID, pas d'`extract`, ou pas d'image libre → on enrichit ce qu'on peut, le reste reste vide, la fiche tombe sur la silhouette par groupe (`silhouettes-by-group.json`, déjà géré par `[id].astro`). **Aucune exception ne crashe le batch** — chaque espèce est isolée dans un try/catch, l'erreur est loggée et comptée.
- **Politesse API Wikimedia** : `User-Agent` explicite (contact), throttle entre requêtes (~150-250ms), retry léger sur 429/5xx.
- **Rapport final** : compteurs `enrichies / images téléchargées / blurbs générés / taxonGroup corrigés / skippées (no-data) / erreurs`, + chemin du JSON écrit.

### Modes d'exécution

- `--limit N` : ne traite que les N premières espèces non-seed (validation échantillon).
- `--ids a,b,c` : ne traite que ces ids (debug ciblé).
- Défaut : toutes les espèces non-seed non encore enrichies (s'appuie sur le cache).

## Couverture attendue (honnête)

Beaucoup de genres PaleoBioDB sont obscurs. Estimation réaliste : ~30-60% auront une image Commons, une majorité aura au moins un blurb Wikipedia, la quasi-totalité aura un `taxonGroup` corrigé. Le reste = data structurée partielle + silhouette. **Bien mieux que 100% vide** ; le rapport final donne les chiffres réels.

## Validation

1. Run `node scripts/enrich-species.mjs --limit 10`.
2. `npm run build` (vérifier que le combo vite 7.3.2 / astro 6.2.1 build toujours).
3. Inspection visuelle : `/codex` (cards remplies, filtres diète/groupe cohérents) + quelques `/especes/[id]` (image, blurb, classification). Screenshots → **verdict humain de Sylvain** avant le run complet (cf feedback iterate-ux-with-screenshots).
4. Si OK → run complet, re-build, commit JSON + images + script.

## Poids dist

1500 images @ ~800px/q80 ≈ 60-120 Mo selon couverture. Sous le cap Cloudflare Pages (25 Mo **par fichier**, 20 000 fichiers max — ~3000 fichiers ici). Acceptable.

## Hors scope

- Pas de paleo-art generatif (les openart restent réservés aux 24 iconiques).
- Pas de refonte UX du codex / fiche détail (le rendu gère déjà image/blurb/fallback).
- Pas d'extraction taille/poids exhaustive (best-effort, non bloquant).

## Crédits

À ajouter dans About / README après le run : enrichissement via PaleoBioDB + Wikidata + Wikipedia + Wikimedia Commons (licences enregistrées par image), blurbs reformulés avec llama3.1:8b local. Toujours « humain + Claude Code + openart.ai » — **pas de ChatGPT**.
