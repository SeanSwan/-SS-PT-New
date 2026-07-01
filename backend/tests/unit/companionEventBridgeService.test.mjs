import { describe, expect, it, vi } from 'vitest';
import {
  buildCompanionActivityEvents,
  buildCompanionActivityEventsForLedger,
  getCompanionActivityForWorkout,
  recordCompanionActivityEvents,
  recordCompanionLedgerEvents,
  scheduleCompanionLedgerEvents,
} from '../../services/gamification/CompanionEventBridgeService.mjs';

describe('CompanionEventBridgeService', () => {
  it('maps workout metadata to existing companion activity counters', () => {
    expect(getCompanionActivityForWorkout({ focus: 'cardio endurance run' })).toBe('cardio_workouts');
    expect(getCompanionActivityForWorkout({ workoutType: 'hypertrophy strength' })).toBe('strength_workouts');
    expect(buildCompanionActivityEvents('workout_completed', { category: 'row conditioning' })).toEqual([
      { activityType: 'cardio_workouts', amount: 1 },
    ]);
  });

  it('maps positive platform events without creating unknown counters', () => {
    expect(buildCompanionActivityEvents('nutrition_logged')).toEqual([
      { activityType: 'nutrition_logs', amount: 1 },
    ]);
    expect(buildCompanionActivityEvents('recovery_logged')).toEqual([
      { activityType: 'recovery_actions', amount: 1 },
    ]);
    expect(buildCompanionActivityEvents('streak_updated', { days: 7 })).toEqual([
      { activityType: 'streak_days', amount: 7 },
    ]);
    expect(buildCompanionActivityEvents('social_action')).toEqual([
      { activityType: 'social_actions', amount: 1 },
    ]);
    expect(buildCompanionActivityEvents('badge_earned')).toEqual([
      { activityType: 'personal_records', amount: 1 },
    ]);
    expect(buildCompanionActivityEvents('unmapped_event')).toEqual([]);
  });

  it('builds ledger-driven events only for successful non-duplicate earn events', () => {
    const result = { duplicate: false, pointsAwarded: 50 };
    expect(buildCompanionActivityEventsForLedger(result, { source: 'workout_completion', transactionType: 'earn' })).toEqual([
      { activityType: 'strength_workouts', amount: 1 },
    ]);
    expect(buildCompanionActivityEventsForLedger(result, { source: 'streak_bonus', transactionType: 'bonus', metadata: { streakDays: 7 } })).toEqual([
      { activityType: 'streak_days', amount: 7 },
    ]);
    expect(buildCompanionActivityEventsForLedger({ duplicate: true, pointsAwarded: 0 }, { source: 'workout_completion' })).toEqual([]);
    expect(buildCompanionActivityEventsForLedger(result, { source: 'reward_redemption', transactionType: 'spend' })).toEqual([]);
  });

  it('records only allowlisted activity events through the companion service', async () => {
    const service = { recordActivity: vi.fn(async (_userId, activityType) => ({ activityType })) };
    const results = await recordCompanionActivityEvents({
      userId: 42,
      service,
      events: [
        { activityType: 'strength_workouts', amount: 1 },
        { activityType: 'unknown_counter', amount: 1 },
        { activityType: 'nutrition_logs', amount: 1 },
        { activityType: 'social_actions', amount: 2 },
      ],
    });

    expect(service.recordActivity).toHaveBeenCalledTimes(3);
    expect(results.map((item) => item.activityType)).toEqual(['strength_workouts', 'nutrition_logs', 'social_actions']);
  });

  it('records ledger events through the supplied companion service', async () => {
    const service = { recordActivity: vi.fn(async (_userId, activityType) => ({ activityType })) };
    const results = await recordCompanionLedgerEvents({
      service,
      result: { duplicate: false, pointsAwarded: 100 },
      entry: { userId: 42, source: 'achievement_earned', transactionType: 'bonus' },
    });

    expect(service.recordActivity).toHaveBeenCalledWith(42, 'personal_records', 1);
    expect(results[0].activityType).toBe('personal_records');
  });

  it('schedules ledger bridge work after commit when possible', () => {
    const service = { recordActivity: vi.fn(async () => ({})) };
    const afterCommit = vi.fn();

    scheduleCompanionLedgerEvents({
      service,
      result: { duplicate: false, pointsAwarded: 50 },
      entry: { userId: 42, source: 'workout_completion', transactionType: 'earn' },
      transaction: { afterCommit },
    });

    expect(afterCommit).toHaveBeenCalledTimes(1);
    expect(service.recordActivity).not.toHaveBeenCalled();
  });
});
