export function tally(entries: { id: string; period: string }[]): {
  total: number;
  byPeriod: Record<string, number>;
  periods: string[];
  dominant: string;
};
