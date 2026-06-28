import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DASHBOARD_SOURCES = [
  resolve(__dirname, './UserDashboard.V3.tsx'),
  resolve(__dirname, './components/HomeTab.tsx'),
  resolve(__dirname, './components/ClientDashboardHomeTab.tsx'),
  resolve(__dirname, './components/AboutSection.helpers.ts'),
  resolve(__dirname, './components/DailyHealthLoop.tsx'),
  resolve(__dirname, './components/SwanCoachActionLauncher.tsx'),
  resolve(__dirname, './components/SwanCoachDock.tsx'),
  resolve(__dirname, './hooks/useUserDashboardV3Controller.ts'),
  resolve(__dirname, '../../types/gamification.ts'),
].map((file) => readFileSync(file, 'utf8'));

describe('dashboard visible language contract', () => {
  it('uses approved movement wording in user-facing dashboard placeholder copy', () => {
    const visibleDashboardCopy = DASHBOARD_SOURCES.join('\n');

    expect(visibleDashboardCopy).not.toMatch(/\byog[a-z]*\b|\bmeditat[a-z]*\b|\bmindful[a-z]*\b/i);
  });

  it('derives dashboard rank copy from the Swan rank ladder instead of retired fallback strings', () => {
    const visibleDashboardCopy = DASHBOARD_SOURCES.join('\n');

    expect(visibleDashboardCopy).toContain('getTierDisplay(getTier(');
    expect(visibleDashboardCopy).not.toContain('Bronze Forge');
    expect(visibleDashboardCopy).not.toContain('Silver Edge');
    expect(visibleDashboardCopy).not.toContain('Titanium Core');
    expect(visibleDashboardCopy).not.toContain('Obsidian Warrior');
    expect(visibleDashboardCopy).not.toContain('Crystal Voyager');
    expect(visibleDashboardCopy).not.toContain("gamProfile?.data?.tier ??");
    expect(visibleDashboardCopy).toContain('Coachcraft Grove');
    expect(visibleDashboardCopy).toContain('Ironwood Flight');
    expect(visibleDashboardCopy).toContain('Evergreen Current');
  });
});
