/*
 * T-B19/T-B20/T-B21 — the WRITE path (S1 hostile review, pass 1).
 *
 * WHY THIS FILE EXISTS. The S0/S1 suite tested the write routes for their happy
 * path and their input validation, but never for the one property a write client
 * must be able to rely on:
 *
 *   A NON-2XX ANSWER MEANS NOTHING WAS WRITTEN.
 *
 * `PATCH /api/creators/:id` violated it. The handler delegated the write to the
 * engine's `setEnabled` (correct), then re-read the ROSTER through `creatorRows`
 * to shape the response row — and `creatorRows` legitimately refuses 409 on a
 * damaged `state.json`. So a state fault turned a completed registry write into
 * a 409, with the mutation already on disk. Measured 2026-09-19 against a real
 * bridge: 409 STORE_DAMAGED returned, `enabled` and `enabledAt` persisted.
 *
 * The operator's only reading of that 409 is "the toggle did not happen", and
 * every surface they could use to check is also refusing:
 * `/api/creators` 409s on the same fault. The console had no way to tell the
 * truth, which is why this is a P1 rather than a cosmetic error-code bug.
 *
 * Two further defects in the same pass, both from the same habit — a guard that
 * is correct only for the inputs someone happened to imagine:
 *   T-B20  `readBody` returned a literal `null` (valid JSON!), and the write
 *          routes dereferenced `body.ref` on it → 500 INTERNAL for a client
 *          error. `42`, `"x"` and `[1,2]` passed only by luck.
 *   T-B21  the static fallthrough answered 200 + an HTML page for EVERY method
 *          on every non-API path, including POST/PATCH/DELETE — the "silent
 *          fallthrough" the route table's own comment forbids.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { rawRequest, withFixture, CH_ONE, CH_TWO } from './fixtures.mjs';
import { addCreatorRow } from '../lib/creators.mjs';

const CORRUPT = '{ this is not valid json';

const patch = (base, id, body) => rawRequest(base, `/api/creators/${encodeURIComponent(id)}`, {
  method: 'PATCH', body: typeof body === 'string' ? body : JSON.stringify(body),
});
const post = (base, body) => rawRequest(base, '/api/creators', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
});
const registry = (r) => JSON.parse(readFileSync(join(r, 'registry.json'), 'utf8'));
const rawRegistry = (r) => readFileSync(join(r, 'registry.json'), 'utf8');

/* ── T-B19 · a committed write must be REPORTED as committed (S1-H9) ─────── */

test('T-B19a: a PATCH answers 200 and persists even when state.json is damaged', async () => {
  await withFixture('t-b19a', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);
    assert.equal(registry(r).creators[CH_TWO].enabled, false, 'fixture starts disabled');

    const res = await patch(base, CH_TWO, { enabled: true });

    assert.equal(res.status, 200, 'the registry write completed — a 409 here would be a lie');
    assert.equal(res.body.enabled, true);
    assert.equal(registry(r).creators[CH_TWO].enabled, true, 'and the write is really on disk');
    assert.ok(registry(r).creators[CH_TWO].enabledAt, 'setEnabled stamped enabledAt');
  });
});

test('T-B19b: the row\'s counts are ABSENT (null) when state.json is damaged, never 0', async () => {
  await withFixture('t-b19b', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);

    const res = await patch(base, CH_TWO, { enabled: true });

    assert.equal(res.status, 200);
    // The same rule the S1 round applied to `documents` in status.mjs: a count
    // that could not be taken is absent. `0` would render "0 videos" for a
    // creator that has videos — a guard value presented as a measurement.
    assert.equal(res.body.videos, null, 'a count that cannot be taken is absent, not zero');
    assert.equal(res.body.fetched, null);
  });
});

test('T-B19c: repeated toggles while state is damaged each answer 200 and match the disk', async () => {
  await withFixture('t-b19c', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);

    for (const want of [true, false, true]) {
      const res = await patch(base, CH_TWO, { enabled: want });
      assert.equal(res.status, 200, `a toggle to ${want} must report what happened`);
      assert.equal(res.body.enabled, want, 'the response agrees with the request');
      assert.equal(registry(r).creators[CH_TWO].enabled, want, 'and with the disk');
    }
  });
});

test('T-B19d: a 409 that DOES happen is a pre-write refusal — the file is untouched', async () => {
  await withFixture('t-b19d', async ({ r, base }) => {
    writeFileSync(join(r, 'registry.json'), CORRUPT);
    const before = rawRegistry(r);

    const res = await patch(base, CH_TWO, { enabled: true });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'STORE_DAMAGED');
    assert.equal(res.body.error.file, 'registry.json');
    assert.equal(rawRegistry(r), before, 'the whole point: a 409 must mean nothing was written');
  });
});

test('T-B19e: with an intact store the row carries REAL counts, not null', async () => {
  await withFixture('t-b19e', async ({ base }) => {
    const res = await patch(base, CH_ONE, { enabled: false });

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.videos, 'number', 'counts are real when state.json is readable');
    assert.equal(res.body.videos, 2, 'CH_ONE owns VID_1 and VID_2 in the fixture');
    assert.equal(res.body.fetched, 1, 'of which exactly one is fetched');
  });
});

