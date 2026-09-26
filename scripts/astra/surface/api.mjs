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
import { tuningView, readTuning, flattenTuning } from '../core/tuning.mjs';
import { readFileSync } from 'node:fs';
import { TUNING_PATH } from '../core/paths.mjs';
import { commitStaged, revertLast, applyPatch } from '../core/tuningStage.mjs';
import { previewStaged } from '../core/tuningPreview.mjs';

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

  /**
   * Classify a thrown value for the wire.
   *
   * A DOMAIN REFUSAL carries its own `E_`-prefixed `.code` — `E_TUNING_KEY_UNKNOWN`,
   * `E_LAW_VIOLATION`, `E_COMPILE_UNKNOWN`. Those are verdicts about the operator's
   * input, and the route's own status is the right one for them.
   *
   * Anything else — a `ReferenceError` from a typo, a `TypeError` from a bad
   * assumption, an `ENOENT` from a missing file — is a BUG in this process, not a
   * verdict. Reporting it under a domain code and a 4xx is the worst of both worlds:
   * the operator is told their request was refused when in fact the console is
   * broken, and the bug hides behind a plausible-looking refusal.
   *
   * A4 found this the hard way. `TUNING_PATH` was used in this file without being
   * imported, and `?? 'E_TUNING_STAGE'` reported the resulting `ReferenceError` as a
   * 400 domain refusal — a perfect impression of the gate working. The smoke runner
   * caught it only because it checks the CODE and not just the status, and only
   * because a second check happened to depend on the first having done its job.
   *
   * So: an unrecognised throw is a 500 named `E_ASTRA_INTERNAL`, which reads as what
   * it is. It can never be mistaken for a refusal, by a test or by Sean.
   */
  const domainError = (e, status) => {
    if (e && typeof e.code === 'string' && e.code.startsWith('E_')) {
      return fail(status, e.code, e.message);
    }
    return fail(500, 'E_ASTRA_INTERNAL',
      `${e?.name ?? 'Error'}: ${e?.message ?? String(e)}`);
  };

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
      return domainError(e, 400);
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
      return domainError(e, 400);
    }
  }

  // --- Read-only views ------------------------------------------------------
  if (route === 'explain') {
    try {
      const entry = getCompile(body.compileId);
      return ok({ compileId: entry.compileId, ok: entry.ok, outcome: entry.outcome, view: entry.view });
    } catch (e) {
      return domainError(e, 404);
    }
  }

  if (route === 'capabilities') return ok({ lanes: capabilities(), summary: capabilitySummary() });

  if (route === 'tuning') {
    try {
      // THE VIEW MUST CARRY THE SESSION'S STAGE, not a fresh empty one. `tuningView()`
      // describes the config ON DISK and hard-codes `staged: {}` — correct for a
      // stateless read, but this route is not stateless: the same `state` object that
      // `tuning-stage` just wrote to is in scope here.
      //
      // A4 found this while writing the route test. After staging `mergeBand.low`, the
      // pane said `STAGED (1)` and this endpoint said `staged: {}, changedKeys: []`.
      // Both cannot be right, and the API is the one that lies: a client polling it
      // would conclude nothing was staged and could commit nothing, or worse, believe a
      // staged change had already been discarded. Same defect family as `T-M-03` — a
      // view stating an all-clear the data does not support.
      const live = tuningView();
      const staged = state.staged ?? {};
      const stagedKeys = Object.keys(staged);
      const preview = stagedKeys.length ? previewStaged({ staged }) : null;
      return ok({
        view: {
          ...live,
          staged,
          changedKeys: stagedKeys,
          blastRadius: preview?.blastRadius ?? [],
          note: state.note ?? '',
          lastCommit: state.lastCommit ?? null,
          state: stagedKeys.length ? 'staged' : 'live',
        },
        preview,
      });
    } catch (e) {
      return domainError(e, 500);
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
      return domainError(e, 404);
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

  // --- The Tune commit path (A4) -------------------------------------------
  // These routes are now REAL, and each one is guarded by the mutation token at the
  // transport layer (`MUTATION_ROUTES`). The staging state lives on `state`, which is the
  // server's per-session object — staging writes NOTHING to disk, which is what makes the
  // preview meaningful and the commit a separate, deliberate act.
  if (route === 'tuning') {
    const flat = flattenTuning(readTuning());
    return ok({
      view: { current: flat, staged: state.staged ?? {}, note: state.note ?? '', lastCommit: state.lastCommit ?? null },
      preview: state.staged && Object.keys(state.staged).length
        ? previewStaged({ staged: state.staged }) : null,
    });
  }

  if (route === 'tuning-stage') {
    // DISCARD: an empty patch clears the stage rather than erroring, because "clear what I
    // staged" is the operator's most likely intent and a refusal here would be pedantry.
    const patch = body.staged ?? {};
    if (Object.keys(patch).length === 0) {
      state.staged = {};
      return ok({ staged: {}, cleared: true, preview: null });
    }
    try {
      // VALIDATE THE PATCH THE SAME WAY THE COMMIT WILL, BEFORE ACCEPTING IT.
      // `previewStaged` alone does not do this: an unknown key like `nope.missing` is
      // harmlessly ignored by the scorer, so the preview succeeds and the stage is
      // accepted — and the operator only discovers the typo when they press COMMIT,
      // after writing a note. A validation that runs at the wrong time is a validation
      // that wastes the operator's work. `applyPatch` is the same pure validator the
      // commit path uses, so the two can never disagree about what is acceptable.
      applyPatch(readFileSync(TUNING_PATH, 'utf8'), patch);
      const preview = previewStaged({ staged: patch });
      state.staged = { ...(state.staged ?? {}), ...patch };
      if (typeof body.note === 'string') state.note = body.note;
      return ok({ staged: state.staged, preview });
    } catch (e) {
      return domainError(e, 400);
    }
  }

  if (route === 'tuning-commit') {
    const staged = state.staged ?? {};
    if (Object.keys(staged).length === 0) {
      return fail(400, 'E_TUNING_NO_CHANGES', 'nothing is staged — there is nothing to commit');
    }
    try {
      const r = commitStaged({ staged, note: body.note ?? state.note });
      state.staged = {};
      state.note = '';
      state.lastCommit = { hashBefore: r.hashBefore, hashAfter: r.hashAfter, changedKeys: r.changedKeys };
      return ok({
        wrote: true, changedKeys: r.changedKeys,
        hashBefore: r.hashBefore, hashAfter: r.hashAfter,
        // The consequence, repeated in the response so a caller cannot report a successful
        // commit without also having been told what it moved.
        blastRadius: r.record.blastRadius,
      });
    } catch (e) {
      return domainError(e, 400);
    }
  }

  if (route === 'tuning-revert') {
    try {
      const r = revertLast();
      state.staged = {};
      state.lastCommit = { reverted: true, hash: r.hash, changedKeys: r.changedKeys };
      return ok({ wrote: true, reverted: true, hash: r.hash, restoredFrom: r.restoredFrom });
    } catch (e) {
      return domainError(e, 400);
    }
  }

  return fail(404, 'E_NO_ROUTE', `no api route named ${JSON.stringify(route)}`);
}

export { SLOT_ORDER };
