import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readScheduleSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

describe('UniversalMasterSchedule lifecycle route wiring', () => {
  it('uses named lifecycle service calls instead of generic status updates', () => {
    const bulkOperations = readScheduleSource('hooks/useBulkOperations.ts');
    const calendarHandlers = readScheduleSource('hooks/useCalendarHandlers.ts');
    const directSessionService = readScheduleSource('../../services/sessionService.ts');
    const universalScheduleService = readScheduleSource('../../services/universal-master-schedule-service.ts');

    expect(bulkOperations).toContain('sessionService.confirmSession(sessionId)');
    expect(bulkOperations).toContain("sessionService.cancelSession(sessionId, actionData?.reason || 'Bulk cancellation')");
    expect(bulkOperations).toContain('sessionService.assignSessionToTrainer(sessionId, actionData?.newTrainerId)');
    expect(calendarHandlers).toContain('sessionService.completeSession(sessionId)');
    // Slice 0.1 server-side billing: these services must NOT send any
    // deductSessionCredit value — an explicit false is a waive request that
    // requires a recorded reason, and only the SessionDetailModal flow
    // collects one. The server decides billing for bare completions.
    expect(directSessionService).not.toContain('deductSessionCredit:');
    expect(universalScheduleService).not.toContain('deductSessionCredit:');

    expect(bulkOperations).not.toContain("status: 'confirmed'");
    expect(bulkOperations).not.toContain("status: 'cancelled'");
    expect(calendarHandlers).not.toContain("status: 'completed'");
  });
});
