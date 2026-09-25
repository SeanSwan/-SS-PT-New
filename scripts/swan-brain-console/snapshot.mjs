/**
 * snapshot — THE one implementation of the console's full read-only picture.
 * @module scripts/swan-brain-console/snapshot
 *
 * WHY THIS MODULE EXISTS (round 8, 2026-09-20)
 * `snapshot()` used to live in `server.mjs` alone, and `mcp/tools.mjs`'s `swan_get_state`
 * had its OWN copy of the same five reads. Both files' comments claimed the two were
 * "identical in shape to GET /api/state". They were not: `server.mjs` grew a `gates`
 * section in S4.1 and the MCP copy did not, so an agent reading `state.gates` from
 * `swan_get_state` got `undefined` while the console returned an object — silently, with
 * no error and no test covering the pair.
 *
 * That is the same defect this codebase keeps re-learning: a fact restated in two places
 * drifts, and the drift is invisible because nothing compares the copies. The fix is not
 * to add `gates` to the second copy — that leaves two implementations and the claim stays
 * an assertion. The fix is to have ONE implementation that both surfaces import, so the
 * claim "identical in shape" is true BY CONSTRUCTION and cannot drift.
 *
 * `mcp/tools.mjs` already states this as its design ("exactly ONE implementation of each
 * fact — the MCP server can never show an agent a different number than the console shows
 * an operator"). This module makes the code match that stated design.
 *
 * BOUNDS: reads only. No network, no DB, no writes, no cache. Every number is computed at
 * call time — the console's whole thesis is that a cached registry is decay made invisible.
 */
import { loadFleet } from './fleetData.mjs';
import { readEngineState } from './engineState.mjs';
import { readDoctrine } from './doctrine.mjs';
import { readCopyPack } from './copyPack.mjs';
import { readGateHealth } from './gateHealth.mjs';
import { REPO } from './fleetData.mjs';

/**
 * The sections this snapshot is guaranteed to carry, in the order they appear.
 *
 * Exported so a consumer can assert coverage against a named set instead of a hardcoded
 * key list — and so adding a section here without adding it to the object is a failing
 * test rather than a silent omission in one consumer.
 */
export const SNAPSHOT_SECTIONS = Object.freeze([
  'generatedAt', 'engine', 'fleet', 'doctrine', 'copy', 'gates',
]);

/**
 * Build the full read-only snapshot. Every number is computed here, at read time.
 *
 * @param {string} [repoRoot] Repository root; defaults to the one `fleetData.mjs` resolved
 *   from its own location, so a caller that has no opinion gets the real tree.
 * @returns {Promise<object>} `{ generatedAt, engine, fleet, doctrine, copy, gates }`
 */
export async function snapshot(repoRoot = REPO) {
  const fleet = await loadFleet();
  return {
    generatedAt: new Date().toISOString(),
    engine: readEngineState(repoRoot),
    fleet,
    doctrine: readDoctrine(repoRoot),
    copy: readCopyPack(repoRoot, fleet.rows.map((r) => r.id)),
    /*
     * Gate health (S4.1). It rides the snapshot rather than a second endpoint so the
     * panel cannot render a gate list from a different moment than the rest of the page:
     * one request, one timestamp, one consistent picture. `readGateHealth` reads at most
     * one small file per declared gate, so it costs nothing next to `loadFleet()`.
     */
    gates: readGateHealth(repoRoot),
  };
}
