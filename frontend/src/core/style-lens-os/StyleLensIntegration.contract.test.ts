import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Style Lens OS mounted integration', () => {
  it('mounts the appearance provider inside the canonical outer theme', () => {
    const app = source('src/App.tsx');

    expect(app).toContain("import { StyleLensProvider } from './core/style-lens-os'");
    expect(app).toMatch(
      /<UniversalThemeProvider[^>]*>[\s\S]*<StyleLensProvider>[\s\S]*<ConfigProvider>/
    );
    expect(app).toMatch(
      /<\/ConfigProvider>[\s\S]*<\/StyleLensProvider>[\s\S]*<\/UniversalThemeProvider>/
    );
  });

  it('suppresses persistence during administrator view-as sessions', () => {
    const layout = source(
      'src/components/DashBoard/UniversalDashboardLayout.tsx'
    );

    expect(layout).toContain('useStyleLensAppearance');
    expect(layout).toContain('setPersistenceSuppressed');
    expect(layout).toContain("userRole === 'admin'");
    expect(layout).toContain("activeRole === 'trainer'");
    expect(layout).toContain("activeRole === 'client'");
  });

  it('composes the dashboard theme from the parent theme', () => {
    const shell = source(
      'src/components/DashBoard/UniversalDashboardLayout.shell.tsx'
    );

    expect(shell).toContain(
      'theme={(parentTheme) => createUniversalDashboardTheme(activeRole, parentTheme)}'
    );
    expect(shell).not.toContain('const dashboardTheme =');
  });
});
