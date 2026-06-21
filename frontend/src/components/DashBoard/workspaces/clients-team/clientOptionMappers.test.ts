import { describe, expect, it } from 'vitest';
import { mapAdminClientToClientOption, toMiniCardClient } from './clientOptionMappers';
import type { ClientOption } from './ClientSelectorDropdown';

const baseClient: ClientOption = {
  id: 42,
  firstName: 'Fixture',
  lastName: 'Client',
  email: 'fixture.client@example.test',
  isActive: true,
  workoutCount: 3,
};

describe('clientOptionMappers', () => {
  it('maps SwanStudios paid inventory into the mini card', () => {
    expect(toMiniCardClient({
      ...baseClient,
      clientSource: 'swanstudios',
      availableSessions: 4,
    })).toMatchObject({
      sessionsLeft: 4,
      tier: 'premium',
    });
  });

  it('does not let free-tracking client sources look like paid inventory', () => {
    expect(toMiniCardClient({
      ...baseClient,
      clientSource: 'move_fitness',
      availableSessions: 12,
    })).toMatchObject({
      sessionsLeft: 0,
      tier: 'starter',
    });

    expect(toMiniCardClient({
      ...baseClient,
      clientSource: 'external',
      availableSessions: 7,
    })).toMatchObject({
      sessionsLeft: 0,
      tier: 'starter',
    });
  });

  it('normalizes malformed paid session inventory before it reaches hub cards', () => {
    expect(toMiniCardClient({
      ...baseClient,
      clientSource: 'swanstudios',
      availableSessions: 'not-a-number' as any,
    })).toMatchObject({
      sessionsLeft: 0,
      tier: 'starter',
    });

    expect(mapAdminClientToClientOption({
      id: 77,
      firstName: 'Drift',
      lastName: 'Client',
      email: 'drift.client@example.test',
      clientSource: 'swanstudios',
      availableSessions: '-5',
      totalWorkouts: 8,
    })).toMatchObject({
      id: 77,
      availableSessions: 0,
      workoutCount: 8,
    });
  });

  it('normalizes malformed workout totals before they reach client cards', () => {
    expect(toMiniCardClient({
      ...baseClient,
      workoutCount: -4.9,
    })).toMatchObject({
      workoutCount: 0,
    });

    expect(mapAdminClientToClientOption({
      id: 79,
      firstName: 'Workout',
      lastName: 'Drift',
      totalWorkouts: '6.8',
    })).toMatchObject({
      id: 79,
      workoutCount: 6,
    });

    expect(mapAdminClientToClientOption({
      id: 80,
      firstName: 'Malformed',
      lastName: 'Workouts',
      totalWorkouts: 'not-a-number',
    })).toMatchObject({
      id: 80,
      workoutCount: 0,
    });
  });

  it('normalizes API client ids before clients become selectable daily-training records', () => {
    expect(mapAdminClientToClientOption({
      id: '88',
      firstName: 'String',
      lastName: 'Identifier',
      email: 'string.id@example.test',
    })).toMatchObject({
      id: 88,
    });

    expect(mapAdminClientToClientOption({
      id: '88junk',
      firstName: 'Bad',
      lastName: 'Identifier',
      email: 'bad.id@example.test',
    })).toBeNull();

    expect(mapAdminClientToClientOption({
      id: 0,
      firstName: 'Zero',
      lastName: 'Identifier',
      email: 'zero.id@example.test',
    })).toBeNull();
  });
});
