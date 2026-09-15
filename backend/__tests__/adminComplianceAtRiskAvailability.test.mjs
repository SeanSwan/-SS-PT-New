import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, res, next) => {
    req.user = { id: 12, role: 'trainer' };
    return next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', () => ({
  default: { query },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { atRiskComplianceRoutes } = await import('../routes/adminComplianceRoutes.mjs');

function app() {
  const instance = express();
  instance.use('/api/admin/compliance/at-risk', atRiskComplianceRoutes);
  return instance;
}

beforeEach(() => query.mockReset());

describe('at-risk compliance availability contract', () => {
  it('returns a visible retryable 503 when the required collection query fails', async () => {
    query.mockRejectedValueOnce(new Error('synthetic database outage'));

    const response = await request(app()).get('/api/admin/compliance/at-risk');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: 'compliance_unavailable',
      message: 'Compliance data is temporarily unavailable. Please retry.',
    });
    expect(JSON.stringify(response.body)).not.toContain('synthetic');
  });

  it('returns 503 for a malformed successful database response', async () => {
    query.mockResolvedValueOnce([{ malformed: true }]);

    const response = await request(app()).get('/api/admin/compliance/at-risk');

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('compliance_unavailable');
  });

  it('preserves a legitimate empty collection as a successful empty result', async () => {
    query.mockResolvedValueOnce([[]]);

    const response = await request(app()).get('/api/admin/compliance/at-risk');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ clients: [] });
  });

  it('does not turn corrupt activity counts into an all-clear result', async () => {
    query.mockResolvedValueOnce([[{
      id: 7, firstName: 'Test', lastName: 'Client', availableSessions: 4,
      lastWorkoutDate: new Date(), workouts7d: 'invalid', workouts30d: 'invalid', recovery14d: '0',
    }]]);
    const response = await request(app()).get('/api/admin/compliance/at-risk');
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('compliance_unavailable');
  });

  it('accepts valid database count strings and a true healthy row', async () => {
    query.mockResolvedValueOnce([[{
      id: 7, firstName: 'Test', lastName: 'Client', availableSessions: null,
      lastWorkoutDate: new Date(), workouts7d: '3', workouts30d: '12', recovery14d: '1',
    }]]);
    const response = await request(app()).get('/api/admin/compliance/at-risk');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ clients: [] });
  });
});
