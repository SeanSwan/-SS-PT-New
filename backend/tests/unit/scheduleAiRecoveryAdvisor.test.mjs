import { describe, expect, it } from 'vitest';
import { buildScheduleRecoveryAdvisory } from '../../services/schedule-ai/scheduleAiRecoveryAdvisor.mjs';

const NOW = new Date('2026-07-01T12:00:00Z');

const completedSession = (id, overrides = {}) => ({
  id,
  userId: 12,
  status: 'completed',
  date: `2026-06-${String(20 + id).padStart(2, '0')}`,
  duration: 60,
  intensity: 7,
  avgRPE: 7,
  clientName: 'Private Client',
  trainerNotes: 'Private trainer note',
  ...overrides,
});

describe('schedule AI recovery advisor', () => {
  it('returns read-only collect-more-data guidance when evidence is too thin for hard blocking', () => {
    const result = buildScheduleRecoveryAdvisory({
      actor: { id: 20, role: 'trainer' },
      plannedSession: {
        id: 77,
        userId: 12,
        plannedFocusRegions: ['lower_back'],
        clientName: 'Private Client',
      },
      recentSessions: [completedSession(1, { intensity: 5, avgRPE: 5 })],
      painEntries: [],
      now: NOW,
    });

    expect(result).toMatchObject({
      ok: true,
      type: 'recovery_safety_advisory',
      executionPolicy: 'read_only',
      mutatesData: false,
      hardBlockAllowed: false,
      advisoryMode: 'collect_more_data',
      dataCompleteness: {
        level: 'low',
        completedSessionCount: 1,
        ratedSessionCount: 1,
        activePainEntryCount: 0,
        enoughForHardBlock: false,
      },
      scheduleGuidance: {
        decision: 'collect_more_data',
      },
    });
    expect(JSON.stringify(result)).not.toContain('Private Client');
    expect(JSON.stringify(result)).not.toContain('Private trainer note');
  });

  it('flags trainer review eligibility only when enough recovery data supports the risk signal', () => {
    const result = buildScheduleRecoveryAdvisory({
      actor: { id: 10, role: 'admin' },
      plannedSession: {
        id: 88,
        userId: 12,
        plannedFocusRegions: ['lower_back', 'hinge'],
      },
      recentSessions: [
        completedSession(2, { intensity: 9, avgRPE: 9, duration: 75 }),
        completedSession(3, { intensity: 8, avgRPE: 8, duration: 70 }),
        completedSession(4, { intensity: 9, avgRPE: 9, duration: 65 }),
        completedSession(5, { intensity: 8, avgRPE: 8, duration: 60 }),
      ],
      painEntries: [{
        id: 301,
        userId: 12,
        isActive: true,
        bodyRegion: 'lower_back',
        painLevel: 8,
        painType: 'aching',
        description: 'Private client phrase should not leave the advisor.',
        trainerNotes: 'Private internal note',
        aggravatingMovements: 'hinge, Sean 555-1212, squat, jane@example.com',
      }],
      now: NOW,
    });

    expect(result).toMatchObject({
      ok: true,
      type: 'recovery_safety_advisory',
      executionPolicy: 'read_only',
      mutatesData: false,
      hardBlockAllowed: true,
      advisoryMode: 'trainer_review_required',
      dataCompleteness: {
        level: 'high',
        enoughForHardBlock: true,
        completedSessionCount: 4,
        ratedSessionCount: 4,
        activePainEntryCount: 1,
      },
      risk: {
        level: 'high',
      },
      scheduleGuidance: {
        decision: 'trainer_review',
        affectedRegions: ['lower_back'],
      },
    });
    expect(result.risk.score).toBeGreaterThanOrEqual(70);
    expect(result.evidence.activePainRegions[0]).toMatchObject({
      bodyRegion: 'lower_back',
      painLevel: 8,
      painType: 'aching',
      aggravatingMovements: ['hinge', 'squat'],
    });
    expect(JSON.stringify(result)).not.toContain('Private client phrase');
    expect(JSON.stringify(result)).not.toContain('Private internal note');
    expect(JSON.stringify(result)).not.toContain('Private Client');
  });
});