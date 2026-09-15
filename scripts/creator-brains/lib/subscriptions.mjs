#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/subscriptions.mjs
 * PURPOSE: The paginated `subscriptions.list` adapter — and the completeness
 *          verdict that decides whether the result may change the catalog.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THE INTERESTING PART OF THIS FILE IS NOT THE HTTP CALL.
 *
 *   `subscriptions.list` returns at most 50 rows per page plus a
 *   `nextPageToken`. The dangerous outcomes are not "the request failed" — they
 *   are the ones that LOOK like success:
 *
 *     - page one succeeds and page two 500s: 50 rows returned, and a caller that
 *       treats that as the subscription list marks every other creator
 *       `unsubscribed`;
 *     - a repeating `nextPageToken` loops until the page cap and returns a
 *       plausible-looking set;
 *     - a 200 with a renamed field parses to zero rows, which reads as "you
 *       follow nobody".
 *
 *   All three are the same failure: an EMPTY OR PARTIAL result presented as
 *   authoritative absence. So this module returns a `complete` boolean with a
 *   reason, and `applySnapshot` refuses to mark anything unsubscribed unless it
 *   is true.
 *
 *   "You follow nobody" and "page two failed" look identical downstream, and one
 *   of them silently discards the owner's catalog.
 *
 * @module creator-brains/subscriptions
 */

import { OAuthError } from './oauth.mjs';

export const SUBSCRIPTIONS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/subscriptions';

/** Google caps this at 50. Asking for more is silently clamped, which would make
 *  page arithmetic wrong, so the value is fixed rather than configurable. */
export const PAGE_SIZE = 50;

/** A hard stop so a pathological cursor cannot loop forever. */
export const MAX_PAGES = 40;

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export class SubscriptionsError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'SubscriptionsError';
    this.detail = detail;
  }
}

/** A valid row, or null with a reason. Anything we cannot bind is not a row. */
export function normalizeRow(item) {
  const snippet = item && item.snippet;
  const channelId = snippet && snippet.resourceId && snippet.resourceId.channelId;
  if (!CHANNEL_ID.test(String(channelId || ''))) {
    return { row: null, reason: 'snippet.resourceId.channelId is missing or not a channel id' };
  }
  return {
    row: {
      channelId,
      title: (snippet && snippet.title) || channelId,
      publishedAt: (snippet && snippet.publishedAt) || null,
      subscriptionId: item.id || null,
    },
    reason: null,
  };
}

/**
 * Fetch every page of the owner's subscriptions.
 *
 * Returns `{ rows, pages, complete, reason, invalid, cursorLoop }`.
 * `complete: true` means every page was fetched, no cursor repeated, no row was
 * unreadable, and the walk did not hit the page cap.
 */
export async function listSubscriptions({
  accessToken, fetchImpl, pageSize = PAGE_SIZE, maxPages = MAX_PAGES, timeoutMs = 30_000, signal = null,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new SubscriptionsError('a fetch implementation is required');
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new OAuthError('an access token is required', { kind: 'oauth_no_access_token' });
  }

  const rows = [];
  const invalid = [];
  const seenIds = new Set();
  const seenCursors = new Set();
  let pageToken = null;
  let pages = 0;
  let cursorLoop = false;
  let reason = null;

  while (pages < maxPages) {
    const url = new URL(SUBSCRIPTIONS_ENDPOINT);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('mine', 'true');
    url.searchParams.set('maxResults', String(pageSize));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    let res;
    try {
      res = await fetchImpl(url.toString(), {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      const kind = e && e.name === 'AbortError' ? 'subscriptions_timeout' : 'subscriptions_transport_error';
      return finish({ kind, message: `${kind}: ${e && e.message ? e.message : e}` });
    }
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (res.status === 401 || res.status === 403) {
      // Named distinctly: this is the one a caller must retry after a refresh,
      // and conflating it with a generic failure hides a recoverable state.
      return finish({ kind: 'subscriptions_unauthorized', message: `subscriptions.list returned ${res.status}` });
    }
    if (!res.ok) {
      return finish({ kind: 'subscriptions_http_error', message: `subscriptions.list returned ${res.status}` });
    }

    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* reported below */ }
    if (!body || typeof body !== 'object' || !Array.isArray(body.items)) {
      return finish({
        kind: 'subscriptions_malformed_response',
        message: 'subscriptions.list did not return an items array — shape change or an error page',
      });
    }

    pages += 1;
    for (const item of body.items) {
      const { row, reason: why } = normalizeRow(item);
      if (!row) { invalid.push({ reason: why }); continue; }
      if (seenIds.has(row.channelId)) continue; // a duplicate across pages is not a new creator
      seenIds.add(row.channelId);
      rows.push(row);
    }

    const next = body.nextPageToken;
    if (!next) return finish(null); // the ONLY clean exit
    if (seenCursors.has(next)) {
      cursorLoop = true;
      return finish({ kind: 'subscriptions_cursor_loop', message: 'nextPageToken repeated — refusing to loop' });
    }
    seenCursors.add(next);
    pageToken = next;
  }

  return finish({ kind: 'subscriptions_page_cap', message: `stopped at the ${maxPages}-page cap` });

  /** Assemble the verdict. `complete` is true only on the clean exit. */
  function finish(problem) {
    if (problem) reason = problem.message;
    // The page cap is INCOMPLETE even though nothing errored: we do not know
    // whether more pages existed, so the result must not be treated as the list.
    const complete = !problem && invalid.length === 0 && !cursorLoop;
    if (!complete && !reason) reason = `${invalid.length} row(s) could not be read`;
    return {
      rows,
      pages,
      complete,
      reason,
      invalid,
      cursorLoop,
      errorKind: problem ? problem.kind : null,
    };
  }
}

/**
 * A valid ZERO result is a legitimate, complete answer.
 *
 *   "You follow nobody" is a real state and must be distinguishable from a
 *   failure. This helper exists so a caller cannot confuse the two by checking
 *   `rows.length` alone: it returns true only when the walk completed AND
 *   genuinely found nothing.
 */
export function isEmptyButComplete(snapshot) {
  return !!(snapshot && snapshot.complete === true && Array.isArray(snapshot.rows) && snapshot.rows.length === 0);
}

/**
 * Fetch with a single refresh-and-retry on 401/403.
 *
 *   A daily job runs when the access token has usually expired, so a 401 on the
 *   first page is the NORMAL path, not an error. Retried once, and a second 401
 *   is reported as revoked so the caller can mark the token rather than loop.
 */
export async function listSubscriptionsWithRefresh({
  tokens, refresh, fetchImpl, now = Date.now(), pageSize = PAGE_SIZE, maxPages = MAX_PAGES, signal = null,
} = {}) {
  const first = await listSubscriptions({
    accessToken: tokens && tokens.access_token, fetchImpl, pageSize, maxPages, signal,
  });
  if (!first.errorKind || !first.errorKind.includes('unauthorized')) return first;

  if (typeof refresh !== 'function') {
    return { ...first, complete: false, reason: `${first.reason} (no refresh available)` };
  }
  const fresh = await refresh();
  const second = await listSubscriptions({
    accessToken: fresh && fresh.access_token, fetchImpl, pageSize, maxPages, signal,
  });
  if (second.errorKind && second.errorKind.includes('unauthorized')) {
    return { ...second, complete: false, revoked: true, reason: 'still unauthorized after a refresh — the token is revoked or the scope is wrong' };
  }
  return { ...second, refreshed: true };
}
