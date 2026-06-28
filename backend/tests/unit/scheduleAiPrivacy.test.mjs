import { describe, expect, it } from 'vitest';
import {
  prepareScheduleAiProviderPayload,
  sanitizeScheduleAiText,
} from '../../services/schedule-ai/scheduleAiPrivacy.mjs';

describe('schedule AI privacy foundation', () => {
  it('replaces schedule participant identities with session-scoped aliases before provider payloads', () => {
    const result = prepareScheduleAiProviderPayload({
      actor: { id: 1, role: 'admin', firstName: 'Sean' },
      message: 'Move Sarah Connor at 3 PM and ask Terry Coach if she can come later.',
      context: {
        surface: 'universal_master_schedule',
        sessions: [{
          id: 44,
          sessionDate: '2026-06-28',
          startTime: '15:00',
          client: {
            id: 12,
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@example.com',
            phone: '555-123-4567',
          },
          trainer: { id: 9, firstName: 'Terry', lastName: 'Coach' },
          privateNotes: 'Sarah Connor card 4242 4242 4242 4242',
        }],
      },
    });

    const providerJson = JSON.stringify(result.providerPayload);
    expect(result.providerPayload.message).toContain('Client #12');
    expect(result.providerPayload.message).toContain('Trainer #9');
    expect(result.aliasMap['Client #12']).toMatchObject({ kind: 'client', id: 12, displayName: 'Sarah Connor' });
    expect(result.aliasMap['Trainer #9']).toMatchObject({ kind: 'trainer', id: 9, displayName: 'Terry Coach' });
    expect(providerJson).not.toMatch(/Sarah|Connor|Terry|Coach|sarah@example\.com|555-123-4567|4242/);
    expect(providerJson).not.toContain('aliasMap');
  });

  it('redacts free-text PII even when no participant alias exists', () => {
    const sanitized = sanitizeScheduleAiText(
      'Call 555-999-1111 and email person@example.com about DOB 01/02/1990.',
    );

    expect(sanitized.text).toContain('[PHONE-REDACTED]');
    expect(sanitized.text).toContain('[EMAIL-REDACTED]');
    expect(sanitized.text).toContain('[DOB-REDACTED]');
    expect(sanitized.hasCriticalPII).toBe(false);
  });
});
