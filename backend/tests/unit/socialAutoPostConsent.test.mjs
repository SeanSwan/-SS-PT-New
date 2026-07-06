/**
 * socialAutoPostConsent.test — auto-share consent gate (trust triple 2026-07-06)
 * ===============================================================================
 * Auto-posts previously published unconditionally with zero consent check.
 * Contract: default ON (no preference set = legacy behavior preserved);
 * notificationPreferences.autoShareWorkoutsToFeed === false suppresses the
 * three AUTO creators; a failed consent read fails CLOSED (no publish);
 * the user-INITIATED wearable share is never gated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/social/SocialPost.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn() } }));
vi.mock('../../socket/socketManager.mjs', () => ({ getIO: () => null }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import SocialPost from '../../models/social/SocialPost.mjs';
import User from '../../models/User.mjs';
import {
  createWorkoutAutoPost,
  createStreakAutoPost,
  createAchievementAutoPost,
  createWearableSharePost,
  isAutoShareEnabled,
} from '../../services/socialAutoPost.mjs';

beforeEach(() => {
  vi.clearAllMocks();
  SocialPost.create.mockResolvedValue({ id: 1 });
});

describe('isAutoShareEnabled', () => {
  it('defaults ON when the user has no preference set', async () => {
    User.findByPk.mockResolvedValue({ id: 5, notificationPreferences: null });
    expect(await isAutoShareEnabled(5)).toBe(true);
  });

  it('is OFF when the user opted out', async () => {
    User.findByPk.mockResolvedValue({ id: 5, notificationPreferences: { autoShareWorkoutsToFeed: false } });
    expect(await isAutoShareEnabled(5)).toBe(false);
  });

  it('fails CLOSED when the user is missing or the read throws', async () => {
    User.findByPk.mockResolvedValue(null);
    expect(await isAutoShareEnabled(5)).toBe(false);
    User.findByPk.mockRejectedValue(new Error('db down'));
    expect(await isAutoShareEnabled(5)).toBe(false);
  });
});

describe('auto-post consent gate', () => {
  it('posts by default when no preference is set (behavior preserved)', async () => {
    User.findByPk.mockResolvedValue({ id: 5, notificationPreferences: {} });
    await createWorkoutAutoPost(5, { duration: 30, exercisesCompleted: 4, pointsAwarded: 50 });
    expect(SocialPost.create).toHaveBeenCalledTimes(1);
  });

  it('suppresses workout, streak, and achievement auto-posts when the user opted out', async () => {
    User.findByPk.mockResolvedValue({ id: 5, notificationPreferences: { autoShareWorkoutsToFeed: false } });
    await createWorkoutAutoPost(5, { duration: 30 });
    await createStreakAutoPost(5, 7);
    await createAchievementAutoPost(5, { name: 'First Workout' });
    expect(SocialPost.create).not.toHaveBeenCalled();
  });

  it('fails CLOSED: a consent-read failure suppresses the auto-post', async () => {
    User.findByPk.mockRejectedValue(new Error('db down'));
    await createWorkoutAutoPost(5, { duration: 30 });
    expect(SocialPost.create).not.toHaveBeenCalled();
  });

  it('does NOT gate the user-initiated wearable share', async () => {
    User.findByPk.mockResolvedValue({ id: 5, notificationPreferences: { autoShareWorkoutsToFeed: false } });
    await createWearableSharePost(5, { category: 'sleep', metrics: [{ label: 'Hours', value: '8' }] });
    expect(SocialPost.create).toHaveBeenCalledTimes(1);
  });

  it('streak non-milestones return before any consent query fires', async () => {
    await createStreakAutoPost(5, 6);
    expect(User.findByPk).not.toHaveBeenCalled();
    expect(SocialPost.create).not.toHaveBeenCalled();
  });
});
