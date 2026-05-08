/**
 * CoachIntakeHoldReason.logic.ts
 * ==============================
 * Shared PII-safe hold-reason display helpers for Coach intake surfaces.
 */
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';

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

export function holdReasonFacts(item: CoachIntakeItem): string[] {
  const reason = item.holdReason;
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
