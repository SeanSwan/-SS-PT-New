/**
 * ============================================================================
 * FILE: stateGuards.ts
 * PURPOSE: Referential stability utilities for React state updates
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * Prevents unnecessary re-renders by returning the previous array reference
 * when the data hasn't actually changed. Used in all hooks that receive
 * API response arrays.
 */

/**
 * Returns `prev` if arrays are equal (avoids React re-render from new reference).
 * Uses optional custom comparator — defaults to comparing by `id` field.
 */
export function stableArrayUpdate<T extends { id: string | number }>(
  prev: T[],
  next: T[],
  isEqual?: (a: T, b: T) => boolean
): T[] {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    const equal = isEqual
      ? isEqual(prev[i], next[i])
      : prev[i].id === next[i].id;
    if (!equal) return next;
  }
  return prev;
}
