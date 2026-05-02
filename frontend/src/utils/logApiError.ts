/**
 * Sanitized API error logger.
 *
 * Why this exists: Village run 2026-05-01 flagged that
 * `console.error('AI generation failed:', err)` (and 2 sibling sites in the
 * Workout Planner page) print the entire Axios error object including
 * `error.config.headers` — which contains the user's Authorization JWT.
 * Anyone with browser DevTools open or any Sentry/Datadog log-shipper picking
 * up console output gets a clean copy of the JWT.
 *
 * This helper strips known sensitive fields before logging. Use it instead
 * of `console.error` for any caught Axios/network error.
 *
 * Usage:
 *   import { logApiError } from '@/utils/logApiError';
 *   try { await api.get(...) } catch (err) {
 *     logApiError('AI generation failed', err);
 *   }
 *
 * Strips:
 *   - error.config.headers (Authorization JWT lives here)
 *   - error.config.data    (may include PII per rule 8)
 *   - error.request        (full XHR object — too noisy)
 *
 * Keeps:
 *   - status, statusText, response.data (server-side error message)
 *   - error.message, error.code (Axios error code)
 *   - error.config.url, error.config.method (no secrets, useful for triage)
 *
 * Anti-rule-8 note: error.response.data MAY contain PII if the server
 * accidentally echoes back input. We keep it because withholding it would
 * break the whole point of error logging — but the server-side response
 * shape should never include PII per rule 8 in the first place.
 */

interface AxiosLikeError {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
  };
  config?: {
    url?: string;
    method?: string;
    // intentionally omitted: headers, data
  };
  // intentionally omitted: request, request._currentRequest, etc
}

/**
 * Pull only the safe-to-log fields off an Axios error.
 * Returns a plain object suitable for console.error / structured logging.
 */
export function sanitizeApiError(err: unknown): AxiosLikeError {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const out: AxiosLikeError = {};
  if (typeof e.message === 'string') out.message = e.message;
  if (typeof e.code === 'string') out.code = e.code;
  if (e.response && typeof e.response === 'object') {
    out.response = {};
    if (typeof e.response.status === 'number') out.response.status = e.response.status;
    if (typeof e.response.statusText === 'string') out.response.statusText = e.response.statusText;
    // Keep response.data — it's the server-side error body (intentionally exposed).
    if (e.response.data !== undefined) out.response.data = e.response.data;
  }
  if (e.config && typeof e.config === 'object') {
    out.config = {};
    if (typeof e.config.url === 'string') out.config.url = e.config.url;
    if (typeof e.config.method === 'string') out.config.method = e.config.method;
    // EXPLICITLY DROPPED: headers (JWT), data (PII), params (query secrets)
  }
  return out;
}

/**
 * Drop-in replacement for `console.error(label, err)` for API errors.
 * Strips JWT-bearing headers + request body before logging.
 */
export function logApiError(label: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(label, sanitizeApiError(err));
}
