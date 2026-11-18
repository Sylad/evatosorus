// Comptage d'un repère ou d'un regroupement de la carte (PaleoMap.tsx) : en espèces
// distinctes, pour le chiffre comme pour la couleur. T. rex, trouvé aux États-Unis et
// au Canada, compte une fois ; un site qui mêle deux périodes les annonce toutes les deux.
const ORDER = ['trias', 'jurassique', 'cretace'];

/** @param {{ id: string, period: string }[]} entries */
export function tally(entries) {
  const seen = new Map();
  for (const e of entries) if (!seen.has(e.id)) seen.set(e.id, e.period);
  const byPeriod = {};
  for (const p of seen.values()) byPeriod[p] = (byPeriod[p] ?? 0) + 1;
  // Plus d'espèces d'abord ; à égalité, ordre chronologique (Trias d'abord).
  const periods = Object.keys(byPeriod).sort(
    (a, b) => byPeriod[b] - byPeriod[a] || ORDER.indexOf(a) - ORDER.indexOf(b),
  );
  return { total: seen.size, byPeriod, periods, dominant: periods[0] };
}
