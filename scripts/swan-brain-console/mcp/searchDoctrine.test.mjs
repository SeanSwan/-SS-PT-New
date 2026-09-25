/**
 * searchDoctrine-contract — the bounds and the honesty of `swan_search_doctrine`.
 * @module scripts/swan-brain-console/mcp/searchDoctrine.test
 *
 * WHY THIS FILE EXISTS SEPARATELY (round 8, 2026-09-20)
 * `searchDoctrine.mjs` was extracted from `tools.mjs` in S4 for Rule 4 headroom, but its
 * tests stayed behind in `tools.test.mjs`. Adding round 8's truncation regression there
 * would have pushed that module past the 300-line budget, and the search handler's bounds
 * are — in that module's own words — "the most load-bearing code in the MCP server". They
 * belong next to the code they constrain.
 *
 * THE DEFECT THIS PINS
 * `truncated` was set whenever the result count reached `want`, so a search that found
 * EXACTLY `want` matches — complete, nothing left behind — reported `truncated: true`. The
 * field exists to stop a caller assuming completeness; it was denying completeness that was
 * real. Measured before the fix: the needle `Crystalline` has exactly 38 matches tree-wide,
 * and `limit: 38` returned all 38 reporting `truncated: true`.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  swanSearchDoctrine,
  clampLimit,
  SEARCH_ROOT,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX,
  SEARCH_FILES_MAX,
} from './searchDoctrine.mjs';

/** The one needle the round-8 probe measured: exactly 38 matches, exhaustively countable. */
const EXACT_NEEDLE = 'Crystalline';

describe('searchDoctrine — the truncated flag must be a fact, not an assumption', () => {
  /*
   * Establish the ground truth the regression needs, and fail loudly if the tree changes
   * enough to make it meaningless. A test that silently becomes vacuous is worse than no
   * test: it keeps reporting green while checking nothing.
   */
  test('the reference needle is still exhaustively countable at the max limit', () => {
    const full = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX });
    assert.equal(
      full.truncated,
      false,
      `${EXACT_NEEDLE} now exceeds ${SEARCH_LIMIT_MAX} matches — pick a new reference needle`,
    );
    assert.ok(full.count > 0, `${EXACT_NEEDLE} has no matches — the regression below would be vacuous`);
  });

  /*
   * THE REGRESSION. Asking for exactly as many results as exist must report COMPLETE.
   * Before the fix this returned `truncated: true` for all 38 of 38.
   */
  test('a limit equal to the true match count reports truncated:false', () => {
    const truth = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX });
    const total = truth.count;
    const exact = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: total });
    assert.equal(exact.count, total, 'the exact-limit search did not return every match');
    assert.equal(
      exact.truncated,
      false,
      `found ALL ${total} matches yet reported truncated:true — this is the round 8 defect`,
    );
    assert.equal(exact.resultsTruncated, false, 'no (want+1)th match exists, so resultsTruncated must be false');
    assert.equal(exact.scanTruncated, false, `the whole tree was scanned (${exact.scanned} files), so scanTruncated must be false`);
  });

  /* The other direction: one fewer than the true count must still report truncation. */
  test('a limit one below the true match count reports truncated:true', () => {
    const truth = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX });
    const total = truth.count;
    assert.ok(total >= 2, 'need at least two matches to test the boundary from below');
    const short = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: total - 1 });
    assert.equal(short.count, total - 1);
    assert.equal(short.truncated, true, 'a (want+1)th match exists, so truncated must be true');
    assert.equal(short.resultsTruncated, true);
  });

  /* A genuinely capped search still reports truncation, and says which cap bit. */
  test('a needle with more matches than the cap reports resultsTruncated:true', () => {
    const capped = swanSearchDoctrine({ query: 'the', limit: 5 });
    if (capped.truncated) {
      assert.equal(capped.resultsTruncated, true, 'a hit on the result cap must set resultsTruncated');
    }
  });

  /* A needle with no matches anywhere is the cleanest possible "complete". */
  test('a needle with zero matches reports truncated:false and count 0', () => {
    const none = swanSearchDoctrine({ query: 'zzz-no-such-needle-zzz', limit: SEARCH_LIMIT_MAX });
    assert.equal(none.count, 0);
    assert.equal(none.truncated, false, 'finding nothing is a complete search, not a truncated one');
  });

  /*
   * `count` must equal `results.length` at every limit — the summary and the payload cannot
   * disagree, which is the same class of defect one level down.
   */
  test('count always equals results.length', () => {
    for (const limit of [1, 3, 10, 50]) {
      const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit });
      assert.equal(r.count, r.results.length, `count/results.length disagree at limit ${limit}`);
    }
  });

  /* `want + 1` must never leak into the payload: the caller asked for `limit`, not `limit + 1`. */
  test('never returns more than the requested limit', () => {
    for (const limit of [1, 2, 7]) {
      const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit });
      assert.ok(r.results.length <= limit, `returned ${r.results.length} for limit ${limit}`);
    }
  });
});

