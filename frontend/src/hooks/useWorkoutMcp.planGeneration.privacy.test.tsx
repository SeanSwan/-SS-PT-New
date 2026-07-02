/**
 * useWorkoutMcp.planGeneration.privacy.test.tsx
 * =============================================
 * Privacy regression coverage for generated workout-plan persistence.
 */
import { describe, expect, it } from 'vitest';
import { buildWorkoutPlanSavePayload } from './useWorkoutMcp.planGeneration';

describe('buildWorkoutPlanSavePayload privacy', () => {
  it('strips generated client identity fields before persisting planData', () => {
    const payload = buildWorkoutPlanSavePayload({
      name: 'Generated Six Month Arc',
      trainerId: '7',
      clientId: '42',
      goal: 'strength',
      startDate: '2026-06-07',
      endDate: '2026-12-06',
      status: 'active',
      planningSystem: 'swan_coach_planning',
      planData: {
        planningSystem: 'swan_coach_planning',
        clientName: 'Private Client',
        clientEmail: 'private@example.com',
        firstName: 'Private',
        lastName: 'Client',
        selectedClient: {
          email: 'nested@example.com',
          firstName: 'Nested',
        },
        planSummary: { durationWeeks: 26, startingPhase: 2 },
        weeks: [{
          weekNumber: 1,
          days: [{
            dayNumber: 1,
            name: 'Day 1: Pull',
            exercises: [{
              exerciseId: 'cable-row',
              exerciseName: 'Cable Row',
              notes: 'Send report to private@example.com or call 555-555-0199',
            }],
          }],
        }],
      },
      days: [],
    });

    const serialized = JSON.stringify(payload.planData);
    expect(serialized).not.toContain('Private Client');
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('nested@example.com');
    expect(serialized).not.toContain('555-555-0199');
    expect(serialized).toContain('[redacted]');
    expect(serialized).toContain('Day 1: Pull');
    expect(serialized).toContain('Cable Row');
  });
});
