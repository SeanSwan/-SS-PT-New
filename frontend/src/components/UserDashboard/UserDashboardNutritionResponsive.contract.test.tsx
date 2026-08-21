/**
 * Shell layout contract for the member dashboard.
 *
 * CONVERTED 2026-08-21 (SWA-188 class). This file previously asserted the exact
 * JSX text of UserDashboard.V3.tsx, e.g.
 *   expect(dashboardSource).toContain('<ContentGrid $fullWidth={isNutritionTaskTab}>')
 * That passes for source that merely *looks* right and fails for a refactor that
 * is behaviourally correct — which is exactly what happened when the rail was
 * changed from opt-out to opt-in. The rule it was guarding is now a real
 * function and a real styled component, so it can be exercised instead of read.
 *
 * The remaining source assertions cover the ObservatoryShell focus-mode wiring,
 * which has no extracted unit yet; they are marked as such.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentGrid } from './styles/DashboardV3LayoutStyles';
import { isFocusModeTab, shouldShowProfileSidebar } from './dashboardSidebarPolicy';
import { USER_DASHBOARD_TAB_IDS } from './types/UserDashboardTypes';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('member dashboard rail policy', () => {
  it('gives Nutrition a focused task surface with no profile rail', () => {
    expect(isFocusModeTab('nutrition')).toBe(true);
    expect(shouldShowProfileSidebar('nutrition')).toBe(false);
  });

  it('does not nest the profile rail inside Home, which has three rails of its own', () => {
    expect(shouldShowProfileSidebar('home')).toBe(false);
  });

  it('still renders the profile rail on the tabs that rely on it', () => {
    expect(shouldShowProfileSidebar('friends')).toBe(true);
    expect(shouldShowProfileSidebar('activity')).toBe(true);
    expect(shouldShowProfileSidebar('progress')).toBe(true);
  });

  it('defaults an unrecognised or future tab to full width rather than crushing it', () => {
    expect(shouldShowProfileSidebar('some-tab-added-later')).toBe(true);
    expect(shouldShowProfileSidebar(null)).toBe(false);
    expect(shouldShowProfileSidebar(undefined)).toBe(false);
  });

  it('covers every routable tab without throwing', () => {
    for (const tab of USER_DASHBOARD_TAB_IDS) {
      expect(typeof shouldShowProfileSidebar(tab)).toBe('boolean');
    }
  });
});

describe('ContentGrid column contract', () => {
  it('renders a single content column when the rail is not opted in', () => {
    const { container } = render(<ContentGrid />);
    const styles = getComputedStyle(container.firstElementChild as Element);
    expect(styles.gridTemplateColumns).toBe('minmax(0, 1fr)');
  });

  it('renders rail + content only when the rail is opted in', () => {
    const { container } = render(<ContentGrid $withSidebar />);
    const styles = getComputedStyle(container.firstElementChild as Element);
    expect(styles.gridTemplateColumns).toBe('300px minmax(0, 1fr)');
  });
});

describe('ObservatoryShell focus-mode wiring (source-level; no extracted unit yet)', () => {
  it('threads focusMode through the shell and its layout', () => {
    const shellSource = readSource('src/components/UserDashboard/components/ObservatoryShell.tsx');
    const layoutSource = readSource('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
    const dashboardLayoutSource = readSource('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');

    expect(shellSource).toContain('focusMode?: boolean');
    expect(shellSource).toContain('$focusMode={focusMode}');
    expect(shellSource).toContain('{!focusMode && (');

    expect(layoutSource).toContain('$focusMode?: boolean');
    expect(layoutSource).toContain("? 'minmax(360px, 520px) minmax(0, 1fr)'");
    expect(layoutSource).toContain('minmax(420px, 560px)');
    expect(dashboardLayoutSource).toContain('@media (min-width: 3200px)');
    expect(dashboardLayoutSource).toContain('max-width: 3040px;');
  });
});
