import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getNextRovingTabIndex } from './UserDashboardRovingTabs';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('UserDashboard roving tab keyboard model', () => {
  it('wraps arrow navigation and supports Home/End across dashboard tablists', () => {
    expect(getNextRovingTabIndex(0, 'ArrowRight', 4)).toBe(1);
    expect(getNextRovingTabIndex(3, 'ArrowRight', 4)).toBe(0);
    expect(getNextRovingTabIndex(0, 'ArrowLeft', 4)).toBe(3);
    expect(getNextRovingTabIndex(2, 'Home', 4)).toBe(0);
    expect(getNextRovingTabIndex(2, 'End', 4)).toBe(3);
    expect(getNextRovingTabIndex(2, 'Tab', 4)).toBeNull();
  });

  it('source-locks roving focus on the main dashboard tab bar', () => {
    const source = readSource('src/components/UserDashboard/components/UserDashboardTabBarV3.tsx');

    expect(source).toContain('getNextRovingTabIndex');
    expect(source).toContain('tabRefs.current[nextIndex]?.focus()');
    expect(source).toContain("id={matches ? 'tab-studio' : `tab-${id}`}");
    expect(source).toContain('const controlledPanelId = isActive && matches ? activeTab : id;');
    expect(source).toContain('aria-controls={`panel-${controlledPanelId}`}');
    expect(source).toContain('tabIndex={isActive ? 0 : -1}');
    expect(source).toContain('onKeyDown={(event) => handleRovingKeyDown(event, index)}');
    expect(source).toContain('<Icon size={18} aria-hidden="true" />');
  });

  it('source-locks roving focus on the Creative lens tab bar', () => {
    const source = readSource('src/components/UserDashboard/components/UserDashboardStudioLenses.tsx');

    expect(source).toContain('getNextRovingTabIndex');
    expect(source).toContain('lensRefs.current[nextIndex]?.focus()');
    expect(source).toContain('id={`tab-${id}`}');
    expect(source).toContain('aria-controls={`panel-${id}`}');
    expect(source).toContain('tabIndex={isActive ? 0 : -1}');
    expect(source).toContain('onKeyDown={(event) => handleRovingKeyDown(event, index)}');
  });

  it('keeps the settings-flow profile route owned by the visible Creative tab label', () => {
    const typesSource = readSource('src/components/UserDashboard/types/UserDashboardTypes.ts');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');

    expect(typesSource).toContain(
      "export const STUDIO_TAB_IDS: readonly TabId[] = ['creative', 'about', 'activity', 'profile'];",
    );
    expect(tabsSource).toContain("const labelledBy = id === 'profile' ? 'tab-studio' : `tab-${id}`;");
    expect(tabsSource).toContain('aria-labelledby={labelledBy}');
  });

  it('announces lazy dashboard tab loading without exposing decorative spinner content', () => {
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');

    expect(tabsSource).toContain('aria-label="Loading dashboard section"');
    expect(tabsSource).toContain('aria-live="polite"');
    expect(tabsSource).toContain('<LoadingSpinner aria-hidden="true" />');
  });
});
