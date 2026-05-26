import { describe, expect, it } from 'vitest';
import { TRAINER_HOME_QUICK_ACTIONS } from './TrainerHomeTab';

describe('TrainerHomeTab quick-action priority', () => {
  it('keeps the daily coaching loop before schedule and planning work', () => {
    expect(TRAINER_HOME_QUICK_ACTIONS.map(action => action.label)).toEqual([
      'Log Workout',
      'View Clients',
      'Client Progress',
      'Swan Coach',
    ]);

    expect(TRAINER_HOME_QUICK_ACTIONS.map(action => action.path)).toEqual([
      '/dashboard/trainer/clients?intent=log_workout',
      '/dashboard/trainer/clients',
      '/dashboard/trainer/client-progress',
      '/dashboard/trainer/coach-assistant',
    ]);
  });
});
