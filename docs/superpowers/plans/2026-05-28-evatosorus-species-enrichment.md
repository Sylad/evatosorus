# Enrichissement auto des 1500 espèces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplir automatiquement les 1500 fiches espèces vides (`species.generated.json`) avec `commonName`, `taxonGroup` corrigé, `diet` (heuristique clade), `blurb` ton BBC (Ollama local) et image Wikimedia téléchargée+créditée, via un script offline committé — le build Cloudflare reste 100% statique.

**Architecture :** Un script orchestrateur Node ESM (`scripts/enrich-species.mjs`) qui s'appuie sur deux modules : `scripts/lib/enrich-pure.mjs` (fonctions pures, testées via `node --test`) et `scripts/lib/enrich-sources.mjs` (I/O réseau Wikidata/Wikipedia/Commons/Ollama + resize sharp). Cache par espèce dans `scripts/.cache/enrich/` (gitignored) → batch resumable. Merge préservant : ne remplit que les champs vides/placeholder, ne touche jamais le seed curé.

**Tech Stack :** Node 22 ESM, `fetch` natif, `sharp` (résolu en transitif via astro, importé directement), Ollama `llama3.1:8b` local (`http://localhost:11434`), `node --test` (runner built-in, zéro dep ajoutée).

**Spec :** `docs/superpowers/specs/2026-05-28-evatosorus-species-enrichment-design.md`

---

## File Structure

- `scripts/lib/enrich-pure.mjs` — **créer**. Fonctions pures sans I/O : `slugify`, `stripHtml`, `classifyTaxonGroupFromChain`, `dietFromGroup`, `cleanBlurb`, `buildImageCredit`, `fillIfEmpty`. Seul fichier unit-testé.
- `scripts/enrich-species.test.mjs` — **créer**. Tests `node --test` des fonctions pures.
- `scripts/lib/enrich-sources.mjs` — **créer**. I/O réseau : `fetchJson` (UA + retry), `getEntity` (Wikidata, mémoïsé), `resolveQid`, `taxonChainLabels`, `fetchCommonsImage`, `wikipediaSummary`, `ollamaBlurb`, `downloadAndResize`.
- `scripts/enrich-species.mjs` — **créer**. Orchestrateur : args, chargement, cache, boucle principale, merge, rapport.
- `frontend/package.json` — **modifier**. Ajouter scripts npm `enrich:species` et `test:scripts`.
- `frontend/src/data/generated/species.generated.json` — **modifier** (sortie du run, committée).
- `frontend/public/species/<id>.jpg` — **créer** (images téléchargées, committées).
- `.gitignore` — déjà patché (`scripts/.cache/`).

---

## Task 1: npm scripts

**Files:**
- Modify: `frontend/package.json` (bloc `scripts`)

- [ ] **Step 1: Ajouter les deux scripts npm**

Dans `frontend/package.json`, bloc `"scripts"`, après la ligne `"ollama:species": ...`, ajouter :

```json
    "enrich:species": "node ../scripts/enrich-species.mjs",
    "test:scripts": "node --test ../scripts/*.test.mjs"
```

(Le bloc doit rester du JSON valide — penser à la virgule sur la ligne précédente.)

- [ ] **Step 2: Vérifier le JSON**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"`
Expected: `package.json OK`

- [ ] **Step 3: Commit**

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add frontend/package.json
git commit -m "chore(evatosorus): npm scripts enrich:species + test:scripts"
```

---

## Task 2: Fonctions pures + tests (TDD)

**Files:**
- Create: `scripts/lib/enrich-pure.mjs`
- Test: `scripts/enrich-species.test.mjs`

- [ ] **Step 1: Écrire les tests (qui échouent)**

Créer `scripts/enrich-species.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  stripHtml,
  classifyTaxonGroupFromChain,
  dietFromGroup,
  cleanBlurb,
  buildImageCredit,
  fillIfEmpty,
} from './lib/enrich-pure.mjs';

test('slugify: binomial → kebab', () => {
  assert.equal(slugify('Tyrannosaurus rex'), 'tyrannosaurus-rex');
  assert.equal(slugify('  Aardonyx  celestae '), 'aardonyx-celestae');
});

test('stripHtml: enlève balises et espaces', () => {
  assert.equal(stripHtml('<a href="x">John   Doe</a>'), 'John Doe');
  assert.equal(stripHtml(undefined), '');
});

