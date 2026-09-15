#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/enumeration-fixtures.mjs
 * PURPOSE: The multi-tab enumerator double and the store builder shared by the
 *          HR22 regressions.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY IT IS NOT INSIDE `helpers.mjs`: `helpers.mjs` is at the Rule 4 cap, and
 * these fixtures are used by ONE family of tests. It is not a `.test.mjs` file,
 * so the runner does not pick it up as a suite.
 *
 * WHY IT IS SHARED RATHER THAN COPIED: the census tests and the resume tests must
 * agree about what a three-tab walk looks like — a duplicated enumerator double
 * that drifts would let one suite pass while the other proved nothing.
 *
 * @module creator-brains/test/enumeration-fixtures
 */

import { makeReviewStore, reviewDeps, uploadRow, REVIEW_A } from './helpers.mjs';

export const DAY = 86_400_000;
export const TABS = ['videos', 'shorts', 'streams'];

/** 11 url-safe characters, distinct per index. */
export const vid = (i) => `r${String(i).padStart(9, '0')}x`.slice(0, 11);

/** Rows for one tab, with ids that do not collide across tabs. */
export function rowsFor(tab, count, offset) {
  return Array.from({ length: count }, (_, i) => uploadRow(i + offset, {
    id: vid(offset + i),
    title: `${tab} ${i}`,
    upload_date: '20260101',
  }));
}

/**
 * An injected multi-tab enumerator that records every walk it is asked for.
 *
 * It implements the enumerator contract (`rows`, `perTab`, `complete`, `reason`,
 * `problems`, `stoppedEarly`) the way `enumerateChannel` does, so what the engine
 * does with a REAL walk is what is under test — only the network is replaced.
 *
 * `fail` may be a function, so a test can change which tab is broken between
 * runs; a plain object would freeze at construction.
 */
export function tabEnumerator({ rows = {}, fail = {}, log = [] } = {}) {
  const failuresNow = typeof fail === 'function' ? fail : () => fail;
  const enumerate = (channelId, { tabs = [], limit = 0, stopAfterId = null } = {}) => {
    const fail = failuresNow() || {};
    const entry = { tabs: [...tabs], stopAfterId, walked: [] };
    log.push(entry);
    const out = {
      rows: [], invalid: [], perTab: {}, problems: [], tabs: [...tabs], stoppedEarly: false,
    };
    for (const tab of tabs) {
      entry.walked.push(tab);
      if (fail[tab]) {
        out.problems.push(`${tab}: ${fail[tab]}`);
        out.perTab[tab] = { rows: 0, error: fail[tab] };
        continue;
      }
      let taken = 0;
      for (const row of rows[tab] || []) {
        if (stopAfterId && row.id === stopAfterId) { out.stoppedEarly = true; break; }
        out.rows.push({ ...row, tab });
        taken += 1;
      }
      out.perTab[tab] = { rows: taken, invalid: 0 };
      if (out.stoppedEarly) break;
    }
    const limitHit = Number.isInteger(limit) && limit > 0 && out.rows.length >= limit;
    out.complete = out.problems.length === 0 && !out.stoppedEarly && !limitHit && out.rows.length > 0;
    out.reason = out.problems.length
      ? `tab failures: ${out.problems.join('; ')}`
      : (out.stoppedEarly ? 'incremental walk stopped at the high-water mark' : null);
    return out;
  };
  enumerate.log = log;
  return enumerate;
}

/** Total tabs actually walked across every call the enumerator saw. */
export const walkedCount = (enumerate) =>
  enumerate.log.reduce((n, w) => n + (w.walked || w.tabs).length, 0);

/** A store with one enabled creator, an optional seeded video and registry patch. */
export async function storeWith(tag, { videos = [], registry = {} } = {}) {
  const r = await makeReviewStore(tag, {
    creators: [{ channelId: REVIEW_A, title: 'Alpha', enabled: true }],
    videos,
  });
  if (Object.keys(registry).length) {
    const { loadRegistry, saveRegistry } = await import('../lib/store.mjs');
    const reg = loadRegistry(r);
    Object.assign(reg.creators[REVIEW_A], registry);
    saveRegistry(reg, r);
  }
  return r;
}

/** Deps with a multi-tab enumerator injected. */
export const depsWith = (enumerate) => reviewDeps({ enumerate });
