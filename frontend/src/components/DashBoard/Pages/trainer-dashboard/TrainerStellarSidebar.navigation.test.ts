import { describe, expect, it } from 'vitest';
import { trainerNavConfig } from './TrainerStellarSidebar';

describe('TrainerStellarSidebar navigation priority', () => {
  it('keeps daily client workout actions beside assigned clients', () => {
    const clientClusterLabels = trainerNavConfig
      .find((group) => group.section === 'CLIENTS')
      ?.items.map((item) => item.label);

    expect(clientClusterLabels).toEqual([
      'My Clients',
      'Log Workout',
      'Client Progress',
      'Messages',
    ]);
  });

  it('routes the sidebar Log Workout entry through client selection instead of an empty logger', () => {
    const logWorkoutItem = trainerNavConfig
      .find((group) => group.section === 'CLIENTS')
      ?.items.find((item) => item.label === 'Log Workout');

    expect(logWorkoutItem?.path).toBe('/dashboard/trainer/clients?intent=log_workout');
  });
});
