import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/GamificationSummaryWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
  'utf8',
);
const gamificationRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/gamificationV1Routes.mjs'),
  'utf8',
);

describe('GamificationSummaryWidget active surface truth contract', () => {
  it('is mounted by the admin overview dashboard', () => {
    expect(parentSource).toContain("import GamificationSummaryWidget from '../components/GamificationSummaryWidget'");
    expect(parentSource).toContain('<BentoThird><GamificationSummaryWidget /></BentoThird>');
  });

  it('only labels metrics that are backed by the leaderboard response', () => {
    expect(source).toContain("authAxios.get('/api/gamification/leaderboard'");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(gamificationRoutesSource).toContain("router.get('/leaderboard'");
    expect(source).not.toContain('achievementsThisWeek');
    expect(source).not.toContain('totalAchievements');
    expect(source).not.toContain('activeStreaks');
    expect(source).not.toContain('<MiniLabel>Total XP</MiniLabel>');
    expect(source).toContain('<MiniLabel>Top 5 XP</MiniLabel>');
  });

  it('does not report an empty leaderboard when the leaderboard API fails', () => {
    expect(source).toContain('const [error, setError]');
    expect(source).toContain("setError('Gamification leaderboard unavailable.')");
    expect(source).toContain('<ErrorCopy role="alert">');
    expect(source).toContain('<RetryInline type="button" onClick={fetchData}>');
    expect(source).not.toContain('catch {\n      setData(EMPTY_GAMIFICATION);\n    }');
  });
});
