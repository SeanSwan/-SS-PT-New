/**
 * lane-discovery.contract.test.mjs — S2 acceptance (16 named cases)
 * =================================================================
 * Blueprint: docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coordination-discovery-2026-09-20
 * Slice: S2 — complete discovery. Acceptance command:
 *   node --test scripts/lane-discovery.contract.test.mjs
 *
 * WHAT THIS SUITE REFUSES TO DO
 *   The S2 checkpoint says: "normalized-object mocks or canned JSON do not
 *   satisfy this checkpoint." So every case builds a REAL temporary git checkout
 *   with a REAL `.ai-workflow/coordination` ledger, and calls `buildDiscovery`
 *   with the REAL `parseLane` and the REAL `identity()` resolver. Nothing here
 *   feeds the module a hand-authored `Discovery` object.
 *
 *   Two boundaries ARE mocked, and both are labelled at the point of use:
 *     - `LANE_PARSE_FAILED` — `parseLane` is total, so no real lane file can make
 *       it throw. A requirement that cannot be exercised cannot be shown to hold.
 *     - `IDENTITY_UNRESOLVED` — the real resolver falls back to `vs-claude` and
 *       the cwd, so it cannot be made to fail on demand.
 *   The other two failure classes are induced for real, with no mock at all: a
 *   DIRECTORY named `*.lane.md` makes `readFileSync` throw EISDIR, and a missing
 *   ledger directory makes `readdirSync` throw ENOENT. Both measured on Windows
 *   before being relied on here.
 *
 * ISOLATION
 *   Fixtures live under the OS temp root, contain a space in the path, and are
 *   removed only after the target is proven to be a directory this helper created
 *   inside that temp root. No fixture touches the live ledger, git history, a
 *   database, or the network. The live ledger is never read: its path is not
 *   referenced anywhere in this file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import {
  buildDiscovery, classifyLock, freshnessOf, mapStatus, STALE_AFTER_MINUTES,
} from './lib/lane-discovery.mjs';
import { identity, lockMatches } from './lib/lane-core.mjs';

const AGENT = 'test-agent';
const FIXTURE_PREFIX = 'lane-disc-';

/* ── Fixture ────────────────────────────────────────────────────────────────── */

/** A real git checkout named with a space, a real ledger directory inside it. */
function makeFixture() {
  const base = mkdtempSync(join(tmpdir(), FIXTURE_PREFIX));
  const root = join(base, 'fixture repo');
  mkdirSync(root, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });
  const ledger = join(root, '.ai-workflow', 'coordination');
  mkdirSync(ledger, { recursive: true });
  return { base, root, ledger };
}

/** Refuse to delete anything that is not a directory this helper created inside
 *  the OS temp root. A cleanup bug must fail loudly, never `rm -rf` a real tree. */
function assertOwnedTempDir(base) {
  const b = resolve(base);
  const t = resolve(tmpdir());
  if (!b.startsWith(t) || !b.includes(FIXTURE_PREFIX)) {
    throw new Error(`refusing to clean up a directory this fixture did not create: ${b}`);
  }
}

/* The real identity resolver reads these at call time. Pin them so the resolved
 * self lane is deterministic, and restore them afterwards. */
