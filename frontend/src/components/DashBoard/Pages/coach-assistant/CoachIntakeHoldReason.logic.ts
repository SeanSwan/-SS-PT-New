/**
 * CoachIntakeHoldReason.logic.ts
 * ==============================
 * Shared PII-safe hold-reason display helpers for Coach intake surfaces.
 */
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';

const SAFE_HOLD_REASON_LABELS = new Set([
  'Client confirmation needed',
  'Clarification required',
  'Possible duplicate workout',
]);

const SAFE_HOLD_REASON_DETAILS = new Set([
  'Coach needs one answer before this intake can move to draft review.',
  'Compare this intake with existing logs before approving.',
  'Choose from the shortlisted client candidates before preparing a draft.',
  'Same client/date fingerprint matched existing workout logs.',
]);

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function factCount(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function confidenceLabel(value: string | null | undefined): string | null {
  if (!value || value === 'unknown') return null;
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()} confidence`;
}

export function safeHoldReasonLabel(item: CoachIntakeItem): string | null {
  const label = item.holdReason?.label;
  return label && SAFE_HOLD_REASON_LABELS.has(label) ? label : null;
}

export function safeHoldReasonDetail(item: CoachIntakeItem): string | null {
  if (!safeHoldReasonLabel(item)) return null;
  const detail = item.holdReason?.detail;
  if (typeof detail !== 'string') return null;
  const text = detail.replace(/[\r\n\t`\\]/g, ' ').trim();
  return SAFE_HOLD_REASON_DETAILS.has(text) ? text : null;
}

export function holdReasonFacts(item: CoachIntakeItem): string[] {
  const label = safeHoldReasonLabel(item);
  const reason = label ? item.holdReason : null;
  if (!reason) return [];
  const facts: string[] = [];
  const candidateCount = factCount(reason.candidateCount);
  const duplicateCount = factCount(reason.duplicateCount);
  const confidence = confidenceLabel(reason.confidenceBand || null);
  if (candidateCount) facts.push(plural(candidateCount, 'candidate'));
  if (duplicateCount) facts.push(`${duplicateCount} possible ${duplicateCount === 1 ? 'match' : 'matches'}`);
  if (confidence) facts.push(confidence);
  return facts;
}
