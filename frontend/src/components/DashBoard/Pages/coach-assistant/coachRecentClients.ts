/**
 * FILE: coachRecentClients.ts (v2 P2.3)
 * PURPOSE: The floor workflow lives on 2-3 hot clients — surface the most
 * recently coached ones as one-tap rebind chips beside the main-client
 * select. Pure + unit-testable.
 */

type ThreadLike = { targetUserId?: number | string | null };

export function recentClientIds(
  threads: ThreadLike[],
  excludeClientId: number | null,
  limit = 3,
  allowedClientIds?: readonly number[],
): number[] {
  const allowed = allowedClientIds ? new Set(allowedClientIds) : null;
  const seen = new Set<number>();
  const result: number[] = [];
  for (const thread of threads) {
    const id = Number(thread.targetUserId);
    if (!Number.isSafeInteger(id) || id <= 0 || id === excludeClientId || seen.has(id) || (allowed && !allowed.has(id))) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= limit) break;
  }
  return result;
}
