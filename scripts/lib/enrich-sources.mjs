// I/O réseau de l'enrichissement : Wikidata, Wikipedia REST, Commons, Ollama, image.
// sharp est dans frontend/node_modules — résolution CJS depuis ce chemin.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
const _require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../frontend/package.json'));
const sharp = _require('sharp');
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
    // Ne mémoïser que les succès : un échec transitoire sur un ancêtre partagé
    // (Dinosauria…) cassait la chaîne taxonomique de toutes les espèces
    // suivantes du run. Review 2026-08-14.
    if (ent) cache.set(qid, ent);
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
