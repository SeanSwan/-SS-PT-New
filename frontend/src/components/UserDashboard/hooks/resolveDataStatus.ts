/**
 * ============================================================================
 * FILE: resolveDataStatus.ts
 * PURPOSE: Turn a React Query result into the ONE question the UI actually
 *          needs answered: do we know this member's record right now?
 * ----------------------------------------------------------------------------
 * Why this exists. Every surface that rolled its own gate got it wrong the same
 * way, three times in this workstream:
 *
 *   `isError && !data`  →  FALSE during first paint, the in-flight request, its
 *                          retry and the backoff between them. For that whole
 *                          window the UI rendered zeros as fact.
 *   `data ? ready : …`  →  TRUE when a background refetch has FAILED but stale
 *                          data survives, so an outage rendered as current.
 *   neither             →  a DISABLED query (`enabled: false`) sits at
 *                          `fetchStatus: 'idle'` with no data and no error, so
 *                          a "loading" state would spin forever.
 *
 * Encoding it once means the next surface inherits the right answer.
 * ============================================================================
 */

/**
 * - `ready`       — data is loaded and current.
 * - `stale`       — data is displayable but a refresh failed; show it, offer a retry.
 * - `loading`     — genuinely in flight; say so, offer nothing to retry yet.
 * - `unavailable` — we do not and will not know without action.
 */
export type DataStatus = 'ready' | 'stale' | 'loading' | 'unavailable';

export interface QueryLike {
  data?: unknown;
  isError?: boolean;
  /**
   * React Query v5. 'fetching' = a request is in flight (this also covers the
   * retry backoff). 'paused' = the browser is OFFLINE and the request is
   * queued. 'idle' = nothing in flight and nothing queued — a disabled query,
   * or a settled one.
   */
  fetchStatus?: string;
  /** True while React Query is serving `placeholderData`, which is NOT the member's record. */
  isPlaceholderData?: boolean;
  /** Distinguishes "resolved to null" from "never resolved". */
  isSuccess?: boolean;
}

export function resolveDataStatus(query: QueryLike | null | undefined): DataStatus {
  if (!query) return 'unavailable';

  // Placeholder rows are fabricated by definition. Never let them read as the
  // member's record — this surface's entire defect class is invented numbers.
  if (query.isPlaceholderData) return 'loading';

  const hasData = query.data !== undefined && query.data !== null;
  if (hasData) return query.isError ? 'stale' : 'ready';
  if (query.isError) return 'unavailable';

  // A query that SUCCEEDED and legitimately resolved to null/undefined is
  // loaded, not broken. Offering a Retry that returns the same nothing forever
  // would be its own small lie.
  if (query.isSuccess) return 'ready';

  // No data, no error, not settled. 'paused' means the device is offline: the
  // request is queued and will not progress, so a spinner with no exit is the
  // very failure this resolver exists to prevent. 'idle' means disabled.
  // Both are actionable states, not loading states.
  if (query.fetchStatus === 'idle' || query.fetchStatus === 'paused') return 'unavailable';
  return 'loading';
}

/** True when the value on screen reflects the member's real record. */
export const isDataKnown = (status: DataStatus): boolean =>
  status === 'ready' || status === 'stale';

export default resolveDataStatus;
