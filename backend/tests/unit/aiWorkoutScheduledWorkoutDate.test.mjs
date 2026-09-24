/**
 * Swan Coach's command write path (log_workout with a booked session) dates the
 * workout by the booking's LOCAL day in the client's zone — the same fix as the
 * workout-form route (2026-09-24 review): the UTC day put every booking from
 * ~5 PM Pacific "in the future" and filed early Tokyo bookings under yesterday.
 */
import { describe, expect, it } from 'vitest';
import { scheduledWorkoutDate } from '../../services/workout/aiWorkoutScheduledSessionService.mjs';

describe('scheduledWorkoutDate', () => {
  it("a 5:30 PM Pacific booking is that day in Los Angeles, not the next UTC day", () => {
    expect(scheduledWorkoutDate({ sessionDate: '2026-09-25T00:30:00.000Z' }, '2026-09-24', 'America/Los_Angeles')).toBe('2026-09-24');
  });
  it('an 8:30 AM Tokyo booking is Sept 26 in Tokyo although UTC still says Sept 25', () => {
    expect(scheduledWorkoutDate({ sessionDate: new Date('2026-09-25T23:30:00.000Z') }, null, 'Asia/Tokyo')).toBe('2026-09-26');
  });
  it('CONTROL: no booking → the requested date as before', () => {
    expect(scheduledWorkoutDate(null, '2026-09-20', 'America/Los_Angeles')).toBe('2026-09-20');
  });
});
