import { describe, expect, it } from 'vitest';
import {
  buildEditableSessionUpdate,
  parseEditableSessionId,
} from '../../routes/sessionEditableUpdate.mjs';

describe('session editable update request helpers', () => {
  it('accepts minute-precise session edits and recalculates endDate from duration', () => {
    const update = buildEditableSessionUpdate({
      sessionDate: '2026-06-15T16:45:00.000Z',
      duration: 45,
      location: 'Park',
      notes: 'Bring bands',
      notifyClient: false,
      trainerId: '7',
      userId: '84',
    });

    expect(update).toMatchObject({
      sessionDate: new Date('2026-06-15T16:45:00.000Z'),
      duration: 45,
      endDate: new Date('2026-06-15T17:30:00.000Z'),
      location: 'Park',
      notes: 'Bring bands',
      notifyClient: false,
      trainerId: 7,
      userId: 84,
    });
  });

  it('allows clearing trainer/client assignment while preserving valid zero-minute-free values', () => {
    expect(buildEditableSessionUpdate({ trainerId: '', userId: null })).toEqual({
      trainerId: null,
      userId: null,
    });
  });

  it('rejects invalid editable session values before a database write', () => {
    expect(() => buildEditableSessionUpdate({ duration: 0 })).toThrow(/duration/i);
    expect(() => buildEditableSessionUpdate({ sessionDate: 'not-a-date' })).toThrow(/sessionDate/i);
    expect(() => buildEditableSessionUpdate({ location: 'x'.repeat(201) })).toThrow(/location/i);
    expect(() => buildEditableSessionUpdate({ trainerId: 'trainer-7' })).toThrow(/trainerId/i);
    expect(parseEditableSessionId('42')).toBe(42);
    expect(parseEditableSessionId('bad')).toBeNull();
  });
});
