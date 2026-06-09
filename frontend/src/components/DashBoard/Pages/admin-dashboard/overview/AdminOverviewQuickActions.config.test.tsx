import { describe, expect, it, vi } from 'vitest';
import { buildAdminOverviewQuickActions } from './AdminOverviewQuickActions.config';

describe('AdminOverviewQuickActions config', () => {
  it('routes client onboarding through Swan Coach as the primary intake path', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'coach-client-intake')?.action();

    expect(navigate).toHaveBeenCalledWith(
      '/dashboard/admin/coach-assistant?source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&intent=client_onboarding'
    );
  });

  it('routes Log Workout to the canonical client hub with a logging intent', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'log-client-workout')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');
    expect(navigate).not.toHaveBeenCalledWith('/dashboard/admin/admin-sessions');
  });

  it('keeps paid-client activation one click from the admin command center', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    expect(actions.slice(0, 3).map(action => action.id)).toEqual([
      'coach-client-intake',
      'client-activation-queue',
      'log-client-workout',
    ]);

    actions.find(action => action.id === 'client-activation-queue')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management');
  });
});
