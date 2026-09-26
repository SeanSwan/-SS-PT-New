/**
 * tools.mjs — the MCP tool registry for Astra. Nine tools, one guarded write.
 *
 * WHY THIS IS NOT A SECOND BRAIN. Every handler here is a thin call into
 * `scripts/astra/core/`, which in turn imports the ONE compiler. Nothing in this
 * file computes a verdict. `brain.capabilities` calls `capabilities()` — the same
 * function the surface calls — so `T-I-09` ("one board serves both consumers") is
 * true by construction rather than by two implementations agreeing today.
 *
 * THE ONE WRITE. `brain.reject` is the only tool that changes anything, and it
 * requires `confirm: true`. Without it the handler returns BEFORE touching the
 * registry, so `T-I-08` is provable by inspecting the compile afterwards: the
 * outcome is still `pending`. A guard that returns an error message after writing
 * would pass a naive reading of the test and fail its point.
 *
 * WHAT IS FORBIDDEN, and why it is a list rather than a rule. `03-INTERFACE.md`
 * §4.4 forbids "any tool returning image bytes, provider credentials, or taste
 * event files; any write without `confirm`; any tool that changes canon or spec
 * mode." Those are checked against `FORBIDDEN_NAMES` at dispatch, so the refusal is
 * a line of code with a name on it rather than a reviewer's judgement. Note that
 * `brain.tuning.preview` is the counterpart: it computes what a patch WOULD do and
 * returns `wrote: false`. The preview exists so that the absence of a
 * `brain.tuning.commit` tool is a decision the operator can see, not a gap.
 *
 * TOOL_NAMES IS DERIVED FROM TOOL_SPECS. The other console's header records the
 * cost of the alternative: a prose count of the tools went stale when a tool moved
 * in, and the fix was to delete the number rather than maintain a second copy. Here
 * the list IS the specs, so there is no second copy to go stale. The remaining
 * drift risk — a spec with no handler — is caught by `verifyToolRegistry()`.
 */

import { directionsWithTiers, readBrainVersion } from '../core/brain.mjs';
import { compileAndRecord, getCompile, setOutcome } from '../core/session.mjs';
import { capabilities, capabilitySummary } from '../core/capabilities.mjs';
import { blastRadius, flattenTuning, readTuning, tuningView, BLAST_RADIUS } from '../core/tuning.mjs';
import { worldRoulette } from '../core/worldRoulette.mjs';
import { searchDoctrine } from '../core/doctrine.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required });

/**
 * Tool descriptors. THE SINGLE SOURCE for the surface — `TOOL_NAMES` is derived.
 * Order is presentation order and is what `--list-tools` prints.
 */
