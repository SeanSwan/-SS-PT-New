#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/injected-enumerator.mjs
 * PURPOSE: Adapt an INJECTED single-tab enumerator to the structured multi-tab
 *          contract discovery expects — without ever inventing completeness.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR12/22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `discover.mjs` for the Rule 4 cap when the resumable-sweep work
 * landed (HR22). It is the seam the file already had: this module translates a
 * test double, and `discover.mjs` decides what a walk means.
 *
 * THE RULE IT EXISTS TO ENFORCE (review HR12):
 *   An injected ARRAY is never upgraded to `complete: true` by assumption. The
 *   previous code treated "the fixture returned rows" as "the walk was a census",
 *   which is how a broken enumeration advanced a permanent deletion. Completeness
 *   is DERIVED from what came back, exactly as it is for a real walk: no rows is
 *   inconclusive, malformed rows make it non-authoritative, and a caller's limit
 *   is a truncation.
 *
 * @module creator-brains/injected-enumerator
 */

/** The shape a refused discovery returns: the same keys as a real result, with
 *  `ok: false` and nothing changed. Callers can render it without branching. */
export function refused(reason, { tabs = [] } = {}) {
  return {
    ok: false,
    reason,
    rows: [],
    newIds: [],
    known: [],
    complete: false,
    partial: false,
    perTab: null,
    problems: [],
    invalid: 0,
    deleted: [],
    suspected: [],
    judged: false,
    incremental: false,
    limit: 0,
    tabs,
  };
}

/**
 * Adapt an injected single-tab enumerator to the structured contract.
 *
 * Accepts either an array of rows (the historical shape), or an object that
 * already carries a verdict. An ARRAY is never upgraded to `complete: true` by
 * assumption — it is classified with the same rules as a real walk, so an empty
 * or malformed injection stays inconclusive (review HR12).
 */
export function wrapInjected(listUploads, channelId, { limit = 0 } = {}, tabs = ['videos']) {
  const raw = listUploads(`https://www.youtube.com/channel/${channelId}/${tabs[0]}`, { limit }) || [];
  if (raw && !Array.isArray(raw) && Array.isArray(raw.rows)) {
    return {
      tabs, perTab: {}, invalid: raw.invalid || [], problems: [], ...raw,
    };
  }
  const rows = Array.isArray(raw) ? raw : [];
  return {
    rows,
    invalid: [],
    perTab: { [tabs[0]]: { rows: rows.length } },
    problems: [],
    complete: rows.length > 0 && (!Number.isInteger(limit) || limit <= 0 || rows.length < limit),
    reason: rows.length ? null : 'injected enumerator returned no rows',
    tabs,
  };
}
