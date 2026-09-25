/**
 * gateHealth.test — the guard for "not run ≠ pass".
 * @module scripts/swan-brain-console/gateHealth.test
 *
 * WHY THIS FILE EXISTS
 * A gate that has never run and a gate that passed are the same thing from the
 * artifact side: silence. That is how this repo accumulated green numbers that were
 * evidence about one afternoon (see the header of `.github/workflows/three-worlds-fleet.yml`,
 * which documents the same lesson learned twice). `readGateHealth` exists to make the
 * difference visible, and the ONLY thing that makes it worth writing is the invariant
 * this suite pins:
 *
 *     an absent, corrupt, stale or simulated result must NEVER be reported as `pass`.
 *
 * Every test below is an attempt to falsify that. The suite is written RED-first: it
 * was run before `gateHealth.mjs` existed, so the import failure is the recorded RED.
 *
 * Run: node --test scripts/swan-brain-console/gateHealth.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { readGateHealth, GATES, STALE_AFTER_DAYS, STATUSES } from './gateHealth.mjs';
// The MCP tool wrapper. `swan_get_gate_health` (S4, ruled D17c) returns this module's
// object, so its behaviour is asserted HERE rather than in `mcp/tools.test.mjs` — the
// wrapper has no logic of its own to test in isolation, and the surface contract there
// is about names and bounds, not about gate semantics.
import * as tools from './mcp/tools.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** A fixed clock so "stale" is a fact, not a function of when the suite ran. */
const NOW = Date.parse('2026-09-19T12:00:00Z');

/** Build a throwaway repo containing only the gate files a test names. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'gate-health-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return root;
}

/** A well-formed, fresh, real (non-mock) passing eval result. */
const PASSING = {
  timestamp: '2026-09-19T00:00:00Z',
  mode: 'live',
  summary: { total: 53, passed: 53, failed: 0 },
};

const planning = GATES.find((g) => g.id === 'planning-validation');
const shadow = GATES.find((g) => g.id === 'gate-shadow-window');

/* ── the invariant this module exists for ─────────────────────────────────── */

test('an ABSENT result file reports not_run, never pass', () => {
  const root = fixture({});
  const out = readGateHealth(root, { now: NOW });
  const gate = out.gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'not_run');
  assert.notEqual(gate.status, 'pass');
});

test('a completely empty repo still reports every gate as not_run', () => {
  const root = fixture({});
  const out = readGateHealth(root, { now: NOW });
  assert.equal(out.gates.length, GATES.length);
  assert.equal(out.summary.not_run, GATES.length);
  assert.equal(out.summary.pass, 0);
});

test('NO gate is ever reported pass without a readable, fresh, real result', () => {
  // The property, swept over every fixture shape that is not a genuine pass.
  const cases = {
    absent: {},
    corrupt: { [planning.path]: '{ not json' },
    stale: { [planning.path]: { ...PASSING, timestamp: '2026-01-01T00:00:00Z' } },
    mock: { [planning.path]: { ...PASSING, mode: 'mock' } },
    failing: { [planning.path]: { ...PASSING, summary: { total: 53, passed: 50, failed: 3 } } },
    noSummary: { [planning.path]: { timestamp: '2026-09-19T00:00:00Z', mode: 'live' } },
  };
  for (const [name, files] of Object.entries(cases)) {
    const out = readGateHealth(fixture(files), { now: NOW });
    const gate = out.gates.find((g) => g.id === 'planning-validation');
    assert.notEqual(gate.status, 'pass', `fixture "${name}" was reported as pass`);
  }
});

/* ── each status is reachable, and reached for the right reason ───────────── */

test('a fresh, real, fully-passing result reports pass', () => {
  const root = fixture({ [planning.path]: PASSING });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'pass');
  assert.equal(gate.ageDays, 0);
});

test('a result with failures reports fail and carries the count', () => {
  const root = fixture({
    [planning.path]: { ...PASSING, summary: { total: 53, passed: 50, failed: 3 } },
  });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'fail');
  assert.match(gate.detail, /3/);
});

