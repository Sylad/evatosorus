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
  // Préambule inline (sortie llama sur UNE ligne : « Voici ... : <blurb> ») —
  // la boucle ci-dessus exige lines.length > 1 et le laissait passer.
  text = text.replace(/^(?:voici|voilà|bien sûr|d'accord)[^:]{0,80}:\s*/i, '');
  // Strip wrapping quotes (droites, courbes, guillemets français).
  text = text.replace(/^["«»“”‘’']+\s*/, '').replace(/\s*["«»“”‘’']+$/, '').trim();
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
