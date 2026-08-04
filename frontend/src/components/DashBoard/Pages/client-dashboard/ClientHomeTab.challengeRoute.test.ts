import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => {
  const filePath = resolve(__dirname, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
};

const homeTabSource = readSource('./ClientHomeTab.tsx');
const clientChallengesPageSource = readSource('./ClientChallengesPage.tsx');
const routeComponentsSource = readSource('../../UniversalDashboardLayout.routeComponents.tsx');
const routeRegistrySource = readSource('../../UniversalDashboardLayout.routes.tsx');
const dashboardHomeTabSource = readSource('../../../UserDashboard/components/ClientDashboardHomeTab.tsx');
const dashboardHomeQuickActionsSource = readSource('../../../UserDashboard/components/ClientDashboardHome.quickActions.tsx');

describe('ClientHomeTab challenge route contract', () => {
  it('routes the Home challenge handoff to the dedicated client challenges page', () => {
    expect(homeTabSource).toContain("challenges: '/dashboard/client/challenges'");
    expect(homeTabSource).not.toContain("challenges: '/dashboard/client/community'");
  });

  it('mounts a first-class client challenges route in the dashboard registry', () => {
    expect(routeComponentsSource).toContain(
      "export const ClientChallengesPage = React.lazy(() => import('./Pages/client-dashboard/ClientChallengesPage'))",
    );
    expect(routeRegistrySource).toContain('ClientChallengesPage');
    expect(routeRegistrySource).toContain("{ path: '/challenges', component: ClientChallengesPage");
  });

  it('composes the full challenge board and squad support on the client route', () => {
    expect(clientChallengesPageSource).toContain("import ChallengesView from '../../../Social/Challenges/ChallengesView'");
    expect(clientChallengesPageSource).toContain(
      "import DashboardChallengesParty from '../../../UserDashboard/components/DashboardChallengesParty'",
    );
    expect(clientChallengesPageSource).toContain('<ChallengesView />');
    expect(clientChallengesPageSource).toContain('<DashboardChallengesParty />');
  });

  it('mounts the client challenge idea gate on the dedicated challenges page', () => {
    expect(clientChallengesPageSource).toContain("import ClientChallengeSubmissionGate from './ClientChallengeSubmissionGate'");
    expect(clientChallengesPageSource).toContain('<ClientChallengeSubmissionGate />');
  });
  it('keeps Challenges as a first-viewport client home quick action without displacing workout priority', () => {
    // quickLogPath = assignment-aware route (panel launch review 2026-08-03,
    // gap e) with logWorkoutPath as the unsettled-state fallback.
    const logWorkoutIndex = dashboardHomeTabSource.indexOf("{ label: 'Log Workout', path: quickLogPath }");
    const progressIndex = dashboardHomeTabSource.indexOf("{ label: 'View Progress', target: 'progress' }");
    const challengesIndex = dashboardHomeTabSource.indexOf("{ label: 'View Challenges', target: 'challenges' }");
    const bookSessionIndex = dashboardHomeTabSource.indexOf("{ label: 'Book Session', path: '/dashboard/client/schedule' }");

    expect(logWorkoutIndex).toBeGreaterThan(-1);
    expect(progressIndex).toBeGreaterThan(logWorkoutIndex);
    expect(challengesIndex).toBeGreaterThan(progressIndex);
    expect(bookSessionIndex).toBeGreaterThan(challengesIndex);
  });

  it('maps the client home Challenges quick action to a trophy icon by target instead of button index', () => {
    expect(dashboardHomeQuickActionsSource).toContain('const resolveQuickActionIcon = (action: ClientDashboardAction, index: number)');
    expect(dashboardHomeQuickActionsSource).toContain("if (action.target === 'challenges') return Trophy;");
    expect(dashboardHomeQuickActionsSource).toContain('const Icon = resolveQuickActionIcon(action, index);');
  });
});