test('classifyTaxonGroupFromChain: clade le plus spécifique gagne', () => {
  assert.equal(classifyTaxonGroupFromChain(['Tyrannosauridae', 'Theropoda', 'Saurischia', 'Dinosauria']), 'theropod');
  assert.equal(classifyTaxonGroupFromChain(['Diplodocidae', 'Sauropoda', 'Saurischia']), 'sauropod');
  assert.equal(classifyTaxonGroupFromChain(['Ankylosauria', 'Thyreophora', 'Ornithischia']), 'thyreophoran');
  assert.equal(classifyTaxonGroupFromChain(['Mosasauridae', 'Squamata']), 'marine-reptile');
  assert.equal(classifyTaxonGroupFromChain(['Saurischia', 'Dinosauria']), 'other-saurischian');
  assert.equal(classifyTaxonGroupFromChain(['Ornithischia']), 'other-ornithischian');
  assert.equal(classifyTaxonGroupFromChain(['Archosauria']), 'other');
  assert.equal(classifyTaxonGroupFromChain([]), 'other');
});

test('dietFromGroup: heuristique clade', () => {
  assert.equal(dietFromGroup('theropod'), 'carnivore');
  assert.equal(dietFromGroup('sauropod'), 'herbivore');
  assert.equal(dietFromGroup('ceratopsian'), 'herbivore');
  assert.equal(dietFromGroup('other-ornithischian'), 'herbivore');
  assert.equal(dietFromGroup('pterosaur'), 'unknown');
  assert.equal(dietFromGroup('marine-reptile'), 'unknown');
  assert.equal(dietFromGroup('other'), 'unknown');
});

test('cleanBlurb: enlève préambule llama et guillemets', () => {
  const raw = 'Voici deux phrases qui reformulent votre texte :\n\nLe Stegosaurus est un dinosaure. Il vivait au Jurassique.';
  assert.equal(cleanBlurb(raw), 'Le Stegosaurus est un dinosaure. Il vivait au Jurassique.');
  assert.equal(cleanBlurb('"Un texte entre guillemets."'), 'Un texte entre guillemets.');
  assert.equal(cleanBlurb(''), '');
});