export const TOOL_SPECS = Object.freeze([
  {
    name: 'brain.directions',
    description: 'Gate 0. Three (or two) distinct visual directions for a brief, with the tier '
      + 'rule applied honestly: a direction backed by at least two of Sean\'s own picks is '
      + '`evidence`, everything else is `prior` and says so. Free — no provider call, no spend.',
    inputSchema: obj({ brief: { type: 'object' }, n: { type: 'number', enum: [2, 3] } }),
  },
  {
    name: 'brain.compile',
    description: 'Compile a brief. Returns the compile id and every LAW check with its verdict. '
      + 'A blocked compile is still returned and registered — a refusal is a readable artifact, '
      + 'not an error. Free.',
    inputSchema: obj({ brief: { type: 'object' }, caps: { type: 'object' } }),
  },
  {
    name: 'brain.explain',
    description: 'The reasoning behind a compile: slots, facets, every lawCheck, seed, provider '
      + 'and brain version. A check that did not run is `passed: null` — NOT OBSERVED, never a pass.',
    inputSchema: obj({ compileId: { type: 'string' } }, ['compileId']),
  },
  {
    name: 'brain.capabilities',
    description: 'The honest capability board: every lane with ACTIVE / REFUSED / RETIRED / '
      + 'DISABLED and the reason. A lane whose marker cannot be found is INCONCLUSIVE, never '
      + 'silently dropped. Same source as the console surface.',
    inputSchema: obj({}),
  },
  {
    name: 'brain.tuning.get',
    description: 'The current tuning knobs, flattened to dotted keys, plus the blast-radius '
      + 'catalogue. Read-only.',
    inputSchema: obj({}),
  },
  {
    name: 'brain.tuning.preview',
    description: 'What a tuning patch WOULD change: the resulting values, the changed keys, and '
      + 'the blast radius of each. WRITES NOTHING — returns `wrote: false`. There is deliberately '
      + 'no commit tool; committing is a dial on the console surface, not an MCP call.',
    inputSchema: obj({ patch: { type: 'object' } }, ['patch']),
  },
  {
    name: 'brain.worlds',
    description: 'The World Engine catalogue (18 DNA recipes in 5 families) and a deterministic '
      + 'seeded draw using the catalogue\'s own `world-roulette.v1`. Same seed gives the same '
      + 'draw. Reports which eligibility stages it did NOT evaluate rather than assuming they passed.',
    inputSchema: obj({
      seed: { type: 'string' },
      n: { type: 'number', enum: [2, 3, 5] },
      recentUse: { type: 'array', items: { type: 'string' } },
      surface: { type: 'string', enum: ['swan-brand', 'non-swan-factory'] },
    }),
  },
  {
    name: 'brain.doctrine',
    description: 'Search the design-brain doctrine corpus. Every hit carries file:line so a claim '
      + 'can be followed to its source. `complete` is false when the search stopped early or part '
      + 'of the tree could not be read — a read failure is never reported as an empty result.',
    inputSchema: obj({ query: { type: 'string' }, limit: { type: 'number' } }, ['query']),
  },
  {
    name: 'brain.reject',
    description: 'THE ONLY WRITE. Records `rejected_all` against a compile id. Requires '
      + '`confirm: true`; without it the call is refused and NOTHING is written.',
    inputSchema: obj({ compileId: { type: 'string' }, confirm: { type: 'boolean' } }, ['compileId']),
  },
]);

/** Derived, so it cannot drift from `TOOL_SPECS`. */
export const TOOL_NAMES = Object.freeze(TOOL_SPECS.map((t) => t.name));

/**
 * Names that must never appear on this surface. Checked at dispatch, so a future
 * edit that registers one fails loudly instead of shipping a capability.
 */
export const FORBIDDEN_NAMES = Object.freeze([
  'brain.image', 'brain.imageBytes', 'brain.render', 'brain.generate', 'brain.spend',
  'brain.taste', 'brain.taste.write', 'brain.taste.events', 'brain.profile.write',
  'brain.credentials', 'brain.provider.key', 'brain.env',
  'brain.canon.write', 'brain.specMode.set', 'brain.specMode.enable',
  'brain.tuning.commit', 'brain.tuning.write', 'brain.variants.write',
  'brain.law.override', 'brain.law.ignore', 'brain.accept',
]);