test('a corrupt result reports unreadable, not pass and not fail', () => {
  const root = fixture({ [planning.path]: '{ "summary": ' });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'unreadable');
});

test('a result older than the window reports stale, and keeps its age', () => {
  const root = fixture({ [planning.path]: { ...PASSING, timestamp: '2026-08-01T00:00:00Z' } });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'stale');
  assert.ok(gate.ageDays > STALE_AFTER_DAYS, `ageDays ${gate.ageDays} should exceed ${STALE_AFTER_DAYS}`);
});

test('a simulated result reports not_evidence even when it is fresh and green', () => {
  // A mock run is the most dangerous shape: it is fresh, it is green, and it proves
  // nothing. If this test ever passes with status "pass", the guard is worthless.
  const root = fixture({ [planning.path]: { ...PASSING, mode: 'mock' } });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.equal(gate.status, 'not_evidence');
  assert.match(gate.detail, /mock/i);
});

test('a result with no recognisable summary reports unreadable, not pass', () => {
  const root = fixture({ [planning.path]: { timestamp: '2026-09-19T00:00:00Z', mode: 'live' } });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'planning-validation');
  assert.notEqual(gate.status, 'pass');
});

/* ── the shadow window is a date, and a lapsed one is a finding ───────────── */

test('an EXPIRED shadow window is reported as fail, not as pass', () => {
  const root = fixture({
    [shadow.path]: { shadow: ['a-gate'], until: '2026-09-06T00:00:00Z' },
  });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'gate-shadow-window');
  assert.equal(gate.status, 'fail');
  assert.match(gate.detail, /expired/i);
});

test('a shadow window still open is reported as pass', () => {
  const root = fixture({
    [shadow.path]: { shadow: ['a-gate'], until: '2026-10-06T00:00:00Z' },
  });
  const gate = readGateHealth(root, { now: NOW }).gates.find((g) => g.id === 'gate-shadow-window');
  assert.equal(gate.status, 'pass');
});

/* ── arithmetic and robustness ───────────────────────────────────────────── */

test('the summary partitions the gate list exactly', () => {
  const root = fixture({
    [planning.path]: PASSING,
    [shadow.path]: { shadow: [], until: '2026-09-06T00:00:00Z' },
  });
  const out = readGateHealth(root, { now: NOW });
  const counted = STATUSES.reduce((n, s) => n + (out.summary[s] ?? 0), 0);
  assert.equal(counted, out.gates.length);
  assert.equal(out.summary.total, out.gates.length);
});

test('a nonexistent repo root returns not_run for everything rather than throwing', () => {
  const out = readGateHealth(join(tmpdir(), 'gate-health-does-not-exist-xyz'), { now: NOW });
  assert.equal(out.gates.length, GATES.length);
  assert.equal(out.summary.pass, 0);
});

test('every gate carries the fields a report needs', () => {
  const out = readGateHealth(fixture({}), { now: NOW });
  for (const g of out.gates) {
    assert.equal(typeof g.id, 'string');
    assert.equal(typeof g.label, 'string');
    assert.equal(typeof g.path, 'string');
    assert.ok(STATUSES.includes(g.status), `${g.id} has status ${g.status}`);
    assert.equal(typeof g.detail, 'string');
  }
});

/* ── the real repo, asserted honestly ─────────────────────────────────────── */

