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
} = vi.hoisted(() => ({
  getAvailableSlotsMock: vi.fn(),
  getAvailabilityForTrainerMock: vi.fn(),
  createOverrideMock: vi.fn(),
}));

vi.mock('../../services/availabilityService.mjs', () => ({
  default: {
    getAvailableSlots: getAvailableSlotsMock,
    getAvailabilityForTrainer: getAvailabilityForTrainerMock,
    createOverride: createOverrideMock,
  },
}));

import {
  dispatchViewAvailableSlots,
} from '../../services/ai/dispatchers/availabilityDispatchers.mjs';

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
});
