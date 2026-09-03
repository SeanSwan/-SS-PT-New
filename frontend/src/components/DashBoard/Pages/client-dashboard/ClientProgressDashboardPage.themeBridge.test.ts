import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const pagePath = resolve(__dirname, './ClientProgressDashboardPage.tsx');
const recapPath = resolve(__dirname, './ClientProgressDashboardPage.recap.ts');
const stylesPath = resolve(__dirname, './ClientProgressDashboardPage.styles.ts');
const dashboardRoutesPath = resolve(__dirname, '../../UniversalDashboardLayout.routes.tsx');

const read = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('ClientProgressDashboardPage theme bridge', () => {
  it('keeps the canonical progress page wired to extracted theme styles', () => {
    const source = read(pagePath);
    const dashboardRoutesSource = read(dashboardRoutesPath);
    const styleSource = existsSync(stylesPath) ? read(stylesPath) : '';

    expect(dashboardRoutesSource).toContain("path: '/progress', component: ClientProgressDashboardPage");
    expect(source).toContain("from './ClientProgressDashboardPage.styles'");
    expect(source).not.toMatch(/styled\./);
    expect(source).not.toContain('keyframes`');
    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('var(--accent-primary');
    expect(styleSource).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(styleSource).not.toContain('rgba(96, 192, 240');
    expect(lineCount(source)).toBeLessThanOrEqual(300);
  });

  it('preserves the client-safe chart grid and progress API endpoints', () => {
    const source = read(pagePath);
    const recapSource = read(recapPath);

    expect(source).toContain("import('./CanonicalProgressChartsGrid')");
    // RE-POINTED 2026-09-03: the recap loader and its id-segment guard moved
    // into useClientProgressPanels so this page stays under the 300-line cap.
    // The guard is unchanged — a client id is still sanitised before it reaches
    // a gamification URL — so the assertion follows the code rather than being
    // deleted, and the page is asserted to consume the hook.
    const panelsSource = read(pagePath.replace('ClientProgressDashboardPage.tsx', 'useClientProgressPanels.ts'));
    expect(panelsSource).toContain('getSafeGamificationIdSegment(userId)');
    expect(panelsSource).toContain('loadClientWeeklyRecap(authAxios, segment)');
    expect(source).toContain('useClientProgressPanels(authAxios, user?.id)');
    expect(source).toContain('const companionPetUserIdSegment = getSafeGamificationIdSegment(user?.id);');
    expect(recapSource).toContain('authAxios.get(');
    expect(recapSource).toContain('`/api/gamification/users/${weeklyRecapUserIdSegment}/weekly-recap`');
    // RE-POINTED 2026-09-03 (same extraction): the personal-records fetch moved
    // into useClientProgressPanels. The endpoint it must call is unchanged.
    expect(panelsSource).toContain("authAxios.get('/api/client/analytics/personal-records')");
    expect(source).toContain('<CanonicalProgressChartsGrid />');
  });
});
