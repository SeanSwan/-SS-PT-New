/**
 * swanExplain.mjs — the "Why this?" view.
 *
 * `forge-compiler-contract.md` §6 specifies `explain(record)` and says what it is
 * for: *"human-readable, powers 'Why this?'"*. The compiler has always RETURNED
 * `lawChecks`, `slots` and `facetsApplied` — and nothing ever rendered them. So the
 * brain's reasoning was real, correct, and invisible. This module is the renderer.
 *
 * DERIVED, NEVER A SECOND LOG. Everything here comes out of the record the compile
 * already produced. There is no parallel reasoning file to disagree with, so this
 * view cannot confidently explain something that did not happen. If a fact is not
 * on the record, it is reported as NOT OBSERVED rather than assumed.
 *
 * THAT LAST RULE IS THE WHOLE POINT. A blocked compile carries `violations` but no
 * `checks` — so five of the six laws were never observed. Marking them "passed"
 * because the one we can see failed would be the exact defect class this repo has
 * spent the engagement fixing: *a check that cannot RUN must not read as a check
 * that FOUND something.* Unobserved is `null`, and the UI says so.
 *
 * Split from swanPromptCompiler.mjs at the 300-line cap (rule 4), matching the seam
 * swanVocabulary.mjs documents. Re-exported from the compiler so the CLI and MCP
 * get it from one import path.
 */

import { FACETS } from './swanVocabulary.mjs';
import { LAW_NAMES } from './swanLawFilter.mjs';

/**
 * Capabilities, with the rule the compiler actually applies made visible.
 *
 * `seedIsDeterministic` and `honorsNegativePrompt` are tri-state, and
 * `swanPromptCompiler.mjs:16-19` is explicit: *"anything not 'verified' is treated
 * as absent."* A surface that printed "claimed" without that consequence would be
 * showing a capability the system does not have — which is how a lying provider
 * silently voids the kill-list.
 */
export function explainCapabilities(caps = {}, provider, modelVersion) {
  const tri = (v) => (v === 'verified' ? 'verified' : (v === 'claimed' ? 'claimed' : 'false'));
  const seed = tri(caps.seedIsDeterministic);
  const neg = tri(caps.honorsNegativePrompt);
  return {
    provider: provider || caps.provider || 'unconfigured',
    modelVersion: modelVersion || caps.modelVersion || 'unspecified',
    seedIsDeterministic: seed,
    honorsNegativePrompt: neg,
    seedUsable: seed === 'verified',
    negativePromptUsable: neg === 'verified',
    supportsImageInit: caps.supportsImageInit === true,
    supportsInpainting: caps.supportsInpainting === true,
    supportsSeed: caps.supportsSeed === true,
    maxResolution: caps.maxResolution || null,
    supportedAspectRatios: Array.isArray(caps.supportedAspectRatios) ? caps.supportedAspectRatios : [],
    attribution: caps.attribution || null,
  };
}

/**
 * The 12 slots, with a REASON for every empty one.
 *
 * A blank cell reads as a bug. Slot 2 in particular is *"often deliberately empty
 * (pure phenomenon)"* per the contract, and `FACETS['Form>Abstract']` sets
 * `subject: ''` on purpose. So an empty slot that a facet emptied is labelled as
 * deliberate and NAMES the facet; only a genuinely unset slot says "not set".
 */
export function explainSlots(slots = {}, facetsApplied = []) {
  const emptiedBy = {};
  for (const f of facetsApplied) {
    const patch = FACETS[f];
    if (!patch) continue;
    for (const [k, v] of Object.entries(patch)) {
      if (v === '') (emptiedBy[k] = emptiedBy[k] || []).push(f);
    }
  }
  const entries = Object.entries(slots).map(([key, raw]) => {
    const value = String(raw ?? '');
    const empty = value.trim() === '';
    let emptyReason = null;
    if (empty) {
      emptyReason = emptiedBy[key] && emptiedBy[key].length
        ? `deliberately emptied by ${emptiedBy[key].join(', ')} — pure phenomenon`
        : 'not set by this brief';
    }
    return { key, value, empty, emptyReason };
  });
  return { entries, emptyKeys: entries.filter((e) => e.empty).map((e) => e.key) };
}

