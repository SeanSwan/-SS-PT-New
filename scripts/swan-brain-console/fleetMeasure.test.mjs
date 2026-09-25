/**
 * fleetMeasure.test — the browser half, EXECUTED through injected boundaries.
 * @module scripts/swan-brain-console/fleetMeasure.test
 *
 * WHY THIS FILE EXISTS (Astra round 15, K05)
 * Round 15's Rule 4 split moved `measureFleet` out of `shot-diff.mjs` and moved its guards with
 * it — but the guards it moved were SOURCE-TEXT assertions. Astra executed three mutations that
 * delete the behaviour while leaving every marker those assertions looked for exactly where they
 * were, and every callback stayed green:
 *
 *     | mutation                                                    | consequence                    |
 *     | writeFileSync(file, shot) added after staged.push(...)        | mixed generation on failure    |
 *     | the refusal throw replaced by `void plan.refusal`             | a subset update writes anyway  |
 *     | results.push(...plan.rows) replaced by `void plan.rows`       | the failure row disappears     |
 *
 * Her verdict was precise: "the current split retained the runtime guards; the defect is the
 * claimed protection against losing them." A guard that reads a file cannot tell a rule from a
 * comment, so this suite drives `measureFleet` through the `deps` seam it now exposes — a fake
 * browser and a fake filesystem — and asserts what HAPPENED rather than what the source says.
 *
 * WHAT IS ASSERTED, AND WHY EACH ONE IS LOAD-BEARING
 *   - REFUSALS: a refused run writes nothing at all (the `void plan.refusal` mutation).
 *   - RECORDED FAILURES: a failing comparison and a population mismatch both reach the results
 *     (the `void plan.rows` mutation, and the general "swallow the failure" class).
 *   - FORBIDDEN WRITES: a compare run never writes a baseline (the `writeFileSync` mutation).
 *   - GENERATION VALIDITY (K04): a write failure mid-publish leaves the marker and a partial
 *     generation, and a later compare REFUSES rather than comparing against it.
 *
 * The real browser and the real `node:fs` are never used here, so this runs anywhere. What that
 * does NOT prove is that Playwright behaves as doubled — that boundary is `shot-diff.mjs`'s live
 * path and is UNVERIFIED here, named rather than implied.
 *
 * Run: node --test scripts/swan-brain-console/fleetMeasure.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { measureFleet, INCOMPLETE_GENERATION } from './fleetMeasure.mjs';
import { HARNESS_TITLE } from './harnessIdentity.mjs';

const BASE = 'BASE';
const MARKER = join(BASE, INCOMPLETE_GENERATION);
const OPTS = { url: 'http://127.0.0.1:5199/qa-worlds.html', maxDiffPixelRatio: 0.002 };

/**
 * A browser double. It answers the identity check with the real harness marker, reports the ids
 * it was told to, and can fail one variant's screenshot.
 */
function fakeBrowser({ ids, failShotOn = null }) {
  const page = {
    goto: async () => {},
    title: async () => 'Three.js fleet QA harness',
    content: async () => `<html><head>${HARNESS_TITLE}</head></html>`,
    waitForSelector: async () => {},
    evaluate: async () => ids,
    locator: (selector) => ({
      screenshot: async () => {
        const id = selector.match(/data-world="([^"]+)"/)?.[1];
        if (id === failShotOn) throw new Error(`screenshot failed for ${id}`);
        return Buffer.from(`PNG-BYTES-${id}`);
      },
    }),
  };
  return { newPage: async () => page, close: async () => {} };
}

/**
 * A filesystem double that RECORDS every call, so a test can assert a write did not happen as
 * easily as one that did. `failWriteOn` makes a chosen path throw, which is K04's mid-publish
 * failure.
 */
function fakeIo({ files = {}, failWriteOn = null } = {}) {
  const writes = [];
  const removed = [];
  const store = new Map(Object.entries(files));
  return {
    writes,
    removed,
    store,
    io: {
      existsSync: (p) => store.has(p),
      readFileSync: (p) => {
        if (!store.has(p)) throw new Error(`ENOENT: ${p}`);
        return store.get(p);
      },
      writeFileSync: (p, data) => {
        if (failWriteOn && p.endsWith(failWriteOn)) throw new Error(`ENOSPC: no space left on ${p}`);
        writes.push(p);
        store.set(p, data);
      },
      mkdirSync: () => {},
      unlinkSync: (p) => { removed.push(p); store.delete(p); },
    },
  };
}

const deps = (browser, io, measure = async () => ({ ok: true, ratio: 0 })) => ({
  launch: async () => browser, io, measure,
});

/* ── refusals ─────────────────────────────────────────────────────────────── */

test('RED — a refused run writes NOTHING (the `void plan.refusal` mutation)', async () => {
  /*
   * `planPopulation` refuses an `--update` whose population is not the fleet, because a partial
   * baseline set is a wrong reference. Astra's mutation deleted the throw and left the decision
   * unused; a source-text guard could not see it. This asserts the CONSEQUENCE: no baseline, no
   * marker, no directory.
   *
   * MUTATION: `if (plan.refusal) void plan.refusal;` — RED.
   */
  const { io, writes } = fakeIo();
  await assert.rejects(
    measureFleet({
      opts: { ...OPTS, update: true },
      baselineDir: BASE,
      expectedIds: ['alpha', 'beta'],
      deps: deps(fakeBrowser({ ids: ['alpha'] }), io),
    }),
    /refusing to record baselines/,
    'a subset update was not refused',
  );
  assert.deepEqual(writes, [], 'a refused run wrote a baseline or a marker');
});

/* ── recorded failures ────────────────────────────────────────────────────── */

