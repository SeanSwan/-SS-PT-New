/**
 * ============================================================================
 * FILE: slotProgressionDisplay.test.ts — R-H20 (contract §6 lines 264, 265, 270).
 *
 * The mapping from the server's `progression` record to the lines a trainer reads is where the
 * truthfulness lives, so it is tested directly rather than only through the panel.
 *
 * NOTE: `frontend/tsconfig.json` EXCLUDES `**\/*.test.ts(x)`, so `tsc` does not type-check this
 * file — the run is the only evidence.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';

import { buildSlotProgressionSummary } from './slotProgressionDisplay';

describe('the progression record a trainer reads (§6 lines 265/270)', () => {
  it('shows NOTHING when the class carries no record', () => {
    // A pre-H20 slot, or a class generated with no modifier, made no decision — an empty
    // "Progression" section would imply one was made.
    expect(buildSlotProgressionSummary(undefined)).toBeNull();
    expect(buildSlotProgressionSummary(null)).toBeNull();
  });

  it('shows the ACTUAL work seconds before and after when a change was applied (§6 line 265)', () => {
    const summary = buildSlotProgressionSummary({
      mode: 'scheduled_work_duration',
      requestedModifier: 1.4,
      baseWorkSec: 30,
      appliedWorkSec: 42,
      baseWorkTotalSec: 1200,
      appliedWorkTotalSec: 1680,
      applied: true,
      reason: 'scheduled_work_duration',
      budgetStatus: 'within_budget',
    });

    expect(summary!.lines).toContainEqual({ label: 'Work interval', value: '30s → 42s', tone: 'normal' });
    expect(summary!.lines).toContainEqual({ label: 'Total work', value: '1200s total → 1680s total', tone: 'muted' });
    expect(summary!.lines).toContainEqual({ label: 'Requested', value: '1.4× week modifier', tone: 'muted' });
    expect(summary!.reviewRequired).toBe(false);
    expect(summary!.blocked).toBe(false);
  });

  it('never renders a REAL change as "20 min → 20 min" (round 103, F5)', () => {
    // The old version rounded totals to minutes: a 30s → 31s increase over 40 slots is
    // 1200s → 1240s, and BOTH round to "20 min". §6 line 265 asks for actual work SECONDS.
    const summary = buildSlotProgressionSummary({
      requestedModifier: 1.03,
      baseWorkSec: 30,
      appliedWorkSec: 31,
      baseWorkTotalSec: 1200,
      appliedWorkTotalSec: 1240,
      applied: true,
      reason: 'scheduled_work_duration',
      budgetStatus: 'within_budget',
    });

    expect(summary!.lines).toContainEqual({ label: 'Work interval', value: '30s → 31s', tone: 'normal' });
    expect(summary!.lines).toContainEqual({ label: 'Total work', value: '1200s total → 1240s total', tone: 'muted' });
  });

  it('shows a PROPOSED interval the budget refused to apply (round 103, F5)', () => {
    // The hold recorded `proposedWorkSec` and nothing displayed it, so the trainer could not
    // see that their requested increase was cut.
    const summary = buildSlotProgressionSummary({
      requestedModifier: 1.5,
      baseWorkSec: 30,
      appliedWorkSec: 35,
      proposedWorkSec: 45,
      applied: true,
      reason: 'budget_hold',
      budgetStatus: 'budget_hold',
    });

    expect(summary!.lines).toContainEqual({ label: 'Proposed', value: '45s (not applied)', tone: 'muted' });
  });

  it('says UNCHANGED rather than repeating one number as if it were a result', () => {
    const summary = buildSlotProgressionSummary({
      requestedModifier: 1,
      baseWorkSec: 30,
      appliedWorkSec: 30,
      applied: false,
      reason: 'no_change',
    });

    expect(summary!.lines).toContainEqual({ label: 'Work interval', value: '30s (unchanged)', tone: 'muted' });
    expect(summary!.lines).toContainEqual({ label: 'Outcome', value: 'no change was requested', tone: 'normal' });
  });

  it('reports a PACED protocol as a capability limit needing trainer review (§6 line 270)', () => {
    // "keep the exact protocol and return mode:'manual_protocol', applied:false with the
    // requested modifier and trainer-review reason". The record said so since H20; nothing
    // displayed it. This is the assertion that the trainer now SEES it.
    const summary = buildSlotProgressionSummary({
      mode: 'manual_protocol',
      requestedModifier: 1.2,
      baseWorkSec: 60,
      appliedWorkSec: 60,
      applied: false,
      reason: 'unsupported_protocol',
      budgetStatus: 'not_checked',
      budgetNotCheckedReason: 'paced_protocol',
    });

    expect(summary!.reviewRequired).toBe(true);
    expect(summary!.blocked).toBe(false);
    expect(summary!.lines).toContainEqual({
      label: 'Protocol',
      value: 'kept exactly as prescribed — automatic progression does not apply',
      tone: 'normal',
    });
    expect(summary!.lines).toContainEqual({ label: 'Requested', value: '1.2× week modifier', tone: 'muted' });
    expect(summary!.lines).toContainEqual({
      label: 'Outcome', value: 'a paced protocol keeps its exact timing', tone: 'normal',
    });
    // A 60s EMOM must not be shown as having become a 90s minute.
    expect(summary!.lines).toContainEqual({ label: 'Work interval', value: '60s (unchanged)', tone: 'muted' });
  });

  it('surfaces an UNVERIFIED budget instead of leaving it invisible (F2)', () => {
    const summary = buildSlotProgressionSummary({
      requestedModifier: 1.4,
      baseWorkSec: 40,
      appliedWorkSec: 56,
      applied: true,
      reason: 'scheduled_work_duration',
      budgetStatus: 'not_checked',
      budgetNotCheckedReason: 'budget_inputs_unavailable',
    });

    expect(summary!.lines).toContainEqual({
      label: 'Time budget',
      value: 'not verified — the work-block budget could not be measured for this class format',
      tone: 'muted',
    });
  });

  it('marks a NOT RUN-READY class loudly, and does not claim a change it did not make', () => {
    const summary = buildSlotProgressionSummary({
      requestedModifier: 1.4,
      baseWorkSec: 50,
      appliedWorkSec: 50,
      applied: false,
      reason: 'budget_failure',
      budgetStatus: 'budget_failure',
      certifiable: false,
    });

    expect(summary!.blocked).toBe(true);
    expect(summary!.reviewRequired).toBe(true);
    expect(summary!.lines).toContainEqual({
      label: 'Not run-ready',
      value: 'the requested class time cannot fit even the baseline work interval',
      tone: 'warning',
    });
    expect(summary!.lines).toContainEqual({ label: 'Work interval', value: '50s (unchanged)', tone: 'muted' });
  });

  it('never invents a number the record does not carry', () => {
    // Only a mode and a reason: everything numeric is absent, so the line set is EXACTLY the
    // two non-numeric ones. The earlier version asserted `not.toMatch(/\d/)` on the assembled
    // values, which cannot fail on an invented non-numeric value such as "60 sec" — a vacuous
    // guard (external review, round 103, F11).
    const summary = buildSlotProgressionSummary({ mode: 'manual_protocol', applied: false });

    expect(summary!.lines).toEqual([
      { label: 'Protocol', value: 'kept exactly as prescribed — automatic progression does not apply', tone: 'normal' },
    ]);
    expect(summary!.lines.map((line) => line.label)).toEqual(['Protocol']);
  });

  it('shows NOTHING for a record it cannot read, rather than a bare heading (round 103, F9)', () => {
    // `[]` passes `typeof === 'object'`, and so does an object of keys we do not know. Both
    // used to render an empty "Progression" section — the one thing that implies a decision.
    expect(buildSlotProgressionSummary([] as never)).toBeNull();
    expect(buildSlotProgressionSummary({ policyVersion: 'progressionPolicyV1' } as never)).toBeNull();
    expect(buildSlotProgressionSummary({} as never)).toBeNull();
  });

  it('carries the week note the SERVER recorded, so the inference is on screen (round 103, F2)', () => {
    const summary = buildSlotProgressionSummary(
      { requestedModifier: 1.05, baseWorkSec: 30, appliedWorkSec: 32, applied: true, reason: 'scheduled_work_duration' },
      { explanation: 'Week 2 intensity modifier 1.05 (from the undulating strategy) — no intensity category applied.' },
    );

    expect(summary!.lines).toContainEqual({
      label: 'Week note',
      value: 'Week 2 intensity modifier 1.05 (from the undulating strategy) — no intensity category applied.',
      tone: 'muted',
    });
    // An absent or non-string explanation adds nothing at all.
    expect(buildSlotProgressionSummary({ reason: 'no_change' }, { explanation: null })!.lines)
      .not.toContainEqual(expect.objectContaining({ label: 'Week note' }));
  });

  it('names every reason it can receive rather than printing a machine token', () => {
    // A raw `budget_inputs_unavailable` in front of a trainer is a leak of our vocabulary, not
    // a review reason. Every reason the server can record has human copy.
    for (const reason of [
      'scheduled_work_duration', 'budget_hold', 'budget_failure', 'work_interval_ceiling',
      'rounded_to_baseline', 'manual_override_preserved', 'unsupported_protocol',
      'unsupported_prescription', 'no_change', 'invalid_modifier',
    ]) {
      const summary = buildSlotProgressionSummary({ reason, baseWorkSec: 30, applied: false });
      const outcome = summary!.lines.find((line) => line.label === 'Outcome');
      expect(outcome, reason).toBeDefined();
      expect(outcome!.value, reason).not.toBe(reason);
      expect(outcome!.value, reason).not.toMatch(/_/);
    }
  });
});
