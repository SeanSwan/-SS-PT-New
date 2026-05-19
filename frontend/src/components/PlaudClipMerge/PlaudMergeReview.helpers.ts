import type { PlaudDateSplitSegment } from '../../services/plaudMergeService';
import { safePlaudActionErrorMessage } from './plaudSafeErrorText';

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  return safePlaudActionErrorMessage(err, fallback);
}

export function isRealIsoDate(value?: string): boolean {
  if (!value || !ISO_DATE_ONLY_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidSegmentDateOverride(value?: string): boolean {
  return isRealIsoDate(value);
}

export function isSegmentDateOverrideFuture(value: string | undefined, referenceDate: string | undefined): boolean {
  if (!isRealIsoDate(value) || !isRealIsoDate(referenceDate)) return false;
  return value! > referenceDate!;
}

export function isSegmentReadyForApproval(
  segment: PlaudDateSplitSegment,
  dateOverride?: string,
): boolean {
  if (!segment.futureDateBlocked && !segment.needsDateConfirmation) return true;
  if (!isValidSegmentDateOverride(dateOverride)) return false;
  if (!isRealIsoDate(segment.referenceDate)) return false;
  return !isSegmentDateOverrideFuture(dateOverride, segment.referenceDate);
}

export function buildEffectiveSegment(
  segment: PlaudDateSplitSegment,
  dateOverride?: string,
): PlaudDateSplitSegment {
  if (!dateOverride || !isSegmentReadyForApproval(segment, dateOverride)) {
    return segment;
  }

  return {
    ...segment,
    date: dateOverride,
    dateSource: 'trainer_override',
    dateConfidence: 'trainer_confirmed',
    needsDateConfirmation: false,
    futureDateBlocked: false,
    evidence: 'trainer confirmed date',
  };
}
