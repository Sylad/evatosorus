// Saga Jurassic Park / Jurassic World — la franchise cinéma.
// Données vérifiées 2026-05 contre Wikipedia FR/EN et IMDb.
//
// Posters : on linke les Wikipedia covers (fair-use), si elles sont
// indisponibles à l'usage hotlink Cloudflare on bascule sur des
// thumbnails locaux dans /public/films/. Pour l'instant URL directes.

export type Film = {
  id: string;
  title: string;
  year: number;
  director: string;
  durationMin: number;
  imdb: number;
  /** Période de la saga : 'park' (trilogie originale) | 'world' (trilogie reboot) | 'rebirth' (cycle 2025+) */
  saga: 'park' | 'world' | 'rebirth';
  posterUrl: string;
  trailerUrl?: string;
  wikipediaUrl: string;
  /** 2-3 phrases vulgarisées : pitch, ton, place dans la saga. */
  blurb: string;
  /** Espèces clés mises en scène (pour cross-link vers le codex). */
  speciesIds?: string[];
  /** Une scène culte mémorable. */
  iconicScene?: string;
};

export const FILMS: Film[] = [
  {
    id: 'jurassic-park-1993',
    title: 'Jurassic Park',
    year: 1993,
    director: 'Steven Spielberg',
    durationMin: 127,
    imdb: 8.2,
    saga: 'park',
    posterUrl: '/films/jurassic-park-1993.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=lc0UehYemQA',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_Park',
    blurb:
      "Le film fondateur. John Hammond ouvre un parc à dinosaures clonés sur une île. " +
      "Tout déraille. Spielberg invente l'idée moderne du dinosaure cinématographique : un Brachiosaure qu'on regarde en pleurant, un T-Rex qui sort de la pluie, un Vélociraptor qui ouvre les portes.",
    speciesIds: ['tyrannosaurus-rex', 'velociraptor-mongoliensis', 'brachiosaurus-altithorax', 'triceratops-horridus'],
    iconicScene: "Le T-Rex sous la pluie qui retourne la jeep ; les Velociraptors dans la cuisine.",
  },
  {
    id: 'lost-world-1997',
    title: 'Le Monde perdu : Jurassic Park',
    year: 1997,
    director: 'Steven Spielberg',
    durationMin: 129,
    imdb: 6.6,
    saga: 'park',
    posterUrl: '/films/lost-world-1997.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=XzUZX1QfO9Y',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Le_Monde_perdu_:_Jurassic_Park',
    blurb:
      "Suite plus sombre. Une seconde île, Site B, où InGen élevait les dinos avant Isla Nublar. " +
      "Une expédition vient les filmer, une autre les capturer. Le climax T-Rex à San Diego divise — séquence Godzilla maladroite, mais le segment jungle est solide.",
    speciesIds: ['tyrannosaurus-rex', 'velociraptor-mongoliensis', 'compsognathus-longipes', 'stegosaurus-stenops'],
    iconicScene: "Les Compsognathus qui dévorent le bioethique. Le T-Rex qui boit dans la piscine.",
  },
  {
    id: 'jurassic-park-iii-2001',
    title: 'Jurassic Park III',
    year: 2001,
    director: 'Joe Johnston',
    durationMin: 92,
    imdb: 5.9,
    saga: 'park',
    posterUrl: '/films/jurassic-park-iii-2001.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=VTKWA1n1bxI',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_Park_III',
    blurb:
      "Reboot court (92 min). Spielberg passe la main à Johnston. Sam Neill revient. " +
      "Le Spinosaure remplace le T-Rex en grand bad — choix discuté à l'époque, validé depuis par la paléontologie : le Spinosaure était plus grand. Premier film de la saga avec des Vélociraptors plumés (timidement).",
    speciesIds: ['spinosaurus-aegyptiacus', 'velociraptor-mongoliensis', 'pteranodon-longiceps', 'tyrannosaurus-rex'],
    iconicScene: "Le combat T-Rex vs Spinosaure (le T-Rex perd). Les Ptéranodons dans la cage.",
  },
  {
    id: 'jurassic-world-2015',
    title: 'Jurassic World',
    year: 2015,
    director: 'Colin Trevorrow',
    durationMin: 124,
    imdb: 7.0,
    saga: 'world',
    posterUrl: '/films/jurassic-world-2015.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=RFinNxS5KN4',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_World',
    blurb:
      "Reboot 22 ans après le premier. Le parc de Hammond a finalement ouvert. " +
      "Chris Pratt dresse des Velociraptors. Indominus rex, hybride génétique, s'évade. Box-office monstre (1,67 milliard $). Critique mitigée mais le public adopte.",
    speciesIds: ['tyrannosaurus-rex', 'velociraptor-mongoliensis', 'mosasaurus-hoffmanni', 'pteranodon-longiceps'],
    iconicScene: "Le Mosasaure qui gobe le requin tigre. Le T-Rex qui combat l'Indominus, aidé par Blue.",
  },
  {
    id: 'fallen-kingdom-2018',
    title: 'Jurassic World : Fallen Kingdom',
    year: 2018,
    director: 'J.A. Bayona',
    durationMin: 128,
    imdb: 6.1,
    saga: 'world',
    posterUrl: '/films/fallen-kingdom-2018.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=vn9mMeWcgoM',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_World_:_Fallen_Kingdom',
    blurb:
      "Le volcan d'Isla Nublar se réveille. Les dinos restants sont évacués (ou pas) vers une " +
      "ancienne demeure gothique aux États-Unis. Bayona injecte du film d'horreur old-school dans la saga — le climax Indoraptor dans le manoir est une réussite atmosphérique. Le film qui décide la mondialisation des dinos.",
    speciesIds: ['tyrannosaurus-rex', 'velociraptor-mongoliensis', 'stegosaurus-stenops', 'brachiosaurus-altithorax'],
    iconicScene: "Le Brachiosaure abandonné sur le quai pendant que l'île explose — la scène qui fait pleurer.",
  },
  {
    id: 'dominion-2022',
    title: 'Jurassic World : Le Monde d\'après',
    year: 2022,
    director: 'Colin Trevorrow',
    durationMin: 147,
    imdb: 5.6,
    saga: 'world',
    posterUrl: '/films/dominion-2022.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=fb5ELWi-ekk',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_World_:_Le_Monde_d%27apr%C3%A8s',
    blurb:
      "Réunion des deux trilogies : Sam Neill, Laura Dern et Jeff Goldblum reviennent aux côtés " +
      "de Pratt et Howard. Les dinos vivent désormais avec les humains. Critique sévère mais le grand public répond (1 milliard $). Le Giganotosaure devient le grand antagoniste. Plus de plumes que jamais.",
    speciesIds: ['giganotosaurus-carolinii', 'tyrannosaurus-rex', 'velociraptor-mongoliensis', 'therizinosaurus-cheloniformis'],
    iconicScene: "Le Therizinosaure qui terrorise Bryce Dallas Howard dans le lac. Giganotosaure vs T-Rex + Therizinosaure (3-way).",
  },
  {
    id: 'rebirth-2025',
    title: 'Jurassic World : Rebirth',
    year: 2025,
    director: 'Gareth Edwards',
    durationMin: 134,
    imdb: 6.3,
    saga: 'rebirth',
    posterUrl: '/films/rebirth-2025.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=jan64x2MRqM',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jurassic_World:_Rebirth',
    blurb:
      "Reboot post-Dominion sous Gareth Edwards (Rogue One, Godzilla 2014). Scarlett Johansson, " +
      "Jonathan Bailey et Mahershala Ali en tête d'affiche. Une expédition sur une île équatoriale interdite pour récupérer du sang de dinosaure géant à fins pharmaceutiques. Le ton revient au thriller-survival du premier film.",
    speciesIds: ['mosasaurus-hoffmanni', 'spinosaurus-aegyptiacus', 'tyrannosaurus-rex'],
    iconicScene: "L'attaque marine du Mosasaure sur la goélette en pleine nuit ; le D-Rex hybride dans la jungle.",
  },
];

export const SAGA_LABELS: Record<Film['saga'], string> = {
  park: 'Trilogie originale (Spielberg/Johnston)',
  world: 'Trilogie Jurassic World',
  rebirth: 'Cycle Rebirth (2025+)',
};

export const FILMS_BY_SAGA: Record<Film['saga'], Film[]> = {
  park: FILMS.filter((f) => f.saga === 'park'),
  world: FILMS.filter((f) => f.saga === 'world'),
  rebirth: FILMS.filter((f) => f.saga === 'rebirth'),
};
