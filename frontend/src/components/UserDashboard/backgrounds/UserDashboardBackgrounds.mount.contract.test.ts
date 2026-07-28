import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('UserDashboard background picker mount contract', () => {
  it('mounts the page-background controls through the live cover editor path', () => {
    const dashboard = read('src/components/UserDashboard/UserDashboard.V3.tsx');
    const hero = read('src/components/UserDashboard/components/ObservatoryCoverHero.tsx');
    const hook = read('src/components/UserDashboard/components/useHomeCoverBanner.tsx');
    const editor = read('src/components/Social/Feed/components/SocialCoverEditor.tsx');
    const panel = read('src/components/Social/Feed/components/CoverStudioPanel.tsx');
    const panelTypes = read('src/components/Social/Feed/components/CoverStudioPanel.types.ts');
    const layoutStyles = read('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');

    expect(dashboard).toContain('useUserDashboardBackgroundPreference(brandLogo)');
    expect(dashboard).toContain('<UserDashboardBackgroundControlsDisclosure');
    expect(dashboard).not.toContain("import UserDashboardBackgroundControls from './backgrounds/UserDashboardBackgroundControls';");
    expect(dashboard).toContain('style={dashboardBackground.backgroundStyle}');
    expect(dashboard).toContain('dashboardBackgroundControls={dashboardBackgroundControls}');
    expect(hero).toContain('dashboardBackgroundControls?: React.ReactNode');
    expect(hero).toContain('useHomeCoverBanner(dashboardBackgroundControls)');
    expect(hook).toContain('dashboardBackgroundControls?: React.ReactNode');
    expect(hook).toContain('dashboardBackgroundControls={dashboardBackgroundControls}');
    expect(editor).toContain('dashboardBackgroundControls?: React.ReactNode');
    expect(editor).toContain('dashboardBackgroundControls={dashboardBackgroundControls}');
    expect(panelTypes).toContain('dashboardBackgroundControls?: ReactNode');
    expect(panel).toContain('{dashboardBackgroundControls}');
    expect(layoutStyles).toContain('--user-dashboard-bg-art');
    expect(layoutStyles).toContain('--user-dashboard-bg-mark-image');
  });
});
