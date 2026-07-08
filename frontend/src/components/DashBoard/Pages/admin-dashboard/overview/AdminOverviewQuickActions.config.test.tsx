import { describe, expect, it, vi } from 'vitest';
import { buildAdminOverviewQuickActions } from './AdminOverviewQuickActions.config';

describe('AdminOverviewQuickActions config', () => {
  it('keeps quick action ids unique for stable keys and targeting', () => {
    const actions = buildAdminOverviewQuickActions(vi.fn() as any);
    const ids = actions.map(action => action.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('routes client onboarding through Swan Coach as the primary intake path', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'coach-client-intake')?.action();

    expect(navigate).toHaveBeenCalledWith(
      // The intake route now also opens the onboarding workspace pane.
      '/dashboard/admin/coach-assistant?source=clients-team&workspace=onboarding&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&intent=client_onboarding'
    );
  });

  it('routes the admin hero action into Swan Coach command triage', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);
    const heroAction = actions[0];

    expect(heroAction.id).toBe('coach-command');
    heroAction.action();

    const [route] = navigate.mock.calls[0];
    const url = new URL(route, 'https://sswanstudios.com');
    expect(url.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(url.searchParams.get('intent')).toBe('admin_daily_command');
    expect(url.searchParams.get('source')).toBe('admin-overview');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/overview');
  });

  it('routes Log Workout to the canonical client hub with a logging intent', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'log-client-workout')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');
    expect(navigate).not.toHaveBeenCalledWith('/dashboard/admin/admin-sessions');
  });

  it('routes Sean/admin self logging to the admin personal workout logger', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    actions.find(action => action.id === 'my-workout')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/log-my-workout?loadPlan=today');
    expect(navigate).not.toHaveBeenCalledWith('/dashboard/client/log-workout');
    expect(actions.find(action => action.id === 'my-workout')?.description).toBe('Log my workout');
  });

  it('keeps paid-client activation one click from the admin command center', () => {
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    expect(actions.slice(0, 5).map(action => action.id)).toEqual([
      'coach-command',
      'log-client-workout',
      'my-workout',
      'coach-client-intake',
      'client-activation-queue',
    ]);

    actions.find(action => action.id === 'client-activation-queue')?.action();

    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management');
  });
});
