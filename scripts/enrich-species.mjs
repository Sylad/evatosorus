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
