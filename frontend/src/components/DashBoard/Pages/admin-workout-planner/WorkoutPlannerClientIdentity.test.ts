import { describe, expect, it } from 'vitest';
import {
  normalizeWorkoutPlannerClients,
  parseWorkoutPlannerClientId,
  pickWorkoutPlannerClientId,
  resolveWorkoutPlannerPlanClientId,
} from './WorkoutPlannerClientIdentity';

describe('WorkoutPlannerClientIdentity', () => {
  it('parses only positive safe integer client ids', () => {
    expect(parseWorkoutPlannerClientId(42)).toBe(42);
    expect(parseWorkoutPlannerClientId('42')).toBe(42);
    expect(parseWorkoutPlannerClientId(' 42 ')).toBe(42);
    expect(parseWorkoutPlannerClientId(0)).toBeNull();
    expect(parseWorkoutPlannerClientId(-1)).toBeNull();
    expect(parseWorkoutPlannerClientId(42.5)).toBeNull();
    expect(parseWorkoutPlannerClientId('42.5')).toBeNull();
    expect(parseWorkoutPlannerClientId('42junk')).toBeNull();
    expect(parseWorkoutPlannerClientId(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });

  it('drops malformed clients before the planner can select or query them', () => {
    const clients = normalizeWorkoutPlannerClients([
      { id: '91', firstName: 'Valid', lastName: 'Client', username: 'valid' },
      { id: '91junk', firstName: 'Bad', lastName: 'Client', username: 'bad' },
      { id: 0, firstName: 'Zero', lastName: 'Client', username: 'zero' },
    ]);

    expect(clients.map((client) => client.id)).toEqual([91]);
  });

  it('prefers a valid requested client and otherwise falls back to the first valid client', () => {
    const clients = normalizeWorkoutPlannerClients([
      { id: 91, firstName: 'First', lastName: 'Client', username: 'first' },
      { id: '155', firstName: 'Second', lastName: 'Client', username: 'second' },
    ]);

    expect(pickWorkoutPlannerClientId(clients, 155)).toBe(155);
    expect(pickWorkoutPlannerClientId(clients, 404)).toBe(91);
    expect(pickWorkoutPlannerClientId([], 155)).toBeNull();
  });

  it('resolves saved generated-plan client ids without ever falling back to zero', () => {
    expect(resolveWorkoutPlannerPlanClientId('42', 99)).toBe(42);
    expect(resolveWorkoutPlannerPlanClientId('42junk', 99)).toBe(99);
    expect(resolveWorkoutPlannerPlanClientId(null, '88')).toBe(88);
    expect(resolveWorkoutPlannerPlanClientId('42junk', null)).toBeNull();
    expect(resolveWorkoutPlannerPlanClientId(0, 0)).toBeNull();
  });
});
