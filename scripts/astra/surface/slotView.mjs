/**
 * slotView.mjs — the SLOT PROJECTION: the compiler's 12-slot object, shaped for a
 * surface.
 *
 * SPLIT FROM `api.mjs` for Rule 4, at a seam that is real rather than convenient:
 * `api.mjs` dispatches ROUTES, this file shapes SLOTS. The projection has three
 * consumers now — the Think pane's `RESOLVED SLOTS` table, the Compose pane's
 * override editor, and any test that wants the view shape without a server — and
 * none of them is a route.
 *
 * `SLOT_ORDER` lives here rather than in the route table because it is a fact about
 * the COMPILER, not about HTTP. `resolveSlots` defines the slots; this is that same
 * list, named once, so a slot added to the compiler cannot appear in the API's
 * validation set and be missing from the table the operator edits.
 */

import { resolveSlots } from '../core/brain.mjs';

/** The 12 slot keys, in the compiler's own order. */
export const SLOT_ORDER = Object.freeze([
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

/**
 * The table the OVERRIDE EDITOR renders: each slot's EFFECTIVE value plus the
 * BASELINE it was resolved from, and whether an override is what makes them differ.
 *
 * BOTH VALUES ARE NECESSARY, and this is the reason the editor can be undone one
 * field at a time. The effective value is what the operator sees and edits; the
 * baseline is what the client diffs against to compute the complete override set.
 * Without the baseline, editing a slot back to its resolved value would look
 * unchanged to the client and the override would stay — the field would appear to
 * ignore the edit.
 *
 * `resolveSlots` applies `slotOverrides` LAST, so calling it twice — once with the
 * overrides and once without — is exactly the pair the editor needs, and it uses
 * the compiler's own resolution rather than a second implementation of it.
 */
export function slotsForEditor(brief, overrides = {}) {
  const baseline = slotsFromBrief(brief);
  const effective = slotsFromBrief({ ...brief, slotOverrides: overrides });
  const staged = new Set(Object.keys(overrides));
  return effective.map((s, i) => ({
    ...s,
    baseline: baseline[i].value,
    overridden: staged.has(s.key),
  }));
}
