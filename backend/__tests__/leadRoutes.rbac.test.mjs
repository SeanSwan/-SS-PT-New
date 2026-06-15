/**
 * leadRoutes RBAC regression tests.
 * Locks the trainer-scoped lead update contract: trainers may update their own
 * lead pipeline fields, but only admins may reassign or unassign lead ownership.
 * Supertest + model mocks only; no real DB.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  leadFindOne,
  leadActivityCreate,
} = vi.hoisted(() => ({
  leadFindOne: vi.fn(),
  leadActivityCreate: vi.fn(),
}));

vi.mock('../models/Lead.mjs', () => ({
  default: { findOne: leadFindOne },
}));

vi.mock('../models/LeadActivity.mjs', () => ({
  default: { create: leadActivityCreate },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 9),
      role: req.get('x-test-role') || 'trainer',
      username: 'route-test-user',
    };
    next();
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (['trainer', 'admin'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { default: leadRoutes } = await import('../routes/leadRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/leads', leadRoutes);

const makeLead = (overrides = {}) => ({
  id: 17,
  status: 'new',
  score: 12,
  assignedTrainerId: 9,
  contactedAt: null,
  qualifiedAt: null,
  scheduledAt: null,
  convertedAt: null,
  lostAt: null,
  update: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('leadRoutes RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadActivityCreate.mockResolvedValue({ id: 1 });
  });

  it('trainer PUT scopes lookup to their assigned leads and ignores assignedTrainerId updates', async () => {
    const lead = makeLead();
    leadFindOne.mockResolvedValue(lead);

    const res = await request(app)
      .put('/api/leads/17')
      .set('x-test-role', 'trainer')
      .set('x-test-user-id', '9')
      .send({ status: 'contacted', assignedTrainerId: 22 });

    expect(res.status).toBe(200);
    expect(leadFindOne).toHaveBeenCalledWith({ where: { id: '17', assignedTrainerId: 9 } });
    expect(lead.update).toHaveBeenCalledTimes(1);
    const updates = lead.update.mock.calls[0][0];
    expect(updates.status).toBe('contacted');
    expect(updates.contactedAt).toBeInstanceOf(Date);
    expect(updates).not.toHaveProperty('assignedTrainerId');
  });

  it('trainer PUT cannot touch a lead outside their assignment scope', async () => {
    leadFindOne.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/leads/18')
      .set('x-test-role', 'trainer')
      .set('x-test-user-id', '9')
      .send({ status: 'contacted', assignedTrainerId: 9 });

    expect(res.status).toBe(404);
    expect(leadFindOne).toHaveBeenCalledWith({ where: { id: '18', assignedTrainerId: 9 } });
  });

  it('admin PUT may reassign lead ownership', async () => {
    const lead = makeLead({ assignedTrainerId: null });
    leadFindOne.mockResolvedValue(lead);

    const res = await request(app)
      .put('/api/leads/17')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', '1')
      .send({ assignedTrainerId: 22 });

    expect(res.status).toBe(200);
    expect(leadFindOne).toHaveBeenCalledWith({ where: { id: '17' } });
    expect(lead.update).toHaveBeenCalledWith({ assignedTrainerId: 22 });
  });
});
