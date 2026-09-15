#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/summary.mjs
 * PURPOSE: Turn a state map into counts — the one-line answer to "how much of
 *          this creator's corpus do we actually have?"
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `fsm.mjs`, which was at the Rule 4 cap: adding the configurable
 * no-caption window left no room. The seam is real rather than cosmetic — the
 * state machine decides what may happen to a video, this counts what already
 * has, and it is the only part of that module that reads a whole map.
 *
 * `summarize` is unchanged, including the detail that it reports a count for
 * EVERY known state (zero included), so a caller can render a full row without
 * knowing the state list.
 *
 * @module creator-brains/summary
 */

import { STATES } from './fsm.mjs';

/** Human summary of a whole state map — used by status and the digest. */
export function summarize(states) {
  const counts = {};
  for (const st of Object.values(STATES)) counts[st] = 0;
  for (const v of Object.values(states || {})) {
    if (counts[v.state] === undefined) counts[v.state] = 0;
    counts[v.state] += 1;
  }
  const total = Object.keys(states || {}).length;
  const done = counts[STATES.FETCHED];
  return {
    total, counts, fetched: done, coverage: total ? done / total : 0,
  };
}
