import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('posts reward redemptions to the mounted user-scoped backend route', () => {
    expect(hookSource()).toContain('authAxios.post(`/api/v1/gamification/users/${targetUserId}/rewards/${rewardId}/redeem`)');
    expect(hookSource()).not.toContain('authAxios.post(`/api/v1/gamification/rewards/${rewardId}/redeem`)');
  });
});
