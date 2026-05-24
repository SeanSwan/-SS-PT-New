import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/GamificationOverview.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
  'utf8',
);

describe('GamificationOverview active surface truth contract', () => {
  it('is mounted by the admin client management gamification tab', () => {
    expect(parentSource).toContain("import GamificationOverview from './components/GamificationOverview'");
    expect(parentSource).toContain('<GamificationOverview clientId={selectedClient.id} />');
  });

  it('does not render hardcoded gamification stats or mock collections', () => {
    expect(source).not.toContain('// Mock data');
    expect(source).not.toContain('const currentXP = 14250');
    expect(source).not.toContain('const totalPoints = 15680');
    expect(source).not.toContain('const mockAchievements');
    expect(source).not.toContain('const mockBadges');
    expect(source).not.toContain('const mockChallenges');
    expect(source).not.toContain('const mockLeaderboard');
    expect(source).not.toContain("API Calls: GET /api/gamification/user/:id");
  });

  it('uses the canonical view-as gamification profile and leaderboard APIs', () => {
    expect(source).toContain("authAxios.get('/api/v1/gamification/profile'");
    expect(source).toContain("authAxios.get('/api/v1/gamification/leaderboard'");
    expect(source).toContain('viewAs: clientId');
  });

  it('uses canonical challenge APIs instead of leaving the challenge tab disconnected', () => {
    expect(source).toContain("authAxios.get('/api/v1/gamification/challenges'");
    expect(source).toContain('`/api/v1/gamification/users/${clientId}/challenges`');
    expect(source).toContain('setChallenges(mapChallenges');
  });
});
