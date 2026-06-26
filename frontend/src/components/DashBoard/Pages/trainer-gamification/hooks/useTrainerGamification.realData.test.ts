import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const hookPath = join(
  process.cwd(),
  'src/components/DashBoard/Pages/trainer-gamification/hooks/useTrainerGamification.ts'
);

const hookSource = () => readFileSync(hookPath, 'utf8');

describe('useTrainerGamification real data contract', () => {
  it('does not populate trainer gamification with mock clients or mock achievements', () => {
    const source = hookSource();

    expect(source).not.toContain('mockClients');
    expect(source).not.toContain('mockAchievements');
    expect(source).not.toContain('For demo purposes');
  });

  it('uses canonical REST endpoints for clients, achievements, and point awards', () => {
    const source = hookSource();

    expect(source).toContain("/api/sessions/users/clients");
    expect(source).toContain("/api/v1/gamification/achievements");
    expect(source).toContain("/api/v1/gamification/users/${clientId}/points");
  });

  it('delegates response normalization to the hardened shared mapper', () => {
    const source = hookSource();

    expect(source).toContain("from '../trainerGamificationData'");
    expect(source).toContain('getTrainerPointBalanceFallback(response.data?.newBalance)');
    expect(source).not.toContain('const valueAsNumber');
    expect(source).not.toContain('Number(value)');
  });
});
