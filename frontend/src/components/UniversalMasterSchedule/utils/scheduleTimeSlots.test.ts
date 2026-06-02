import { describe, expect, it } from 'vitest';
import {
  SCHEDULE_SLOT_MINUTES,
  buildScheduleSlotDate,
  getScheduleSlotMinuteFromOffset,
} from './scheduleTimeSlots';

describe('scheduleTimeSlots', () => {
  it('supports quarter-hour starts for half-hour and 45-minute scheduling', () => {
    expect(SCHEDULE_SLOT_MINUTES).toEqual([0, 15, 30, 45]);

    const day = new Date('2026-06-15T00:00:00.000Z');
    const slot = buildScheduleSlotDate(day, 9, 45);

    expect(slot.getFullYear()).toBe(day.getFullYear());
    expect(slot.getMonth()).toBe(day.getMonth());
    expect(slot.getDate()).toBe(day.getDate());
    expect(slot.getHours()).toBe(9);
    expect(slot.getMinutes()).toBe(45);
  });

  it('maps click position inside an hour cell to the nearest quarter-hour slot', () => {
    expect(getScheduleSlotMinuteFromOffset(0, 80)).toBe(0);
    expect(getScheduleSlotMinuteFromOffset(21, 80)).toBe(15);
    expect(getScheduleSlotMinuteFromOffset(41, 80)).toBe(30);
    expect(getScheduleSlotMinuteFromOffset(79, 80)).toBe(45);
  });
});
