#!/usr/bin/env node
// Import enrichment from the Paleobiology Database (PBDB) public API.
//
// PBDB API: https://paleobiodb.org/data1.2/
//   GET /occs/list.json?base_name=Dinosauria&interval=Mesozoic&show=class,coords,attr,img&limit=10000
//   → returns up to ~30k rows of occurrences (one per fossil find).
//
// We collapse occurrences into species, keeping the first/best coords and
// the broadest temporal interval. The output goes into
//   frontend/src/data/generated/species.generated.json
// which `species.ts` merges with the manual seed at runtime.
//
// Usage:
//   node scripts/import-paleobiodb.mjs              (default: 1500 species cap)
//   node scripts/import-paleobiodb.mjs --limit 3000

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, '../frontend/src/data/generated/species.generated.json');

const args = process.argv.slice(2);
const cap = parseInt(args[args.indexOf('--limit') + 1] ?? '1500', 10) || 1500;

const PBDB_URL =
  'https://paleobiodb.org/data1.2/occs/list.json' +
  '?base_name=Dinosauria,Pterosauria,Ichthyosauria,Plesiosauria,Mosasauridae' +
  '&interval=Mesozoic' +
  '&show=class,coords,attr,img,time,strat' +
  '&limit=20000';

const TAXON_GROUP_RULES = [
  { match: /Theropoda/i,         group: 'theropod' },
  { match: /Sauropodomorpha|Sauropoda/i, group: 'sauropod' },
  { match: /Ornithopoda/i,       group: 'ornithopod' },
  { match: /Thyreophora|Stegosauria|Ankylosauria/i, group: 'thyreophoran' },
  { match: /Ceratopsia/i,        group: 'ceratopsian' },
  { match: /Pachycephalosauria/i, group: 'pachycephalosaur' },
  { match: /Saurischia/i,        group: 'other-saurischian' },
  { match: /Ornithischia/i,      group: 'other-ornithischian' },
  { match: /Pterosauria/i,       group: 'pterosaur' },
  { match: /Mosasauridae|Ichthyosauria|Plesiosauria/i, group: 'marine-reptile' },
];

function classifyTaxonGroup(record) {
  const cls = `${record.cll ?? ''} ${record.odl ?? ''} ${record.fml ?? ''}`;
  for (const r of TAXON_GROUP_RULES) {
    if (r.match.test(cls)) return r.group;
  }
  return 'other';
}

function periodFromMa(maxMa, minMa) {
  // Pick the period containing the midpoint.
  if (maxMa == null || minMa == null) return null;
  const mid = (maxMa + minMa) / 2;
  if (mid >= 201) return 'trias';
  if (mid >= 145) return 'jurassique';
  if (mid >= 66)  return 'cretace';
  return null;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log(`Fetching PBDB occurrences (cap ${cap} species)...`);
  const t0 = Date.now();
  const res = await fetch(PBDB_URL, { headers: { 'User-Agent': 'evatosorus-import/0.1 (https://evatosorus.pages.dev)' } });
  if (!res.ok) {
    console.error(`PBDB returned HTTP ${res.status}`);
    process.exit(1);
  }
  const json = await res.json();
  const records = json.records ?? [];
  console.log(`  ${records.length} occurrences in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Collapse by accepted name (species level)
  const bySpecies = new Map();
  for (const r of records) {
    const acceptedName = r.tna ?? r.idn;
    if (!acceptedName || !/ /.test(acceptedName)) continue; // skip genus-only

    const periodId = periodFromMa(r.eag, r.lag);
    if (!periodId) continue;

    const slug = slugify(acceptedName);
    if (!bySpecies.has(slug)) {
      const taxonGroup = classifyTaxonGroup(r);
      bySpecies.set(slug, {
        id: slug,
        name: acceptedName,
        taxonGroup,
        diet: 'unknown',
        periodId,
        earlyMa: r.eag,
        lateMa: r.lag,
        locations: [],
        wikipediaUrl: `https://fr.wikipedia.org/wiki/${encodeURIComponent(acceptedName.split(' ')[0])}`,
        paleobiodbId: r.tid,
      });
    }
    const s = bySpecies.get(slug);
    // Merge: widen interval, append unique location
    if (r.eag && (!s.earlyMa || r.eag > s.earlyMa)) s.earlyMa = r.eag;
    if (r.lag && (!s.lateMa  || r.lag < s.lateMa))  s.lateMa  = r.lag;
    if (r.lat != null && r.lng != null) {
      const country = r.cc2 ?? r.cc ?? '?';
      const dup = s.locations.find((l) => Math.abs(l.lat - r.lat) < 0.5 && Math.abs(l.lng - r.lng) < 0.5);
      if (!dup) s.locations.push({ country, lat: r.lat, lng: r.lng });
    }
  }

  console.log(`  ${bySpecies.size} unique species after collapse`);

  const all = Array.from(bySpecies.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, cap);

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'paleobiodb',
    count: all.length,
    species: all,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${all.length} species → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
