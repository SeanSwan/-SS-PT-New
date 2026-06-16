import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide client support action rails', () => {
  it('gives workout history, progress, booking, messaging, and nutrition their exact next actions', () => {
    const workouts = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/workouts',
    });

    expect(workouts.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Review Workouts', to: '/dashboard/client/workouts' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
    ]));

    const progress = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/progress/detailed',
    });

    expect(progress.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Review Progress', to: '/dashboard/client/progress' }),
      expect.objectContaining({ label: 'Review Workouts', to: '/dashboard/client/workouts' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' }),
    ]));

    const booking = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/schedule',
    });

    expect(booking.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Book My Session', to: '/dashboard/client/schedule' }),
      expect.objectContaining({ label: 'Message Coach', to: '/dashboard/client/messages' }),
    ]));

    const messages = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/messages',
    });

    expect(messages.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Message Coach', to: '/dashboard/client/messages' }),
      expect.objectContaining({ label: 'Book My Session', to: '/dashboard/client/schedule' }),
    ]));

    const nutrition = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/meal-planner',
    });

    expect(nutrition.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Nutrition', to: '/dashboard/client/meal-planner' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Review Progress', to: '/dashboard/client/progress' }),
    ]));
  });
});
