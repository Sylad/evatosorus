// L11 — mots collés autour des liens et des mises en valeur, sur TOUT le site construit.
// Cause (revue UX L11, « publicevatosorus.sladoire.devet », « Eywa— ») : depuis Astro 7
// (L51), compressHTML vaut 'jsx' par défaut et supprime l'espace porté par un saut de
// ligne entre un texte et <a>/<strong>/<em>. astro.config.mjs revient à compressHTML: true
// (compression sans perte, le comportement d'Astro 6 pour lequel les pages sont écrites).
// Lit frontend/dist (lancer `npx astro build` avant).
// Aussi : aucun lien vers eywa-eywa.pages.dev (domaine sans DNS), ni dans le site construit
// ni dans les sources.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DIST } from './lib/e2e-dist.mjs';

const SRC = new URL('../frontend/src/', import.meta.url).pathname;

const walk = (dir, ext, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (ext.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
};

const pages = () => {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('frontend/dist absent (site non construit) : lancer `cd frontend && ../scripts/avec-node.sh npx astro build` avant npm run test:scripts');
  }
  return walk(DIST, ['.html']);
};

// Une lettre, un chiffre ou un tiret cadratin collé à l'ouverture ou à la fermeture
// d'un lien ou d'une mise en valeur (texte visible seulement : scripts et styles retirés).
const TAG = '(?:a|strong|em|b|i)';
const GLUED = new RegExp(`[\\p{L}\\p{N}—]<${TAG}[\\s>]|</${TAG}>[\\p{L}\\p{N}—]`, 'gu');

export function gluedWords(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  return [...text.matchAll(GLUED)].map((m) => text.slice(Math.max(0, m.index - 30), m.index + 40)
    .replace(/<[^>]*>/g, '|').replace(/\s+/g, ' '));
}

test('détecteur : repère « public<a…>…</a>et » et « </a>— », pas « public <a…> » ni « l\'<a…> »', () => {
  assert.equal(gluedWords('domaine public<a href="x">evatosorus</a>et l\'URL').length, 2);
  assert.equal(gluedWords('<strong><a href="x">Eywa</a></strong>— le codex').length, 1);
  assert.equal(gluedWords('domaine public <a href="x">evatosorus</a> et l\'<a href="y">URL</a>.').length, 0);
});

test('aucun mot collé autour d\'un lien ou d\'une mise en valeur, sur toutes les pages construites', () => {
  const failures = [];
  for (const f of pages()) {
    for (const g of gluedWords(readFileSync(f, 'utf8'))) failures.push(`${f.slice(DIST.length)} : ${g}`);
  }
  assert.deepEqual(failures.slice(0, 30), [], `${failures.length} mots collés`);
});

test('/about/ : les phrases relevées par la revue UX gardent leurs espaces', () => {
  const html = readFileSync(join(DIST, 'about/index.html'), 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  for (const phrase of [
    'avec le domaine public evatosorus.sladoire.dev et l\'URL Pages evatosorus.pages.dev.',
    'compilées au build depuis PaleoBioDB (taxonomie',
    'déployé sur Cloudflare Pages',
    'Wikipedia reformulées',
    'exécuté en local',
    'vas-y',
  ]) assert.ok(text.includes(phrase), `absent de /about/ : « ${phrase} »`);
});

test('aucun lien vers eywa-eywa.pages.dev (domaine sans DNS), ni construit ni en source', () => {
  const hits = [...pages(), ...walk(SRC, ['.astro', '.ts', '.tsx', '.mjs', '.md', '.mdx'])]
    .filter((f) => readFileSync(f, 'utf8').includes('eywa-eywa.pages.dev'));
  assert.deepEqual(hits, []);
  const about = readFileSync(join(DIST, 'about/index.html'), 'utf8');
  assert.equal((about.match(/href="https:\/\/avatar-pandora-12q\.pages\.dev\/?"/g) ?? []).length, 3);
});