/* ── T-B20 · the body contract is "a JSON object" (S1-H10) ───────────────── */

test('T-B20: a literal `null` body is a 400, not a 500', async () => {
  await withFixture('t-b20', async ({ r, base }) => {
    for (const [label, send] of [
      ['POST', () => post(base, 'null')],
      ['PATCH', () => patch(base, CH_ONE, 'null')],
    ]) {
      const res = await send();
      assert.equal(res.status, 400, `${label} with a null body is a client error, not a server fault`);
      assert.equal(res.body.error.code, 'VALIDATION');
      assert.match(res.body.error.message, /JSON object/);
    }
    assert.equal(registry(r).creators[CH_ONE].enabled, true, 'nothing was written');
  });
});

test('T-B20b: every non-object JSON body is refused the same way', async () => {
  await withFixture('t-b20b', async ({ base }) => {
    for (const raw of ['null', '42', '"str"', 'true', 'false', '[1,2]', '[]']) {
      const res = await post(base, raw);
      assert.equal(res.status, 400, `body ${raw} must be a 400`);
      assert.equal(res.body.error.code, 'VALIDATION');
    }

    // An ABSENT body is still an object (`{}`), so it keeps its own, more
    // specific refusal rather than being folded into the shape check.
    const empty = await rawRequest(base, '/api/creators', { method: 'POST' });
    assert.equal(empty.status, 400);
    assert.match(empty.body.error.message, /creator reference is required/);
  });
});

/* ── T-B21 · no silent fallthrough outside /api either (S1-H11) ─────────── */

test('T-B21: a non-GET method on a static path is a named 404, not a 200 page', async () => {
  await withFixture('t-b21', async ({ base }) => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']) {
      for (const p of ['/', '/registry.json', '/nope']) {
        const res = await rawRequest(base, p, { method });
        assert.equal(res.status, 404, `${method} ${p} must be a named 404`);
        assert.equal(res.body?.error?.code, 'NOT_FOUND');
      }
    }

    // GET and HEAD still serve the page through the same code path.
    assert.equal((await rawRequest(base, '/', { method: 'GET' })).status, 200);
    assert.equal((await rawRequest(base, '/', { method: 'HEAD' })).status, 200);
  });
});

/* ── A1-12 · re-add must not disturb consent, and counts must be measured ── */

/*
 * WHY THESE CALL `addCreatorRow` DIRECTLY. `addCreator` resolves a ref to a
 * channel id by running yt-dlp, so the route-level POST test above can only
 * assert `[201, 422].includes(status)` — it passes whether the returned row is
 * right or wrong, and the console's add path had no row-level coverage at all.
 * A1-12's correction ("test re-add of an enabled creator with fetched videos")
 * was therefore unwritable until `addCreatorRow` accepted the engine's own
 * `deps` seam. These tests use that seam; the HTTP path is unchanged.
 */

const stubResolver = (channelId, title) => () => ({ channelId, title, url: '' });

test('A1-12a: re-adding an ENABLED creator keeps it enabled', async () => {
  await withFixture('a1-12a', async ({ r }) => {
    // CH_ONE is `enabled: true` in the fixture registry.
    const row = await addCreatorRow(CH_ONE, { r, deps: { resolveCreator: stubResolver(CH_ONE, 'Fixture One') } });
    assert.equal(row.enabled, true,
      'upsertCreator preserves consent by design — the docstring used to claim otherwise');
  });
});

test('A1-12b: re-adding a creator that HAS videos reports the measured counts', async () => {
  await withFixture('a1-12b', async ({ r }) => {
    // CH_ONE has two videos, one of them fetched. The old code hardcoded 0/0,
    // so re-adding answered "0 videos" for a creator that plainly has some.
    const row = await addCreatorRow(CH_ONE, { r, deps: { resolveCreator: stubResolver(CH_ONE, 'Fixture One') } });
    assert.equal(row.videos, 2, 'a count that can be taken must be the real one');
    assert.equal(row.fetched, 1);
  });
});

test('A1-12c: a NEW creator arrives DISABLED, with a measured zero', async () => {
  await withFixture('a1-12c', async ({ r }) => {
    const fresh = `UC${'n'.repeat(22)}`;
    const row = await addCreatorRow(fresh, { r, deps: { resolveCreator: stubResolver(fresh, 'Fresh') } });
    assert.equal(row.enabled, false, 'enabling stays a separate, deliberate act');
    // Zero here is MEASURED — the creator has no state rows — which is exactly
    // why it must not be hardcoded: the same literal is a lie one line earlier.
    assert.equal(row.videos, 0);
    assert.equal(row.fetched, 0);
  });
});

test('A1-12d: a count that cannot be taken is null, and the write still stands', async () => {
  await withFixture('a1-12d', async ({ r }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);
    const row = await addCreatorRow(CH_ONE, { r, deps: { resolveCreator: stubResolver(CH_ONE, 'Fixture One') } });
    assert.equal(row.videos, null, 'absent, not zero');
    assert.equal(row.fetched, null);
    assert.equal(registry(r).creators[CH_ONE].enabled, true, 'the registry write committed regardless');
  });
});
