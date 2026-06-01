import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const dashboardPath = resolve(__dirname, './WorkoutDashboard.tsx');
const logicPath = resolve(__dirname, './WorkoutDashboard.logic.ts');
const clientProgressPath = resolve(__dirname, './components/ClientProgress.tsx');

const dashboardSource = readFileSync(dashboardPath, 'utf8');
const logicSource = readFileSync(logicPath, 'utf8');
const clientProgressSource = readFileSync(clientProgressPath, 'utf8');

describe('WorkoutDashboard client selection contract', () => {
  it('feeds the selected dashboard client into every active workout tab', () => {
    expect(dashboardSource).toContain(
      "<ClientProgress userId={selectedClientId || null} userRole={user?.role || 'client'} />"
    );
    expect(dashboardSource).toContain(
      '<WorkoutPlanner clientId={selectedClientId || null}'
    );
    expect(dashboardSource).toContain(
      '<RecentSessions clientId={selectedClientId || null}'
    );
  });

  it('uses role-aware client sources instead of sending trainers to the admin-only client endpoint', () => {
    expect(dashboardSource).toContain('getWorkoutDashboardClients');
    expect(logicSource).toContain('/api/client-trainer-assignments/trainer/${user.id}');
    expect(dashboardSource).not.toContain("authAxios.get('/api/auth/clients')");
  });

  it('defaults staff dashboards to a real loaded client instead of the staff member self-record', () => {
    expect(logicSource).toContain('export const getInitialWorkoutDashboardClientId');
    expect(dashboardSource).toContain('getInitialWorkoutDashboardClientId(userId, user, clients)');
    expect(dashboardSource).not.toContain('My Workouts');
  });

  it('lets ClientProgress consume an explicit userId from the parent dashboard selector', () => {
    expect(clientProgressSource).toContain('interface ClientProgressProps');
    expect(clientProgressSource).toContain('const ClientProgress: React.FC<ClientProgressProps>');
    expect(clientProgressSource).toContain('const selectedUserId = userId || routeUserId || user?.id');
    expect(clientProgressSource).toContain('selectedUserId');
  });
});