test('RED — a failing comparison is RECORDED, not swallowed', async () => {
  /*
   * MUTATION: drop the per-variant `results.push({ id, ...verdict })`. RED.
   */
  const file = join(BASE, 'alpha.png');
  const { io } = fakeIo({ files: { [file]: Buffer.from('OLD-BASELINE') } });
  const out = await measureFleet({
    opts: { ...OPTS, update: false },
    baselineDir: BASE,
    expectedIds: ['alpha'],
    deps: deps(fakeBrowser({ ids: ['alpha'] }), io, async () => ({ ok: true, ratio: 0.9 })),
  });
  const row = out.results.find((r) => r.id === 'alpha');
  assert.ok(row, 'the measured variant produced no row at all');
  assert.equal(row.status, 'fail', `a 0.9 diff ratio was recorded as ${row.status}`);
});

test('RED — a population mismatch contributes its failure row (the `void plan.rows` mutation)', async () => {
  /*
   * The synthetic `fleet-population` row is what makes a subset run FAIL rather than pass, and it
   * is the row Astra's third mutation removed. MUTATION: `void plan.rows;` — RED.
   */
  const { io } = fakeIo();
  const out = await measureFleet({
    opts: { ...OPTS, update: false },
    baselineDir: BASE,
    expectedIds: ['alpha', 'beta'],
    deps: deps(fakeBrowser({ ids: ['alpha'] }), io),
  });
  const row = out.results.find((r) => r.id === 'fleet-population');
  assert.ok(row, 'the population mismatch contributed no row');
  assert.equal(row.status, 'fail', `the population row was recorded as ${row.status}`);
  assert.equal(out.population.ok, false, 'the population was reported as covered');
});

/* ── forbidden writes ─────────────────────────────────────────────────────── */

test('RED — a compare run NEVER writes a baseline', async () => {
  /*
   * The `writeFileSync(file, shot)` mutation Astra added after `staged.push(...)` writes in BOTH
   * modes. This asserts the compare half writes nothing at all — a compare run has no authority
   * over the reference set.
   *
   * MUTATION: hoist the write out of the `if (opts.update)` branch. RED.
   */
  const { io, writes } = fakeIo();
  const out = await measureFleet({
    opts: { ...OPTS, update: false },
    baselineDir: BASE,
    expectedIds: ['alpha'],
    deps: deps(fakeBrowser({ ids: ['alpha'] }), io),
  });
  assert.deepEqual(writes, [], 'a compare run wrote to the baseline directory');
  assert.equal(out.results[0].status, 'no_baseline', 'a missing baseline was not reported as such');
});

/* ── generation validity (Astra K04) ──────────────────────────────────────── */

test('RED — a write failure mid-publish leaves the marker and a partial generation (K04)', async () => {
  /*
   * Astra's residual: two screenshots succeed, the second baseline write throws, and the set is
   * left alpha = new, beta = old with nothing recording it. Staging alone could not close this,
   * because a loop that dies still leaves the mixture. The marker is the repair: it is written
   * before the first byte and removed only after the last.
   *
   * MUTATION: move the marker write after the publish loop, or remove it inside the loop. RED.
   */
  const { io, writes, removed } = fakeIo({ failWriteOn: 'beta.png' });
  await assert.rejects(
    measureFleet({
      opts: { ...OPTS, update: true },
      baselineDir: BASE,
      expectedIds: ['alpha', 'beta'],
      deps: deps(fakeBrowser({ ids: ['alpha', 'beta'] }), io),
    }),
    /ENOSPC/,
    'the failed baseline write was swallowed',
  );
  assert.ok(writes.includes(join(BASE, 'alpha.png')), 'alpha was not published before the failure');
  assert.ok(!writes.includes(join(BASE, 'beta.png')), 'beta was published despite throwing');
  assert.ok(io.existsSync(MARKER),
    'the incomplete-generation marker is NOT on disk — the mixture is silent');
  assert.ok(!removed.includes(MARKER), 'the marker was cleared despite the generation being partial');
});

test('RED — a compare run REFUSES while the incomplete-generation marker exists (K04)', async () => {
  /*
   * The half that makes the marker worth writing: a mixture must not be compared against. Asserted
   * on the consequence — `measure` is never called — so a guard that only mentions the marker in a
   * message cannot pass this.
   *
   * MUTATION: delete the marker check. RED.
   */
  const { io } = fakeIo({ files: { [MARKER]: '{"marker":"incomplete-generation"}' } });
  let comparisons = 0;
  await assert.rejects(
    measureFleet({
      opts: { ...OPTS, update: false },
      baselineDir: BASE,
      expectedIds: ['alpha'],
      deps: deps(fakeBrowser({ ids: ['alpha'] }), io, async () => {
        comparisons += 1;
        return { ok: true, ratio: 0 };
      }),
    }),
    /INCOMPLETE GENERATION/,
    'a compare run proceeded against a mixed generation',
  );
  assert.equal(comparisons, 0, 'a pixel comparison ran against a mixed generation');
});

test('a COMPLETE update clears the marker (control for K04)', async () => {
  /*
   * The repair path, asserted so the marker cannot become a permanent block. An `--update` that
   * finishes must leave the directory clean, or the next compare refuses forever and the fix has
   * traded one silent failure for one loud deadlock.
   *
   * MUTATION: never unlink the marker. RED.
   */
  const { io, removed, writes } = fakeIo();
  await measureFleet({
    opts: { ...OPTS, update: true },
    baselineDir: BASE,
    expectedIds: ['alpha'],
    deps: deps(fakeBrowser({ ids: ['alpha'] }), io),
  });
  assert.ok(writes.includes(join(BASE, 'alpha.png')), 'the baseline was not published');
  assert.ok(removed.includes(MARKER), 'a complete update left the incomplete-generation marker behind');
  assert.ok(!io.existsSync(MARKER), 'the marker survived a complete update');
});
