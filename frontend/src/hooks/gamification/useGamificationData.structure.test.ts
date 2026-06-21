import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSafeGamificationIdSegment,
  getSafeGamificationToastDescription,
} from './useGamificationData';
import { buildRewardRedemptionCachePatch } from './gamificationRewardRedemption';

const hookPath = join(process.cwd(), 'src/hooks/gamification/useGamificationData.ts');
const hookSource = () => readFileSync(hookPath, 'utf8');

describe('useGamificationData structure', () => {
  it('keeps the hook orchestration file below the project line budget', () => {
    const lineCount = hookSource().split(/\r?\n/).length;
    expect(lineCount).toBeLessThanOrEqual(300);
  });

  it('keeps legacy DTO contracts out of the React Query hook file', () => {
    expect(hookSource()).not.toContain('export interface Achievement');
    expect(hookSource()).not.toContain('export interface GamificationProfile');
  });

  it('normalizes reward redemption path IDs as positive integer segments', () => {
    expect(getSafeGamificationIdSegment(42)).toBe('42');
    expect(getSafeGamificationIdSegment('42')).toBe('42');
    expect(getSafeGamificationIdSegment('../42')).toBeNull();
    expect(getSafeGamificationIdSegment('reward/42')).toBeNull();
    expect(getSafeGamificationIdSegment(0)).toBeNull();
    expect(getSafeGamificationIdSegment(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('posts reward redemptions to the mounted user-scoped backend route with validated IDs', () => {
    expect(hookSource()).toContain('const userIdSegment = getSafeGamificationIdSegment(targetUserId);');
    expect(hookSource()).toContain('const rewardIdSegment = getSafeGamificationIdSegment(rewardId);');
    expect(hookSource()).toContain('authAxios.post(`/api/v1/gamification/users/${userIdSegment}/rewards/${rewardIdSegment}/redeem`)');
    expect(hookSource()).not.toContain('authAxios.post(`/api/v1/gamification/users/${targetUserId}/rewards/${rewardId}/redeem`)');
    expect(hookSource()).not.toContain('authAxios.post(`/api/v1/gamification/rewards/${rewardId}/redeem`)');
  });

  it('keeps gamification hook logs and reward toasts generic', () => {
    expect(getSafeGamificationToastDescription({ response: { data: { message: 'SQLSTATE tenant leak' } } })).toBe(
      'Reward could not be redeemed.'
    );
    expect(hookSource()).not.toContain('error.message');
    expect(hookSource()).not.toContain('fallbackError');
    expect(hookSource()).not.toContain('response?.data?.message');
    expect(hookSource()).not.toMatch(/logger\.warn\([^)]*,/);
  });

  it('builds reward cache patches only from safe integer economics', () => {
    const reward = {
      id: '7',
      name: 'Session Credit',
      description: 'Credit for a future training session.',
      icon: 'Gift',
      pointCost: 500,
      tier: 'bronze' as const,
      stock: 3,
      isActive: true,
      redemptionCount: 2,
    };

    expect(buildRewardRedemptionCachePatch(reward)).toEqual({
      pointCost: 500,
      nextStock: 2,
      nextRedemptionCount: 3,
    });
    expect(buildRewardRedemptionCachePatch({ ...reward, pointCost: Number.NaN })).toBeNull();
    expect(buildRewardRedemptionCachePatch({ ...reward, stock: undefined as unknown as number })).toBeNull();
    expect(buildRewardRedemptionCachePatch({ ...reward, redemptionCount: -1 })).toBeNull();
  });
});
