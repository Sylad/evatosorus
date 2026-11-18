// L32 — couleurs de période : une seule source, frontend/src/data/periods.ts (accentColor).
// Relevé en revue L24 : SpeciesCard.astro et CodexBrowser.tsx recopiaient les trois hex
// dans un ternaire, la frise (MesozoicTimeline.astro) les recodait en jetons Tailwind
// (--color-evato-rust/jade/amber) — jetons que Tailwind 4 n'émet pas s'ils ne servent pas
// ailleurs : les 22 vignettes de la frise étaient toutes ambre (mesuré le 2026-11-18).
// Ce test échoue sur toute couleur de période recopiée dans le code de frontend/src.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../frontend/src/', import.meta.url));
const SOURCE = 'data/periods.ts';

// Fichiers autorisés à porter ces hex, et pourquoi. Les feuilles CSS ne sont pas lues :
// global.css définit la palette de marque (ambre, jade, rouille), dont periods.ts tire
// ses teintes, et aucune feuille n'associe une couleur à une période.
const ALLOWED = {
  // Palette de marque des chaînes YouTube : l'accent est choisi par chaîne, sans lien
  // avec une période géologique.
  'data/youtube-channels.ts': 'palette de marque des chaînes',
};

function codeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return codeFiles(p);
    return ['.ts', '.tsx', '.astro', '.mjs', '.js', '.jsx'].includes(extname(e.name)) ? [p] : [];
  });
}

function periodColors(src) {
  return [...src.matchAll(/accentColor:\s*'(#[0-9a-f]{6})'/gi)].map((m) => m[1].toLowerCase());
}

// Écarts d'un fichier : hex de période recopié, ou couleur choisie selon l'id de période.
function copies(text, colors) {
  const found = [];
  const lower = text.toLowerCase();
  for (const hex of colors) if (lower.includes(hex)) found.push(`hex ${hex}`);
  if (/['"`](trias|jurassique|cretace)['"`]\s*\?\s*['"`]?\s*(#[0-9a-f]{3,8}|var\(|rgb|rust|jade|amber)/i.test(text)) {
    found.push('ternaire période → couleur');
  }
  if (/--color-evato-\$\{/.test(text)) found.push('jeton de couleur construit dynamiquement');
  return found;
}

test('periods.ts porte les trois couleurs de période', () => {
  assert.equal(periodColors(readFileSync(join(SRC, SOURCE), 'utf8')).length, 3);
});

test('aucune couleur de période recopiée hors de periods.ts', () => {
  const colors = periodColors(readFileSync(join(SRC, SOURCE), 'utf8'));
  const offenders = [];
  for (const file of codeFiles(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/');
    if (rel === SOURCE || rel in ALLOWED) continue;
    const found = copies(readFileSync(file, 'utf8'), colors);
    if (found.length) offenders.push(`${rel} : ${found.join(', ')}`);
  }
  assert.deepEqual(offenders, [], `importer accentColor de ${SOURCE} :\n${offenders.join('\n')}`);
});

test('le détecteur reconnaît les formes relevées en revue L24', () => {
  const c = ['#c75131', '#5e8f6e', '#d4a55e'];
  assert.deepEqual(copies("const x = s.periodId === 'trias' ? '#c75131' : '#d4a55e';", c),
    ['hex #c75131', 'hex #d4a55e', 'ternaire période → couleur']);
  assert.deepEqual(copies("--accent:var(--color-evato-${p === 'trias' ? 'rust' : 'amber'})", c),
    ['ternaire période → couleur', 'jeton de couleur construit dynamiquement']);
  assert.deepEqual(copies("const { accentColor } = PERIODS_BY_ID[s.periodId];", c), []);
});
