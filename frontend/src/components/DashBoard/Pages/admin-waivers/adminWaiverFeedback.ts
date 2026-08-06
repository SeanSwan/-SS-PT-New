/**
 * ============================================================================
 * FILE: adminWaiverFeedback.ts
 * PURPOSE: Turn a failed admin-waiver API call into admin-readable copy.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Pure (no React) mapping from an axios-shaped rejection
 * to a { title, message } pair the manager can put on screen. Kept pure so the
 * status mapping is unit-testable without rendering the surface.
 *
 * BACKEND CONTRACT (backend/controllers/adminWaiverController.mjs):
 *   { success: false, error: '<human readable string>' }
 *   400 malformed input · 404 not found · 409 state conflict ·
 *   422 wrong role · 500 server failure
 * plus 429 from `adminLimiter` (backend/middleware/rateLimiter.mjs:56 —
 * 50 admin requests / 5 minutes) whose body uses the same `error` key.
 *
 * WHY `unchanged` MATTERS: an admin who sees "Approve failed" still does not
 * know whether the match got half-approved. Every mutating call passes the
 * sentence that states what did NOT change, and it is appended verbatim.
 */

export interface WaiverFeedbackMessage {
  title: string;
  message: string;
}

interface ErrorShape {
  status?: number;
  serverMessage?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

/** Pulls the HTTP status + backend `error` string off an axios rejection. */
export const readErrorShape = (err: unknown): ErrorShape => {
  const response = isRecord(err) && isRecord(err.response) ? err.response : undefined;
  const data = response && isRecord(response.data) ? response.data : undefined;

  const serverMessage =
    data && typeof data.error === 'string' && data.error.trim()
      ? data.error.trim()
      : data && typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : undefined;

  return {
    status: response && typeof response.status === 'number' ? response.status : undefined,
    serverMessage,
  };
};

const join = (...parts: Array<string | undefined>): string =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');

/**
 * Builds the banner copy for a failed waiver call.
 *
 * @param err       the rejection thrown by apiService
 * @param action    what the admin was trying to do, e.g. 'Approve match'
 * @param unchanged optional sentence stating what did NOT change
 */
export const describeWaiverError = (
  err: unknown,
  action: string,
  unchanged?: string,
): WaiverFeedbackMessage => {
  const { status, serverMessage } = readErrorShape(err);

  if (status === 429) {
    return {
      title: `${action} was rate-limited`,
      message: join(
        serverMessage || 'Too many admin requests, please try again later.',
        'The admin limit is 50 requests per 5 minutes — wait a few minutes and retry.',
        unchanged,
      ),
    };
  }

  if (status === 400) {
    return {
      title: `${action} failed — the request was rejected`,
      message: join(serverMessage || 'The server rejected the request as malformed.', unchanged),
    };
  }

  if (status === 401 || status === 403) {
    return {
      title: `${action} failed — not authorized`,
      message: join(
        serverMessage || 'This action requires an active admin session.',
        'Reload the page and sign in again.',
        unchanged,
      ),
    };
  }

  if (status === 404) {
    return {
      title: `${action} failed — record not found`,
      message: join(
        serverMessage || 'The server could not find that record.',
        'It may have been removed or replaced since this list was loaded. Refresh and retry.',
        unchanged,
      ),
    };
  }

  if (status === 409 || status === 422) {
    return {
      title: `${action} failed — conflicting state`,
      message: join(
        serverMessage || 'The record is not in a state that allows this action.',
        'Refresh to see its current state.',
        unchanged,
      ),
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      title: `${action} failed — server error`,
      message: join(serverMessage || 'The server returned an error.', unchanged),
    };
  }

  if (typeof status === 'number') {
    return {
      title: `${action} failed (HTTP ${status})`,
      message: join(serverMessage || 'The server returned an unexpected response.', unchanged),
    };
  }

  return {
    title: `${action} failed — no response from the server`,
    message: join(
      'The request did not complete. Check your connection and retry.',
      unchanged,
    ),
  };
};

/** Sentences reused across the manager so wording stays consistent. */
export const WAIVER_UNCHANGED = {
  approve: 'Nothing changed — the match is still pending review.',
  reject: 'Nothing changed — the match is still pending review.',
  attach: 'Nothing changed — the waiver is still unlinked.',
  revoke: 'Nothing changed — the waiver is still active.',
  list: 'The list below may be out of date.',
  detail: 'The record was not opened.',
  detailRefresh: 'The details shown may be out of date.',
} as const;
