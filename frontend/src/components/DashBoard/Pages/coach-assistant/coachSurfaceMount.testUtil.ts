/**
 * Shared route-chain assertion for the coach "identity contract" tests.
 *
 * brain-v4: /dashboard/:role/coach-assistant mounts CoachSurfaceRoute, which
 * renders the v4 Coach Workspace by default and CoachCommandCenterPage behind the
 * VITE_COACH_WORKSPACE_V4 / ?coachLegacy=1 flag. A component is "wired into the
 * canonical chain" when it is reachable from BOTH pages, so each identity test
 * keeps its legacy-page assertions and gains the v4 chain through this helper.
 * One helper, so the next route change re-anchors one file, not five.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';

const workspaceFile = (name: string) => readFileSync(resolve(__dirname, '../coach-workspace', name), 'utf8');

export function expectCoachSurfaceMount(routeComponentsSource: string, routesSource: string): void {
  expect(routeComponentsSource).toContain("export const CoachSurfaceRoute = React.lazy(() => import('./Pages/coach-workspace/CoachSurfaceRoute'))");
  expect(routesSource).toContain("{ path: '/coach-assistant', component: CoachSurfaceRoute");
  expect(routesSource).not.toContain("component: CoachCommandCenterPage");

  const surface = workspaceFile('CoachSurfaceRoute.tsx');
  expect(surface).toContain("import('./CoachWorkspacePage')");
  expect(surface).toContain("import('../coach-assistant/CoachCommandCenterPage')");

  const page = workspaceFile('CoachWorkspacePage.tsx');
  expect(page).toContain('<ConversationColumn model={model} />');
  expect(page).toContain('<WorkspaceReviewView model={model} />');
  expect(workspaceFile('ConversationColumn.tsx')).toContain('<TurnEntry entry={entry} {...handlers} />');
  expect(workspaceFile('TurnEntry.tsx')).toContain("<CoachCommandLogEntry entry={entry} presentation=\"flat\" {...handlers} />");
  expect(workspaceFile('WorkspaceReviewView.tsx')).toContain('<CoachCommandCenterReviewPanel');
}
