import { describe, expect, it } from 'vitest';
import { buildScheduleTrainerScope } from './trainerScope';

const currentUser = {
  id: 1,
  firstName: 'Sean',
  lastName: 'Swan',
  role: 'admin',
};

const trainers = [
  { id: 1, firstName: 'Sean', lastName: 'Swan' },
  { id: 2, firstName: 'Jasmine', lastName: 'Swan' },
  { id: 3, firstName: 'Alex', lastName: 'Trainer' },
];

const sessions = [
  { id: 'session-1', trainerId: 1, sessionDate: '2026-05-22T16:00:00.000Z' },
  { id: 'session-2', trainerId: 2, sessionDate: '2026-05-22T17:00:00.000Z' },
];

describe('schedule trainer scope', () => {
  it('labels and scopes an admin personal schedule to the logged-in trainer/admin', () => {
    const scope = buildScheduleTrainerScope({
      mode: 'admin',
      adminViewScope: 'my',
      currentUser,
      trainers,
      sessions,
      selectedTrainerId: null,
    });

    expect(scope.headerTitle).toBe("Sean's Schedule");
    expect(scope.headerSubtitle).toBe('Sean Swan');
    expect(scope.calendarTrainers).toEqual([
      expect.objectContaining({ id: 1, name: 'Sean Swan' }),
    ]);
    expect(scope.displaySessions).toEqual([
      expect.objectContaining({ id: 'session-1' }),
    ]);
  });

  it('shows all current trainers as columns in admin all-trainers mode, including empty schedules', () => {
    const scope = buildScheduleTrainerScope({
      mode: 'admin',
      adminViewScope: 'global',
      currentUser,
      trainers,
      sessions,
      selectedTrainerId: null,
    });

    expect(scope.headerTitle).toBe('All Trainer Schedules');
    expect(scope.headerSubtitle).toBe('3 trainers');
    expect(scope.calendarTrainers.map((trainer) => trainer.name)).toEqual([
      'Sean Swan',
      'Jasmine Swan',
      'Alex Trainer',
    ]);
    expect(scope.displaySessions).toHaveLength(2);
  });

  it('keeps a selected trainer visible even when that trainer has no sessions', () => {
    const scope = buildScheduleTrainerScope({
      mode: 'admin',
      adminViewScope: 'global',
      currentUser,
      trainers,
      sessions,
      selectedTrainerId: 3,
    });

    expect(scope.headerTitle).toBe("Alex's Schedule");
    expect(scope.headerSubtitle).toBe('Alex Trainer');
    expect(scope.calendarTrainers).toEqual([
      expect.objectContaining({ id: 3, name: 'Alex Trainer' }),
    ]);
    expect(scope.displaySessions).toEqual([]);
  });
});
