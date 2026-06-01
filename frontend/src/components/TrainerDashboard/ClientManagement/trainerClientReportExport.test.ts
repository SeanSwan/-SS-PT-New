import { describe, expect, it } from 'vitest';
import { buildTrainerClientReportCsv } from './trainerClientReportExport';

describe('trainer client report export', () => {
  it('builds a CSV with real client/session fields and escaped values', () => {
    const csv = buildTrainerClientReportCsv([
      {
        assignedAt: '2026-05-01T00:00:00Z',
        isActive: true,
        client: {
          firstName: 'Ava',
          lastName: 'Quote "Queen"',
          email: 'ava@example.test',
          availableSessions: 4,
          totalSessionsCompleted: 9,
          lastSessionDate: '2026-05-24T12:00:00Z',
          nextSessionDate: '2026-05-31T12:00:00Z',
          membershipLevel: 'premium',
          status: 'active',
        },
      },
    ]);

    expect(csv).toContain('First Name,Last Name,Email,Status');
    expect(csv).toContain('"Ava","Quote ""Queen""","ava@example.test","active"');
    expect(csv).toContain('"4 paid sessions","deducts when logged","9","2026-05-24T12:00:00Z","2026-05-31T12:00:00Z"');
  });

  it('exports Move Fitness clients as free tracking instead of paid session debt', () => {
    const csv = buildTrainerClientReportCsv([
      {
        assignedAt: '2026-05-01T00:00:00Z',
        isActive: true,
        client: {
          firstName: 'Mia',
          lastName: 'Move',
          email: 'mia@example.test',
          clientSource: 'move_fitness',
          availableSessions: 0,
          totalSessionsCompleted: 3,
          membershipLevel: 'basic',
          status: 'active',
        },
      },
    ]);

    expect(csv).toContain('Session Policy,Billing Note');
    expect(csv).not.toContain('Sessions Left');
    expect(csv).toContain('"Mia","Move","mia@example.test","active","basic","free tracking","no deduction","3"');
  });
});
