/**
 * Availability dispatchers - unit tests
 * =====================================
 * Covers the Swan Coach availability command handlers without touching the DB.
 * The shared availability service is mocked so the tests exercise command-lane
 * validation, RBAC/defaulting, and flat result shaping only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAvailableSlotsMock,
  getAvailabilityForTrainerMock,
  createOverrideMock,
  updateWeeklyAvailabilityMock,
} = vi.hoisted(() => ({
  getAvailableSlotsMock: vi.fn(),
  getAvailabilityForTrainerMock: vi.fn(),
  createOverrideMock: vi.fn(),
  updateWeeklyAvailabilityMock: vi.fn(),
}));

vi.mock('../../services/availabilityService.mjs', () => ({
  default: {
    getAvailableSlots: getAvailableSlotsMock,
    getAvailabilityForTrainer: getAvailabilityForTrainerMock,
    createOverride: createOverrideMock,
    updateWeeklyAvailability: updateWeeklyAvailabilityMock,
  },
}));

import {
  dispatchViewAvailableSlots,
} from '../../services/ai/dispatchers/availabilityDispatchers.mjs';
import { dispatchSetAvailability } from '../../services/ai/dispatchers/setAvailabilityDispatcher.mjs';

describe('availability dispatchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults trainerId to the requesting trainer and flattens slot results', async () => {
    getAvailableSlotsMock.mockResolvedValue([
      {
        startTime: '2026-04-15T16:00:00.000Z',
        endTime: '2026-04-15T17:00:00.000Z',
      },
      {
        startTime: '2026-04-15T18:00:00.000Z',
        endTime: '2026-04-15T19:00:00.000Z',
      },
    ]);

    const result = await dispatchViewAvailableSlots(
      { date: '2026-04-15', duration: 60 },
      { user: { id: 42, role: 'trainer' } },
    );

    expect(getAvailableSlotsMock).toHaveBeenCalledTimes(1);
    const [trainerId, dateArg, durationArg] = getAvailableSlotsMock.mock.calls[0];
    expect(trainerId).toBe(42);
    expect(durationArg).toBe(60);
    expect(dateArg.getFullYear()).toBe(2026);
    expect(dateArg.getMonth()).toBe(3);
    expect(dateArg.getDate()).toBe(15);

    expect(result).toEqual({
      trainerId: 42,
      date: '2026-04-15',
      durationMinutes: 60,
      availableSlotCount: 2,
      firstSlotStartUtc: '16:00',
      lastSlotEndUtc: '19:00',
    });
  });

  it('rejects a trainer trying to query another trainer', async () => {
    await expect(
      dispatchViewAvailableSlots(
        { trainerId: 99, date: '2026-04-15' },
        { user: { id: 42, role: 'trainer' } },
      ),
    ).rejects.toThrow('Trainers can only manage their own availability.');

    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it('rejects impossible calendar dates before the service call', async () => {
    await expect(
      dispatchViewAvailableSlots(
        { date: '2026-02-31', duration: 60 },
        { user: { id: 42, role: 'trainer' } },
      ),
    ).rejects.toThrow('"2026-02-31" is not a valid calendar date.');

    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it('returns an honest empty summary when no slots are open', async () => {
    getAvailableSlotsMock.mockResolvedValue([]);

    const result = await dispatchViewAvailableSlots(
      { trainerId: 7, date: '2026-04-16', duration: 45 },
      { user: { id: 1, role: 'admin' } },
    );

    expect(result).toEqual({
      trainerId: 7,
      date: '2026-04-16',
      durationMinutes: 45,
      availableSlotCount: 0,
      firstSlotStartUtc: null,
      lastSlotEndUtc: null,
    });
  });

  it('sets one recurring day without wiping the trainer weekly schedule', async () => {
    getAvailabilityForTrainerMock.mockResolvedValue({
      recurring: [
        {
          dayOfWeek: 2,
          startTime: '10:00:00',
          endTime: '16:00:00',
          type: 'available',
          isRecurring: true,
          isActive: true,
        },
      ],
      overrides: [],
    });
    updateWeeklyAvailabilityMock.mockResolvedValue([
      { id: 11, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { id: 12, dayOfWeek: 2, startTime: '10:00', endTime: '16:00' },
    ]);

    const result = await dispatchSetAvailability(
      {
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '17:00',
      },
      { user: { id: 42, role: 'trainer' } },
    );

    expect(getAvailabilityForTrainerMock).toHaveBeenCalledWith(42);
    expect(updateWeeklyAvailabilityMock).toHaveBeenCalledWith(42, [
      {
        dayOfWeek: 2,
        startTime: '10:00',
        endTime: '16:00',
        type: 'available',
      },
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        type: 'available',
      },
    ]);
    expect(result).toEqual({
      trainerId: 42,
      dayOfWeek: 1,
      day: 'Mon',
      startTime: '09:00',
      endTime: '17:00',
      recurringSlotCount: 2,
      preservedOtherDays: 1,
    });
  });

  it('rejects set_availability ranges that end before they start', async () => {
    await expect(
      dispatchSetAvailability(
        {
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '09:00',
        },
        { user: { id: 42, role: 'trainer' } },
      ),
    ).rejects.toThrow('End time (09:00) must be after start time (17:00).');

    expect(updateWeeklyAvailabilityMock).not.toHaveBeenCalled();
  });
});
