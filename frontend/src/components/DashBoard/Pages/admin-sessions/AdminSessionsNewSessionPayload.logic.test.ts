import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const payloadLogicPath = resolve(sourceRoot, './AdminSessionsNewSessionPayload.logic.ts');
const mutationHookPath = resolve(sourceRoot, './useAdminSessionsMutations.ts');
const payloadLogicModule = './AdminSessionsNewSessionPayload.logic';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('Admin sessions new-session payload contract', () => {
  it('builds the backend /api/sessions array payload instead of a flat session object', async () => {
    expect(existsSync(payloadLogicPath), 'payload logic should be extracted and testable').toBe(true);

    const { buildAdminSessionsNewSessionPayload } = await import(payloadLogicModule);
    const startIso = '2026-06-01T16:30:00.000Z';

    const assignedPayload = buildAdminSessionsNewSessionPayload({
      startIso,
      duration: 60,
      location: 'Main Studio',
      notes: 'Upper strength focus',
      clientId: '12',
      trainerId: '7',
    });

    expect(assignedPayload).toEqual({
      sessions: [{
        start: startIso,
        duration: 60,
        location: 'Main Studio',
        notes: 'Upper strength focus',
        userId: '12',
        trainerId: '7',
      }],
    });
    expect(assignedPayload.sessions[0]).not.toHaveProperty('sessionDate');
    expect(assignedPayload.sessions[0]).not.toHaveProperty('status');

    const openSlotPayload = buildAdminSessionsNewSessionPayload({
      startIso,
      duration: 45,
      location: 'Main Studio',
      notes: '  ',
      clientId: '',
      trainerId: '',
    });

    expect(openSlotPayload).toEqual({
      sessions: [{
        start: startIso,
        duration: 45,
        location: 'Main Studio',
      }],
    });
  });

  it('keeps the mutation hook wired to the extracted backend payload builder', () => {
    const hookSource = readSource(mutationHookPath);

    expect(hookSource).toContain("import { buildAdminSessionsNewSessionPayload } from './AdminSessionsNewSessionPayload.logic'");
    expect(hookSource).toContain("apiService.post('/api/sessions', buildAdminSessionsNewSessionPayload({");
    expect(hookSource).not.toContain('sessionDate: newSessionDateTime.toISOString()');
    expect(hookSource).not.toContain("status: 'available'");
  });
});
