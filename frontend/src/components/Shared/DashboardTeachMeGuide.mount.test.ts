import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('DashboardTeachMeGuide mounts', () => {
  it('mounts the shared guide on role dashboards and the public user dashboard', () => {
    const universalLayout = read('src/components/DashBoard/UniversalDashboardLayout.tsx');
    const userDashboard = read('src/components/UserDashboard/UserDashboard.V3.tsx');

    expect(universalLayout).toContain('DashboardTeachMeGuide');
    expect(universalLayout).toContain('role={activeRole}');
    expect(userDashboard).toContain('DashboardTeachMeGuide');
    expect(userDashboard).toContain('role="user"');
    expect(userDashboard).toContain('const teachMePathname');
    expect(userDashboard).toContain('pathname={teachMePathname}');
    expect(userDashboard).toContain('onAskCoach={handleTeachMeCoachPrompt}');
  });

  it('wires admin and trainer Teach Me prompts into one-click Coach drawer sends', () => {
    const universalLayout = read('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(universalLayout).toContain('const [omniTerminalSendInitialPrompt, setOmniTerminalSendInitialPrompt]');
    expect(universalLayout).toContain('setOmniTerminalSendInitialPrompt(true)');
    expect(universalLayout).toContain('initialPromptSendImmediately={omniTerminalSendInitialPrompt}');
    expect(universalLayout).toContain('setOmniTerminalSendInitialPrompt(false)');
  });

  it('does not hide Teach Me Coach help from client dashboard routes', () => {
    const universalLayout = read('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(universalLayout).toContain('onAskCoach={handleTeachMeCoachPrompt}');
    expect(universalLayout).toContain('teachPrompt');
    expect(universalLayout).not.toContain('onAskCoach={\n                activeRole');
  });
});
