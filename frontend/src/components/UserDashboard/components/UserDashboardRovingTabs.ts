/**
 * Shared keyboard model for dashboard tablists.
 */

const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);

export function getNextRovingTabIndex(
  currentIndex: number,
  key: string,
  itemCount: number,
): number | null {
  if (itemCount <= 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  if (NEXT_KEYS.has(key)) return (currentIndex + 1) % itemCount;
  if (PREVIOUS_KEYS.has(key)) return (currentIndex - 1 + itemCount) % itemCount;
  return null;
}
