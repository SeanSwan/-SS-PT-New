/**
 * tools-contract — locks the MCP surface to "read-only, exactly five tools".
 * @module scripts/swan-brain-console/mcp/tools.test
 *
 * WHY THIS SUITE EXISTS
 * The console's whole claim is that it reports and never writes. On an HTTP surface
 * that claim is enforced by a route table with no POST handler. On an MCP surface
 * there is no route table — a tool is callable the moment it appears in the
 * registry — so the claim has to be enforced by a TEST that pins the exported name
 * list to an exact literal.
 *
 * THE ASSERTION THAT MATTERS (B1)
 * `TOOL_NAMES` must equal the five names below EXACTLY. Not "contain", not "be a
 * superset": a contributor who adds `promote_variant` must see this suite go red
 * before they can ship it. B6 requires that red to have been OBSERVED, not assumed
 * — the procedure is recorded at the bottom of this file.
 *
 * ⚠ THE FIFTH TOOL, AND THE RED THAT WAS OBSERVED FOR IT (S4, ruled D17c)
 * S1 shipped FOUR tools; `swan_get_gate_health` was ruled to S4 because it depends on
 * `gateHealth.mjs`. When S4 added it to the registry, this suite was run BEFORE the pin
 * was updated, and it failed exactly as designed:
 *
 *     not ok 1 - B1 — the tool list is EXACTLY the four allowed names
 *       expected: 4
 *       actual:   5
 *     # tests 24  # pass 22  # fail 2
 *
 * That is the pin earning its keep: adding a tool to a read-only surface is not a
 * silent operation, and the number in this file is the thing that makes it loud.
 *
 * Run: node --test scripts/swan-brain-console/mcp/tools.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');

const mod = await import(pathToFileURL(join(HERE, 'tools.mjs')).href);

/** The exact allowed surface. Ruled D17(c): gate health moved to S4, which ships five. */
const EXPECTED_TOOLS = [
  'swan_get_state',
  'swan_list_variants',
  'swan_get_engine_state',
  'swan_search_doctrine',
  'swan_get_gate_health',
];

describe('B1 — the tool list is EXACTLY the five allowed names', () => {
  test('the exported names equal the allowed set, with no extras and no omissions', () => {
    assert.deepEqual([...mod.TOOL_NAMES], EXPECTED_TOOLS);
  });

  test('there are five of them', () => {
    assert.equal(mod.TOOL_NAMES.length, 5);
  });

  test('every callable tool is also a listed tool (no hidden tool)', () => {
    // TOOL_NAMES is derived from the registry, so this pins the derivation itself:
    // if someone hand-writes the list and adds a registry entry, this fails.
    assert.deepEqual([...mod.TOOL_NAMES], Object.keys(mod.TOOL_REGISTRY));
    assert.deepEqual(mod.TOOL_SPECS.map((s) => s.name), [...mod.TOOL_NAMES]);
  });
});

describe('B2 — no write, promote or spend capability exists', () => {
  test('no forbidden name appears in the registry', () => {
    for (const name of mod.FORBIDDEN_NAMES) {
      assert.ok(!mod.TOOL_NAMES.includes(name), `forbidden tool present: ${name}`);
    }
  });

  test('every tool name uses a read-only verb', () => {
    // Structural, not a blocklist: a NEW write tool fails here even if nobody
    // thought to add its name to FORBIDDEN_NAMES. That is the point — a blocklist
    // only catches the capabilities someone already imagined.
    //
    // The verb is the FIRST token after the optional `swan_` prefix. Splitting on `_`
    // and taking index 1 assumed the prefix was present, so `promote_variant` yielded
    // "variant" — the guard still went red, but for the wrong reason and with a
    // misleading message. Caught by the B6 red-first run, which is exactly what that
    // run is for.
    for (const name of mod.TOOL_NAMES) {
      const bare = name.startsWith('swan_') ? name.slice('swan_'.length) : name;
      const verb = bare.split('_')[0];
      assert.ok(
        mod.ALLOWED_VERBS.includes(verb),
        `tool "${name}" uses verb "${verb}"; allowed verbs are ${mod.ALLOWED_VERBS.join(', ')}`,
      );
    }
  });

  test('calling a forbidden tool is refused with a specific reason, not "unknown"', async () => {
    for (const name of ['promote_variant', 'set_engine_state', 'run_seat']) {
      const out = await mod.callTool(name, {});
      assert.equal(out.error, `forbidden tool: ${name}`);
      assert.match(out.hint, /read-only/i);
    }
  });

  test('every spec carries a description and an object input schema', () => {
    for (const spec of mod.TOOL_SPECS) {
      assert.ok(spec.description.length > 30, `${spec.name} needs a real description`);
      assert.equal(spec.inputSchema.type, 'object');
    }
  });
});

