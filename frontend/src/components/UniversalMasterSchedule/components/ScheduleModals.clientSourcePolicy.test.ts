import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(resolve(__dirname, './ScheduleModals.tsx'), 'utf8');

describe('ScheduleModals client source policy', () => {
  it('uses source-aware session policy copy in the client picker', () => {
    expect(SOURCE).toContain('getClientSessionSignal');
    expect(SOURCE).toContain('const sessionSignal = getClientSessionSignal(c);');
    expect(SOURCE).toContain('subLabel: `${sessionSignal.label} - ${sessionSignal.note}`');
    expect(SOURCE).not.toContain('`${c.availableSessions} sessions remaining`');
  });

  it('locks free-tracking client self-service booking without paid-credit purchase copy', () => {
    expect(SOURCE).toContain('isNonDeductingClientSource');
    expect(SOURCE).toContain('clientSource?: string | null;');
    expect(SOURCE).toContain('const isFreeTrackingBooking = mode === \'client\' && isNonDeductingClientSource(clientSource);');
    expect(SOURCE).toContain('const isPaidCreditLocked = mode === \'client\' && !isFreeTrackingBooking && hasNoCredits;');
    expect(SOURCE).toContain('const isBookingLocked = isFreeTrackingBooking || isPaidCreditLocked;');
    expect(SOURCE).toContain('Session Tracking Only');
    expect(SOURCE).toContain('This account is tracked through Workout Logger. SwanStudios booking credits do not apply.');
    expect(SOURCE).not.toContain('title={hasNoCredits && mode === \'client\' ? \'Session Locked\' : \'Confirm Booking\'}');
  });

  it('normalizes booking credit counts before lock and recurring-booking decisions', () => {
    expect(SOURCE).toContain('normalizeAvailableSessions');
    expect(SOURCE).toContain('const normalizedSessionsRemaining = sessionsRemaining == null');
    expect(SOURCE).toContain('const hasNoCredits = normalizedSessionsRemaining != null && normalizedSessionsRemaining <= 0;');
    expect(SOURCE).toContain('After booking: {Math.max(0, normalizedSessionsRemaining - 1)}');
    expect(SOURCE).toContain('userCredits={normalizedSessionsRemaining ?? 0}');
    expect(SOURCE).not.toContain('const hasNoCredits = typeof sessionsRemaining === \'number\' && sessionsRemaining <= 0;');
    expect(SOURCE).not.toContain('userCredits={sessionsRemaining || 0}');
  });
});
