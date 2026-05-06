// Mésozoïque : 252 → 66 millions d'années. Trois ères, chacune subdivisée
// en époques. Sources : ICS International Chronostratigraphic Chart 2024.
//
// Les bornes "ma" sont en millions d'années (most recent first when read
// top-to-bottom in the timeline page). On affiche aussi le climat global
// dominant et 1-2 events emblématiques pour donner du contexte à Eva.

export type Epoch = {
  id: string;
  name: string;
  startMa: number;
  endMa: number;
  notes?: string;
};

export type Period = {
  id: 'trias' | 'jurassique' | 'cretace';
  name: string;
  shortName: string;
  startMa: number;
  endMa: number;
  durationMa: number;
  climate: string;
  pangea: string;
  iconicEvents: string[];
  iconicSpecies: string[];
  accentColor: string;
  epochs: Epoch[];
  blurb: string;
};

export const PERIODS: Period[] = [
  {
    id: 'trias',
    name: 'Trias',
    shortName: 'Trias',
    startMa: 252,
    endMa: 201,
    durationMa: 51,
    climate: 'Chaud, aride, supercontinent unique sans calotte polaire.',
    pangea: 'Pangée — supercontinent encore soudé, océans Téthys et Panthalassa.',
    iconicEvents: [
      'Extinction Permien-Trias (–252 Ma) : 95 % des espèces marines disparaissent.',
      'Émergence des premiers dinosaures (~230 Ma) — petits bipèdes carnivores.',
      'Extinction Trias-Jurassique (–201 Ma) : disparition des grands archosaures non-dinosauriens.',
    ],
    iconicSpecies: ['Eoraptor', 'Coelophysis', 'Plateosaurus', 'Postosuchus'],
    accentColor: '#c75131',
    epochs: [
      { id: 'trias-inf',  name: 'Trias inférieur',  startMa: 252, endMa: 247 },
      { id: 'trias-moy',  name: 'Trias moyen',      startMa: 247, endMa: 237 },
      { id: 'trias-sup',  name: 'Trias supérieur',  startMa: 237, endMa: 201 },
    ],
    blurb:
      "Après la plus grande extinction de l'histoire de la Terre, la vie repart sur " +
      "Pangée — un supercontinent brûlant, hostile, où les premiers dinosaures " +
      "émergent timidement à l'ombre des reptiles dominants.",
  },
  {
    id: 'jurassique',
    name: 'Jurassique',
    shortName: 'Jurassique',
    startMa: 201,
    endMa: 145,
    durationMa: 56,
    climate: 'Chaud, humide, niveau des mers élevé. Forêts de conifères et de fougères luxuriantes.',
    pangea: 'Pangée se fragmente : Laurasia au nord, Gondwana au sud, mer de Téthys élargie.',
    iconicEvents: [
      'Apparition des premiers oiseaux (~150 Ma) — Archaeopteryx.',
      'Sauropodes géants atteignent leur apogée (Diplodocus, Brachiosaurus).',
      'Carnivores allosaures et théropodes s\'établissent comme prédateurs dominants.',
    ],
    iconicSpecies: ['Brachiosaurus', 'Diplodocus', 'Allosaurus', 'Stegosaurus', 'Archaeopteryx'],
    accentColor: '#5e8f6e',
    epochs: [
      { id: 'jura-inf',  name: 'Jurassique inférieur',  startMa: 201, endMa: 174 },
      { id: 'jura-moy',  name: 'Jurassique moyen',      startMa: 174, endMa: 163 },
      { id: 'jura-sup',  name: 'Jurassique supérieur',  startMa: 163, endMa: 145 },
    ],
    blurb:
      "L'âge des géants. Pangée se brise, des couloirs océaniques s'ouvrent, " +
      "le climat se fait luxuriant. Brachiosaurus, Diplodocus, Stegosaurus — " +
      "des sauropodes long-cous broutent des forêts de séquoias primitifs. " +
      "Et dans les arbres, un petit théropode plumé apprend à voler.",
  },
  {
    id: 'cretace',
    name: 'Crétacé',
    shortName: 'Crétacé',
    startMa: 145,
    endMa: 66,
    durationMa: 79,
    climate: 'Globalement chaud, niveau des mers très haut. Premières fleurs (angiospermes).',
    pangea: 'Continents proches de leur configuration actuelle, Atlantique en formation.',
    iconicEvents: [
      'Apparition et explosion des plantes à fleurs (angiospermes, ~125 Ma).',
      'Tyrannosaures et Tricératops dominent l\'Amérique du Nord (Crétacé sup.).',
      'Extinction K-Pg (–66 Ma) : impact astéroïde Chicxulub, fin des dinosaures non-aviens.',
    ],
    iconicSpecies: ['Tyrannosaurus', 'Triceratops', 'Velociraptor', 'Spinosaurus', 'Ankylosaurus'],
    accentColor: '#d4a55e',
    epochs: [
      { id: 'cret-inf',  name: 'Crétacé inférieur',  startMa: 145, endMa: 100 },
      { id: 'cret-sup',  name: 'Crétacé supérieur',  startMa: 100, endMa: 66 },
    ],
    blurb:
      "Le crépuscule des géants. Les fleurs apparaissent, les forêts changent " +
      "de couleur. T-Rex, Tricératops, Vélociraptor — la galerie de stars que " +
      "tout le monde connaît. Puis, un matin de fin Crétacé, un astéroïde " +
      "de 12 km percute le Yucatan. Tout s'arrête.",
  },
];

export const PERIODS_BY_ID: Record<string, Period> = Object.fromEntries(
  PERIODS.map((p) => [p.id, p]),
);
