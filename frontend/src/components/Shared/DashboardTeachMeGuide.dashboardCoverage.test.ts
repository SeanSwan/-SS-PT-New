import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide mounted dashboard coverage', () => {
  it('teaches mounted admin notes as a client-record workflow instead of pain charts', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/notes/42',
    });

    expect(guide.title).toBe('Admin client care loop');
    expect(guide.primaryAction).toEqual({
      label: 'Open Notes',
      to: '/dashboard/admin/notes',
    });
    expect(guide.fastPath.join(' ')).toMatch(/client signal|training context/i);
  });

  it('teaches the mounted trainer sprint planner as a trainer planning workflow', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/sprint-planner',
    });

    expect(guide.title).toBe('Trainer sprint planning');
    expect(guide.primaryAction).toEqual({
      label: 'Open Sprint Planner',
      to: '/dashboard/trainer/sprint-planner',
    });
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Workout Planner', to: '/dashboard/trainer/workout-planner' }),
      expect.objectContaining({ label: 'Client Progress', to: '/dashboard/trainer/client-progress' }),
    ]));
  });

  it('teaches the mounted client overview as a current-workout command surface', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/overview',
    });

    expect(guide.title).toBe('Client daily command');
    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Current Workout/i),
      expect.stringMatching(/Coach This or Plan Vault/i),
      expect.stringMatching(/Book or share only after logging/i),
    ]);
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.stringMatching(/Current Workout card/i),
      expect.stringMatching(/Coach This/i),
      expect.stringMatching(/Training Plan Vault/i),
      expect.stringMatching(/Do not treat overview/i),
    ]));
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Coach This', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Progress', to: '/dashboard/client/progress' }),
      expect.objectContaining({ label: 'Book Session', to: '/dashboard/client/schedule' }),
    ]));
    expect(guide.primaryPrompt).toMatch(/client overview daily command workflow/i);
  });

  it('teaches client overview social tabs as tab-specific proof workflows', () => {
    const expected = [
      ['/dashboard/client/overview/reels', 'Client reels proof', 'Open Reels'],
      ['/dashboard/client/overview/friends', 'Client friends accountability', 'Open Friends'],
      ['/dashboard/client/overview/challenges', 'Client challenge proof', 'Open Challenges'],
    ] as const;

    expected.forEach(([pathname, title, label]) => {
      const guide = getDashboardTeachMeGuide({ role: 'client', pathname });

      expect(guide.title).toBe(title);
      expect(guide.primaryAction.label).toBe(label);
      expect(guide.primaryAction.to).toBe(pathname);
      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' }),
        expect.objectContaining({ label: 'Progress', to: '/dashboard/client/progress' }),
      ]));
      expect(guide.primaryPrompt).not.toBe('teach me the client training loop workflow');
    });
  });
});
