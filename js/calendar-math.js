// Calendar arithmetic. Pure.

export const daysIn = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();

/** Six weeks of day numbers for month `mo` (1-based), 0 for padding. weekStart: 1 = Monday, 0 = Sunday. */
export function monthGrid(y, mo, weekStart = 1){
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const lead = (first - weekStart + 7) % 7, n = daysIn(y, mo);
  return Array.from({length: 42}, (_, i) => { const d = i - lead + 1; return d >= 1 && d <= n ? d : 0; });
}
