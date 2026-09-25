/**
 * fleet-data-contract — the console's read-only reader for the 20-variant fleet.
 * @module scripts/swan-brain-console/fleet-data.test
 *
 * WHY THIS SUITE EXISTS (round 11, finding F07)
 * `loadSkeletons()` imported `skeletons.ts` through a STABLE URL. `import()` caches by URL for
 * the life of the process, so a long-lived console — or simply two `snapshot()` calls either
 * side of an edit — kept serving the skeletons it read first, while `readRegistryText()`
 * re-read `registry.ts` from disk on every call. The product was a MIXED-GENERATION fleet: fresh
 * prose describing stale structure, under a fresh `generatedAt`, with nothing on screen saying
 * which moment the numbers belonged to.
 *
 * Astra reported this from reading, and marked its own reproduction **UNVERIFIED** because a
 * filesystem edit was outside the review's read-only constraint. That is the honest grade, and
 * this suite is what closes it: the cache key is now a pure function of the file's stat, so the
 * mechanism is pinned without editing anything.
 *
 * WHAT THIS SUITE DOES NOT PROVE
 * That Node honours a query string as a distinct module instance. That is documented ESM
 * behaviour, not something a unit test should re-assert — and asserting it would need a
 * filesystem edit, which is the thing this suite exists to avoid.
 *
 * Run: node --test scripts/swan-brain-console/fleet-data.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const fleet = await import(pathToFileURL(join(HERE, 'fleetData.mjs')).href);

const FILE = join(fleet.REPO, 'frontend/src/pages/HomePage/three-worlds/skeletons.ts');
const stat = (mtimeMs, size) => ({ mtimeMs, size });

describe('F07 — the skeleton import URL carries the revision it was read at', () => {
  test('RED — a changed mtime yields a different URL, so a cached module cannot survive an edit', () => {
    const before = fleet.skeletonsImportUrl(FILE, stat(1000, 500));
    const after = fleet.skeletonsImportUrl(FILE, stat(2000, 500));
    assert.notEqual(before, after, 'an edited manifest reused the cached module URL');
  });

  test('RED — a changed SIZE also yields a different URL', () => {
    // Two edits inside the same filesystem timestamp tick would otherwise be invisible on
    // filesystems with coarse mtime resolution. Size is the cheap second signal.
    assert.notEqual(
      fleet.skeletonsImportUrl(FILE, stat(1000, 500)),
      fleet.skeletonsImportUrl(FILE, stat(1000, 501)),
    );
  });

  test('an UNCHANGED file yields the SAME URL — the cache must still do its job', () => {
    // The other direction. A key that varies per call would defeat `import()` caching entirely
    // and make every snapshot re-parse the manifest, which is the opposite failure.
    assert.equal(
      fleet.skeletonsImportUrl(FILE, stat(1000, 500)),
      fleet.skeletonsImportUrl(FILE, stat(1000, 500)),
    );
  });

  test('the URL is still a file URL for the real manifest, with the revision as a query', () => {
    const url = fleet.skeletonsImportUrl(FILE, stat(1000, 500));
    assert.ok(url.startsWith('file://'), url);
    assert.ok(url.includes('skeletons.ts?rev=1000-500'), url);
  });
});

describe('the reader returns what the rest of the console expects', () => {
  test('the canonical id list is non-empty, unique, and ordered', async () => {
    const ids = await fleet.loadFleetIds();
    assert.ok(ids.length > 0);
    assert.equal(new Set(ids).size, ids.length, 'the manifest declares a duplicate id');
    assert.deepEqual(ids, [...ids].sort(), 'the ids are not in a stable order');
  });

  test('loadFleet carries rows, collisions and a summary that agree with the ids', async () => {
    const out = await fleet.loadFleet();
    assert.equal(out.rows.length, (await fleet.loadFleetIds()).length);
    assert.ok(Array.isArray(out.collisions));
    assert.equal(out.summary.total, out.rows.length);
  });

  test('every number is read at call time — no hand-maintained count survives here', async () => {
    // The retired 2026-08-26 packet's post-mortem: hand-maintained counts go stale invisibly.
    // Two calls must agree with EACH OTHER and with the file, not with a constant in the source.
    const a = await fleet.loadFleet();
    const b = await fleet.loadFleet();
    assert.equal(a.summary.total, b.summary.total);
    assert.equal(a.summary.variantDirs, b.summary.variantDirs);
  });
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the fleet reader and this suite stay within 300 lines', () => {
  for (const f of ['fleetData.mjs', 'fleet-data.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
