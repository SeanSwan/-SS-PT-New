import { describe, expect, it } from 'vitest';
import { getAlternativeKey, getConflictKey } from './ConflictPanel.logic';

describe('ConflictPanel identity helpers', () => {
  it('keys conflicts by conflict details instead of array order', () => {
    const conflict = {
      type: 'hard' as const,
      reason: 'Trainer already booked',
      conflictingSession: {
        id: 91,
        sessionDate: '2026-06-01T15:00:00.000Z',
      },
      suggestion: 'Pick another trainer',
    };

    expect(getConflictKey(conflict)).toBe(getConflictKey({ ...conflict }));
    expect(getConflictKey(conflict)).not.toBe(getConflictKey({ ...conflict, reason: 'Client already booked' }));
  });

  it('keys alternatives by destination slot identity', () => {
    const alternative = {
      date: new Date('2026-06-01T00:00:00.000Z'),
      hour: 15,
      label: 'Jun 1, 3:00 PM',
    };

    expect(getAlternativeKey(alternative)).toBe(getAlternativeKey({ ...alternative }));
    expect(getAlternativeKey(alternative)).not.toBe(getAlternativeKey({ ...alternative, hour: 16 }));
  });
});