test('against the real repo, the stale planning result is NOT reported as pass', () => {
  /*
   * This is the assertion that would have caught the original sin. The real
   * `AI-PLANNING-VALIDATION-LATEST.json` is dated 2026-03-03 and is green — a reader
   * skimming it would call the gate passing. It is over six months old, so it is not
   * evidence about today, and the guard must say so.
   */
  const out = readGateHealth(REPO, { now: NOW });
  const gate = out.gates.find((g) => g.id === 'planning-validation');
  assert.notEqual(gate.status, 'pass');
  assert.ok(['stale', 'fail', 'unreadable'].includes(gate.status), `got ${gate.status}`);
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: every module in this subsystem stays within 300 lines', () => {
  // `gateClassify.mjs` and `gateHealth.summary.test.mjs` were added when the coherence
  // rule pushed `gateHealth.mjs` to 338 lines. This list is the guard that caught it, so
  // it must name every file the split produced — a guard that names only some of the
  // modules is the shape this suite already got wrong once (`gateHealth.test.mjs` itself
  // once passed while unnamed in `verify-all.mjs`).
  for (const f of ['gateHealth.mjs', 'gateClassify.mjs', 'gateHealth.test.mjs', 'gateHealth.summary.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});

/* ── B10 — the MCP tool wrapper ──────────────────────────────────────────────
 * MOVED HERE from `mcp/tools.test.mjs` in S4. It tests `gateHealth.mjs` through the tool
 * wrapper, so it belongs beside the module's own suite. Moving it is also what brought
 * `tools.test.mjs` back under the 300-line budget once the fifth tool was added.
 *
 * These assertions are deliberately written from OUTSIDE the tool, against facts the test
 * checks for itself — a tool that reports its own honesty is not evidence of anything.
 * ------------------------------------------------------------------------ */

/** Does a repo-relative path exist and read? Used to check the tool against the disk. */
function filePresent(rel) {
  try {
    readFileSync(join(REPO, rel));
    return true;
  } catch {
    return false;
  }
}

test('B10 — the tool is callable and reports every declared gate', async () => {
  const out = await tools.callTool('swan_get_gate_health', {});
  assert.ok(Array.isArray(out.gates), 'gates must be an array');
  assert.ok(out.gates.length > 0, 'no gates were reported');
  assert.equal(out.summary.total, out.gates.length);
});

test('B10 — the summary counts partition the gate list exactly', async () => {
  const out = await tools.callTool('swan_get_gate_health', {});
  const counted = STATUSES.reduce((n, s) => n + (out.summary[s] ?? 0), 0);
  assert.equal(counted, out.gates.length, 'some gate fell outside every status bucket');
});

test('B10 — a gate with no result file on disk is NEVER reported as pass', async () => {
  // The core invariant, asserted against the filesystem rather than the tool's own claim.
  // A gate whose result does not exist cannot be green, whatever the tool says.
  const out = await tools.callTool('swan_get_gate_health', {});
  for (const g of out.gates) {
    if (filePresent(g.path)) continue;
    assert.notEqual(g.status, 'pass', `${g.id} has no result file yet reports pass`);
    assert.equal(g.status, 'not_run', `${g.id} has no result file but reports ${g.status}`);
  }
});

test('B10 — pass implies a dated result inside the freshness window', async () => {
  const out = await tools.callTool('swan_get_gate_health', {});
  for (const g of out.gates) {
    if (g.status !== 'pass') continue;
    assert.notEqual(g.ageDays, null, `${g.id} passed with no age — no timestamp was read`);
    assert.ok(g.ageDays <= out.staleAfterDays, `${g.id} passed at ${g.ageDays} days old`);
  }
});

test('B10 — every gate carries a non-empty reason and names what declares it', async () => {
  const out = await tools.callTool('swan_get_gate_health', {});
  for (const g of out.gates) {
    assert.ok(g.detail && g.detail.length > 0, `${g.id} has an empty detail`);
    assert.ok(g.declaredBy, `${g.id} does not say where its obligation comes from`);
  }
});

test('B10 — the tool is reachable through the derived name list, not by luck', async () => {
  // A tool that works but is not listed cannot be discovered, and one that is listed but
  // not callable is a lie in `tools/list`. `TOOL_NAMES` is derived from the registry, so
  // this pins both directions at once.
  assert.ok(tools.TOOL_NAMES.includes('swan_get_gate_health'));
  assert.equal(typeof tools.TOOL_REGISTRY.swan_get_gate_health.handler, 'function');
});