const ENV_KEYS = ['SWAN_AGENT_SURFACE', 'CLAUDE_AGENT', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID'];

function withFixture(fn) {
  const f = makeFixture();
  const saved = new Map(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.SWAN_AGENT_SURFACE = AGENT;
  for (const k of ENV_KEYS.slice(1)) delete process.env[k];
  try {
    return fn(f);
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    assertOwnedTempDir(f.base);
    rmSync(f.base, { recursive: true, force: true });
  }
}

/** A lane file the real parser will actually parse: a `Task:`, a `Status:`, an
 *  optional `Updated:`, and an `EDITING NOW` section. The heading is required —
 *  `parseLane` anchors the lock section on it.
 *
 *  `boldFields` writes `**Status:**` / `**Updated:**`, which is how 8 of the 87
 *  live lanes actually write them. */
function laneBody({ task = 'lane-discovery fixture', status = 'in-progress', updated = null, locks = [], boldFields = false } = {}) {
  const B = boldFields ? '**' : '';
  const lines = ['# Fixture lane', '', `Task: ${task}`, `${B}Status:${B} ${status}`];
  if (updated !== null) lines.push(`${B}Updated:${B} ${updated}`);
  lines.push('', '## EDITING NOW', '');
  for (const l of locks) lines.push(`- ${l}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const writeLane = (ledger, name, body) => writeFileSync(join(ledger, name), body, 'utf8');
const discover = (f, opts = {}) => buildDiscovery({ ledger: f.ledger, cwd: f.root, ...opts });
const byLabel = (discovery) => new Map(discovery.lanes.map((l) => [l.agentLabel, l]));

/* ── The 16 cases ───────────────────────────────────────────────────────────── */

test('includes static and session lanes', () => {
  withFixture((f) => {
    writeLane(f.ledger, 'claude.lane.md', laneBody({ locks: ['backend/a.ts'] }));
    writeLane(f.ledger, 'codex--main-s1a2b3c4d.lane.md', laneBody({ locks: ['backend/b.ts'] }));
    // A name matching no known pattern at all: enumeration must not be a fixed list.
    writeLane(f.ledger, 'fable-42.lane.md', laneBody({ locks: [] }));

    const { discovery } = discover(f);
    assert.deepEqual(
      discovery.lanes.map((l) => l.agentLabel).sort(),
      ['claude', 'codex--main-s1a2b3c4d', 'fable-42'],
    );
    assert.equal(discovery.enumeration.entries, 3);
    assert.equal(discovery.enumeration.records, 3);
    // The fixture is clean, so a complete response must be reachable — otherwise
    // every "incomplete" assertion below could be passing for the wrong reason.
    assert.equal(discovery.complete, true);
  });
});

test('includes the sixth and later lock', () => {
  withFixture((f) => {
    // Nine locks: past `digest`'s per-seat cap of 5 AND past its live-lane cap of 6.
    const locks = Array.from({ length: 9 }, (_, i) => `backend/file-${i + 1}.ts`);
    writeLane(f.ledger, 'holder.lane.md', laneBody({ locks }));

    const { discovery } = discover(f);
    const rec = discovery.lanes[0];
    assert.equal(rec.locks.length, 9);
    assert.deepEqual(rec.locks, locks, 'order and content of every claim must survive');
    assert.ok(rec.locks.includes('backend/file-6.ts'), 'the sixth lock must be present');
    assert.ok(rec.locks.includes('backend/file-9.ts'), 'the ninth lock must be present');
    for (const l of rec.locks) {
      assert.ok(!/…|\.\.\.|\+\d+\s*more/.test(l), `a lock must never be a truncation marker: ${l}`);
    }
    // And nowhere in the response, not merely in the lock list.
    assert.ok(!/\+[0-9]+ more/.test(JSON.stringify(discovery)));
  });
});

test('includes every stale lane and lock', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  withFixture((f) => {
    const updated = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    for (let i = 1; i <= 7; i += 1) {
      writeLane(f.ledger, `stale-${i}.lane.md`, laneBody({
        updated, locks: [`backend/s${i}-a.ts`, `backend/s${i}-b.ts`],
      }));
    }

    const { discovery } = discover(f, { now });
    assert.equal(discovery.lanes.length, 7, 'seven stale lanes: past the cap of 6');
    for (const l of discovery.lanes) {
      assert.equal(l.freshness, 'stale');
      assert.equal(l.locks.length, 2);
    }
    assert.equal(discovery.lanes.reduce((n, l) => n + l.locks.length, 0), 14);
  });
});

test('includes in-progress lanes with empty locks', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  withFixture((f) => {
    writeLane(f.ledger, 'working.lane.md', laneBody({ status: 'in-progress', locks: [] }));
    // A status outside the contract enum. Measured in the live ledger: real lanes
    // carry `handoff-ready` and `awaiting-sean`.
    writeLane(f.ledger, 'unknown-status.lane.md', laneBody({ status: 'handoff-ready', locks: ['backend/held.ts'] }));
    /* Bold-wrapped fields — `**Status:**` / `**Updated:**`. Measured: 8 of the 87
     * live lanes write them this way, including `claude.lane.md` and
     * `codex.lane.md`. A bare `^Status:` regex cannot see any of them and
     * reported them as `null` / `unknown` while saying nothing about why. */
    writeLane(f.ledger, 'bold-fields.lane.md', laneBody({
      boldFields: true, status: 'in-progress', updated: '2026-09-20T23:59:00Z', locks: ['backend/bold.ts'],
    }));

    const { discovery } = discover(f, { now });
    const by = byLabel(discovery);
    assert.equal(discovery.lanes.length, 3, 'coverage is not limited to lock holders');
    assert.deepEqual(by.get('working').locks, []);
    assert.equal(by.get('working').status, 'in-progress');
    // An unrecognised status is neither guessed nor dropped — and never idle.
    assert.equal(by.get('unknown-status').status, null);
    assert.deepEqual(by.get('unknown-status').locks, ['backend/held.ts']);
    // A bold-wrapped field is read, not silently treated as absent.
    assert.equal(by.get('bold-fields').status, 'in-progress');
    assert.equal(by.get('bold-fields').updatedAt, '2026-09-20T23:59:00Z');
    assert.equal(by.get('bold-fields').freshness, 'fresh');
    assert.deepEqual(by.get('bold-fields').errors, []);

    assert.equal(mapStatus('handoff-ready'), null);
    assert.equal(mapStatus('awaiting-sean'), null);
    assert.equal(mapStatus('idle — round-4 repairs'), 'idle');
    assert.equal(mapStatus('in-progress  (header refreshed)'), 'in-progress');
  });
});

test('preserves duplicate display labels as distinct records', () => {
  withFixture((f) => {
    /* A literal `agentLabel` collision is not constructible: the label is the
     * filename minus `.lane.md`, and one directory cannot hold two entries with
     * the same name. So the case is tested as the property it protects — records
     * are keyed by ABSOLUTE PATH, and identical display fields must neither merge
     * nor drop either record. The bodies are byte-identical on purpose: a copied
     * lane is the realistic shape. */
    const body = laneBody({ task: 'duplicated lane body', locks: ['backend/shared.ts'] });
    writeLane(f.ledger, 'copy-a.lane.md', body);
    writeLane(f.ledger, 'copy-b.lane.md', body);

    const { discovery } = discover(f);
    assert.equal(discovery.lanes.length, 2);
    assert.equal(discovery.enumeration.records, 2);
    assert.equal(new Set(discovery.lanes.map((l) => l.laneFile)).size, 2, 'path is the identity key');
    assert.deepEqual(discovery.lanes.map((l) => l.task), ['duplicated lane body', 'duplicated lane body']);
    assert.deepEqual(discovery.lanes.map((l) => l.locks), [['backend/shared.ts'], ['backend/shared.ts']]);
    // The label is display-only — and it is the one field that does differ.
    assert.deepEqual(discovery.lanes.map((l) => l.agentLabel), ['copy-a', 'copy-b']);
  });
});

test('returns exact resolved self lane path', () => {
  withFixture((f) => {
    const { discovery } = discover(f);
    const expected = resolve(f.ledger, `${AGENT}--main.lane.md`);

    assert.equal(discovery.self.laneFile, expected);
    assert.equal(discovery.self.identity, `${AGENT}@main`);
    assert.ok(isAbsolute(discovery.self.laneFile), 'the self path must be absolute');

    /* Cross-checked against an independent call to the SAME resolver the rest of
     * the CLI uses, and against a hand-computed name — not against text scraped
     * out of a digest. */
    const me = identity(f.root);
    assert.equal(me.laneName, `${AGENT}--main.lane.md`);
    assert.equal(discovery.self.laneFile, resolve(f.ledger, me.laneName));
  });
});

test('allows resolved self before first claim file exists', () => {
  withFixture((f) => {
    // A fresh session: the ledger exists, this session's lane file does not.
    const { discovery, exitCode } = discover(f);

    assert.notEqual(discovery.self.laneFile, null, 'a fresh session still has a resolvable own path');
    assert.equal(existsSync(discovery.self.laneFile), false, 'the file must not exist yet');
    assert.deepEqual(discovery.errors, [], 'an unclaimed-but-resolved self is NOT an error');
    assert.equal(discovery.lanes.length, 0);
    assert.equal(discovery.complete, true);
    assert.equal(exitCode, 0);
  });
});

test('unresolved identity makes response incomplete', () => {
  withFixture((f) => {
    writeLane(f.ledger, 'peer.lane.md', laneBody({ locks: ['backend/peer.ts'] }));

    /* MOCKED BOUNDARY: the real resolver is effectively total — it falls back to
     * `vs-claude` and the cwd — so it cannot be made to fail on demand. This stub
     * stands in for a session whose ownership is genuinely unknown. */
    const { discovery, exitCode } = discover(f, { resolveIdentity: () => null });

    assert.equal(discovery.self.laneFile, null);
    assert.equal(discovery.self.identity, null);
    assert.ok(discovery.errors.some((e) => e.code === 'IDENTITY_UNRESOLVED'));
    assert.equal(discovery.complete, false, 'unknown ownership cannot produce clearance');
    assert.equal(exitCode, 2);
    // The peer's record is still returned: unknown ownership must not blank the
    // inventory, or the failure would hide exactly the thing it is warning about.
    assert.equal(discovery.lanes.length, 1);
    assert.deepEqual(discovery.lanes[0].locks, ['backend/peer.ts']);
  });
});

test('thirty-minute boundary is consistent', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  withFixture((f) => {
    writeLane(f.ledger, 'exactly-thirty.lane.md', laneBody({ updated: '2026-09-20T23:30:00Z' }));
    writeLane(f.ledger, 'just-past-thirty.lane.md', laneBody({ updated: '2026-09-20T23:29:59Z' }));
    writeLane(f.ledger, 'well-inside.lane.md', laneBody({ updated: '2026-09-20T23:59:00Z' }));

    const { discovery } = discover(f, { now });
    const by = byLabel(discovery);
    assert.equal(by.get('exactly-thirty').freshness, 'fresh', 'exactly 30 minutes is FRESH');
    assert.equal(by.get('just-past-thirty').freshness, 'stale', 'one second beyond is STALE');
    assert.equal(by.get('well-inside').freshness, 'fresh');

    assert.equal(STALE_AFTER_MINUTES, 30);
    assert.equal(discovery.staleAfterMinutes, STALE_AFTER_MINUTES);
    assert.equal(freshnessOf('2026-09-20T23:30:00Z', now), 'fresh');
    assert.equal(freshnessOf('2026-09-20T23:29:59Z', now), 'stale');
  });
});

test('invalid or future timestamp remains unknown', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  withFixture((f) => {
    writeLane(f.ledger, 'bad.lane.md', laneBody({ updated: 'not-a-timestamp' }));
    writeLane(f.ledger, 'future.lane.md', laneBody({ updated: '2026-09-22T00:00:00Z' }));

    const { discovery, exitCode } = discover(f, { now });
    const by = byLabel(discovery);

    assert.equal(by.get('bad').freshness, 'unknown', 'an unparsable age must not read as fresh');
    assert.equal(by.get('bad').updatedAt, 'not-a-timestamp', 'the raw value is preserved, not rewritten');
    assert.equal(by.get('future').freshness, 'unknown', 'a future age must not read as fresh');
    assert.equal(by.get('future').updatedAt, '2026-09-22T00:00:00Z', 'a future timestamp is NOT clamped');

    for (const label of ['bad', 'future']) {
      assert.ok(by.get(label).errors.some((e) => e.code === 'INVALID_TIMESTAMP'), `${label} must report INVALID_TIMESTAMP`);
    }
    assert.equal(discovery.errors.filter((e) => e.code === 'INVALID_TIMESTAMP').length, 2);
    assert.equal(discovery.complete, false);
    assert.equal(exitCode, 2);
  });
});

test('malformed lane remains visible with error', () => {
  withFixture((f) => {
    writeLane(f.ledger, 'broken-a.lane.md', laneBody({ locks: ['backend/a.ts'] }));
    writeLane(f.ledger, 'broken-b.lane.md', laneBody({ locks: ['backend/b.ts'] }));

    /* MOCKED BOUNDARY: `parseLane` is TOTAL — no real lane file can make it throw,
     * so the failure is injected. Everything else on this path is real: real
     * enumeration, real record construction, real accounting, real response. */
    const { discovery, exitCode } = discover(f, {
      parse: () => { throw new Error('induced parse failure'); },
    });

    assert.equal(discovery.enumeration.entries, 2);
    assert.equal(discovery.enumeration.records, 2, 'a parse failure cannot shrink the inventory');
    assert.equal(discovery.errors.filter((e) => e.code === 'LANE_PARSE_FAILED').length, 2);
    for (const l of discovery.lanes) {
      assert.deepEqual(l.locks, []);
      assert.equal(l.errors[0].code, 'LANE_PARSE_FAILED');
      assert.equal(l.freshness, 'unknown');
    }
    assert.equal(discovery.complete, false);
    assert.equal(exitCode, 2);
  });
});

test('unreadable lane remains visible with error', () => {
  withFixture((f) => {
    writeLane(f.ledger, 'readable.lane.md', laneBody({ locks: ['backend/ok.ts'] }));
    /* REAL failure, no mock: a DIRECTORY named `*.lane.md`. Measured on Windows
     * before being relied on — `readFileSync` on a directory throws EISDIR. */
    mkdirSync(join(f.ledger, 'unreadable.lane.md'));

    const { discovery, exitCode } = discover(f);
    assert.equal(discovery.enumeration.entries, 2, 'the directory is an enumerated entry');
    assert.equal(discovery.enumeration.records, 2, 'and it must produce a record');
    assert.equal(discovery.enumeration.failedReads, 1);

    const bad = byLabel(discovery).get('unreadable');
    assert.ok(bad, 'the unreadable entry must not vanish from the response');
    assert.equal(bad.errors[0].code, 'LANE_READ_FAILED');
    assert.deepEqual(bad.locks, []);
    assert.equal(bad.freshness, 'unknown');

    // The readable neighbour is unaffected: one bad lane must not blank the rest.
    assert.deepEqual(byLabel(discovery).get('readable').locks, ['backend/ok.ts']);
    assert.equal(discovery.complete, false);
    assert.equal(exitCode, 2);
  });
});

test('enumeration failure makes response incomplete', () => {
  withFixture((f) => {
    /* REAL failure, no mock: the ledger directory does not exist, so
     * `readdirSync` throws ENOENT. */
    const missing = join(f.root, '.ai-workflow', 'coordination-absent');
    const { discovery, exitCode } = buildDiscovery({ ledger: missing, cwd: f.root });

    assert.equal(discovery.enumeration.entries, 0);
    assert.equal(discovery.enumeration.records, 0);
    assert.equal(discovery.lanes.length, 0);
    assert.ok(discovery.errors.some((e) => e.code === 'ENUMERATION_FAILED'));
    /* The whole point: an empty inventory caused by failure must not be reported
     * the same way as an empty inventory that was successfully read. */
    assert.equal(discovery.complete, false);
    assert.equal(exitCode, 2);
  });
});

test('filesystem inventory equals returned accounting', () => {
  withFixture((f) => {
    const names = ['a.lane.md', 'b.lane.md', 'c.lane.md', 'd--main-sdeadbeef.lane.md', 'e.lane.md'];
    for (const n of names) writeLane(f.ledger, n, laneBody({ locks: [`backend/${n}.ts`] }));
    writeFileSync(join(f.ledger, 'README.md'), '# not a lane\n', 'utf8');

    const onDisk = readdirSync(f.ledger).filter((n) => n.endsWith('.lane.md')).sort();
    const { discovery } = discover(f);

    assert.equal(onDisk.length, names.length);
    assert.equal(discovery.enumeration.entries, onDisk.length, 'README.md must not inflate the count');
    assert.equal(discovery.enumeration.records, discovery.lanes.length);
    assert.equal(discovery.lanes.length, names.length);
    assert.equal(new Set(discovery.lanes.map((l) => l.laneFile)).size, discovery.lanes.length);

    // A bijection: every entry maps to exactly one record, and every record to an entry.
    assert.deepEqual(
      discovery.lanes.map((l) => l.laneFile.split(/[\\/]/).pop()).sort(),
      onDisk,
    );
    assert.equal(discovery.enumeration.entries, discovery.enumeration.records);
  });
});

test('discovery performs no writes', () => {
  withFixture((f) => {
    writeLane(f.ledger, 'held.lane.md', laneBody({ locks: ['backend/held.ts', 'backend/also-held.ts'] }));
    writeLane(f.ledger, 'idle-peer.lane.md', laneBody({ status: 'idle', locks: ['backend/still-visible.ts'] }));

    const ledgerState = () => readdirSync(f.ledger).sort()
      .map((n) => {
        const p = join(f.ledger, n);
        const s = statSync(p);
        return `${n}|${s.size}|${s.mtimeMs}|${s.isDirectory() ? 'd' : 'f'}|${readFileSync(p, 'utf8')}`;
      })
      .join('\u0001');
    const rootEntries = () => readdirSync(f.root).sort().join(',');

    const ledgerBefore = ledgerState();
    const rootBefore = rootEntries();

    discover(f);
    discover(f, { now: Date.now() });

    assert.equal(ledgerState(), ledgerBefore, 'ledger bytes, entries and mtimes must be untouched');
    assert.equal(rootEntries(), rootBefore, 'no new entry may appear in the checkout');
    assert.deepEqual(rootBefore.split(','), ['.ai-workflow', '.git']);
  });
});

test('exact directory subtree and basename claims remain conservative', () => {
  withFixture((f) => {
    const locks = [
      'backend/a.ts', 'backend/', 'backend/migrations/**', 'backend/*',
      'Dockerfile', 'src/*.js', '../escape.ts',
    ];
    writeLane(f.ledger, 'claims.lane.md', laneBody({ locks }));

    const { discovery, exitCode } = discover(f);
    const rec = discovery.lanes[0];

    // This classifies; it never rewrites. Every declared form survives verbatim.
    assert.deepEqual(rec.locks, locks);

    // The four demonstrated forms are resolvable.
    assert.equal(classifyLock('backend/a.ts'), 'exact');
    assert.equal(classifyLock('backend/'), 'subtree');
    assert.equal(classifyLock('backend/migrations/**'), 'subtree');
    assert.equal(classifyLock('Dockerfile'), 'basename');
    // Uncertain forms cannot clear a target. `dir/*` is NOT a subtree: it matches
    // direct children only, so treating it as one would clear grandchildren the
    // lane never claimed.
    assert.equal(classifyLock('src/*.js'), 'ambiguous');
    assert.equal(classifyLock('../escape.ts'), 'ambiguous');
    /* The bare `dir/*` is the form most likely to be mistaken for a subtree, and
     * it was classified as one in the first draft of this module. It is not: the
     * existing matcher refuses to let a single `*` cross a separator, so the two
     * forms genuinely differ and the classification must not conflate them. */
    assert.equal(classifyLock('backend/*'), 'ambiguous');
    assert.equal(lockMatches('backend/x.ts', 'backend/*'), true);
    assert.equal(lockMatches('backend/deep/x.ts', 'backend/*'), false);

    const ambiguous = rec.errors.filter((e) => e.code === 'AMBIGUOUS_PATH');
    assert.equal(ambiguous.length, 3);
    assert.ok(ambiguous.some((e) => e.message.includes('src/*.js')));
    assert.ok(ambiguous.some((e) => e.message.includes('../escape.ts')));
    assert.ok(ambiguous.some((e) => e.message.includes('backend/*')));

    // The existing matcher agrees about what each demonstrated form covers.
    assert.equal(lockMatches('backend/a.ts', 'backend/a.ts'), true);
    assert.equal(lockMatches('backend/deep/a.ts', 'backend/a.ts'), false);
    assert.equal(lockMatches('backend/deep/x.ts', 'backend/'), true);
    assert.equal(lockMatches('backend/migrations/2026/x.sql', 'backend/migrations/**'), true);
    assert.equal(lockMatches('backend/deep/x.ts', 'backend/migrations/**'), false);
    assert.equal(lockMatches('Dockerfile', 'Dockerfile'), true);

    assert.equal(discovery.complete, false, 'uncertainty must never read as clearance');
    assert.equal(exitCode, 2);
  });
});
