import { describe, expect, it, vi } from 'vitest';
import { buildAdminOverviewQuickActions } from './AdminOverviewQuickActions.config';

describe('AdminOverviewQuickActions config', () => {
  it('routes client onboarding through Swan Coach as the primary intake path', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'coach-client-intake')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/coach-assistant?intent=onboard_client');
  });

  it('routes Log Workout to the canonical client hub with a logging intent', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'log-client-workout')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');
    expect(navigate).not.toHaveBeenCalledWith('/dashboard/admin/admin-sessions');
  });
});
