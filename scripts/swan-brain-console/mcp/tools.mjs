/**
 * tools — the Swan Brain Console's read-only MCP tool surface.
 * @module scripts/swan-brain-console/mcp/tools
 *
 * Five tools an agent can call to learn the state of the design workstream without a
 * browser and without a running console. It imports the console's own reader modules
 * directly, so there is exactly ONE implementation of each fact — the MCP server can
 * never show an agent a different number than the console shows an operator.
 *
 * ROUND 8 (2026-09-20) — THAT CLAIM WAS FALSE, and this is the record. `swanGetState` had
 * its own copy of the snapshot reads, and the copy had drifted: `server.mjs` grew a `gates`
 * section in S4.1 and this one did not, so `state.gates` was `undefined` here while the
 * console returned an object — silently, because `undefined` is not an error, and untested,
 * because neither suite imported the other. Both now call the single `snapshot()` in
 * `../snapshot.mjs`, so the identity is structural and `mcp/snapshot.parity.test.mjs` pins it.
 * The lesson is the one this repo keeps paying for: a fact restated in two places drifts,
 * and the drift is invisible because nothing compares the copies.
 *
 * WHY DIRECT IMPORTS AND NOT `GET /api/state` (ruled D17a): requiring a running HTTP
 * console would make the tools unavailable exactly when they are most useful, and would
 * create a second source of truth. The contract's original `GET /api/state` backing
 * claim is deleted; `03-contracts.md` carries the correction.
 *
 * THE READ-ONLY CONTRACT: no tool here writes, promotes, spends or mutates. That is not
 * enforced by a permission check — it is enforced by the ABSENCE of any such tool,
 * asserted by `tools.test.mjs`, which pins the exported name list to an exact literal.
 *
 * THE SCOPE OF "READ-ONLY", STATED (round 12, Astra F22). "No writes" was previously
 * unqualified, and the unqualified version is FALSE for the tree this module ships beside:
 * the browser Judge panel persists picks to `localStorage`, and `generate-worlds.mjs` and
 * `wire-playground.mjs` write repository files when run directly. The claim that IS true,
 * and that this module is answerable for, is narrower — so it is stated rather than implied:
 *
 *     no MCP tool and no HTTP route mutates repository data or engine state.
 *
 * The two generators are reachable from NEITHER surface: they are absent from `ASSET_ROUTES`
 * and from the browser module graph (`app/asset-routes.test.mjs` asserts it), and no route
 * table entry names them. No repository-write exploit through HTTP or MCP is claimed.
 *
 * BOUNDS: reads files under `docs/`, `.ai-workflow/` and the three-worlds tree. No
 * network, no DB, no .env, no cache. Counts are computed at read time.
 */
import { REPO, loadFleet } from '../fleetData.mjs';
import { readEngineState } from '../engineState.mjs';
import { readGateHealth } from '../gateHealth.mjs';
/*
 * ROUND 8 (2026-09-20): `readDoctrine` and `readCopyPack` were imported here so this file
 * could assemble its own snapshot. That private assembly is gone — `swanGetState` calls the
 * shared `snapshot()` — so those two imports are gone with it. Leaving them would be the
 * raw material for re-creating the drift this round removed.
 */
import { snapshot } from '../snapshot.mjs';
import {
  swanSearchDoctrine,
  SEARCH_ROOT,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX,
} from './searchDoctrine.mjs';

/*
 * Re-exported so the bounds stay part of this module's public surface. `tools.test.mjs`
 * drives them through `callTool`, but a caller reading `tools.mjs` to learn what this
 * surface permits should not have to know that the implementation moved.
 */
export {
  SEARCH_ROOT,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX,
  SEARCH_FILES_MAX,
  SEARCH_LINE_MAX,
  clampLimit,
  swanSearchDoctrine,
} from './searchDoctrine.mjs';

/* ------------------------------------------------------------------ bounds */

/** The only fields `swan_list_variants` may narrow on. */
const FILTER_FIELDS = Object.freeze(['nav_model', 'hero_mechanics', 'grid']);

/**
 * Capabilities that must never exist on this surface. Listing them lets `callTool`
 * answer a forbidden name with a specific refusal instead of a generic "unknown
 * tool" — the difference between an agent learning the boundary and assuming a typo.
 */
export const FORBIDDEN_NAMES = Object.freeze([
  'promote_variant', 'accept_claim', 'write_receipt', 'run_seat', 'set_engine_state',
]);

/** Verbs a read-only tool name may use. A name outside this set fails the suite. */
export const ALLOWED_VERBS = Object.freeze(['get', 'list', 'search']);

/* ---------------------------------------------------------------- handlers */

/**
 * The full snapshot, identical in shape to the console's `/api/state`.
 *
 * ROUND 8 (2026-09-20): this handler used to assemble its own copy of the five reads while
 * claiming identity with `/api/state`. The claim was FALSE — `server.mjs` had grown a
 * `gates` section in S4.1 and this copy had not, so an agent reading `state.gates` got
 * `undefined` while the console returned an object. Both suites were green because neither
 * imported the other.
 *
 * It now calls the SAME `snapshot()` the HTTP route calls, so the identity is structural
 * rather than asserted. `mcp/snapshot.parity.test.mjs` pins it.
 *
 * `snapshot()` resolves its own repo root from its module location, so this handler takes
 * no repo argument. Accepting one and ignoring it would produce a snapshot mixing a
 * foreign root with real fleet rows.
 */
export async function swanGetState() {
  return snapshot();
}

/**
 * Narrow the 20 fleet rows.
 *
 * RULED D17(d): the original `filter: 'nav_model'` named a FIELD, not a value, so it
 * could not narrow anything — it always returned all twenty while looking like it had
 * filtered. The shape is now `{ field, value }`, and an unrecognised field is an error
 * rather than a silent pass-through.
 */
