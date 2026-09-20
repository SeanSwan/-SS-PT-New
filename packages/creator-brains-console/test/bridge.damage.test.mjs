/*
 * T-B17 — damage handling per route (S1 hostile review, finding S1-H1).
 *
 * WHY THIS FILE EXISTS. `T-B2` corrupted only `registry.json`. Nobody ever
 * corrupted `state.json`, so a real defect survived S0's three hostile rounds and
 * all 81 tests: `lib/status.mjs` called `stateOrDefault()` unguarded, and that
 * function THROWS on a corrupt file by design (`defaultValue` refuses to
 * substitute a default for damage). A damaged `state.json` therefore 500'd the
 * ENTIRE status instrument — the operator got a stack trace instead of the
 * `state.damaged` refusal the code was written to emit.
 *
 * The rule this file pins (recorded in 05 §2a):
 *   - a COMPOSITE instrument route keeps answering 200 and reports damage as a
 *     FIELD (`/api/status`), because most of its payload is still knowable;
 *   - a route whose WHOLE payload derives from the damaged file REFUSES with
 *     409 STORE_DAMAGED (`/api/creators`, `/api/backlog`), because an empty
 *     array or `lines: []` is indistinguishable from "genuinely empty" (R3).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getJson, getRaw, withFixture } from './fixtures.mjs';

const CORRUPT = '{ this is not valid json';

/* ── damaged state.json ──────────────────────────────────────────────────── */

test('T-B17a: a corrupt state.json does NOT 500 GET /api/status', async () => {
  await withFixture('t-b17a', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);

    const { status, body } = await getJson(base, '/api/status');
    assert.equal(status, 200, 'a damaged state must be reported as a field, not a server fault');
    assert.equal(body.state.damaged?.file, 'state.json');
    assert.ok(body.state.damaged.detail.length > 0, 'the refusal carries the engine reason verbatim');
    assert.equal(body.state.videos, null, 'no fabricated coverage when state is unreadable');
    assert.equal(body.error, undefined, 'a 200 must not carry an error envelope');
  });
});

test('T-B17b: the rest of the instrument still renders when state.json is damaged', async () => {
  await withFixture('t-b17b', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);

    const { status, body } = await getJson(base, '/api/status');
    assert.equal(status, 200);
    // registry.json is intact, so the roster reading must survive the state fault
    assert.equal(body.creators.damaged, null, 'creators are unaffected by a state fault');
    assert.ok(body.creators.total > 0, 'the roster is still real data');
    assert.ok(body.ytdlp && typeof body.ytdlp.ok === 'boolean', 'health still reports');
    assert.ok(Array.isArray(body.recentRuns), 'recentRuns still reports');
  });
});

test('T-B17c: a corrupt state.json makes GET /api/backlog REFUSE, not return empty lines', async () => {
  await withFixture('t-b17c', async ({ r, base }) => {
    writeFileSync(join(r, 'state.json'), CORRUPT);

    const { status, body } = await getJson(base, '/api/backlog');
    assert.equal(status, 409, 'the whole backlog payload derives from state.json');
    assert.equal(body.error.code, 'STORE_DAMAGED');
    assert.equal(body.error.file, 'state.json');
    assert.equal(body.lines, undefined, 'an empty lines array would read as "no backlog"');
  });
});

/* ── damaged registry.json ───────────────────────────────────────────────── */

test('T-B17d: a corrupt registry.json keeps status at 200 and names the file (H6b)', async () => {
  await withFixture('t-b17d', async ({ r, base }) => {
    writeFileSync(join(r, 'registry.json'), CORRUPT);

    const { status, body } = await getJson(base, '/api/status');
    assert.equal(status, 200, 'status reports registry damage as a field (H6b)');
    assert.equal(body.creators.damaged?.file, 'registry.json');
    // The trap recorded in 05 §2a: the same payload still carries zeros.
    assert.equal(body.creators.total, 0);
    assert.equal(body.creators.enabled, 0);
  });
});

test('T-B17e: a corrupt registry.json does NOT affect GET /api/backlog', async () => {
  await withFixture('t-b17e', async ({ r, base }) => {
    writeFileSync(join(r, 'registry.json'), CORRUPT);

    const { status, body } = await getJson(base, '/api/backlog');
    assert.equal(status, 200, 'backlog derives from state.json, which is intact');
    assert.ok(Array.isArray(body.lines), 'real backlog lines still available');
  });
});

test('T-B17f: no damage mode ever leaks a stack trace or an internal error name', async () => {
  // Precise shapes, NOT bare substrings. A first draft searched for "at " and
  // matched the engine's own legitimate prose — the corrupt-JSON reason reads
  // "...in JSON at position 2 (line 1 column 3)". That is a false positive on
  // correct output, so the needles are anchored to the shape of a real leak.
  const LEAKS = [
    [/\bat\s+[\w$.<>]+\s*\(/, 'a stack frame ("at fn (")'],
    [/\.(?:mjs|js|ts):\d+/, 'a source path with a line number'],
    [/node_modules/, 'a node_modules path'],
    [/\bTypeError\b|\bReferenceError\b/, 'a raw JS error name'],
  ];

  for (const file of ['state.json', 'registry.json']) {
    await withFixture(`t-b17f-${file}`, async ({ r, base }) => {
      writeFileSync(join(r, file), CORRUPT);
      for (const route of ['/api/status', '/api/backlog', '/api/creators']) {
        // Raw text, not the parsed body — a non-JSON leak would be invisible otherwise.
        const { text } = await getRaw(base, route);
        for (const [pattern, label] of LEAKS) {
          assert.ok(
            !pattern.test(text),
            `${route} with a corrupt ${file} leaked ${label}: ${text.slice(0, 160)}`,
          );
        }
      }
    });
  }
});
