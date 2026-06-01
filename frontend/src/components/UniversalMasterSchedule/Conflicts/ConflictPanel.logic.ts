export interface ConflictIdentity {
  type: 'hard' | 'soft';
  reason: string;
  conflictingSession?: {
    id?: number | string;
    clientName?: string;
    sessionDate?: string | Date;
  };
  suggestion?: string;
}

export interface AlternativeIdentity {
  date: Date;
  hour: number;
  label: string;
}

function keyPart(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  return raw || fallback;
}

function datePart(value: unknown, fallback: string): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }
  return keyPart(value, fallback);
}

export function getConflictKey(conflict: ConflictIdentity): string {
  const sessionId = keyPart(conflict.conflictingSession?.id, '');
  if (sessionId) {
    return `schedule-conflict|${conflict.type}|session|${sessionId}|${keyPart(conflict.reason, 'no-reason')}`;
  }

  return [
    'schedule-conflict',
    conflict.type,
    keyPart(conflict.reason, 'no-reason'),
    datePart(conflict.conflictingSession?.sessionDate, 'no-session-date'),
    keyPart(conflict.conflictingSession?.clientName, 'no-client'),
    keyPart(conflict.suggestion, 'no-suggestion'),
  ].join('|');
}

export function getAlternativeKey(alternative: AlternativeIdentity): string {
  return [
    'schedule-alternative',
    datePart(alternative.date, 'no-date'),
    keyPart(alternative.hour, 'no-hour'),
    keyPart(alternative.label, 'no-label'),
  ].join('|');
}