const HANDLERS = {
  'brain.directions': (args) => ({
    brainVersion: readBrainVersion(),
    directions: directionsWithTiers(args.brief ?? {}, args.n ?? 3, args.evidence ?? {}),
  }),

  'brain.compile': (args) => {
    const r = compileAndRecord(args.brief ?? {}, args.caps ?? {});
    return {
      compileId: r.compileId,
      ok: r.ok,
      lawChecks: r.view.lawChecks,
      view: r.view,
      error: r.error ? { code: r.error.code ?? 'E_COMPILE_FAILED', message: r.error.message } : null,
    };
  },

  'brain.explain': (args) => {
    const entry = getCompile(args.compileId);
    return {
      compileId: entry.compileId, ok: entry.ok, outcome: entry.outcome,
      createdAt: entry.createdAt, view: entry.view,
    };
  },

  'brain.capabilities': () => ({ lanes: capabilities(), summary: capabilitySummary() }),

  'brain.tuning.get': () => ({ view: tuningView(), blastRadiusCatalog: BLAST_RADIUS }),

  /**
   * No write, and the shape says so. Unknown keys are reported rather than
   * silently merged: a patch naming a knob that does not exist is how a caller
   * discovers they are editing the wrong file, and dropping it quietly would
   * turn their typo into a no-op that looks like a success.
   */
  'brain.tuning.preview': (args) => {
    const patch = args.patch ?? {};
    const current = flattenTuning(readTuning());
    const unknownKeys = Object.keys(patch).filter((k) => !(k in current));
    const changedKeys = Object.keys(patch).filter((k) => k in current && patch[k] !== current[k]);
    const next = { ...current };
    for (const k of Object.keys(patch)) if (k in current) next[k] = patch[k];
    return {
      state: 'preview', wrote: false, current, next, patch, changedKeys, unknownKeys,
      blastRadius: blastRadius(changedKeys),
    };
  },

  'brain.worlds': (args) => worldRoulette({
    seed: args.seed, n: args.n, recentUse: args.recentUse, surface: args.surface,
  }),

  'brain.doctrine': (args) => searchDoctrine({ query: args.query, limit: args.limit }),

  'brain.reject': (args) => {
    // The guard comes FIRST. Nothing above this line touches the registry, so a
    // refused call leaves `outcome: 'pending'` — which is what T-I-08 inspects.
    if (args.confirm !== true) {
      return {
        refused: true,
        wrote: false,
        error: {
          code: 'E_CONFIRM_REQUIRED',
          message: 'brain.reject records `rejected_all` against a compile and requires '
            + '`confirm: true`. Nothing was written.',
          hint: 'Re-send as {"compileId": "...", "confirm": true} to record the rejection.',
        },
      };
    }
    const entry = setOutcome(args.compileId, 'rejected_all');
    return {
      ok: true, wrote: true, compileId: entry.compileId,
      outcome: entry.outcome, createdAt: entry.createdAt,
    };
  },
};

/**
 * Registry consistency, callable from a test.
 *
 * `TOOL_NAMES` cannot drift from `TOOL_SPECS` (it is derived). What CAN drift is a
 * spec with no handler, or a handler with no spec — a tool that lists and then
 * fails at dispatch. Returns the discrepancies instead of throwing, so a test can
 * assert on the shape of the failure.
 */
export function verifyToolRegistry() {
  const specNames = new Set(TOOL_NAMES);
  const handlerNames = new Set(Object.keys(HANDLERS));
  return {
    ok: TOOL_NAMES.length === TOOL_SPECS.length
      && [...specNames].every((n) => handlerNames.has(n))
      && [...handlerNames].every((n) => specNames.has(n)),
    count: TOOL_NAMES.length,
    specsWithoutHandler: [...specNames].filter((n) => !handlerNames.has(n)),
    handlersWithoutSpec: [...handlerNames].filter((n) => !specNames.has(n)),
    forbiddenRegistered: TOOL_NAMES.filter((n) => FORBIDDEN_NAMES.includes(n)),
  };
}

/**
 * Run one tool. NEVER throws: a failure is returned as `{ error }`, because the
 * transport must survive a bad tool call (property 1 of `server.mjs`).
 */
export async function callTool(name, args = {}) {
  if (typeof name !== 'string') {
    return { error: { code: 'E_TOOL_NAME', message: 'tool name must be a string' } };
  }
  if (FORBIDDEN_NAMES.includes(name)) {
    return {
      error: {
        code: 'E_TOOL_FORBIDDEN',
        message: `${name} is forbidden on this surface: no image bytes, no credentials, no taste `
          + 'files, no canon or spec-mode writes, and no unconfirmed write.',
      },
    };
  }
  const handler = HANDLERS[name];
  if (!handler) {
    return {
      error: {
        code: 'E_TOOL_UNKNOWN',
        message: `unknown tool: ${name}`,
        hint: `available: ${TOOL_NAMES.join(', ')}`,
      },
    };
  }
  try {
    return await handler(args && typeof args === 'object' ? args : {});
  } catch (err) {
    return { error: { code: err?.code ?? 'E_TOOL_FAILED', message: String(err?.message ?? err) } };
  }
}
