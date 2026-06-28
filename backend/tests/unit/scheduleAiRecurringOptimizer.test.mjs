import { describe, expect, it } from 'vitest';
import { buildRecurringOptimizationProposals } from '../../services/schedule-ai/scheduleAiRecurringOptimizer.mjs';

const NOW = new Date('2026-07-01T12:00:00Z');

const baseSeriesSession = {
  recurringGroupId: 'series-alpha',
  duration: 60,
  trainerId: 8,
  userId: 12,
  status: 'scheduled',
  location: 'Main Studio',
  clientName: 'Private Client',
  trainerName: 'Private Trainer',
  notes: 'Do not leak this note',
};

describe('schedule AI recurring optimizer', () => {
  it('drafts a non-mutating repair proposal for a future trainer conflict', () => {
    const result = buildRecurringOptimizationProposals({
      actor: { id: 10, role: 'admin' },
      recurringGroupId: 'series-alpha',
      now: NOW,
      seriesSessions: [
        { ...baseSeriesSession, id: 101, sessionDate: '2026-07-06T16:00:00Z', endDate: '2026-07-06T17:00:00Z' },
        { ...baseSeriesSession, id: 102, sessionDate: '2026-07-13T16:00:00Z', endDate: '2026-07-13T17:00:00Z' },
      ],
      comparisonSessions: [
        { id: 900, trainerId: 8, status: 'confirmed', sessionDate: '2026-07-13T16:30:00Z', endDate: '2026-07-13T17:30:00Z' },
      ],
      candidateSlots: [
        { trainerId: 8, startTime: '2026-07-13T17:30:00Z', endTime: '2026-07-13T18:30:00Z' },
      ],
      clientPreferences: {
        preferredTrainerIds: [8],
        preferredDays: [1],
        preferredTimeWindows: [{ start: '16:00', end: '19:00' }],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      recurringGroupId: 'series-alpha',
      issueCount: 1,
      proposalCount: 1,
    });
    expect(result.issues[0]).toMatchObject({
      code: 'TRAINER_CONFLICT',
      severity: 'high',
      sessionId: 102,
      conflictingSessionId: 900,
    });
    expect(result.proposals[0]).toMatchObject({
      type: 'recurring_series_repair',
      action: 'repair_series_conflict',
      recurringGroupId: 'series-alpha',
      targetSessionId: 102,
      executionPolicy: 'proposal_only',
      mutatesData: false,
      confirmation: {
        required: true,
        canExecute: false,
        mode: 'manual_review',
      },
      suggestedPatch: {
        trainerId: 8,
        time: '17:30',
        duration: 60,
      },
      reasonCodes: ['TRAINER_CONFLICT'],
    });
    expect(JSON.stringify(result)).not.toContain('Private Client');
    expect(JSON.stringify(result)).not.toContain('Do not leak this note');
  });

  it('ignores past and terminal series occurrences before ranking trainer-gap repairs', () => {
    const result = buildRecurringOptimizationProposals({
      actor: { id: 10, role: 'admin' },
      recurringGroupId: 'series-beta',
      now: NOW,
      seriesSessions: [
        { ...baseSeriesSession, id: 201, recurringGroupId: 'series-beta', trainerId: null, status: 'scheduled', sessionDate: '2026-06-01T16:00:00Z', endDate: '2026-06-01T17:00:00Z' },
        { ...baseSeriesSession, id: 202, recurringGroupId: 'series-beta', trainerId: null, status: 'completed', sessionDate: '2026-07-08T16:00:00Z', endDate: '2026-07-08T17:00:00Z' },
        { ...baseSeriesSession, id: 203, recurringGroupId: 'series-beta', trainerId: null, status: 'scheduled', sessionDate: '2026-07-15T16:00:00Z', endDate: '2026-07-15T17:00:00Z' },
      ],
      trainerLoad: [
        { trainerId: 9, futureSessionCount: 8 },
        { trainerId: 10, futureSessionCount: 2 },
      ],
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'TRAINER_GAP',
      sessionId: 203,
    });
    expect(result.proposals[0]).toMatchObject({
      action: 'assign_series_trainer',
      suggestedPatch: {
        trainerId: 10,
      },
    });
  });

  it('ranks client-preferred slots ahead of less compatible repair slots', () => {
    const result = buildRecurringOptimizationProposals({
      actor: { id: 10, role: 'admin' },
      recurringGroupId: 'series-gamma',
      now: NOW,
      seriesSessions: [
        { ...baseSeriesSession, id: 301, recurringGroupId: 'series-gamma', sessionDate: '2026-07-14T22:00:00Z', endDate: '2026-07-14T23:00:00Z' },
      ],
      clientPreferences: {
        preferredTrainerIds: [11],
        preferredDays: [2],
        preferredTimeWindows: [{ start: '15:00', end: '18:00' }],
      },
      candidateSlots: [
        { trainerId: 8, startTime: '2026-07-14T20:00:00Z', endTime: '2026-07-14T21:00:00Z' },
        { trainerId: 11, startTime: '2026-07-14T16:00:00Z', endTime: '2026-07-14T17:00:00Z' },
      ],
    });

    expect(result.issues[0]).toMatchObject({
      code: 'PREFERENCE_DRIFT',
      severity: 'medium',
      sessionId: 301,
    });
    expect(result.proposals[0]).toMatchObject({
      action: 'improve_series_preference_fit',
      suggestedPatch: {
        trainerId: 11,
        time: '16:00',
      },
      confidence: expect.any(Number),
    });
    expect(result.proposals[0].confidence).toBeGreaterThan(0.75);
  });
});