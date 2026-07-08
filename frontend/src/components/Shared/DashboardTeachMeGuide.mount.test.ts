import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const readDashboardShellSource = () => [
  read('src/components/DashBoard/UniversalDashboardLayout.tsx'),
  read('src/components/DashBoard/UniversalDashboardLayout.shell.tsx'),
].join('\n');

describe('DashboardTeachMeGuide mounts', () => {
  it('mounts the shared guide on role dashboards and the public user dashboard', () => {
    const dashboardShellSource = readDashboardShellSource();
    const userDashboard = read('src/components/UserDashboard/UserDashboard.V3.tsx');

    expect(dashboardShellSource).toContain('DashboardTeachMeGuide');
    expect(dashboardShellSource).toContain('role={activeRole}');
    expect(userDashboard).toContain('DashboardTeachMeGuide');
    expect(userDashboard).toContain('role="user"');
    expect(userDashboard).toContain('const teachMePathname');
    expect(userDashboard).toContain('pathname={teachMePathname}');
    expect(userDashboard).toContain('onAskCoach={handleTeachMeCoachPrompt}');
  });

  it('routes admin and trainer Teach Me prompts into Coach Command Center', () => {
    const universalLayout = read('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(universalLayout).toContain('new URLSearchParams({ teachPrompt: trimmedPrompt })');
    expect(universalLayout).toContain('navigate(`/dashboard/${activeRole}/coach-assistant?${params.toString()}`);');
    expect(universalLayout).not.toContain('omniTerminalSendInitialPrompt');
    expect(universalLayout).not.toContain('setOmniTerminalOpen(true)');
  });

  it('does not hide Teach Me Coach help from client dashboard routes', () => {
    const dashboardShellSource = readDashboardShellSource();

    expect(dashboardShellSource).toContain('onTeachMeCoachPrompt={handleTeachMeCoachPrompt}');
    expect(dashboardShellSource).toContain('onAskCoach={onTeachMeCoachPrompt}');
    expect(dashboardShellSource).toContain('teachPrompt');
    expect(dashboardShellSource).not.toContain('onAskCoach={\n                activeRole');
  });

  it('lets Coach Assistant own its teach experience instead of the shell guide', () => {
    const dashboardShell = read('src/components/DashBoard/UniversalDashboardLayout.shell.tsx');
    const coachController = read('src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.controller.ts');

    // The voice-command-center rebuild (29202be1d) removed the header guide
    // popover; the command center now carries its own teach mode. The shell
    // still suppresses its guide on coach routes so nothing double-teaches.
    expect(dashboardShell).toContain('isCoachAssistantRoute');
    expect(dashboardShell).toContain('!isCoachAssistantRoute');
    expect(coachController).toContain('teachMode');
    expect(coachController).toContain('toggleTeachMode');
  });
});
