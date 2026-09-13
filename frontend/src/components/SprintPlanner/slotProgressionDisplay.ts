/**
 * ============================================================================
 * FILE: frontend/src/components/SprintPlanner/slotProgressionDisplay.ts
 *
 * PURPOSE: turn a generated class's `progression` record into the lines a trainer reads.
 *
 * WHY THIS EXISTS (contract §6 lines 265 and 270)
 *   The server has recorded the work-interval decision since H20, but nothing DISPLAYED it: a
 *   paced week (EMOM / Tabata / AMRAP / pyramid) kept its exact protocol and said so only in a
 *   field nobody rendered, and §6 line 270 explicitly requires that an unsupported automatic
 *   progression be reported as a truthful capability limit with a TRAINER-REVIEW reason rather
 *   than silently doing nothing. §6 line 265 likewise requires the actual work seconds
 *   before/after to be shown.
 *
 * PURE ON PURPOSE
 *   No React, no styled-components, no fetching: the mapping from record to copy is where the
 *   truthfulness lives, so it is the part that must be directly testable.
 *
 * IT NEVER INVENTS A NUMBER. Every value shown comes from the record; when a field is absent,
 * the line is omitted rather than filled with a default the class never had.
 * ============================================================================
 */

/** The `progression` record shape the server persists on `slot.generatedClassData`. */
export interface SlotProgressionRecord {
  mode?: string;
  source?: string;
  requestedModifier?: number;
  baseWorkSec?: number;
  appliedWorkSec?: number;
  proposedWorkSec?: number;
  baseWorkTotalSec?: number | null;
  appliedWorkTotalSec?: number | null;
  applied?: boolean;
  reason?: string;
  budgetStatus?: string;
  budgetNotCheckedReason?: string | null;
  certifiable?: boolean;
}

export type SlotProgressionTone = 'normal' | 'muted' | 'warning';

export interface SlotProgressionLine {
  label: string;
  value: string;
  tone: SlotProgressionTone;
}

export interface SlotProgressionSummary {
  lines: SlotProgressionLine[];
  /** A trainer must decide something: the server deliberately did not. */
  reviewRequired: boolean;
  /** The class is not run-ready (the same value the builder's Preflight blocks on). */
  blocked: boolean;
}

/** Human labels for the reasons the server records. No reason is silently swallowed. */
const REASON_LABELS: Record<string, string> = {
  scheduled_work_duration: 'applied to the work interval',
  budget_hold: 'held to the largest interval the requested time allows',
  budget_failure: 'the requested time cannot fit even the baseline interval',
  work_interval_ceiling: 'held at the 60-second ceiling',
  rounded_to_baseline: 'the request rounded back to the current interval',
  manual_override_preserved: 'a manually saved longer interval was preserved',
  unsupported_protocol: 'a paced protocol keeps its exact timing',
  unsupported_prescription: 'no reducible work interval in this class',
  no_change: 'no change was requested',
  invalid_modifier: 'the requested modifier was not usable',
};

const BUDGET_NOT_CHECKED_LABELS: Record<string, string> = {
  paced_protocol: 'the protocol keeps its exact timing',
  no_interval_change: 'nothing changed',
  reduction_cannot_overrun: 'a reduction cannot overrun the requested time',
  // NOT "this format does not report a work-slot count": that is false for `full_group`,
  // whose station count is 0 rather than whose per-station count is null (round 103, F8).
  // The honest claim is the one that is true for every case: the budget could not be measured.
  budget_inputs_unavailable: 'the work-block budget could not be measured for this class format',
  invalid_modifier: 'the requested modifier was not usable',
  no_reducible_interval: 'no reducible work interval in this class',
};

const seconds = (value: unknown): string | null => (
  typeof value === 'number' && Number.isFinite(value) ? `${value}s` : null
);

/**
 * Totals are shown in SECONDS, not rounded minutes (round 103, F5). §6 line 265 says "show
 * actual work seconds before/after", and rounding to minutes made a REAL small increase render
 * as no change at all — e.g. a 30s → 31s change over 40 slots is 1200s → 1240s, which both
 * round to "20 min".
 */
const totalSeconds = (value: unknown): string | null => {
  const asSeconds = seconds(value);
  return asSeconds ? `${asSeconds} total` : null;
};

