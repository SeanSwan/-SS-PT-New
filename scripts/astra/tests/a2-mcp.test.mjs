/**
 * a2-mcp.test.mjs — slice A2's tests: WHAT THE SURFACE IS.
 * IDs map to `04-TESTS-TRACEABILITY.md`.
 *
 * T-I-08  MCP `brain.reject` without `confirm` is refused, and the write does not occur
 * T-I-09  MCP `brain.capabilities` and the surface's board are identical, from ONE source
 * T-P-02  the MCP surface writes no taste state, returns no image bytes, no credentials
 * plus the slice's exit criterion (`--list-tools` shows 9).
 *
 * The tests that matter here are the ones that would still pass if the code were
 * WRONG in a plausible way. `T-I-08` is not "does it return an error" — a guard that
 * wrote first and complained afterwards would satisfy that. It inspects the compile
 * registry afterwards and requires `outcome: 'pending'`.
 *
 * HOW it speaks — the JSON-RPC framing, the handshake, surviving malformed input —
 * is in `a2-transport.test.mjs`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { ASTRA_ROOT } from '../core/paths.mjs';
import { TOOL_NAMES, TOOL_SPECS, callTool, verifyToolRegistry, FORBIDDEN_NAMES } from '../mcp/tools.mjs';
import { capabilities, capabilitySummary } from '../core/capabilities.mjs';
import { compileAndRecord, getCompile, resetRegistry } from '../core/session.mjs';
import { TUNING_PATH } from '../core/paths.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(ASTRA_ROOT, 'mcp', 'server.mjs');
const FIXTURES = join(ASTRA_ROOT, 'fixtures');
const readFixture = (f) => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8'));

const BRIEF = readFixture('brief-hero.json');
const CAPS = readFixture('caps-verified.json');

/** Every .mjs under scripts/astra, recursively. */
function astraSources(dir = ASTRA_ROOT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...astraSources(p));
    else if (entry.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

/** The one place this file shells out: `--list-tools` prints and exits. */
function listToolsRaw() {
  return spawnSync(process.execPath, [SERVER, '--list-tools'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// ---------------------------------------------------------------------------
// The registry, and the exit criterion
// ---------------------------------------------------------------------------

test('T-A2-01 the registry is internally consistent and lists exactly 9 tools', () => {
  const check = verifyToolRegistry();
  assert.equal(check.ok, true, `registry inconsistent: ${JSON.stringify(check)}`);
  assert.equal(check.count, 9);
  assert.deepEqual(check.specsWithoutHandler, []);
  assert.deepEqual(check.handlersWithoutSpec, []);
  assert.deepEqual(check.forbiddenRegistered, []);
  assert.equal(new Set(TOOL_NAMES).size, TOOL_NAMES.length, 'tool names must be unique');
});

test('T-A2-02 `--list-tools` prints 9 tools and exits 0', () => {
  const r = listToolsRaw();
  assert.equal(r.error, undefined, `spawn failed: ${r.error?.message}`);
  assert.equal(r.status, 0, r.stderr);
  for (const name of TOOL_NAMES) assert.match(r.stdout, new RegExp(`\\b${name.replace('.', '\\.')}\\b`));
  assert.match(r.stdout, /9 tools/);
  // The registry prints ITSELF, so the printed count cannot drift from the real one.
  assert.equal(TOOL_SPECS.length, TOOL_NAMES.length);
});

// ---------------------------------------------------------------------------
// T-I-08 — the one write, and the guard that comes first
// ---------------------------------------------------------------------------

test('T-I-08 brain.reject without confirm is refused AND writes nothing', () => {
  resetRegistry();
  const { compileId } = compileAndRecord(BRIEF, CAPS);
  assert.equal(getCompile(compileId).outcome, 'pending', 'precondition: pending');

  return callTool('brain.reject', { compileId }).then((out) => {
    assert.equal(out.refused, true);
    assert.equal(out.wrote, false);
    assert.equal(out.error.code, 'E_CONFIRM_REQUIRED');
    // THE POINT OF THE TEST: the write did not happen. A guard that recorded the
    // outcome and then reported a refusal would pass every assertion above.
    assert.equal(getCompile(compileId).outcome, 'pending',
      'a refused reject must leave the outcome untouched');
  });
});

test('T-I-08 confirm: false is also refused — only literal true passes', async () => {
  resetRegistry();
  const { compileId } = compileAndRecord(BRIEF, CAPS);
  for (const bad of [false, 1, 'true', undefined, null]) {
    const out = await callTool('brain.reject', { compileId, confirm: bad });
    assert.equal(out.refused, true, `confirm=${JSON.stringify(bad)} must be refused`);
  }
  assert.equal(getCompile(compileId).outcome, 'pending');
});

test('T-I-08 with confirm: true the write DOES occur', async () => {
  resetRegistry();
  const { compileId } = compileAndRecord(BRIEF, CAPS);
  const out = await callTool('brain.reject', { compileId, confirm: true });
  assert.equal(out.wrote, true);
  assert.equal(out.outcome, 'rejected_all');
  assert.equal(getCompile(compileId).outcome, 'rejected_all');
});

test('T-I-08 the guard PRECEDES the write in source order, not just in effect', () => {
  // Belt and braces for the case a future refactor moves the guard below the write
  // while keeping the observable behaviour of the paths currently tested.
  const src = stripComments(readFileSync(join(ASTRA_ROOT, 'mcp', 'tools.mjs'), 'utf8'));
  const guardAt = src.indexOf('confirm !== true');
  const writeAt = src.indexOf('setOutcome(');
  assert.notEqual(guardAt, -1, 'the confirm guard must exist');
  assert.notEqual(writeAt, -1, 'the write must exist');
  assert.ok(guardAt < writeAt, 'the confirm guard must come before the only write');
  assert.equal(src.split('setOutcome(').length - 1, 1, 'brain.reject must be the ONLY write');
});

test('T-I-08 brain.reject on an unknown id fails without inventing an entry', async () => {
  resetRegistry();
  const out = await callTool('brain.reject', { compileId: 'cmp-nope-1', confirm: true });
  assert.equal(out.error.code, 'E_COMPILE_UNKNOWN');
  assert.equal(out.wrote, undefined);
});

// ---------------------------------------------------------------------------
// T-I-09 — one board, two consumers
// ---------------------------------------------------------------------------

test('T-I-09 MCP capabilities and the core board are the SAME object, from one source', async () => {
  const mcp = await callTool('brain.capabilities', {});
  assert.deepEqual(mcp.lanes, capabilities());
  assert.deepEqual(mcp.summary, capabilitySummary());
  // And the board is not empty or uniformly INCONCLUSIVE — a deepEqual of two
  // empty arrays would pass this test while the board was broken.
  assert.ok(mcp.lanes.length >= 10, `expected a real board, got ${mcp.lanes.length} lanes`);
  // `status`, not `state` — the lane row's field is `status`, and an earlier draft of
  // this test asserted on `state`, collected twelve `undefined`s, and reported an
  // empty set. The guard below is what caught it: `new Set([undefined]).size === 1`.
  const statuses = new Set(mcp.lanes.map((l) => l.status));
  assert.ok(!statuses.has(undefined), 'every lane must carry a status');
  assert.ok(statuses.size >= 3, `expected a mixed board, got statuses: ${[...statuses].join(', ')}`);
});

// ---------------------------------------------------------------------------
// T-P-02 — what the surface must never do
// ---------------------------------------------------------------------------

test('T-P-02 no forbidden capability is registered, and forbidden names are refused', async () => {
  for (const name of FORBIDDEN_NAMES) {
    assert.ok(!TOOL_NAMES.includes(name), `${name} must not be registered`);
    const out = await callTool(name, {});
    assert.equal(out.error.code, 'E_TOOL_FORBIDDEN', `${name} must be refused at dispatch`);
  }
});

test('T-P-02 no Astra source writes taste state, and no tool reaches for taste or .env', () => {
  // THE SCAN LOOKS FOR A REACH, NOT FOR THE WORD. A first draft matched `/\.env\b/`
  // and fired on `tools.mjs` — because `FORBIDDEN_NAMES` contains the literal
  // `'brain.env'`, which is a DECLARATION that we refuse the tool, not a read of the
  // environment. Same defect class as round 32's coverage sweep and A1's D4: a scan
  // that reads a declaration as the thing declared. So the assertions are about
  // access — an env read, or a taste path used as a path.
  // SHIPPED SOURCES ONLY — `tests/` is excluded. The property is about the surface,
  // and a scan that includes its own file matches the regex literal inside its own
  // assertion. A draft did exactly that and reported this file as reading
  // `process.env`; it is the third appearance of this class in this slice alone
  // (round 32's coverage sweep, A1's D4, and this), so it is named rather than
  // quietly filtered.
  for (const file of astraSources().filter((f) => !f.includes(`${sep}tests${sep}`))) {
    const src = stripComments(readFileSync(file, 'utf8'));
    assert.ok(!/process\.env/.test(src), `${file} reads process.env (credentials live there)`);
    assert.ok(!/['"`]taste\//.test(src), `${file} contains a taste/ path literal`);
    assert.ok(!/\bfrom ['"]dotenv['"]|require\(['"]dotenv['"]\)/.test(src), `${file} imports dotenv`);
  }
  // The MCP surface specifically: exactly one mutating call, and it is brain.reject's.
  const mcpSrc = astraSources(join(ASTRA_ROOT, 'mcp'))
    .map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  const mutators = mcpSrc.match(/writeFileSync|appendFileSync|createWriteStream|unlinkSync|rmSync/g) ?? [];
  assert.deepEqual(mutators, [], `the MCP surface must have no filesystem write path: ${mutators}`);
});

test('T-P-02 no tool result carries image bytes or a credential-shaped blob', async () => {
  const results = [];
  for (const name of TOOL_NAMES) {
    if (name === 'brain.reject') continue;
    const args = name === 'brain.explain' ? { compileId: 'cmp-none-1' }
      : name === 'brain.doctrine' ? { query: 'palette' }
        : name === 'brain.compile' ? { brief: BRIEF, caps: CAPS }
          : name === 'brain.tuning.preview' ? { patch: {} } : {};
    results.push(await callTool(name, args));
  }
  const text = JSON.stringify(results);
  assert.ok(!/data:image\//.test(text), 'no tool may return inline image data');
  assert.ok(!/"(apiKey|api_key|secret|token|password)"/i.test(text), 'no tool may return credentials');
  assert.ok(text.length < 500_000, 'results must stay bounded');
});

// ---------------------------------------------------------------------------
// The read tools do what they claim
// ---------------------------------------------------------------------------

test('T-A2-03 brain.tuning.preview reports changes and WRITES NOTHING', async () => {
  const before = readFileSync(TUNING_PATH);
  const out = await callTool('brain.tuning.preview', { patch: { 'auto.S': 0.9, 'nope.key': 1 } });
  assert.equal(out.wrote, false);
  assert.equal(out.state, 'preview');
  assert.ok(out.changedKeys.includes('auto.S') || out.current['auto.S'] === 0.9,
    'a patch to a real key must show up as changed (or already equal)');
  assert.deepEqual(out.unknownKeys, ['nope.key'], 'a patch to a fake key must be NAMED, not dropped');
  assert.ok(out.blastRadius.some((b) => b.gate === true),
    'auto.S must name the auto-corroboration gate — a knob that moves state without review');
  assert.deepEqual(readFileSync(TUNING_PATH), before, 'tuning.json must be byte-identical after a preview');
});

test('T-A2-04 brain.worlds is deterministic through the MCP surface', async () => {
  const a = await callTool('brain.worlds', { seed: 'mcp-replay', n: 3 });
  const b = await callTool('brain.worlds', { seed: 'mcp-replay', n: 3 });
  assert.deepEqual(a.selected, b.selected);
  assert.equal(a.counts.matchesDeclared, true, 'the catalogue must parse fully');
  assert.equal(a.counts.worlds, 18);
  assert.deepEqual(a.counts.unlabelledFields, [], 'every world must expose a palette law');
  assert.ok(a.eligibility.notEvaluated.includes('audience-content-fit'),
    'unevaluated stages must be REPORTED, not assumed to have passed');
});

test('T-A2-05 brain.doctrine returns file:line and an honest completeness flag', async () => {
  const out = await callTool('brain.doctrine', { query: 'Law A', limit: 3 });
  assert.equal(out.count, 3);
  for (const hit of out.results) {
    assert.match(hit.file, /^docs\/ai-workflow\/design-brain\//, 'hits must be allowlisted to the corpus');
    assert.ok(Number.isInteger(hit.line) && hit.line > 0);
  }
  assert.equal(typeof out.complete, 'boolean');
  assert.deepEqual(out.unreadable, [], 'nothing should be unreadable in a normal run');
  assert.equal(out.complete, !out.truncated);

  // A one-character query is refused by name, not silently treated as no matches.
  const tooShort = await callTool('brain.doctrine', { query: 'x' });
  assert.equal(tooShort.error.code, 'E_DOCTRINE_QUERY');
});

test('T-A2-06 brain.explain on an unknown id is a named error, never a blank pane', async () => {
  resetRegistry();
  const out = await callTool('brain.explain', { compileId: 'cmp-stale-9' });
  assert.equal(out.error.code, 'E_COMPILE_UNKNOWN');
  assert.match(out.error.message, /not persisted/);
});

// The transport half of this slice — the JSON-RPC framing, the handshake, and
// surviving malformed input — lives in `a2-transport.test.mjs`, split out to hold
// Rule 4 and because a transport bug (a hung process) and a registry bug (a wrong
// answer) are different things to debug.
