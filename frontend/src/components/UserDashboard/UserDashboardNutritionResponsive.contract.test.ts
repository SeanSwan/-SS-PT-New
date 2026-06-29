import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('UserDashboard nutrition responsive shell contract', () => {
  it('renders Nutrition as a focused task surface instead of nested sidebars', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ObservatoryShell.tsx');
    const layoutSource = readSource('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
    const dashboardLayoutSource = readSource('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');

    expect(dashboardSource).toContain("const isNutritionTaskTab = dashboard.activeTab === 'nutrition'");
    expect(dashboardSource).toContain('focusMode={isNutritionTaskTab}');
    expect(dashboardSource).toContain('<ContentGrid $fullWidth={isNutritionTaskTab}>');
    expect(dashboardSource).toContain('{!isNutritionTaskTab && (');

    expect(shellSource).toContain('focusMode?: boolean');
    expect(shellSource).toContain('$focusMode={focusMode}');
    expect(shellSource).toContain('{!focusMode && (');

    expect(layoutSource).toContain('$focusMode?: boolean');
    expect(layoutSource).toContain("? 'minmax(360px, 520px) minmax(0, 1fr)'");
    expect(layoutSource).toContain("minmax(420px, 560px)");
    expect(dashboardLayoutSource).toContain('@media (min-width: 3200px)');
    expect(dashboardLayoutSource).toContain('max-width: 3040px;');
  });
});