export async function swanListVariants({ filter } = {}) {
  const { rows } = await loadFleet();
  if (filter === undefined || filter === null) {
    return { total: rows.length, returned: rows.length, appliedFilter: null, rows };
  }
  if (typeof filter !== 'object' || Array.isArray(filter)) {
    throw new Error('filter must be an object of shape { field, value }');
  }
  if (!FILTER_FIELDS.includes(filter.field)) {
    throw new Error(
      `unknown filter field "${String(filter.field)}" — allowed: ${FILTER_FIELDS.join(', ')}`,
    );
  }
  if (typeof filter.value !== 'string' || filter.value === '') {
    throw new Error('filter.value must be a non-empty string');
  }
  const matched = rows.filter((r) => String(r[filter.field]) === filter.value);
  return {
    total: rows.length,
    returned: matched.length,
    appliedFilter: { field: filter.field, value: filter.value },
    rows: matched,
  };
}

/**
 * The engine's real state, read from disk.
 *
 * The reader's WHOLE object is returned rather than a hand-picked subset, so a field
 * added to `engineState.mjs` reaches agents automatically and cannot drift.
 * `durableWrites` is never a bare `BLOCKED` — the console cannot TEST a write gate, so
 * it must not speak as though it had.
 */
export function swanGetEngineState() {
  return readEngineState(REPO);
}

/**
 * Gate health (S4). Ruled D17(c): this tool MOVED here from S1, which ships four.
 *
 * The distinction it exists to make is the one this repo keeps losing: "not run" is not
 * "pass". A gate with no result file, a corrupt result, a result from six months ago and
 * a result produced by a simulated run are four different problems, and none of them is
 * a green light. `gateHealth.mjs` returns `pass` only for a readable, fresh, real result
 * with zero failures; `gateHealth.test.mjs` sweeps the other shapes and asserts that.
 */
export function swanGetGateHealth() {
  return readGateHealth(REPO);
}

/* ---------------------------------------------------------------- registry */

/**
 * The registry. `TOOL_NAMES` is DERIVED from it, so a tool cannot be callable
 * without also being listed — there is no way to add a hidden tool.
 */
export const TOOL_REGISTRY = Object.freeze({
  swan_get_state: {
    description:
      'Read the full Swan Brain Console snapshot: engine state, the 20-variant fleet, '
      + 'doctrine coverage and the copy pack. Read-only; identical shape to GET /api/state.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: swanGetState,
  },
  swan_list_variants: {
    description:
      'List the 20 fleet variants with structural fields (nav_model, hero_mechanics, grid, '
      + 'chapters, anti_specs, wildcard) and each variant\'s authored tradeoff.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Narrow the list. Omit to return all rows.',
          properties: {
            field: { type: 'string', enum: [...FILTER_FIELDS] },
            value: { type: 'string' },
          },
          required: ['field', 'value'],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    handler: swanListVariants,
  },
  swan_get_engine_state: {
    description:
      'Read the Design Brain learning engine\'s declared state. durableWrites is one of '
      + 'DECLARED_BLOCKED, VERIFIED_BLOCKED or UNKNOWN — never a bare BLOCKED.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: swanGetEngineState,
  },
  swan_search_doctrine: {
    description:
      `Search ${SEARCH_ROOT} for a literal substring. Returns matching lines with file:line. `
      + `Limit defaults to ${SEARCH_LIMIT_DEFAULT} and is capped at ${SEARCH_LIMIT_MAX}.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: `Literal substring, max ${SEARCH_QUERY_MAX} chars.` },
        limit: { type: 'integer', minimum: 1, maximum: SEARCH_LIMIT_MAX },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: swanSearchDoctrine,
  },
  swan_get_gate_health: {
    description:
      'Report whether each declared gate has RUN, and what it said. "Not run" is a distinct '
      + 'state from "pass": a missing, corrupt, stale or simulated result is never reported '
      + 'as passing. Returns per-gate status plus a summary count.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: swanGetGateHealth,
  },
});

/** Derived, never hand-listed: a callable tool is always a listed tool. */
export const TOOL_NAMES = Object.freeze(Object.keys(TOOL_REGISTRY));

/** The `tools/list` payload. */
export const TOOL_SPECS = Object.freeze(
  TOOL_NAMES.map((name) => ({
    name,
    description: TOOL_REGISTRY[name].description,
    inputSchema: TOOL_REGISTRY[name].inputSchema,
  })),
);

/* ---------------------------------------------------------------- dispatch */

/**
 * Call one tool. NEVER throws and NEVER exits the process.
 *
 * The single catch here is the whole degraded-mode contract (ruled D17b): a failed data
 * read must arrive as a correctable typed error, because an agent that discovers a dead
 * tool learns nothing while an agent that gets a hint learns the fix. The catch is
 * tool-agnostic, so the suite drives it through more than one tool — the strongest
 * evidence available without editing a module this slice may not touch.
 */
export async function callTool(name, args = {}) {
  const entry = TOOL_REGISTRY[name];
  if (!entry) {
    const forbidden = FORBIDDEN_NAMES.includes(name);
    return {
      error: forbidden ? `forbidden tool: ${name}` : `unknown tool: ${name}`,
      hint: forbidden
        ? 'this surface is read-only by construction; no tool here writes, promotes or spends'
        : `available tools: ${TOOL_NAMES.join(', ')}`,
    };
  }
  try {
    return await entry.handler(args ?? {});
  } catch (err) {
    return {
      error: 'tool failed',
      tool: name,
      detail: String(err && err.message ? err.message : err),
      hint: 'the underlying data could not be read; check the repo root and that the path named '
        + 'in "detail" exists',
    };
  }
}
