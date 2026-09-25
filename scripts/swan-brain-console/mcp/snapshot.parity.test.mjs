/**
 * snapshot-parity — the guard that would have caught round 8's D1.
 * @module scripts/swan-brain-console/mcp/snapshot.parity
 *
 * WHAT THIS PINS
 * `swan_get_state`'s payload and the console's `GET /api/state` payload are the SAME
 * OBJECT SHAPE. Both surfaces told an agent they were "identical in shape" while two
 * separate implementations drifted apart — the MCP copy silently lost the `gates` section
 * when `server.mjs` grew it in S4.1.
 *
 * WHY IT IS A SEPARATE FILE AND NOT PART OF `tools.test.mjs`
 * `tools.test.mjs` tests the tool surface against its own contract. The defect was in the
 * BOUNDARY between two surfaces, and a per-side suite cannot see a boundary defect — that
 * is precisely how the drift survived two green suites. This file imports BOTH sides and
 * compares them, which is the only place the comparison can live.
 *
 * WHY IT IMPORTS `snapshot()` RATHER THAN SCRAPING THE HTTP ROUTE
 * The parity that matters is "the object `swan_get_state` returns equals the object the
 * route serialises". The route serialises `await snapshot()`. Importing the same function
 * tests the real thing without binding a socket, and `server-contract.test.mjs` already
 * covers the route's use of it end to end.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { snapshot, SNAPSHOT_SECTIONS } from '../snapshot.mjs';
import { swanGetState } from './tools.mjs';
import { callTool } from './tools.mjs';

const KEYS = (o) => Object.keys(o).sort();

describe('snapshot parity — swan_get_state must match the console snapshot exactly', () => {
  test('the two payloads carry the same top-level keys', async () => {
    const viaTool = await swanGetState();
    const viaSnapshot = await snapshot();
    assert.deepEqual(
      KEYS(viaTool),
      KEYS(viaSnapshot),
      'swan_get_state and the console snapshot have diverged — one of them gained or lost a section',
    );
  });

  /*
   * The anti-vacuity guard. `deepEqual([], [])` passes, so if BOTH sides ever became empty
   * — a refactor that returned `{}` from the shared snapshot — the parity test above would
   * still be green while both surfaces were broken. This pins a floor and the named sections.
   */
  test('the shared snapshot is not empty, and carries every named section', async () => {
    const snap = await snapshot();
    assert.ok(KEYS(snap).length >= 6, `snapshot carries only ${KEYS(snap).length} sections`);
    for (const section of SNAPSHOT_SECTIONS) {
      assert.ok(section in snap, `SNAPSHOT_SECTIONS names "${section}" but the snapshot omits it`);
    }
  });

  /*
   * ROUND 8 D1, PINNED AS A REGRESSION. The specific section that went missing. Naming it
   * separately means a future divergence reports WHICH section, not just "keys differ".
   */
  test('the gates section is present through BOTH paths', async () => {
    const viaTool = await swanGetState();
    const viaSnapshot = await snapshot();
    assert.ok('gates' in viaTool, 'swan_get_state lost its gates section again');
    assert.ok('gates' in viaSnapshot, 'the console snapshot lost its gates section');
    assert.equal(
      typeof viaTool.gates,
      typeof viaSnapshot.gates,
      'gates is present on both sides but is not the same kind of value',
    );
    assert.notEqual(viaTool.gates, undefined, 'gates is present but undefined — the round 8 defect exactly');
  });

  /*
   * The tool's own description claims identity with `GET /api/state`. Pin the CLAIM, not
   * only the behaviour: if the description is edited to stop promising identity, that is a
   * deliberate change and this test should be updated with it rather than left asserting a
   * promise the file no longer makes.
   */
  test('the tool description still claims identity with GET /api/state', async () => {
    const { TOOL_REGISTRY } = await import('./tools.mjs');
    const desc = TOOL_REGISTRY.swan_get_state.description;
    assert.match(desc, /identical shape to GET \/api\/state/);
  });

  /*
   * Driven through the dispatcher too, because that is the path an agent actually takes.
   * `callTool` never throws, so a handler that broke would arrive as `{ error: … }` and the
   * assertions above (which call `swanGetState` directly) would not see it.
   */
  test('callTool("swan_get_state") returns the full snapshot, not an error', async () => {
    const out = await callTool('swan_get_state', {});
    assert.ok(!('error' in out), `swan_get_state failed through the dispatcher: ${JSON.stringify(out.error)}`);
    const snap = await snapshot();
    assert.deepEqual(KEYS(out), KEYS(snap));
  });

  /*
   * And the counterpart: the two surfaces must agree on the FLEET, not merely on the key
   * list. Key parity with divergent contents would be the same defect wearing a hat.
   */
  test('both paths agree on the fleet row count', async () => {
    const viaTool = await swanGetState();
    const viaSnapshot = await snapshot();
    assert.equal(viaTool.fleet.rows.length, viaSnapshot.fleet.rows.length);
    assert.ok(viaTool.fleet.rows.length > 0, 'fleet is empty — this comparison would be vacuous');
  });
});
