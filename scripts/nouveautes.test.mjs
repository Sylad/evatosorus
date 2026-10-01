// L13 — journal des Nouveautés : données générées par `cadence news build`
// (npm run news dans frontend/) dans frontend/public/nouveautes-data/, VERSIONNÉES :
// Cloudflare Pages construit le site sans cadence, la page /nouveautes/ lit ce JSON
// au build. Ces tests vérifient que le JSON versionné suit bien docs/nouveautes/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ENTRIES = join(ROOT, 'docs/nouveautes');
const DATA = join(ROOT, 'frontend/public/nouveautes-data');
const JSON_FILE = join(DATA, 'nouveautes.json');

const readJson = () => JSON.parse(readFileSync(JSON_FILE, 'utf8'));

// En-tête YAML minimal des entrées (clé: valeur, listes [a, b]).
function header(file) {
  const src = readFileSync(join(ENTRIES, file), 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, `${file} : en-tête absent`);
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const mdFiles = () => readdirSync(ENTRIES).filter((f) => f.endsWith('.md'));

test('le JSON versionné existe et porte une entrée par fichier de docs/nouveautes/', () => {
  assert.ok(existsSync(JSON_FILE), 'frontend/public/nouveautes-data/nouveautes.json absent (npm run news)');
  const slugs = readJson().entries.map((e) => e.slug).sort();
  assert.deepEqual(slugs, mdFiles().map((f) => f.replace(/\.md$/, '')).sort());
});

test('ordre DÉCROISSANT : date puis heure de création (created), la plus récente en haut', () => {
  const order = readJson().entries.map((e) => e.slug);
  const expected = mdFiles()
    .map((f) => ({ slug: f.replace(/\.md$/, ''), ...header(f) }))
    .sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.created) - Date.parse(a.created));
  assert.deepEqual(order, expected.map((e) => e.slug));
});

test('chaque capture citée est servie depuis public/nouveautes-data/', () => {
  for (const e of readJson().entries) {
    assert.ok(e.captures.length > 0, `${e.slug} : aucune capture`);
    for (const c of e.captures) assert.ok(existsSync(join(DATA, c)), `${e.slug} : ${c} manquante`);
  }
});

test('pas de page index.html de cadence sous /nouveautes-data/ (doublon non habillé de /nouveautes/)', () => {
  assert.ok(!existsSync(join(DATA, 'index.html')));
});

test('le JSON versionné est à jour avec docs/nouveautes/ (sinon : cd frontend && npm run news)', (t) => {
  let tmp;
  try {
    tmp = mkdtempSync(join(tmpdir(), 'evato-news-'));
    execFileSync('cadence', ['news', 'build', '-o', tmp], { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    if (e.code === 'ENOENT') { t.skip('cadence absent du PATH'); return; }
    throw e;
  }
  try {
    const fresh = JSON.parse(readFileSync(join(tmp, 'nouveautes.json'), 'utf8'));
    assert.deepEqual(readJson().entries, fresh.entries);
    for (const c of fresh.entries.flatMap((e) => e.captures)) {
      assert.ok(readFileSync(join(DATA, c)).equals(readFileSync(join(tmp, c))), `${c} différente de la source`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
