/** Pure pagination logic for the bootcamp audience display. */
import type { StationCardVM } from './audienceDirector';

/** Which slice of station cards this page shows (alternating rooms). */
export function pageSlice(cards: StationCardVM[], perPage: number, page: number): StationCardVM[] {
  if (perPage <= 0 || cards.length <= perPage) return cards;
  const pages = Math.ceil(cards.length / perPage);
  const start = (page % pages) * perPage;
  return cards.slice(start, start + perPage);
}
