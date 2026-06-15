import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide trainer overview', () => {
  it('teaches the upgraded next-session Coach Plan Log command instead of sending trainers away first', () => {
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
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Plan Next Workout', to: '/dashboard/trainer/workout-planner' }),
      expect.objectContaining({ label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
    ]));
    expect(guide.primaryPrompt).toContain('trainer overview');
    expect(guide.primaryAction.to).not.toContain('/clients?intent=log_workout');
  });
});
