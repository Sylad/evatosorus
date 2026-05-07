// Source de vérité runtime — fusionne le seed manuel curé + le JSON
// généré par scripts/import-paleobiodb.mjs (s'il existe).
//
// Le seed garantit qu'on a toujours du contenu solide même sans le
// script ; l'import enrichit la liste avec ~1500 entrées additionnelles.
// La fusion dédupe par id (le seed gagne en cas de collision).

import type { Species, SpeciesIndex } from './species.types';
import { SPECIES_SEED, SPECIES_INDEX_FALLBACK } from './species.seed';

let merged: SpeciesIndex = SPECIES_INDEX_FALLBACK;

try {
  // Lazy require so the build doesn't fail if the file isn't present yet.
  // Vite/Astro will tree-shake correctly thanks to the dynamic import path.
  const generated = (await import('./generated/species.generated.json')) as { default: SpeciesIndex };
  if (generated?.default?.species?.length) {
    const byId = new Map<string, Species>(SPECIES_SEED.map((s) => [s.id, s]));
    for (const s of generated.default.species) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
    merged = {
      generatedAt: generated.default.generatedAt,
      source: 'mixed',
      count: byId.size,
      species: Array.from(byId.values()),
    };
  }
} catch {
  // No generated file yet → fallback seed only. Normal on a fresh checkout.
}

export const SPECIES_INDEX = merged;
export const SPECIES = merged.species;

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}

export function getSpeciesByPeriod(periodId: string): Species[] {
  return SPECIES.filter((s) => s.periodId === periodId);
}

export const TAXON_GROUP_LABELS: Record<string, string> = {
  theropod: 'Théropodes',
  sauropod: 'Sauropodes',
  ornithopod: 'Ornithopodes',
  thyreophoran: 'Thyréophores',
  ceratopsian: 'Cératopsiens',
  pachycephalosaur: 'Pachycéphalosaures',
  'other-saurischian': 'Autres saurischiens',
  'other-ornithischian': 'Autres ornithischiens',
  pterosaur: 'Ptérosaures',
  'marine-reptile': 'Reptiles marins',
  other: 'Autres',
};

export const DIET_LABELS: Record<string, string> = {
  carnivore: 'Carnivore',
  herbivore: 'Herbivore',
  omnivore: 'Omnivore',
  piscivore: 'Piscivore',
  unknown: 'Inconnu',
};

export const DIET_ICONS: Record<string, string> = {
  carnivore: '🦖',
  herbivore: '🌿',
  omnivore: '🌗',
  piscivore: '🐟',
  unknown: '?',
};

// Espèces pour lesquelles on a 1-2 vidéos paleo-art en boucle dans /public/.
// Le slug ici est le préfixe de fichier (ex: 'tyrannosaurus-rex' → /tyrannosaurus-rex-1.mp4
// + /tyrannosaurus-rex-2.mp4). On fait le matching contre l'id Species par
// préfixe pour rester robuste aux suffixes type 'tyrannosaurus-rex' vs
// 'tyrannosaurus-rex-12345' éventuellement importé du PaleoBioDB.
const SPECIES_WITH_VIDEOS = [
  'allosaurus',
  'ankylosaurus',
  'brachiosaurus',
  'diplodocus',
  'parasaurolophus',
  'spinosaurus',
  'stegosaurus',
  'triceratops',
  'tyrannosaurus-rex',
  'velociraptor',
] as const;

/**
 * Renvoie la liste des URLs de vidéos disponibles pour une espèce, ou un
 * tableau vide. Match par préfixe sur l'id Species (ex: 'velociraptor-mongoliensis'
 * → ['/velociraptor-1.mp4', '/velociraptor-2.mp4']).
 */
export function getSpeciesVideos(speciesId: string): string[] {
  const slug = SPECIES_WITH_VIDEOS.find((s) => speciesId.startsWith(s));
  if (!slug) return [];
  return [`/${slug}-1.mp4`, `/${slug}-2.mp4`];
}
