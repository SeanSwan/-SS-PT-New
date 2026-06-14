import { describe, expect, it } from 'vitest';
import {
  getDashboardTeachMeGuide,
  normalizeDashboardTeachMeRole,
} from './DashboardTeachMeGuide.logic';

describe('getDashboardTeachMeGuide', () => {
  it('teaches the admin command flow without implying hidden writes', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/client-management?tab=training',
    });

    expect(guide.title).toBe('Admin command center');
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.stringMatching(/Start with Coach or Client Hub/i),
      expect.stringMatching(/Training tab/i),
      expect.stringMatching(/approval-gated/i),
    ]));
    expect(guide.primaryPrompt).toMatch(/teach me the admin dashboard workflow/i);
    expect(guide.primaryAction).toEqual({
      label: 'Log Client Workout',
      to: '/dashboard/admin/client-management?intent=log_workout',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Pick the client or Coach thread/i),
      expect.stringMatching(/Open the Training tab/i),
      expect.stringMatching(/Review, then save/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Coach', to: '/dashboard/admin/coach-assistant' }),
      expect.objectContaining({ label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' }),
      expect.objectContaining({ label: 'Log Client Workout', to: '/dashboard/admin/client-management?intent=log_workout' }),
      expect.objectContaining({ label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' }),
    ]));
  });

  it('teaches trainers to move from today sessions to logging and progress review', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/overview',
    });

    expect(guide.title).toBe('Trainer floor flow');
    expect(guide.primaryAction).toEqual({
      label: "Log Today's Client",
      to: '/dashboard/trainer/clients?intent=log_workout',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Open Today sessions/i),
      expect.stringMatching(/Log the active client/i),
      expect.stringMatching(/Check progress/i),
    ]);
    expect(guide.steps.join(' ')).toMatch(/Today.*sessions/i);
    expect(guide.steps.join(' ')).toMatch(/Log.*workout/i);
    expect(guide.steps.join(' ')).toMatch(/progress/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' }),
      expect.objectContaining({ label: 'Today Sessions', to: '/dashboard/trainer/overview' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
    ]));
  });

  it('teaches clients the workout loop before secondary surfaces', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/log-workout',
    });

    expect(guide.title).toBe('Client training loop');
    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: '/dashboard/client/log-workout',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Log today's workout/i),
      expect.stringMatching(/Check progress/i),
      expect.stringMatching(/Book or message/i),
    ]);
    expect(guide.steps.join(' ')).toMatch(/Log Workout/i);
    expect(guide.steps.join(' ')).toMatch(/Progress/i);
    expect(guide.steps.join(' ')).toMatch(/Book My Session/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout' }),
      expect.objectContaining({ label: 'Book My Session', to: '/dashboard/client/schedule' }),
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
      to: '/dashboard/client/log-workout',
    });
    expect(guide.primaryPrompt).toMatch(/user dashboard training workflow/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Progress', to: '/user-dashboard/progress' }),
    ]));
  });

  it('normalizes unknown route roles to the safest client guide', () => {
    expect(normalizeDashboardTeachMeRole('admin')).toBe('admin');
    expect(normalizeDashboardTeachMeRole('operator')).toBe('client');
  });
});
