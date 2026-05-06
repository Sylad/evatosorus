# Evatosorus — Déploiement Cloudflare Pages

Site statique pur, déployé via le connecteur Cloudflare Pages → GitHub.
Pas de NAS, pas de Docker, pas de NestJS. Tout vit sur l'edge CDN.

## Premier déploiement

1. **Crée le repo GitHub** (public, MIT)

   ```bash
   cd /volume2/docker/developpeur/evatosorus  # ou ton chemin local
   git init
   git add .
   git commit -m "feat: bootstrap Evatosorus codex mésozoïque"
   gh repo create sylad/evatosorus --public --source=. --remote=origin --push
   ```

2. **Connecte Cloudflare Pages au repo**

   - https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
   - Sélectionne `sylad/evatosorus`
   - Branche prod : `main`

3. **Build settings**

   | Champ | Valeur |
   |---|---|
   | Framework preset | Astro |
   | Build command | `cd frontend && npm install && npm run build` |
   | Build output directory | `frontend/dist` |
   | Root directory | (vide) |
   | Node version | `22` (var d'env `NODE_VERSION=22`) |

4. **Variables d'environnement** : aucune.

5. **Premier deploy** : Cloudflare clone, build, déploie. ~90 s.

   URL preview : `https://evatosorus.pages.dev`

## Build local pour tester

```bash
cd frontend
nvm use
npm install
npm run build      # → dist/
npm run preview    # http://localhost:4321
```

Vérifie :
- [ ] La landing tourne (cycle backdrop 75s, dust drift, hover amber-word)
- [ ] `/codex` : filtres période/régime/groupe filtrent en live
- [ ] `/periodes` → cards Trias/Jurassique/Crétacé
- [ ] `/periodes/jurassique` : detail période + species grid
- [ ] `/especes/tyrannosaurus-rex` : fiche complète, image, stats, related
- [ ] `/carte` : Leaflet charge, markers ambre/jade/rust, popups stylés
- [ ] `/about` : page complète

## Enrichir avec PaleoBioDB avant le deploy

```bash
cd frontend
npm run import:paleobiodb
git add src/data/generated/
git commit -m "data: enrich species via PaleoBioDB import"
git push
```

Cloudflare rebuild auto sur push.

> ⚠️ Le dossier `frontend/src/data/generated/` est **gitignored par défaut**.
> Si tu veux versionner le JSON généré (recommandé pour la repro de build
> Cloudflare), enlève la ligne dans `.gitignore`.

## Déploiement preview

Pousse sur une autre branche → Cloudflare Pages génère automatiquement
un preview URL `https://<branch>.evatosorus.pages.dev`.

```bash
git checkout -b feat/timeline-3d
git push -u origin feat/timeline-3d
```

## Domaine custom (optionnel)

Cloudflare Pages → Custom domains → ajoute par exemple `evatosorus.fr`.
Si le domaine est déjà sur Cloudflare DNS, c'est instantané (CNAME auto).

## Rollback

Cloudflare Pages garde les 100 derniers builds. Onglet Deployments →
clique sur un ancien build → "Rollback to this deployment". 5 secondes.
