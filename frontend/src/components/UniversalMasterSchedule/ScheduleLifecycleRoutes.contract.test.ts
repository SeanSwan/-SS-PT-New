import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readScheduleSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

describe('UniversalMasterSchedule lifecycle route wiring', () => {
  it('keeps direct lifecycle service calls billing-safe', () => {
    const directSessionService = readScheduleSource('../../services/sessionService.ts');
    const universalScheduleService = readScheduleSource('../../services/universal-master-schedule-service.ts');
    // Slice 0.1 server-side billing: these services must NOT send any
    // deductSessionCredit value — an explicit false is a waive request that
    // requires a recorded reason, and only the SessionDetailModal flow
    // collects one. The server decides billing for bare completions.
    expect(directSessionService).not.toContain('deductSessionCredit:');
    expect(universalScheduleService).not.toContain('deductSessionCredit:');

  });
});
