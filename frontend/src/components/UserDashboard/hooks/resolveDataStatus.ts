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

  // Placeholder rows are fabricated by definition, so they are NOT data.
  // Checked as part of the data test rather than ahead of it — returning early
  // here sent an offline device to 'loading', i.e. a spinner with no exit.
  const hasData = query.data !== undefined && query.data !== null && !query.isPlaceholderData;

  if (hasData) {
    // 'paused' means the device is OFFLINE. With React Query's default
    // networkMode the refetch is PAUSED, never errored — so this, not isError,
    // is the common "displayable but not refreshed" case. It must read as
    // stale, or a member who lost signal is told their data is current.
    if (query.isError || query.fetchStatus === 'paused') return 'stale';
    return 'ready';
  }

  if (query.isError) return 'unavailable';

  // Succeeded and legitimately resolved to nothing: loaded, not broken.
  if (query.isSuccess && !query.isPlaceholderData) return 'ready';

  // No usable data and not settled. 'idle' = disabled; 'paused' = offline with
  // the request queued. Both are actionable; neither is progress.
  if (query.fetchStatus === 'idle' || query.fetchStatus === 'paused') return 'unavailable';
  return 'loading';
}

/** True when the value on screen reflects the member's real record. */
export const isDataKnown = (status: DataStatus): boolean =>
  status === 'ready' || status === 'stale';

export default resolveDataStatus;
