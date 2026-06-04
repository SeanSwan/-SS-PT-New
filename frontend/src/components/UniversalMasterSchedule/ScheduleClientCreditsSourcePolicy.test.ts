import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('schedule client credits source policy wiring', () => {
  it('carries clientSource from credits API hook into schedule stats and booking modals', () => {
    const hookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionCredits.ts');
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');

    expect(hookSource).toContain("clientSource?: 'swanstudios' | 'move_fitness' | 'external' | string | null;");
    expect(hookSource).toContain('normalizeSessionCreditsPayload');
    expect(hookSource).toContain('sessionsRemaining: normalizeAvailableSessions(payload?.sessionsRemaining)');
    expect(hookSource).toContain('clientSource: payload?.clientSource ?? null');
    expect(scheduleSource).toContain('const clientSource = credits?.clientSource ?? user?.clientSource ?? null;');
    expect(scheduleSource).toContain('sessionsRemaining={sessionsRemaining}');
    expect(scheduleSource).toContain('clientSource={clientSource}');
  });

  it('hides recurring self-booking for free-tracking client sources before the backend rejects it', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalStackSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleConnectedModals.tsx');

    expect(scheduleSource).toContain("import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';");
    expect(scheduleSource).toContain("const canUseClientRecurringBooking = mode === 'client' && !isNonDeductingClientSource(clientSource);");
    expect(scheduleSource).toContain('onOpenClientRecurring={canUseClientRecurringBooking ? () => setShowClientRecurringDialog(true) : undefined}');
    expect(modalStackSource).toContain("{mode === 'client' && !isFreeTrackingBooking && (");
  });

  it('keeps the schedule shell on normalized credit counts without raw type guards', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');

    expect(scheduleSource).toContain('const lowCredits = sessionsRemaining != null && sessionsRemaining < 3;');
    expect(scheduleSource).toContain(": (sessionsRemaining ?? '--');");
    expect(scheduleSource).not.toContain("typeof sessionsRemaining === 'number'");
  });
});
