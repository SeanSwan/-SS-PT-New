/**
 * brain.mjs — Astra's ONE import path to the brain.
 *
 * "One brain, three consumers" (the backend service, the CLI, and the MCP server)
 * only holds if the consumers import the SAME symbols from the SAME place. So
 * Astra does not reach into `swanDirections.mjs` and `swanExplain.mjs` directly;
 * it takes them from the compiler, which re-exports them. If the brain ever moves
 * a primitive, one import path changes and no consumer silently keeps an old copy.
 *
 * THE VERSION IS READ, NEVER WRITTEN DOWN. `readBrainVersion()` resolves the
 * export at CALL time. A literal `'0.2.0'` anywhere in Astra would be the exact
 * drift `forge-compiler-contract.md` §0.5 exists to kill: a run record that
 * persists `brainVersion` would then be comparing two runs from two different
 * compilers while claiming they came from one. `T-U-05` asserts the literal is
 * absent from Astra's source, which is the only executable form of "read it, do
 * not write it down".
 */

import * as compiler from '../../../shared/swanPromptCompiler.mjs';

export const {
  BRAIN_VERSION,
  FACETS,
  compileImage,
  resolveSlots,
  personify,
  directions,
  explain,
} = compiler;

/**
 * The compiler's version, resolved live.
 *
 * A namespace import is used deliberately: a named import would ALSO be live, but
 * the namespace makes the "this is read at call time, not captured" property
 * visible at the call site rather than a subtlety of ESM semantics.
 */
export function readBrainVersion() {
  return compiler.BRAIN_VERSION;
}

/**
 * Compile a brief and return BOTH the result and its explanation, or neither.
 *
 * The console always needs both — a compile without an explanation is the
 * invisible reasoning this whole surface exists to fix. Returning a pair keeps the
 * caller from compiling twice and getting two different seeds.
 *
 * On a blocked compile the error is NOT swallowed: `explain()` understands an
 * `E_LAW_VIOLATION` and renders the partial view, so a refusal becomes a readable
 * artifact instead of a stack trace.
 *
 * @returns {{ok: true, compile: object, view: object} | {ok: false, error: Error, view: object}}
 */
export function compileAndExplain(brief = {}, caps = {}) {
  try {
    const compile = compileImage(brief, caps);
    return { ok: true, compile, view: explain(compile, { caps }) };
  } catch (e) {
    if (e && e.code === 'E_LAW_VIOLATION') {
      return { ok: false, error: e, view: explain(e, { caps }) };
    }
    throw e; // E_CAPABILITY_*, E_EMPTY_PROMPT etc. are NOT explainable compiles
  }
}

/**
 * Gate 0, with the tier rule applied honestly.
 *
 * `directions()` is pure and cannot know Sean's picks, so evidence must be
 * INJECTED. With no injection every direction is `prior` — which is the correct
 * cold-start state and is rendered as such, not hidden. This helper exists to make
 * that the obvious call: passing nothing yields `prior`, never a fabricated
 * `evidence` tier.
 */
export function directionsWithTiers(brief = {}, n = 3, evidence = {}) {
  return directions(brief, n, { evidence });
}