/**
 * Merge the two law sources into one honest table.
 *
 * `applyLaws` returns `checks` = `[{law, passed}]` — NO detail — and separately
 * `violations` = `[{law, slot, detail}]`. Both are needed: `checks` proves a law
 * RAN, `violations` explains a failure. A table built from only one of them is
 * either unexplained or incomplete.
 *
 * `passed: null` means NOT OBSERVED. It is never a pass.
 */
export function explainLawChecks(checks = [], violations = []) {
  const byLaw = new Map();
  for (const v of violations) if (!byLaw.has(v.law)) byLaw.set(v.law, v);
  const rows = [];
  const known = new Set();

  for (const law of LAW_NAMES) {
    const check = checks.find((c) => c.law === law);
    const v = byLaw.get(law);
    known.add(law);
    rows.push({
      law,
      passed: check ? check.passed : (v ? false : null),
      detail: v ? v.detail : null,
      slot: v ? v.slot : null,
      observed: Boolean(check) || Boolean(v),
    });
  }
  // A law the compiler reported that this module does not know about is SHOWN,
  // not dropped. A table that silently omits an unknown law is a table that will
  // silently omit the next one added.
  for (const c of checks) {
    if (known.has(c.law)) continue;
    rows.push({ law: c.law, passed: c.passed, detail: null, slot: null, observed: true });
  }
  return rows;
}

/**
 * Build the ExplainView for a compile result OR a blocked compile.
 *
 * @param {object} input  a `CompiledPrompt`, or the `E_LAW_VIOLATION` error thrown
 *                        by `compileImage`
 * @param {object} [opts]
 * @param {object} [opts.caps]  the ProviderCapabilities used for the compile
 */
export function explain(input, opts = {}) {
  const caps = opts.caps || {};

  if (input && input.code === 'E_LAW_VIOLATION') {
    const violations = (input.violations || []).map((v) => ({
      law: v.law, slot: v.slot, detail: v.detail,
    }));
    return {
      blocked: true,
      partial: true,
      // Named, because the view genuinely is incomplete: the compile threw before
      // it produced slots or a prompt, so this table cannot show them.
      partialReason: 'the compile was blocked, so no prompt or slot map exists for this run',
      code: input.code,
      message: input.message,
      lawChecks: explainLawChecks([], violations),
      violations,
      slots: null,
      promptText: null,
    };
  }

  if (!input || typeof input !== 'object') {
    const err = new Error('E_EXPLAIN_INPUT: explain() needs a compile result or an E_LAW_VIOLATION error');
    err.code = 'E_EXPLAIN_INPUT';
    throw err;
  }

  const slotView = explainSlots(input.slots || {}, input.facetsApplied || []);
  return {
    blocked: false,
    partial: false,
    partialReason: null,
    // Read from the record, never a literal — a hardcoded version is the drift the
    // contract's §0.5 exists to kill, and `brainVersion` is the field that lets a
    // ledger say two runs came from two different compilers.
    brainVersion: input.brainVersion ?? null,
    briefId: input.briefId ?? null,
    seed: input.seed ?? null,
    provider: input.provider || 'unconfigured',
    modelVersion: input.modelVersion || 'unspecified',
    promptStyle: input.promptStyle ?? null,
    promptText: input.promptText ?? '',
    aspect: input.aspect ?? null,
    // A typed field and its prose disagreement are DIFFERENT facts. Showing the
    // ratio without showing the divergence would hide the one case where the frame
    // the provider gets is not the frame the prompt describes.
    aspectDivergence: input.aspectDivergence ?? null,
    truncated: input.truncated === true,
    droppedSegments: Array.isArray(input.droppedSegments) ? input.droppedSegments : [],
    negativeText: input.negativeText ?? null,
    slots: slotView.entries,
    emptySlots: slotView.emptyKeys,
    facetsApplied: Array.isArray(input.facetsApplied) ? input.facetsApplied : [],
    lawChecks: explainLawChecks(input.lawChecks || [], []),
    capabilities: explainCapabilities(caps, input.provider, input.modelVersion),
  };
}