test('buildImageCredit: licence présente → crédit, absente → null', () => {
  const ok = buildImageCredit({ LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Jane</a>' } });
  assert.equal(ok.license, 'CC BY-SA 4.0');
  assert.equal(ok.credit, 'Jane — CC BY-SA 4.0 via Wikimedia Commons');
  assert.equal(buildImageCredit({ Artist: { value: 'Jane' } }), null);
  assert.equal(buildImageCredit(null), null);
});

test('fillIfEmpty: ne remplit que vides + placeholders other/unknown', () => {
  const t = { name: 'X', taxonGroup: 'other', diet: 'unknown', blurb: 'déjà là' };
  fillIfEmpty(t, { taxonGroup: 'theropod', diet: 'carnivore', blurb: 'NOUVEAU', commonName: 'Truc' });
  assert.equal(t.taxonGroup, 'theropod'); // 'other' est un placeholder → remplacé
  assert.equal(t.diet, 'carnivore');      // 'unknown' placeholder → remplacé
  assert.equal(t.blurb, 'déjà là');       // déjà rempli → conservé
  assert.equal(t.commonName, 'Truc');     // absent → ajouté
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `cd frontend && node --test ../scripts/enrich-species.test.mjs`
Expected: FAIL (`Cannot find module '.../scripts/lib/enrich-pure.mjs'`)

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `scripts/lib/enrich-pure.mjs` :

```js
// Fonctions pures (sans I/O) de l'enrichissement espèces. Testées via node --test.

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ordre = du plus spécifique au plus générique (premier match gagne).
export const TAXON_GROUP_RULES = [
  { match: /Theropoda/i, group: 'theropod' },
  { match: /Sauropodomorpha|Sauropoda/i, group: 'sauropod' },
  { match: /Ornithopoda/i, group: 'ornithopod' },
  { match: /Thyreophora|Stegosauria|Ankylosauria/i, group: 'thyreophoran' },
  { match: /Ceratopsia/i, group: 'ceratopsian' },
  { match: /Pachycephalosauria/i, group: 'pachycephalosaur' },
  { match: /Pterosauria/i, group: 'pterosaur' },
  { match: /Mosasauridae|Ichthyosauria|Plesiosauria|Sauropterygia/i, group: 'marine-reptile' },
  { match: /Saurischia/i, group: 'other-saurischian' },
  { match: /Ornithischia/i, group: 'other-ornithischian' },
];

export function classifyTaxonGroupFromChain(chainNames) {
  const hay = (chainNames || []).join(' ');
  for (const r of TAXON_GROUP_RULES) {
    if (r.match.test(hay)) return r.group;
  }
  return 'other';
}

export function dietFromGroup(group) {
  switch (group) {
    case 'theropod':
      return 'carnivore';
    case 'sauropod':
    case 'ornithopod':
    case 'thyreophoran':
    case 'ceratopsian':
    case 'pachycephalosaur':
    case 'other-ornithischian':
      return 'herbivore';
    default:
      return 'unknown';
  }
}

const PREAMBLE_RE = /^(voici|voilà|bien sûr|d'accord|voici le texte|voici la version|voici la reformulation|reformulation)/i;

export function cleanBlurb(raw) {
  if (!raw) return '';
  let lines = String(raw)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  // Drop leading conversational preamble lines (llama3.1 ajoute souvent "Voici ... :").
  while (lines.length > 1 && (PREAMBLE_RE.test(lines[0]) || (/:\s*$/.test(lines[0]) && lines[0].length < 90))) {
    lines.shift();
  }
  let text = lines.join(' ').trim();
  // Strip wrapping quotes (droites, courbes, guillemets français).
  text = text.replace(/^["«»“”']+\s*/, '').replace(/\s*["«»“”']+$/, '').trim();
  return text;
}

export function buildImageCredit(extmetadata) {
  const license = stripHtml(extmetadata?.LicenseShortName?.value);
  if (!license) return null; // Pas de licence claire → on skip l'image (sécurité juridique).
  const artist = stripHtml(extmetadata?.Artist?.value) || 'Auteur inconnu';
  return { credit: `${artist} — ${license} via Wikimedia Commons`, license };
}

// Remplit target avec patch UNIQUEMENT pour les champs vides ou placeholder.
// 'other' (taxonGroup) et 'unknown' (diet) sont considérés comme placeholders.
export function fillIfEmpty(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') continue;
    const cur = target[k];
    const isEmpty = cur == null || cur === '';
    const isPlaceholder = (k === 'taxonGroup' && cur === 'other') || (k === 'diet' && cur === 'unknown');
    if (isEmpty || isPlaceholder) target[k] = v;
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le passage**

Run: `cd frontend && node --test ../scripts/enrich-species.test.mjs`
Expected: PASS (7 tests, 0 fail)

- [ ] **Step 5: Commit**

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add scripts/lib/enrich-pure.mjs scripts/enrich-species.test.mjs
git commit -m "feat(evatosorus): pure helpers enrichissement espèces + tests"
```

---

## Task 3: Module sources réseau (Wikidata / Wikipedia / Commons / Ollama / image)

**Files:**
- Create: `scripts/lib/enrich-sources.mjs`

Pas de test unitaire (I/O réseau live) — validé par une sonde manuelle Step 2 puis par le smoke `--limit` (Task 5).

- [ ] **Step 1: Écrire le module sources**

Créer `scripts/lib/enrich-sources.mjs` :

```js
// I/O réseau de l'enrichissement : Wikidata, Wikipedia REST, Commons, Ollama, image.
import sharp from 'sharp';
import { cleanBlurb } from './enrich-pure.mjs';

const UA = 'EvatosorusEnrich/1.0 (https://github.com/Sylad/evatosorus; sylvain.ladoire@gmail.com)';
const OLLAMA = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';
export const THROTTLE_MS = Number(process.env.ENRICH_THROTTLE_MS ?? 200);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    } catch {
      await sleep(800 * (i + 1));
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * (i + 1));
      continue;
    }
    return null; // 4xx définitif
  }
  return null;
}

// Parse un wikipediaUrl en { lang, title }. Ex: https://fr.wikipedia.org/wiki/Aardonyx
export function parseWikipediaUrl(url) {
  try {
    const u = new URL(url);
    const lang = u.hostname.split('.')[0];
    const title = decodeURIComponent(u.pathname.replace(/^\/wiki\//, ''));
    if (!title) return null;
    return { lang, title };
  } catch {
    return null;
  }
}

// QID Wikidata depuis un article Wikipedia (pageprops.wikibase_item).
export async function qidFromWikipedia(lang, title) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json` +
    `&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(title)}`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.pageprops?.wikibase_item ?? null;
}

// Fallback : recherche Wikidata par nom scientifique.
export async function qidFromSearch(name) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json` +
    `&language=en&type=item&limit=1&search=${encodeURIComponent(name)}`;
  const data = await fetchJson(url);
  return data?.search?.[0]?.id ?? null;
}

// Entité Wikidata complète, mémoïsée par QID (ancêtres partagés = 1 seul fetch).
export function makeEntityGetter() {
  const cache = new Map();
  return async function getEntity(qid) {
    if (!qid) return null;
    if (cache.has(qid)) return cache.get(qid);
    const data = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const ent = data?.entities?.[qid] ?? null;
    cache.set(qid, ent);
    await sleep(THROTTLE_MS);
    return ent;
  };
}

// Remonte la chaîne P171 (parent taxon) et collecte les labels (en|fr), max 12 sauts.
export async function taxonChainLabels(qid, getEntity) {
  const labels = [];
  const seen = new Set();
  let current = qid;
  for (let i = 0; i < 12 && current && !seen.has(current); i++) {
    seen.add(current);
    const ent = await getEntity(current);
    if (!ent) break;
    const label = ent.labels?.en?.value || ent.labels?.fr?.value;
    if (label) labels.push(label);
    current = ent.claims?.P171?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
  }
  return labels;
}

// Label FR d'une entité (nom commun), si présent et != nom scientifique.
export function frLabel(entity, scientificName) {
  const fr = entity?.labels?.fr?.value;
  if (!fr) return null;
  if (fr.toLowerCase() === String(scientificName).toLowerCase()) return null;
  return fr;
}

// Nom de fichier Commons depuis P18.
export function p18Filename(entity) {
  return entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
}

// Résumé Wikipedia (REST summary). Renvoie l'extract texte ou null.
export async function wikipediaSummary(lang, title) {
  const data = await fetchJson(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  );
  return data?.extract || null;
}

// Infos image Commons : url originale + extmetadata (licence, auteur).
export async function fetchCommonsImage(filename) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&prop=imageinfo&iiprop=url|extmetadata&titles=${encodeURIComponent('File:' + filename)}`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) return null;
  return { url: info.url, extmetadata: info.extmetadata };
}

// Reformulation BBC via Ollama llama3.1:8b. Renvoie blurb nettoyé ou ''.
export async function ollamaBlurb(extract) {
  if (!extract) return '';
  const prompt =
    `Reformule le texte suivant en 2 ou 3 phrases, ton documentaire factuel et accessible, en français. ` +
    `N'invente rien, n'ajoute aucune information absente du texte. ` +
    `Réponds UNIQUEMENT avec le texte reformulé, sans introduction, sans guillemets.\n\nTexte:\n${extract}`;
  let res;
  try {
    res = await fetch(`${OLLAMA}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, stream: false, prompt, options: { temperature: 0.3 } }),
    });
  } catch {
    return '';
  }
  if (!res.ok) return '';
  const data = await res.json();
  return cleanBlurb(data.response);
}

// Télécharge une image et la redimensionne (800px max, JPEG q80) vers outPath.
export async function downloadAndResize(imgUrl, outPath) {
  const res = await fetch(imgUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).rotate().resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(outPath);
}
```

- [ ] **Step 2: Sonde manuelle live (Wikidata + Wikipedia + Ollama)**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
node --input-type=module -e "
import { parseWikipediaUrl, qidFromWikipedia, makeEntityGetter, taxonChainLabels, p18Filename, wikipediaSummary, ollamaBlurb } from '../scripts/lib/enrich-sources.mjs';
const { lang, title } = parseWikipediaUrl('https://fr.wikipedia.org/wiki/Stegosaurus');
const qid = await qidFromWikipedia(lang, title);
const getEntity = makeEntityGetter();
const ent = await getEntity(qid);
console.log('qid', qid, '| p18', p18Filename(ent));
console.log('chain', (await taxonChainLabels(qid, getEntity)).slice(0,6));
const ex = await wikipediaSummary(lang, title);
console.log('extract?', !!ex);
console.log('blurb', await ollamaBlurb(ex));
"
```
Expected: un QID (`Q14250` ou similaire), un nom de fichier P18, une chaîne contenant `Stegosauria`/`Thyreophora`, `extract? true`, et un blurb français de 2-3 phrases **sans préambule « Voici… »**.

- [ ] **Step 3: Commit**

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add scripts/lib/enrich-sources.mjs
git commit -m "feat(evatosorus): module sources réseau enrichissement (wikidata/wikipedia/commons/ollama/sharp)"
```

---

## Task 4: Orchestrateur

**Files:**
- Create: `scripts/enrich-species.mjs`

- [ ] **Step 1: Écrire l'orchestrateur**

Créer `scripts/enrich-species.mjs` :

```js
#!/usr/bin/env node
// Enrichit les fiches espèces vides (PaleoBioDB) de species.generated.json :
// commonName, taxonGroup, diet (heuristique clade), blurb (Ollama), image (Commons).
// Offline + resumable (cache par espèce). Ne touche jamais le seed curé ni les
// champs déjà remplis. Le résultat (JSON + images) est committé.
//
// Usage:
//   cd frontend && node ../scripts/enrich-species.mjs            (toutes les non-seed)
//   cd frontend && node ../scripts/enrich-species.mjs --limit 10
//   cd frontend && node ../scripts/enrich-species.mjs --ids stegosaurus-stenops,allosaurus-fragilis

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyTaxonGroupFromChain, dietFromGroup, buildImageCredit, fillIfEmpty,
} from './lib/enrich-pure.mjs';
import {
  sleep, THROTTLE_MS, parseWikipediaUrl, qidFromWikipedia, qidFromSearch, makeEntityGetter,
  taxonChainLabels, frLabel, p18Filename, wikipediaSummary, fetchCommonsImage, ollamaBlurb,
  downloadAndResize,
} from './lib/enrich-sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED = path.resolve(__dirname, '../frontend/src/data/generated/species.generated.json');
const SEED = path.resolve(__dirname, '../frontend/src/data/species.seed.ts');
const IMG_DIR = path.resolve(__dirname, '../frontend/public/species');
const CACHE_DIR = path.resolve(__dirname, '.cache/enrich');

// --- args ---
const argv = process.argv.slice(2);
const limit = argv.includes('--limit') ? parseInt(argv[argv.indexOf('--limit') + 1], 10) : Infinity;
const onlyIds = argv.includes('--ids') ? new Set(argv[argv.indexOf('--ids') + 1].split(',').map((s) => s.trim())) : null;

// --- cache ---
const cachePath = (id) => path.join(CACHE_DIR, `${id}.json`);
function readCache(id) { try { return JSON.parse(fs.readFileSync(cachePath(id), 'utf8')); } catch { return null; } }
function writeCache(id, data) { fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.writeFileSync(cachePath(id), JSON.stringify(data)); }

// --- seed ids à skipper ---
const seedText = fs.readFileSync(SEED, 'utf8');
const seedIds = new Set([...seedText.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));

// --- données ---
const index = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
const getEntity = makeEntityGetter();
fs.mkdirSync(IMG_DIR, { recursive: true });

const stats = { seen: 0, enriched: 0, images: 0, blurbs: 0, groupsFixed: 0, dietsFixed: 0, skippedNoData: 0, errors: 0, cached: 0 };

// Calcule l'enrichissement d'une espèce (cache si présent).
async function computeEnrichment(s) {
  const cached = readCache(s.id);
  if (cached) { stats.cached++; return cached; }

  const patch = {};
  const wp = parseWikipediaUrl(s.wikipediaUrl);
  let qid = null;
  if (wp) qid = await qidFromWikipedia(wp.lang, wp.title);
  if (!qid) qid = await qidFromSearch(s.name);

  let imageFile = null;
  if (qid) {
    const ent = await getEntity(qid);
    if (ent) {
      const common = frLabel(ent, s.name);
      if (common) patch.commonName = common;
      const chain = await taxonChainLabels(qid, getEntity);
      const group = classifyTaxonGroupFromChain(chain);
      if (group !== 'other') {
        patch.taxonGroup = group;
        const diet = dietFromGroup(group);
        if (diet !== 'unknown') patch.diet = diet;
      }
      imageFile = p18Filename(ent);
    }
  }

  // blurb depuis le résumé Wikipedia (FR puis EN).
  let extract = null;
  if (wp) extract = await wikipediaSummary(wp.lang, wp.title);
  if (!extract && wp?.lang !== 'en') extract = await wikipediaSummary('en', wp?.title ?? s.name);
  if (extract) {
    const blurb = await ollamaBlurb(extract);
    if (blurb) patch.blurb = blurb;
  }

  // image : download si licence claire et fichier pas déjà présent.
  const outPath = path.join(IMG_DIR, `${s.id}.jpg`);
  if (imageFile) {
    if (fs.existsSync(outPath)) {
      patch.imageUrl = `/species/${s.id}.jpg`;
    } else {
      const info = await fetchCommonsImage(imageFile);
      const credit = info ? buildImageCredit(info.extmetadata) : null;
      if (info && credit) {
        try {
          await downloadAndResize(info.url, outPath);
          patch.imageUrl = `/species/${s.id}.jpg`;
          patch.imageCredit = credit.credit;
        } catch {
          stats.errors++;
        }
      }
    }
  }

  writeCache(s.id, patch);
  await sleep(THROTTLE_MS);
  return patch;
}

// --- boucle principale ---
const candidates = index.species.filter((s) => {
  if (seedIds.has(s.id)) return false;
  if (onlyIds && !onlyIds.has(s.id)) return false;
  if (s.blurb && s.imageUrl) return false; // déjà enrichie
  return true;
});

let processed = 0;
for (const s of candidates) {
  if (processed >= limit) break;
  processed++;
  stats.seen++;
  try {
    const patch = await computeEnrichment(s);
    const before = { g: s.taxonGroup, d: s.diet };
    fillIfEmpty(s, patch);
    if (patch.imageUrl) stats.images++;
    if (patch.blurb) stats.blurbs++;
    if (before.g === 'other' && s.taxonGroup !== 'other') stats.groupsFixed++;
    if (before.d === 'unknown' && s.diet !== 'unknown') stats.dietsFixed++;
    if (patch.blurb || patch.imageUrl || patch.commonName || (patch.taxonGroup && patch.taxonGroup !== 'other')) {
      stats.enriched++;
    } else {
      stats.skippedNoData++;
    }
  } catch (e) {
    stats.errors++;
    console.error(`✗ ${s.id}: ${e.message}`);
  }
  if (processed % 25 === 0) console.log(`… ${processed}/${Math.min(limit, candidates.length)} (enriched ${stats.enriched}, img ${stats.images})`);
}

// --- écriture ---
index.enrichedAt = new Date().toISOString();
index.source = 'mixed';
fs.writeFileSync(GENERATED, JSON.stringify(index, null, 2));

console.log('\n=== Rapport enrichissement ===');
console.log(JSON.stringify(stats, null, 2));
console.log(`Écrit: ${GENERATED}`);
console.log(`Images: ${IMG_DIR}`);
```

- [ ] **Step 2: Vérifier que le script parse et démarre (dry sur 2 ids connus avec image)**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
node ../scripts/enrich-species.mjs --ids stegosaurus-stenops 2>&1 | tail -20
```
Note: si `stegosaurus-stenops` est un id du seed, il sera skippé (rapport `seen: 0`) — c'est attendu et prouve que le skip-seed marche. Choisir alors un id non-seed présent dans le generated (ex. `aardonyx-celestae`). Le rapport JSON doit s'afficher sans exception.

- [ ] **Step 3: Vérifier le diff du generated (non destructif)**

Run: `cd /home/sylvain_ladoire/projects/developpeur/evatosorus && git diff --stat frontend/src/data/generated/species.generated.json`
Expected: le fichier est modifié (reformatage + éventuels champs ajoutés sur l'id ciblé), aucune entrée supprimée.

- [ ] **Step 4: Restaurer le generated avant le vrai run (le Step 2 était un test ciblé)**

Run: `cd /home/sylvain_ladoire/projects/developpeur/evatosorus && git checkout frontend/src/data/generated/species.generated.json`
Expected: working tree propre sur ce fichier (le cache `.cache/enrich/` reste, c'est voulu).

- [ ] **Step 5: Commit le script**

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add scripts/enrich-species.mjs
git commit -m "feat(evatosorus): orchestrateur enrichissement espèces (cache resumable, merge préservant)"
```

---

## Task 5: Smoke `--limit 10` + build + validation visuelle (GATE humain)

**Files:** aucun nouveau — exécution et inspection.

- [ ] **Step 1: Run échantillon**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
node ../scripts/enrich-species.mjs --limit 10
```
Expected: rapport JSON avec `enriched > 0`, `blurbs > 0`, idéalement `images > 0`, `errors` faible/0.

- [ ] **Step 2: Vérifier des fiches enrichies dans le JSON**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
node -e "const d=require('./src/data/generated/species.generated.json');const e=d.species.filter(s=>s.blurb||s.imageUrl).slice(0,5);console.log(JSON.stringify(e.map(s=>({id:s.id,group:s.taxonGroup,diet:s.diet,common:s.commonName,img:s.imageUrl,blurb:(s.blurb||'').slice(0,80)})),null,2))"
```
Expected: 5 fiches avec `blurb` français propre (pas de « Voici… »), `taxonGroup` ≠ `other` quand connu, `img` si dispo.

- [ ] **Step 3: Build statique (combo vite/astro épinglé)**

Run: `cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend && npm run build 2>&1 | tail -15`
Expected: build OK, pas d'erreur. (Si échec lié à vite/astro → cf `CLAUDE.md`, ne pas bumper.)

- [ ] **Step 4: Validation visuelle — GATE HUMAIN**

Lancer `npm run dev`, ouvrir `/codex` et 2-3 `/especes/<id>` enrichies. Prendre des screenshots dans `~/projects/developpeur/tmp/`. **Demander le verdict humain de Sylvain** (cf feedback iterate-ux-with-screenshots) avant le run complet.

> NE PAS lancer le run complet ni committer les données tant que Sylvain n'a pas validé visuellement.

- [ ] **Step 5: Restaurer le generated après validation visuelle (le run complet repartira du cache)**

Run: `cd /home/sylvain_ladoire/projects/developpeur/evatosorus && git checkout frontend/src/data/generated/species.generated.json`
Expected: working tree propre (le cache `.cache/enrich/` conserve le travail des 10 espèces → pas refait).

---

## Task 6: Run complet + commit données

**Files:**
- Modify: `frontend/src/data/generated/species.generated.json`
- Create: `frontend/public/species/*.jpg`

- [ ] **Step 1: Run complet (plusieurs heures — resumable via cache)**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
node ../scripts/enrich-species.mjs 2>&1 | tee ~/projects/developpeur/tmp/enrich-run.log | tail -40
```
Expected: rapport final avec compteurs réels (`enriched`, `images`, `blurbs`, `groupsFixed`, `dietsFixed`, `skippedNoData`, `errors`). En cas d'interruption, relancer la même commande → reprend au cache.

- [ ] **Step 2: Re-build de contrôle**

Run: `cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend && npm run build 2>&1 | tail -10`
Expected: build OK.

- [ ] **Step 3: Vérifier le poids dist et le nombre d'images**

Run:
```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus/frontend
echo "images:"; ls public/species/*.jpg | wc -l
echo "poids images:"; du -sh public/species
echo "fichier >25Mo (cap CF)?"; find public -size +25M
```
Expected: N images, poids raisonnable (< ~150 Mo), **aucun fichier > 25 Mo**.

- [ ] **Step 4: Commit données + images**

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add frontend/src/data/generated/species.generated.json frontend/public/species
git commit -m "feat(evatosorus): enrichit 1500 fiches espèces (blurb BBC ollama + image commons + taxon/diète)

Sources: PaleoBioDB + Wikidata + Wikipedia + Wikimedia Commons (licences enregistrées par image).
Blurbs reformulés avec llama3.1:8b local. Crédits: humain + Claude Code + openart.ai (pas de ChatGPT)."
```

- [ ] **Step 5: Mettre à jour les crédits (About / README)**

Ajouter dans le About et/ou README la mention des sources d'enrichissement (PaleoBioDB + Wikidata + Wikipedia + Commons + llama3.1 local), sans introduire ChatGPT. Commit séparé :

```bash
cd /home/sylvain_ladoire/projects/developpeur/evatosorus
git add -A
git commit -m "docs(evatosorus): crédite sources d'enrichissement espèces"
```

---

## Notes d'exécution

- **Ollama** doit tourner (`curl -s http://localhost:11434/api/tags`). Override possible : `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.
- **Throttle** ajustable via `ENRICH_THROTTLE_MS` (défaut 200ms) — rester poli avec l'API Wikimedia (UA déjà fourni).
- **Resume** : tout est dans `scripts/.cache/enrich/<id>.json` (gitignored). Supprimer un fichier cache force le re-fetch de cette espèce.
- **Ne jamais** régénérer via `import:paleobiodb` après enrichissement sans merge (écraserait — cf `CLAUDE.md` « ne jamais écraser le seed/curé »).
