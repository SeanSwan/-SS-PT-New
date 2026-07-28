import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('UserDashboard Home spacing contract', () => {
  it('keeps the training loop panels in the main center column after Quick Stats', () => {
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');
    const centerSource = readSource('src/components/UserDashboard/components/HomeTabVisionCenter.tsx');

    expect(homeSource).toContain('supportPanels={supportPanels}');
    expect(homeSource).not.toContain('<SupportShell>');
    expect(centerSource).toContain('supportPanels?: React.ReactNode');

    const quickStatsIndex = centerSource.indexOf('<UserDashboardQuickStatsTicker stats={quickStats} />');
    const supportPanelsIndex = centerSource.indexOf('{supportPanels}');
    const feedIndex = centerSource.indexOf('<HomeCommunityFeed');

    expect(quickStatsIndex).toBeGreaterThanOrEqual(0);
    expect(supportPanelsIndex).toBeGreaterThan(quickStatsIndex);
    expect(feedIndex).toBeGreaterThan(supportPanelsIndex);
  });
});