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
    expect(parentSource).toContain('<BentoThird><WidgetErrorBoundary name="Gamification summary"><GamificationSummaryWidget /></WidgetErrorBoundary></BentoThird>');
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

  it('bridges summary cards and rank fallbacks to Crystalline Swan theme tokens', () => {
    expect(source).toContain('const rankFallbackBackground = \'var(--surface-muted, rgba(255,255,255,0.05))\';');
    expect(source).toContain('const rankFallbackColor = \'var(--text-muted, rgba(224,236,244,0.5))\';');
    expect(source).toContain('background: color-mix(in srgb, var(--royal-depth, #003080) 25%, transparent);');
    expect(source).toContain('border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);');
    expect(source).toContain('color: var(--text-muted, rgba(224,236,244,0.45));');
    expect(source).toContain('background: ${p => p.$rank <= 3 ? hexAlpha(RARITY_COLORS[p.$rank] || CHART_COLORS.iceWing, 0.2) : rankFallbackBackground};');
    expect(source).toContain('color: ${p => p.$rank <= 3 ? (RARITY_COLORS[p.$rank] || CHART_COLORS.iceWing) : rankFallbackColor};');
    expect(source).not.toContain('background: rgba(0, 32, 96, 0.25);');
    expect(source).not.toContain('border: 1px solid rgba(96, 192, 240, 0.06);');
    expect(source).not.toContain('background: rgba(198, 168, 75, 0.12);');
    expect(source).not.toContain('border: 1px solid rgba(198, 168, 75, 0.24);');
    expect(source).not.toContain(" : 'rgba(255,255,255,0.05)'");
    expect(source).not.toContain(" : 'rgba(224,236,244,0.5)'");
  });
});
