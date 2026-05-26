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
});