describe('B3 — swan_get_state returns the real snapshot', () => {
  test('the fleet really has 20 rows, read at call time', async () => {
    const state = await mod.callTool('swan_get_state', {});
    assert.equal(state.fleet.rows.length, 20);
    assert.equal(state.fleet.summary.total, 20);
    assert.match(state.fleet.rows[0].id, /^v\d{2}$/);
  });

  test('the snapshot carries engine, doctrine and copy — not just the fleet', async () => {
    const state = await mod.callTool('swan_get_state', {});
    assert.ok(state.engine && typeof state.engine.durableWrites === 'string');
    assert.ok(state.doctrine && state.doctrine.declaredCount > 0);
    assert.ok(state.copy && typeof state.copy.present === 'boolean');
    assert.match(state.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('B4 — the engine verdict is never a bare BLOCKED', () => {
  test('durableWrites is one of the three honest states', async () => {
    const s = await mod.callTool('swan_get_engine_state', {});
    assert.ok(
      ['DECLARED_BLOCKED', 'VERIFIED_BLOCKED', 'UNKNOWN'].includes(s.durableWrites),
      `unexpected durableWrites: ${s.durableWrites}`,
    );
    assert.notEqual(s.durableWrites, 'BLOCKED');
  });

  test('it exposes no write control', async () => {
    const s = await mod.callTool('swan_get_engine_state', {});
    assert.deepEqual(s.writeControls, []);
  });

  test('it quotes the declaration as evidence rather than paraphrasing', async () => {
    const s = await mod.callTool('swan_get_engine_state', {});
    assert.equal(s.gateDeclared, true);
    assert.ok(s.declaration.length > 20);
  });
});

/**
 * B5 — DEGRADED MODE.
 *
 * `callTool` catches ANY handler failure and returns `{error, detail, hint}` instead
 * of throwing. The catch is tool-agnostic, so it is driven here through more than
 * one tool rather than proven once: the strongest available evidence without editing
 * a module this slice is not permitted to touch.
 *
 * The production instance of this path is a partial checkout — `fleetData.loadFleet()`
 * imports `skeletons.ts` by absolute path, so an absent file raises
 * ERR_MODULE_NOT_FOUND out of `swan_get_state`. That cannot be simulated here without
 * mutating the tree, so what is asserted is the MECHANISM, and the mechanism is shared.
 */
describe('B5 — a failure is a correctable error, never a crash', () => {
  test('a handler that cannot honour its input returns a typed error with a hint', async () => {
    const out = await mod.callTool('swan_list_variants', { filter: { field: 'nope', value: 'x' } });
    assert.equal(out.error, 'tool failed');
    assert.equal(out.tool, 'swan_list_variants');
    assert.match(out.detail, /unknown filter field/);
    assert.ok(out.hint.length > 20, 'a failure without a hint teaches the caller nothing');
  });

  test('a second, unrelated tool fails the same way — the catch is shared, not per-tool', async () => {
    const out = await mod.callTool('swan_search_doctrine', { query: 'x' });
    assert.equal(out.error, 'tool failed');
    assert.match(out.detail, /at least 2 characters/);
  });

  test('an unknown tool names the tools that do exist', async () => {
    const out = await mod.callTool('swan_definitely_not_a_tool', {});
    assert.equal(out.error, 'unknown tool: swan_definitely_not_a_tool');
    assert.match(out.hint, /swan_get_state/);
  });

  test('callTool never throws, even for a nonsense argument shape', async () => {
    for (const args of [undefined, null, 0, 'string', [], { filter: 'not-an-object' }]) {
      const out = await mod.callTool('swan_list_variants', args);
      assert.equal(typeof out, 'object');
    }
  });
});

describe('B8 — the filter narrows, and never silently passes everything', () => {
  test('a real field/value pair returns a strict subset', async () => {
    const all = await mod.callTool('swan_list_variants', {});
    const value = all.rows[0].nav_model;
    const narrowed = await mod.callTool('swan_list_variants', {
      filter: { field: 'nav_model', value },
    });
    assert.equal(narrowed.total, 20);
    assert.ok(narrowed.returned > 0, `expected at least one row with nav_model=${value}`);
    assert.ok(narrowed.returned < 20, 'a filter that returns everything is not a filter');
    assert.ok(narrowed.rows.every((r) => String(r.nav_model) === value));
  });

  test('omitting the filter returns all twenty, and says no filter was applied', async () => {
    const out = await mod.callTool('swan_list_variants', {});
    assert.equal(out.returned, 20);
    assert.equal(out.appliedFilter, null);
  });

  test('an unknown field is an error, never a pass-through', async () => {
    const out = await mod.callTool('swan_list_variants', { filter: { field: 'id', value: 'v01' } });
    assert.equal(out.error, 'tool failed');
    assert.match(out.detail, /allowed: nav_model, hero_mechanics, grid/);
  });
});

describe('B9 — the doctrine search is allowlisted and bounded', () => {
  test('an absurd limit is clamped, not honoured', async () => {
    const out = await mod.callTool('swan_search_doctrine', { query: 'design', limit: 100000 });
    assert.equal(out.limit, 50);
    assert.ok(out.count <= 50);
  });

  test('every result carries a repo-relative file and a 1-based line', async () => {
    const out = await mod.callTool('swan_search_doctrine', { query: 'design', limit: 5 });
    assert.ok(out.count > 0, 'expected hits for "design" in the doctrine tree');
    for (const r of out.results) {
      assert.match(r.file, /^docs\/ai-workflow\/design-brain\//);
      assert.ok(Number.isInteger(r.line) && r.line >= 1, `bad line: ${r.line}`);
      assert.ok(r.text.length > 0);
    }
  });

  test('it reports truncation rather than implying completeness', async () => {
    const out = await mod.callTool('swan_search_doctrine', { query: 'design', limit: 1 });
    assert.equal(out.count, 1);
    assert.equal(out.truncated, true);
  });

  test('an over-long query is refused rather than scanned', async () => {
    const out = await mod.callTool('swan_search_doctrine', { query: 'a'.repeat(500) });
    assert.equal(out.error, 'tool failed');
    assert.match(out.detail, /exceeds 200 characters/);
  });
});

/*
 * B10 — gate health: "not run" is not "pass".
 *
 * MOVED to `../gateHealth.test.mjs` (S4). It tests `gateHealth.mjs` through this module's
 * tool wrapper, so it belongs beside the module's own suite rather than here — and moving
 * it is what brought this file back under the 300-line budget after the fifth tool was
 * added. `tools.test.mjs` keeps the SURFACE contract (B1–B5, B7–B9); gate health's
 * behaviour is asserted in full at `../gateHealth.test.mjs`.
 */

describe('B7 — Rule 4: every new module stays within budget', () => {
  test('every MCP module is ≤300 lines', () => {
    // `searchDoctrine.mjs` and `gateHealth.mjs` were added in S4; `tools.mjs` shrank from
    // 299 to 259 because the search handler moved out, which is what made room for the
    // fifth tool without a Rule 4 violation.
    for (const f of [
      'tools.mjs', 'server.mjs', 'tools.test.mjs', 'server.test.mjs', 'searchDoctrine.mjs',
    ]) {
      const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines, over the 300-line budget`);
    }
  });
});

/*
 * B6 — THE RED WAS OBSERVED. The full record now lives in `./RED-RECORD.md`.
 *
 * Short version: injecting `promote_variant` into the registry turned 6 of 24 assertions
 * red across three independent guards, and that RED found a real bug in the verb rule's
 * diagnostics (it reported `verb "variant"` — the right verdict for the wrong reason).
 *
 * The long version — procedure, exact output, and why the transport suite is a separate
 * file — moved to `./RED-RECORD.md` in S4, because 33 lines of prose inside a test module
 * spends 33 lines of the Rule 4 budget on something no test ever reads.
 */