/**
 * Build the display model, or `null` when the class carries no progression record at all.
 *
 * `null` matters: a slot generated before H20, or one whose caller passed no modifier, has
 * nothing to say about progression, and showing an empty "Progression" section would imply a
 * decision that was never made.
 */
export function buildSlotProgressionSummary(
  progression: SlotProgressionRecord | null | undefined,
  options: { explanation?: string | null } = {},
): SlotProgressionSummary | null {
  // An ARRAY passes `typeof === 'object'`, and so does an object whose keys we do not know —
  // both used to render a bare "Progression" heading implying a decision (round 103, F9).
  // The empty-lines guard at the end of this function closes that.
  if (!progression || typeof progression !== 'object' || Array.isArray(progression)) return null;

  const lines: SlotProgressionLine[] = [];
  const paced = progression.mode === 'manual_protocol';
  const certifiable = progression.certifiable;

  // ── §6 line 265: the ACTUAL work seconds, before and after ──────────────────
  const base = seconds(progression.baseWorkSec);
  const applied = seconds(progression.appliedWorkSec);
  if (base) {
    const changed = progression.applied === true && applied && applied !== base;
    lines.push({
      label: 'Work interval',
      value: changed
        ? `${base} → ${applied}`
        : `${base} (unchanged)`,
      tone: changed ? 'normal' : 'muted',
    });
  }
  // §6 line 264 can HOLD an increase below what was proposed. That number was recorded and
  // never shown, so the held request was dropped from the trainer's view (round 103, F5).
  const proposed = seconds(progression.proposedWorkSec);
  if (proposed && applied && proposed !== applied) {
    lines.push({ label: 'Proposed', value: `${proposed} (not applied)`, tone: 'muted' });
  }
  if (progression.applied === true) {
    const beforeTotal = totalSeconds(progression.baseWorkTotalSec);
    const afterTotal = totalSeconds(progression.appliedWorkTotalSec);
    if (beforeTotal && afterTotal) {
      lines.push({ label: 'Total work', value: `${beforeTotal} → ${afterTotal}`, tone: 'muted' });
    }
  }

  // ── §6 line 257-ish: the REQUESTED modifier is shown, not just the outcome ──
  if (typeof progression.requestedModifier === 'number' && Number.isFinite(progression.requestedModifier)) {
    lines.push({
      label: 'Requested',
      value: `${progression.requestedModifier}× week modifier`,
      tone: 'muted',
    });
  }

  const reason = typeof progression.reason === 'string' ? REASON_LABELS[progression.reason] : null;
  if (reason) lines.push({ label: 'Outcome', value: reason, tone: 'normal' });

  // ── §6 line 270: a paced protocol is a CAPABILITY LIMIT, not a silent no-op ──
  if (paced) {
    lines.push({
      label: 'Protocol',
      value: 'kept exactly as prescribed — automatic progression does not apply',
      tone: 'normal',
    });
  }

  // ── §6 line 264 + F2: the budget disposition, including "not checked" ───────
  if (progression.budgetStatus === 'not_checked') {
    const why = typeof progression.budgetNotCheckedReason === 'string'
      ? BUDGET_NOT_CHECKED_LABELS[progression.budgetNotCheckedReason] ?? 'no reason recorded'
      : 'no reason recorded';
    lines.push({ label: 'Time budget', value: `not verified — ${why}`, tone: 'muted' });
  } else if (progression.budgetStatus === 'budget_hold') {
    lines.push({ label: 'Time budget', value: 'held to fit the requested class time', tone: 'normal' });
  }

  if (certifiable === false) {
    lines.push({
      label: 'Not run-ready',
      value: 'the requested class time cannot fit even the baseline work interval',
      tone: 'warning',
    });
  }

  // §6 line 258's compatibility inference, as the SERVER recorded it. The generator writes it
  // into the class's persisted `explanations`, and until this parameter existed nothing
  // displayed it: the text was true in the database and invisible at the trainer's screen
  // (external review, round 103, MED-2).
  const explanation = typeof options.explanation === 'string' ? options.explanation.trim() : '';
  if (explanation) lines.push({ label: 'Week note', value: explanation, tone: 'muted' });

  // Nothing recognisable to say → show NOTHING. An empty section is indistinguishable from a
  // decision, which is the one thing this module must never imply (round 103, F9).
  if (lines.length === 0) return null;

  return {
    lines,
    reviewRequired: paced || certifiable === false,
    blocked: certifiable === false,
  };
}

export default buildSlotProgressionSummary;