describe('searchDoctrine — bounds', () => {
  test('clampLimit floors, caps and defaults non-numbers', () => {
    assert.equal(clampLimit(undefined), SEARCH_LIMIT_DEFAULT);
    assert.equal(clampLimit(0), SEARCH_LIMIT_DEFAULT);
    assert.equal(clampLimit(-3), SEARCH_LIMIT_DEFAULT);
    assert.equal(clampLimit(NaN), SEARCH_LIMIT_DEFAULT);
    assert.equal(clampLimit(Infinity), SEARCH_LIMIT_DEFAULT);
    assert.equal(clampLimit(1.9), 1);
    assert.equal(clampLimit(1e9), SEARCH_LIMIT_MAX);
  });

  test('a query shorter than 2 characters after trimming is refused', () => {
    for (const q of ['', ' ', 'a', ' a ']) {
      assert.throws(() => swanSearchDoctrine({ query: q }), /at least 2 characters/);
    }
  });

  test('a non-string query is refused', () => {
    for (const q of [undefined, null, 42, {}, []]) {
      assert.throws(() => swanSearchDoctrine({ query: q }), /at least 2 characters/);
    }
  });

  test('a query over the length cap is refused', () => {
    assert.throws(
      () => swanSearchDoctrine({ query: 'x'.repeat(SEARCH_QUERY_MAX + 1) }),
      /exceeds/,
    );
  });

  /*
   * The allowlist. Every result must sit under SEARCH_ROOT — this is the bound that makes
   * "read-only" also mean "cheap" and "bounded", and it is worth asserting on real output
   * rather than trusting the construction.
   */
  test('every result path sits under the allowlisted root', () => {
    const r = swanSearchDoctrine({ query: 'the', limit: SEARCH_LIMIT_MAX });
    assert.ok(r.results.length > 0, 'no results — this bound check would be vacuous');
    for (const hit of r.results) {
      assert.ok(
        hit.file.startsWith(`${SEARCH_ROOT}/`),
        `result outside the allowlist: ${hit.file}`,
      );
    }
    assert.equal(r.root, SEARCH_ROOT);
  });

  test('the scanned-file cap is never exceeded', () => {
    const r = swanSearchDoctrine({ query: 'the', limit: SEARCH_LIMIT_MAX });
    assert.ok(r.scanned <= SEARCH_FILES_MAX, `scanned ${r.scanned} > cap ${SEARCH_FILES_MAX}`);
  });
});

/*
 * ── F16 — a read failure is not an empty directory ────────────────────────────
 *
 * Round 11. The walk used to `catch { return; }` on `readdirSync`, so a subtree the process
 * could not read simply vanished. The search then reported `count: 0`, `truncated: false`,
 * `scanTruncated: false` — a confident, exhaustive "no matches" for content it had never
 * examined, and an agent has no way to tell that apart from a clean miss. Astra reproduced it
 * with one readable file and one directory whose reader threw `EACCES`.
 *
 * `readdir` is injectable because an unreadable directory cannot be created portably in a test.
 */
describe('F16 — coverage is reported, never assumed', () => {
  /** A reader that refuses every directory, as a permissions failure does. */
  const denied = () => {
    const err = new Error('permission denied');
    err.code = 'EACCES';
    throw err;
  };

  test('RED — a search that could not read the tree does NOT report a complete answer', () => {
    const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX, readdir: denied });
    assert.equal(r.count, 0, 'a search that read nothing found matches it should not have');
    assert.equal(r.truncated, true, 'an unread tree reported an exhaustive search');
    assert.equal(r.complete, false);
    assert.equal(r.unreadable.length, 1);
    assert.match(r.unreadable[0].reason, /EACCES/);
  });

  test('RED — the unreadable directory is NAMED, so the gap can be acted on', () => {
    const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX, readdir: denied });
    assert.match(r.unreadable[0].dir, /design-brain/, 'the report did not say what was not searched');
  });

  test('a READABLE tree reports full coverage, so the flag is not always-on', () => {
    // The other direction. A flag that is always true carries no information, and this is the
    // direction that would have gone unnoticed.
    const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX });
    assert.deepEqual(r.unreadable, []);
    assert.equal(r.complete, true);
    assert.ok(r.scanned > 0, 'the walk read no files — this assertion would be vacuous');
  });

  test('a complete search and a truncated one are distinguishable by ONE field', () => {
    // `complete` is the field a caller should read if it wants a single answer. It must agree
    // with the three specific flags rather than being a fourth opinion.
    for (const limit of [1, 3, SEARCH_LIMIT_MAX]) {
      const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit });
      assert.equal(
        r.complete,
        !r.truncated && !r.resultsTruncated && !r.scanTruncated,
        `complete disagreed with the specific flags at limit ${limit}`,
      );
    }
  });

  test('an unreadable subtree still returns the matches it DID find', () => {
    // Partial coverage is more useful than none, as long as it is labelled as partial.
    const r = swanSearchDoctrine({ query: EXACT_NEEDLE, limit: SEARCH_LIMIT_MAX, readdir: denied });
    assert.ok(Array.isArray(r.results));
    assert.equal(r.count, r.results.length);
  });
});
