import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide Coach routes', () => {
  it('teaches admin Coach as the command terminal instead of a generic admin route', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/coach-assistant',
    });

    expect(guide.title).toBe('Admin Coach command terminal');
    expect(guide.primaryAction).toEqual({
      label: 'Open Coach',
      to: '/dashboard/admin/coach-assistant',
    });
    expect(guide.fastPath.join(' ')).toMatch(/select.*client|client.*scope/i);
    expect(guide.fastPath.join(' ')).toMatch(/review/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'PLAUD Intake', to: '/dashboard/admin/coach-assistant?workspace=plaud' }),
      expect.objectContaining({ label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' }),
      expect.objectContaining({ label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' }),
    ]));
    expect(guide.primaryPrompt).toContain('admin Coach command terminal');
  });

  it('teaches trainer Coach as the client-action terminal', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/coach-assistant',
    });

    expect(guide.title).toBe('Trainer Coach terminal');
    expect(guide.primaryAction).toEqual({
      label: 'Open Coach',
      to: '/dashboard/trainer/coach-assistant',
    });
    expect(guide.fastPath.join(' ')).toMatch(/client/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
      expect.objectContaining({ label: 'Plan Next Workout', to: '/dashboard/trainer/workout-planner' }),
    ]));
    expect(guide.primaryPrompt).toContain('trainer Coach terminal');
  });

  it('teaches client Coach as a review-before-action helper', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/coach-assistant',
    });

    expect(guide.title).toBe('Client Coach terminal');
    expect(guide.summary).toMatch(/review/i);
    expect(guide.primaryAction).toEqual({
      label: 'Ask Coach',
      to: '/dashboard/client/coach-assistant',
    });
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Progress', to: '/dashboard/client/progress' }),
    ]));
    expect(guide.primaryPrompt).toContain('client Coach terminal');
  });
});
