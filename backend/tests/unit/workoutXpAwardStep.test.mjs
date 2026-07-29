/**
 * workoutXpAwardStep unit tests (Phase 1.1a)
 *
 * Locks the shared post-commit XP step: suppression, idempotency-key usage,
 * experiencePoints stamping, single-post discipline (no direct auto-post
 * calls — awardWorkoutXP owns side effects), and never-fail-the-write.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAwardWorkoutXP = vi.fn();
const mockSessionUpdate = vi.fn(async () => undefined);
const tx = {
  commit: vi.fn(async () => undefined),
  rollback: vi.fn(async () => undefined),
};

vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: mockAwardWorkoutXP,
}));
vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({ WorkoutSession: { update: mockSessionUpdate } }),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { runWorkoutXpAwardStep } = await import('../../services/workout/workoutXpAwardStep.mjs');

const baseInput = () => ({
  sequelize: { transaction: vi.fn(async () => tx) },
  userId: 42,
  workoutId: 'form-1',
  sessionId: 'session-1',
  duration: 45,
  exercisesCompleted: 5,
  workoutDate: new Date('2026-05-05T00:00:00.000Z'),
  awardedBy: 7,
});

describe('runWorkoutXpAwardStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and opens no transaction when suppressed', async () => {
    const input = baseInput();
    const result = await runWorkoutXpAwardStep({ ...input, suppress: true });
    expect(result).toBeNull();
    expect(input.sequelize.transaction).not.toHaveBeenCalled();
    expect(mockAwardWorkoutXP).not.toHaveBeenCalled();
  });

  it('awards with the form id as the idempotency key and stamps experiencePoints', async () => {
    mockAwardWorkoutXP.mockResolvedValue({
      pointsAwarded: 60, newBalance: 200, streakDays: 4, awardedMilestones: [{ name: 'First Week' }],
    });
    const result = await runWorkoutXpAwardStep(baseInput());
    expect(mockAwardWorkoutXP).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, workoutId: 'form-1', awardedBy: 7 }),
      tx,
    );
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      { experiencePoints: 60 },
      { where: { id: 'session-1' }, transaction: tx },
    );
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ pointsAwarded: 60, newBalance: 200, streakDays: 4, milestones: ['First Week'], badgesEarned: [] });
  });

  it('collapses sameDay/alreadyAwarded to null without stamping', async () => {
    mockAwardWorkoutXP.mockResolvedValue({ pointsAwarded: 0, sameDay: true });
    const result = await runWorkoutXpAwardStep(baseInput());
    expect(result).toBeNull();
    expect(mockSessionUpdate).not.toHaveBeenCalled();
    expect(tx.commit).toHaveBeenCalledTimes(1);
  });

  it('never fails the write: award errors roll back and return null', async () => {
    mockAwardWorkoutXP.mockRejectedValue(new Error('xp exploded'));
    const result = await runWorkoutXpAwardStep(baseInput());
    expect(result).toBeNull();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.commit).not.toHaveBeenCalled();
  });

  it('does not import or call social auto-post directly (single-post discipline)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(process.cwd(), 'services/workout/workoutXpAwardStep.mjs'), 'utf8');
    expect(source).not.toContain('createWorkoutAutoPost');
    expect(source).not.toContain('socialAutoPost');
  });
});
