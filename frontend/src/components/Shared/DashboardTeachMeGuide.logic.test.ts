import { describe, expect, it } from 'vitest';
import {
  getDashboardTeachMeGuide,
  normalizeDashboardTeachMeRole,
} from './DashboardTeachMeGuide.logic';

describe('getDashboardTeachMeGuide', () => {
  it('teaches the admin overview as first-screen first moves without implying hidden writes', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/overview',
    });

    expect(guide.title).toBe('Admin overview first moves');
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.stringMatching(/Step 1.*Coach Command/i),
      expect.stringMatching(/Step 2.*Log Client/i),
      expect.stringMatching(/Step 3.*My Workout/i),
      expect.stringMatching(/Do not write from overview/i),
    ]));
    expect(guide.primaryPrompt).toMatch(/admin overview first moves workflow/i);
    expect(guide.primaryAction).toEqual({
      label: 'Coach Command',
      to: '/dashboard/admin/coach-assistant',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Step 1.*Coach Command/i),
      expect.stringMatching(/Step 2.*Log Client/i),
      expect.stringMatching(/Step 3.*My Workout/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Coach Command', to: '/dashboard/admin/coach-assistant' }),
      expect.objectContaining({ label: 'Log Client', to: '/dashboard/admin/client-management?intent=log_workout' }),
      expect.objectContaining({ label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Onboard Client', to: '/dashboard/admin/client-onboarding' }),
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

  it('teaches the public user progress tab as the mounted workout proof loop', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/progress',
    });

    expect(guide.title).toBe('User workout proof loop');
    expect(guide.primaryAction).toEqual({
      label: "Log Today's Workout",
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Exercise Usage/i),
      expect.stringMatching(/Log Today or Ask Coach/i),
      expect.stringMatching(/Save today's session/i),
    ]);
    expect(guide.steps.join(' ')).toMatch(/Exercise Usage/i);
    expect(guide.steps.join(' ')).toMatch(/Log Today/i);
    expect(guide.steps.join(' ')).toMatch(/Ask Coach/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Home', to: '/user-dashboard' }),
      expect.objectContaining({ label: 'Progress Tab', to: '/user-dashboard/progress' }),
    ]));
  });

  it('teaches the public user home route as the real daily training command', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard#home',
    });

    expect(guide.title).toBe('User home daily command');
    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Step 1.*Log Workout/i),
      expect.stringMatching(/Step 2.*View Progress/i),
      expect.stringMatching(/share after the work is logged/i),
    ]);
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.stringMatching(/Step 1.*HomeTrainingCommandStrip.*Log Workout/i),
      expect.stringMatching(/Step 2.*Progress/i),
      expect.stringMatching(/Step 3.*Ask Coach/i),
      expect.stringMatching(/share proof/i),
    ]));
    expect(guide.primaryPrompt).toMatch(/user home daily command workflow/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Progress', to: '/user-dashboard/progress' }),
      expect.objectContaining({ label: 'Studio', to: '/user-dashboard/creative' }),
    ]));
  });

  it('normalizes unknown route roles to the safest client guide', () => {
    expect(normalizeDashboardTeachMeRole('admin')).toBe('admin');
    expect(normalizeDashboardTeachMeRole('operator')).toBe('client');
  });
});
