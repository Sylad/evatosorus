// Chaînes YouTube paléontologie / dinosaures — 7 chaînes curées (FR + EN).
// Sélection : sérieux scientifique, qualité vulgarisation, traffic suffisant.
// Avatars : pas de hotlink googleusercontent (instable + risque CSP) — on
// utilise des initiales colorées ; user peut générer des avatars custom
// sur openart.ai pour remplacer plus tard.

export type YouTubeChannel = {
  id: string;
  name: string;
  handle: string;
  url: string;
  language: 'fr' | 'en' | 'mixed';
  subscribers: string;       // formatted, "3,2M abonnés"
  topics: string[];          // tags
  /** Description curée — pourquoi on la recommande, ton documentaire. */
  blurb: string;
  /** Couleur d'accent pour la card (matche la palette evato). */
  accent: 'amber' | 'jade' | 'rust' | 'bone';
  /** Une vidéo emblématique à mettre en avant. */
  featured?: { title: string; url: string };
};

export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  {
    id: 'pbs-eons',
    name: 'PBS Eons',
    handle: '@eons',
    url: 'https://www.youtube.com/@eons',
    language: 'en',
    subscribers: '3,3M',
    topics: ['Paléontologie', 'Évolution', 'Vulgarisation'],
    blurb:
      "La référence anglophone. Produite par PBS, elle vulgarise toute l'histoire de la vie sur Terre — pas seulement les dinos, mais les épisodes mésozoïques sont nombreux et toujours rigoureux. Ton « documentaire BBC » par excellence.",
    accent: 'amber',
    featured: {
      title: 'When Dinosaurs Outran Their Predators',
      url: 'https://www.youtube.com/watch?v=cZqJxqklr3I',
    },
  },
  {
    id: 'trey-the-explainer',
    name: 'TREY the Explainer',
    handle: '@TREYtheExplainer',
    url: 'https://www.youtube.com/@TREYtheExplainer',
    language: 'en',
    subscribers: '760K',
    topics: ['Cryptozoologie', 'Paléontologie pop', 'Mythes débunkés'],
    blurb:
      "Trey décortique les mythes paléontologiques à coup de littérature scientifique. Format long, investigation poussée, voix calme. Excellente série « Were » (Were dinosaurs warm-blooded? etc.).",
    accent: 'rust',
    featured: {
      title: 'How Big Was Megalodon, Really?',
      url: 'https://www.youtube.com/watch?v=LAj_tg9NRAU',
    },
  },
  {
    id: 'ben-g-thomas',
    name: 'Ben G Thomas',
    handle: '@BenGThomas',
    url: 'https://www.youtube.com/@BenGThomas',
    language: 'en',
    subscribers: '450K',
    topics: ['Paléontologie', 'Biologie évolutive', 'Espèces méconnues'],
    blurb:
      "Britannique, jeune, pédagogue. Ben fait briller les dinos moins célèbres et explique la phylogénétique sans jargon. Format court (15-25 min), montage soigné, narration excellente.",
    accent: 'jade',
  },
  {
    id: 'henry-paleoguy',
    name: 'Henry the PaleoGuy',
    handle: '@HenryThePaleoGuy',
    url: 'https://www.youtube.com/@HenryThePaleoGuy',
    language: 'en',
    subscribers: '270K',
    topics: ['Dinosaures', 'Méconnus', 'Reviews paléo-art'],
    blurb:
      "Spécialiste dinos. Reviews des nouvelles découvertes, deep-dive sur les espèces oubliées. Traite les paleo-artistes contemporains avec le respect qu'ils méritent.",
    accent: 'amber',
  },
  {
    id: 'dirty-biology',
    name: 'DirtyBiology',
    handle: '@dirtybiology',
    url: 'https://www.youtube.com/@dirtybiology',
    language: 'fr',
    subscribers: '1,3M',
    topics: ['Biologie évolutive', 'Vulgarisation FR', 'Histoires de vie'],
    blurb:
      "Léo Grasset. La meilleure chaîne FR de biologie évolutive — pas focus dinos exclusif, mais ses épisodes touchant aux extinctions de masse, à l'évolution des oiseaux et aux fossiles vivants sont incontournables. Humour intelligent.",
    accent: 'jade',
    featured: {
      title: 'L\'extinction des dinosaures, on a peut-être tout faux',
      url: 'https://www.youtube.com/watch?v=BDLGmKmFGtg',
    },
  },
  {
    id: 'le-sense-of-wonder',
    name: 'Le Sense of Wonder',
    handle: '@LeSenseofWonder',
    url: 'https://www.youtube.com/@LeSenseofWonder',
    language: 'fr',
    subscribers: '170K',
    topics: ['Paléontologie FR', 'Préhistoire', 'Reportages'],
    blurb:
      "Chaîne FR dédiée paleontologie/préhistoire. Reportages sur les sites de fouilles français (Angeac-Charente, Bernissart belge), interviews de paléontologues. Ressource précieuse en français.",
    accent: 'bone',
  },
  {
    id: 'stranger-aeons',
    name: 'Stranger Aeons',
    handle: '@StrangerAeons',
    url: 'https://www.youtube.com/@StrangerAeons',
    language: 'en',
    subscribers: '90K',
    topics: ['Cambrien à Crétacé', 'Macroevolution', 'Indépendant'],
    blurb:
      "Production indé, narration calme, focus sur les transitions évolutives majeures (Cambrien, Trias après extinction Permo-Trias, oiseaux modernes). Pas la plus connue mais une des plus pointues.",
    accent: 'rust',
  },
];

export const LANGUAGE_LABELS: Record<YouTubeChannel['language'], string> = {
  fr: 'Français',
  en: 'English',
  mixed: 'FR / EN',
};

export const ACCENT_HEX: Record<YouTubeChannel['accent'], string> = {
  amber: '#d4a55e',
  jade: '#5e8f6e',
  rust: '#c75131',
  bone: '#b8a78f',
};
