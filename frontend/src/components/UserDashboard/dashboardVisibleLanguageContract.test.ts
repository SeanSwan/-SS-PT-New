import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DASHBOARD_SOURCES = [
  resolve(__dirname, './UserDashboard.V3.tsx'),
  resolve(__dirname, './components/HomeTab.tsx'),
  resolve(__dirname, './components/DailyHealthLoop.tsx'),
  resolve(__dirname, './components/SwanCoachActionLauncher.tsx'),
  resolve(__dirname, './components/SwanCoachDock.tsx'),
  resolve(__dirname, '../ClientDashboard/sections/CommunitySection.tsx'),
  resolve(__dirname, '../ClientDashboard/newLayout/SocialProfileSection.tsx'),
  resolve(__dirname, '../ClientDashboard/sections/ProfileSection.tsx'),
].map((file) => readFileSync(file, 'utf8'));

describe('dashboard visible language contract', () => {
  it('uses approved movement wording in user-facing dashboard placeholder copy', () => {
    const visibleDashboardCopy = DASHBOARD_SOURCES.join('\n');

    expect(visibleDashboardCopy).not.toMatch(/\byog[a-z]*\b|\bmeditat[a-z]*\b|\bmindful[a-z]*\b/i);
  });
});
