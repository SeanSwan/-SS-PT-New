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
  /** React Query v5: 'fetching' | 'paused' | 'idle'. */
  fetchStatus?: string;
}

export function resolveDataStatus(query: QueryLike | null | undefined): DataStatus {
  if (!query) return 'unavailable';

  const hasData = query.data !== undefined && query.data !== null;
  if (hasData) return query.isError ? 'stale' : 'ready';
  if (query.isError) return 'unavailable';

  // No data, no error. 'idle' means nothing is in flight and nothing will be —
  // a disabled or paused query. Spinning forever would be its own false claim.
  if (query.fetchStatus === 'idle') return 'unavailable';
  return 'loading';
}

/** True when the value on screen reflects the member's real record. */
export const isDataKnown = (status: DataStatus): boolean =>
  status === 'ready' || status === 'stale';

export default resolveDataStatus;
