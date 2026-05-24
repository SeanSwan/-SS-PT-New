/**
 * Availability routes - API tests
 * ===============================
 * Verifies the real availability HTTP surface keeps date-only parsing aligned
 * with the new Swan Coach command slice. The availability service is mocked so
 * these tests only cover route validation and argument wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  getAvailabilityForTrainerMock,
  getAvailableSlotsMock,
  updateWeeklyAvailabilityMock,
  createOverrideMock,
} = vi.hoisted(() => ({
  getAvailabilityForTrainerMock: vi.fn(),
  getAvailableSlotsMock: vi.fn(),
  updateWeeklyAvailabilityMock: vi.fn(),
  createOverrideMock: vi.fn(),
}));

vi.mock('../../services/availabilityService.mjs', () => ({
  default: {
    getAvailabilityForTrainer: getAvailabilityForTrainerMock,
    getAvailableSlots: getAvailableSlotsMock,
    updateWeeklyAvailability: updateWeeklyAvailabilityMock,
    createOverride: createOverrideMock,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid') {
      req.user = {
        id: Number(req.headers['x-test-user-id'] || 42),
        role: req.headers['x-test-role'] || 'trainer',
      };
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
  },
  trainerOrAdminOnly: (req, _res, next) => next(),
}));

import availabilityRoutes from '../../routes/availability.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/availability', availabilityRoutes);
  return app;
}

describe('availability routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes a local calendar date into the slots service', async () => {
    getAvailableSlotsMock.mockResolvedValue([
      { startTime: '2026-04-15T16:00:00.000Z', endTime: '2026-04-15T17:00:00.000Z' },
    ]);

    const app = createApp();
    const res = await request(app)
      .get('/api/availability/9/slots?date=2026-04-15&duration=60')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
    expect(getAvailableSlotsMock).toHaveBeenCalledTimes(1);

    const [trainerId, dateArg, durationArg] = getAvailableSlotsMock.mock.calls[0];
    expect(trainerId).toBe(9);
    expect(durationArg).toBe(60);
    expect(dateArg.getFullYear()).toBe(2026);
    expect(dateArg.getMonth()).toBe(3);
    expect(dateArg.getDate()).toBe(15);
  });

  it('rejects impossible date strings on the slots route', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/availability/9/slots?date=2026-02-31&duration=60')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid date. Use YYYY-MM-DD.');
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it('rejects invalid slot durations before the service call', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/availability/9/slots?date=2026-04-15&duration=10')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('duration must be an integer between 15 and 180');
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it('rejects non-integer trainer IDs before the service call', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/availability/9.5/slots?date=2026-04-15&duration=60')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid trainerId');
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it('rejects impossible date strings on the base availability route too', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/availability/9?date=2026-02-31')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid date. Use YYYY-MM-DD.');
    expect(getAvailabilityForTrainerMock).not.toHaveBeenCalled();
  });

  it('blocks trainers from updating another trainer availability calendar', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/api/availability/9')
      .set('Authorization', 'Bearer valid')
      .send({ schedule: [] });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
    expect(updateWeeklyAvailabilityMock).not.toHaveBeenCalled();
  });

  it('allows trainers to update their own availability calendar', async () => {
    updateWeeklyAvailabilityMock.mockResolvedValue([{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);

    const app = createApp();
    const res = await request(app)
      .put('/api/availability/42')
      .set('Authorization', 'Bearer valid')
      .send({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] });

    expect(res.status).toBe(200);
    expect(updateWeeklyAvailabilityMock).toHaveBeenCalledWith(42, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
  });
});
