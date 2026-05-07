// Schéma normalisé d'une fiche espèce. Les champs viennent de PaleoBioDB
// (taxon, intervalles temporels, occurrences fossiles), enrichis si possible
// par Wikipedia pour la description narrative et l'image.
//
// On garde la structure plate volontairement : tout ce qui sert au filtre
// codex (regime, periodId, taxonGroup) est promu au top-level pour éviter
// d'avoir à parcourir une taxonomie nested au runtime.

export type Diet = 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore' | 'unknown';

export type TaxonGroup =
  | 'theropod'
  | 'sauropod'
  | 'ornithopod'
  | 'thyreophoran'   // ankylosaures + stégosaures
  | 'ceratopsian'
  | 'pachycephalosaur'
  | 'other-saurischian'
  | 'other-ornithischian'
  | 'pterosaur'      // marqué dans la base mais pas un dinosaure stricto sensu
  | 'marine-reptile' // idem, on les garde car liés au Mésozoïque
  | 'other';

export type Species = {
  id: string;                    // slug stable (kebab-case du nom scientifique)
  name: string;                  // nom scientifique (Tyrannosaurus rex)
  commonName?: string;           // nom français/courant si dispo
  taxonGroup: TaxonGroup;
  diet: Diet;
  /** Période principale (la plus récente où l'espèce est attestée). */
  periodId: 'trias' | 'jurassique' | 'cretace';
  epochs?: string[];             // ids d'epochs.ts (sous-périodes)
  /** Intervalle temporel d'existence en Ma (millions d'années). */
  earlyMa?: number;              // borne ancienne
  lateMa?: number;               // borne récente
  /** Taille adulte estimée. Toujours en mètres / kilogrammes. */
  lengthM?: number;
  heightM?: number;
  weightKg?: number;
  /** Régions/pays où des fossiles ont été trouvés (codes ISO + libellés). */
  locations?: { country: string; lat?: number; lng?: number }[];
  /** Description courte (1-3 phrases) en français — vulgarisée façon BBC. */
  blurb?: string;
  /** Image principale — squelette/fossile (référence muséale). */
  imageUrl?: string;
  imageCredit?: string;
  /**
   * Reconstitution paleo-art : l'animal "en chair", vivant. Affichée en
   * priorité sur la fiche détail si disponible. Le squelette devient
   * image secondaire dans la galerie de la fiche.
   */
  lifeRestorationUrl?: string;
  lifeRestorationCredit?: string;
  /** Lien externe canonique. */
  wikipediaUrl?: string;
  paleobiodbId?: number;
  /** Étoile = espèce iconique mise en avant sur la landing/timeline. */
  iconic?: boolean;
};

export type SpeciesIndex = {
  generatedAt: string;     // ISO timestamp
  source: string;          // 'paleobiodb' | 'manual' | 'mixed'
  count: number;
  species: Species[];
};
