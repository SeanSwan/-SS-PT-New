/**
 * Transient-failure policy for AI equipment scans.
 *
 * Auto-retry only handles likely upstream/network failures. It must never
 * retry validation failures, permission errors, rate limits, or the configured
 * "AI unavailable" 503 path because those retries waste time or scan quota.
 */

const MAX_SCAN_AUTO_RETRIES = 1;
export const SCAN_AUTO_RETRY_DELAY_MS = 700;

interface ScanErrorLike {
  status?: number;
  retryable?: boolean;
}

const isRetryableStatus = (status: number): boolean => status >= 500 && status !== 503;

function isRetryableScanError(err: unknown): boolean {
  const e = (err ?? undefined) as ScanErrorLike | undefined;

  if (typeof e?.status !== 'number') {
    return e?.retryable ?? true;
  }

  return isRetryableStatus(e.status) && e.retryable !== false;
}

export function shouldAutoRetryScan(err: unknown, attempt: number): boolean {
  return attempt < MAX_SCAN_AUTO_RETRIES && isRetryableScanError(err);
}
