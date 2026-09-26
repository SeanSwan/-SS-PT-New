/**
 * api.mjs — the `/api/*` handlers, separated from the HTTP plumbing.
 *
 * EVERY HANDLER HERE IS A THIN CALL INTO `core/`. Nothing in this file computes a
 * verdict, for the same reason `mcp/tools.mjs` does not: one brain, several
 * consumers. `capabilities()` in particular is called directly, so the board the
 * browser sees and the board the MCP server returns cannot disagree — `T-I-09`
 * asserts exactly that, across both surfaces.
 *
 * HANDLERS RETURN `{ status, body }` AND NEVER THROW. A thrown error inside a
 * request handler is a 500 with no code, which is the "Something went wrong" the
 * packet's copy rule forbids. Every failure path names its code, because
 * `E_LAW_VIOLATION` at slot 7 and `E_TUNING_INVALID` are actionable and a stack
 * trace is not.
 */

import {
  compileImage, directionsWithTiers, explain, readBrainVersion, resolveSlots,
} from '../core/brain.mjs';
import { compileAndRecord, getCompile, setOutcome } from '../core/session.mjs';
import { capabilities, capabilitySummary } from '../core/capabilities.mjs';
import { tuningView } from '../core/tuning.mjs';

/** The 12 slot keys, in the compiler's own order. */
const SLOT_ORDER = Object.freeze([
  'intent', 'subject', 'medium', 'styleAnchor', 'composition', 'optics',
  'light', 'palette', 'material', 'abstraction', 'negative', 'output',
]);

/**
 * `resolveSlots()`'s object, as the `slots[]` array `ExplainView` uses.
 *
 * The reason a slot is empty is NOT invented here. `resolveSlots` returns values,
 * not reasons; the reason is recorded by `explain()` during a compile. So before a
 * compile the copy says exactly that, rather than claiming a facet deliberately
 * emptied a slot it never touched.
 */
export function slotsFromBrief(brief) {
  const resolved = resolveSlots(brief) ?? {};
  return SLOT_ORDER.map((key) => {
    const value = resolved[key];
    const empty = value === undefined || value === null || String(value).trim() === '';
    return {
      key,
      value: empty ? '' : String(value),
      empty,
      emptyReason: empty ? 'empty at resolve time — a compile records the reason it stayed empty' : null,
    };
  });
}

/** `{ status, body }` for one API call. `state` is the server's UI state. */
export function handleApi(route, { method, body, state, now = () => Date.now() }) {
  const fail = (status, code, message) => ({ status, body: { error: { code, message } } });
  const ok = (b) => ({ status: 200, body: b });

  // --- Gate 0: free, and it must stay free ---------------------------------
  if (route === 'directions') {
    if (method !== 'POST') return fail(405, 'E_METHOD', 'POST only');
    const brief = {
      text: body.text ?? '', intent: body.intent, aspect: body.aspect, surfaceClass: body.surfaceClass,
    };
    try {
      // `directions()` is pure and zero-cost. `evidence` is NOT injected here: with
      // no injection every direction is `prior`, which is the honest cold-start
      // state. Fabricating evidence would be a lie about Sean's own picks.
      const directions = directionsWithTiers(brief, body.n ?? 3, {});
      state.brief = { ...state.brief, ...brief };
      state.directions = directions;
      return ok({ directions, brainVersion: readBrainVersion(), spent: 0, generated: 0 });
    } catch (e) {
      return fail(400, e.code ?? 'E_DIRECTIONS', e.message);
    }
  }

  // --- Compile: free, no generation ---------------------------------------
  if (route === 'compile') {
    const brief = { ...state.brief, ...(body.brief ?? {}) };
    if (body.slotOverrides) brief.slotOverrides = body.slotOverrides;
    try {
      const r = compileAndRecord(brief, body.caps ?? {});
      state.lastCompileId = r.compileId;
      // A blocked compile is a 200 with `ok: false`. It is a REPORTED outcome, not a
      // transport failure, and a 4xx here would make the Think pane show an error
      // state instead of the explanation that says which slot is at fault.
      return ok({ compileId: r.compileId, ok: r.ok, view: r.view, error: r.error
        ? { code: r.error.code ?? 'E_COMPILE_FAILED', message: r.error.message } : null });
    } catch (e) {
      return fail(400, e.code ?? 'E_COMPILE_FAILED', e.message);
    }
  }

  // --- Read-only views ------------------------------------------------------
  if (route === 'explain') {
    try {
      const entry = getCompile(body.compileId);
      return ok({ compileId: entry.compileId, ok: entry.ok, outcome: entry.outcome, view: entry.view });
    } catch (e) {
      return fail(404, e.code ?? 'E_EXPLAIN', e.message);
    }
  }

  if (route === 'capabilities') return ok({ lanes: capabilities(), summary: capabilitySummary() });

  if (route === 'tuning') {
    try {
      return ok({ view: tuningView() });
    } catch (e) {
      return fail(500, e.code ?? 'E_TUNING', e.message);
    }
  }

  if (route === 'state') {
    return ok({ brainVersion: readBrainVersion(), brief: state.brief, lastCompileId: state.lastCompileId });
  }

  // --- Reject: the one write this slice implements -------------------------
  if (route === 'reject') {
    if (method !== 'POST') return fail(405, 'E_METHOD', 'POST only');
    try {
      const entry = setOutcome(body.compileId, 'rejected_all');
      return ok({ compileId: entry.compileId, outcome: entry.outcome });
    } catch (e) {
      return fail(404, e.code ?? 'E_REJECT', e.message);
    }
  }

  // --- The billing endpoint: refused, not missing ---------------------------
  if (route === 'preview') {
    // Fail-closed, and stated. `01-REQUIREMENTS.md` INV7 and the packet's standing
    // rule: the app never fabricates generated media. There is no provider wired to
    // this console, so a preview would either spend without generating or claim a
    // render that did not happen. Both are worse than an honest refusal.
    return fail(501, 'E_GENERATION_DISABLED',
      'Preview is the only billing endpoint and no provider is wired to this console. '
      + 'Astra compiles and explains; it does not generate. Nothing was spent.');
  }

  // --- Tune commit path: A4 -------------------------------------------------
  if (route === 'tuning-stage' || route === 'tuning-commit' || route === 'tuning-revert') {
    return fail(501, 'E_NOT_BUILT',
      `${route} is slice A4. The Tune pane has no write path yet, and that is load-bearing: `
      + 'T-M-01 (a corrupt tuning.json produces a named error and NO write) is only provable '
      + 'while there is no write path to accidentally reach.');
  }

  return fail(404, 'E_NO_ROUTE', `no api route named ${JSON.stringify(route)}`);
}

export { SLOT_ORDER };
