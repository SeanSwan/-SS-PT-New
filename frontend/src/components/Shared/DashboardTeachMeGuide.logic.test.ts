import { describe, expect, it } from 'vitest';
import {
  getDashboardTeachMeGuide,
  normalizeDashboardTeachMeRole,
} from './DashboardTeachMeGuide.logic';

describe('getDashboardTeachMeGuide', () => {
  it('teaches the admin overview as first-screen triage without implying hidden writes', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/overview',
    });

    expect(guide.title).toBe('Admin overview triage');
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.stringMatching(/scan the overview widgets/i),
      expect.stringMatching(/client, session, order, revenue, trainer, or trust/i),
      expect.stringMatching(/Do not write from overview/i),
    ]));
    expect(guide.primaryPrompt).toMatch(/admin overview triage workflow/i);
    expect(guide.primaryAction).toEqual({
      label: 'Open Coach Command',
      to: '/dashboard/admin/coach-assistant',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Scan alerts and proof/i),
      expect.stringMatching(/Pick the owner route/i),
      expect.stringMatching(/Finish inside the source screen/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Coach Command', to: '/dashboard/admin/coach-assistant' }),
      expect.objectContaining({ label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' }),
      expect.objectContaining({ label: 'Orders', to: '/dashboard/admin/pending-orders' }),
      expect.objectContaining({ label: 'Sessions', to: '/dashboard/admin/admin-sessions' }),
      expect.objectContaining({ label: 'Revenue', to: '/dashboard/admin/revenue' }),
    ]));
  });

  it('teaches trainers to work the next-session command from Home', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/overview',
    });

    expect(guide.title).toBe('Trainer today command');
    expect(guide.primaryAction).toEqual({
      label: 'Today Command',
      to: '/dashboard/trainer/overview',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/next client card/i),
      expect.stringMatching(/Coach, Plan, or Log/i),
      expect.stringMatching(/progress or schedule/i),
    ]);
    expect(guide.focus).toMatch(/next client card/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' }),
      expect.objectContaining({ label: 'Today Command', to: '/dashboard/trainer/overview' }),
      expect.objectContaining({ label: 'Plan Next Workout', to: '/dashboard/trainer/workout-planner' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
    ]));
  });

  it('teaches clients direct workout logging before secondary surfaces', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/log-workout',
    });

    expect(guide.title).toBe('Client workout logging');
    expect(guide.primaryAction).toEqual({
      label: "Log Today's Workout",
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Open today's workout/i),
      expect.stringMatching(/sets, reps, load/i),
      expect.stringMatching(/Save before checking progress/i),
    ]);
    expect(guide.primaryPrompt).toMatch(/client workout logging workflow/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'My Workouts', to: '/dashboard/client/workouts' }),
    ]));
  });

  it('teaches the public user progress tab as a proof-review job', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/progress',
    });

    expect(guide.title).toBe('User progress proof');
    expect(guide.primaryAction).toEqual({
      label: 'Review Progress',
      to: '/user-dashboard/progress',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Check the training proof/i),
      expect.stringMatching(/Find the next gap/i),
      expect.stringMatching(/Share only meaningful progress/i),
    ]);
    expect(guide.steps.join(' ')).toMatch(/Home/i);
    expect(guide.steps.join(' ')).toMatch(/Progress/i);
    expect(guide.steps.join(' ')).toMatch(/Studio/i);
    expect(guide.steps.join(' ')).toMatch(/Friends|Challenges/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Home', to: '/user-dashboard' }),
      expect.objectContaining({ label: 'Progress', to: '/user-dashboard/progress' }),
    ]));
  });

  it('teaches the public user home route to start with training, not reopening home', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard',
    });

    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.primaryPrompt).toMatch(/user dashboard training workflow/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Progress', to: '/user-dashboard/progress' }),
    ]));
  });

  it('normalizes unknown route roles to the safest client guide', () => {
    expect(normalizeDashboardTeachMeRole('admin')).toBe('admin');
    expect(normalizeDashboardTeachMeRole('operator')).toBe('client');
  });
});
