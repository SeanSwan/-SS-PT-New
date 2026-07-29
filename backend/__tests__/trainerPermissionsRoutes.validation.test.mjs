import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  trainerFindOne,
  permissionFindOne,
  permissionFindAll,
  permissionFindAndCountAll,
  permissionCreate,
  permissionFindByPk,
} = vi.hoisted(() => ({
  trainerFindOne: vi.fn(),
  permissionFindOne: vi.fn(),
  permissionFindAll: vi.fn(),
  permissionFindAndCountAll: vi.fn(),
  permissionCreate: vi.fn(),
  permissionFindByPk: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../models/index.mjs', () => ({
  getTrainerPermissions: () => ({
    findOne: permissionFindOne,
    findAll: permissionFindAll,
    findAndCountAll: permissionFindAndCountAll,
    create: permissionCreate,
    findByPk: permissionFindByPk,
  }),
  getUser: () => ({
    findOne: trainerFindOne,
    count: vi.fn(),
  }),
}));

vi.mock('../models/TrainerPermissions.mjs', () => ({
  PERMISSION_TYPES: {
    EDIT_WORKOUTS: 'edit_workouts',
    VIEW_PROGRESS: 'view_progress',
    MANAGE_CLIENTS: 'manage_clients',
    ACCESS_NUTRITION: 'access_nutrition',
    MODIFY_SCHEDULES: 'modify_schedules',
    VIEW_ANALYTICS: 'view_analytics',
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const trainerPermissionsRouter = (await import('../routes/trainerPermissionsRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/trainer-permissions', trainerPermissionsRouter);

describe('trainer permission grant validation', () => {
  beforeEach(() => {
    trainerFindOne.mockReset();
    permissionFindOne.mockReset();
    permissionFindAll.mockReset();
    permissionFindAndCountAll.mockReset();
    permissionCreate.mockReset();
    permissionFindByPk.mockReset();
    trainerFindOne.mockResolvedValue({ id: 901, firstName: 'Asha', lastName: 'Reed' });
    permissionFindOne.mockResolvedValue(null);
    permissionFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    permissionCreate.mockResolvedValue({ id: 3001 });
    permissionFindByPk.mockResolvedValue({ id: 3001, permissionType: 'edit_workouts' });
  });

  it('rejects malformed pagination before listing permissions', async () => {
    const response = await request(app).get('/api/trainer-permissions?page=abc');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'page must be a positive integer',
    });
    expect(permissionFindAndCountAll).not.toHaveBeenCalled();
  });

  it('caps trainer permission list limits to 100 rows', async () => {
    const response = await request(app).get('/api/trainer-permissions?limit=9999');

    expect(response.status).toBe(200);
    expect(permissionFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 100,
      offset: 0,
    }));
  });

  it('rejects malformed trainer ID filters before listing permissions', async () => {
    const response = await request(app).get('/api/trainer-permissions?trainerId=901abc');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'trainerId must be a positive integer',
    });
    expect(permissionFindAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects malformed trainer IDs before fetching trainer permissions', async () => {
    const response = await request(app).get('/api/trainer-permissions/trainer/901abc');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Trainer ID must be a positive integer',
    });
    expect(permissionFindAll).not.toHaveBeenCalled();
  });

  it('rejects unsafe trainer IDs before fetching trainer permissions', async () => {
    const unsafeTrainerId = String(Number.MAX_SAFE_INTEGER + 1);
    const response = await request(app).get(`/api/trainer-permissions/trainer/${unsafeTrainerId}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Trainer ID must be a positive integer',
    });
    expect(permissionFindAll).not.toHaveBeenCalled();
  });

  it('rejects malformed trainer IDs before checking trainer permissions', async () => {
    const response = await request(app)
      .post('/api/trainer-permissions/check')
      .send({ trainerId: '901abc', permissionType: 'edit_workouts' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Trainer ID must be a positive integer',
    });
    expect(permissionFindOne).not.toHaveBeenCalled();
  });

  it('rejects malformed trainer IDs before user lookup or permission creation', async () => {
    const response = await request(app)
      .post('/api/trainer-permissions/grant')
      .send({ trainerId: '901abc', permissionType: 'edit_workouts' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Trainer ID must be a positive integer',
    });
    expect(trainerFindOne).not.toHaveBeenCalled();
    expect(permissionCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid expiration dates before permission creation', async () => {
    const response = await request(app)
      .post('/api/trainer-permissions/grant')
      .send({ trainerId: 901, permissionType: 'edit_workouts', expiresAt: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Expiration date must be a valid future date',
    });
    expect(trainerFindOne).not.toHaveBeenCalled();
    expect(permissionCreate).not.toHaveBeenCalled();
  });

  it('does not expose raw operational errors from trainer permission responses', async () => {
    permissionFindAndCountAll.mockRejectedValueOnce(new Error('database_password=secret'));

    const response = await request(app).get('/api/trainer-permissions');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Failed to fetch trainer permissions',
      error: 'internal_error',
    });
    expect(JSON.stringify(response.body)).not.toContain('database_password');
  });

  it('keeps valid grants working with parsed trainer IDs and future expiration dates', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post('/api/trainer-permissions/grant')
      .send({ trainerId: '901', permissionType: 'edit_workouts', expiresAt, reason: 'Temporary coverage' });

    expect(response.status).toBe(201);
    expect(trainerFindOne).toHaveBeenCalledWith({
      where: { id: 901, role: 'trainer' },
    });
    // `notes` is the real trainer_permissions audit column — no `reason` column exists
    // (schema verified against information_schema 2026-07-29, rule 58).
    expect(permissionCreate).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 901,
      permissionType: 'edit_workouts',
      expiresAt: expect.any(Date),
      isActive: true,
      notes: 'Temporary coverage',
    }));
    expect(permissionCreate.mock.calls[0][0]).not.toHaveProperty('reason');
  });

  it('rejects malformed permission IDs before revoking permissions', async () => {
    const response = await request(app)
      .put('/api/trainer-permissions/12abc/revoke')
      .send({ notes: 'Bad id' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Permission ID must be a positive integer',
    });
    expect(permissionFindByPk).not.toHaveBeenCalled();
  });

  it('rejects malformed permission IDs before extending permissions', async () => {
    const response = await request(app)
      .put('/api/trainer-permissions/12abc/extend')
      .send({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Permission ID must be a positive integer',
    });
    expect(permissionFindByPk).not.toHaveBeenCalled();
  });

  it('uses model-backed lifecycle fields when revoking permissions', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    permissionFindByPk
      .mockResolvedValueOnce({ id: 12, permissionType: 'edit_workouts', trainerId: 901, isActive: true, notes: 'Existing note', update })
      .mockResolvedValueOnce({ id: 12, permissionType: 'edit_workouts' });

    const response = await request(app)
      .put('/api/trainer-permissions/12/revoke')
      .send({ reason: 'Coverage period ended' });

    expect(response.status).toBe(200);
    // Real lifecycle columns are revokedAt + notes; the revoking admin is folded into the
    // notes text because the table has no revoked-by column (rule 58, verified 2026-07-29).
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      isActive: false,
      revokedAt: expect.any(Date),
      notes: 'Coverage period ended (revoked by admin 1)',
    }));
    expect(update.mock.calls[0][0]).not.toHaveProperty('deactivatedAt');
    expect(update.mock.calls[0][0]).not.toHaveProperty('deactivatedBy');
    expect(update.mock.calls[0][0]).not.toHaveProperty('reason');
  });

  it('rejects invalid extension dates before permission lookup', async () => {
    const response = await request(app)
      .put('/api/trainer-permissions/12/extend')
      .send({ expiresAt: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Expiration date must be a valid future date',
    });
    expect(permissionFindByPk).not.toHaveBeenCalled();
  });

  it('keeps valid permission extensions working with parsed IDs and Date objects', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const update = vi.fn().mockResolvedValue(undefined);
    permissionFindByPk
      .mockResolvedValueOnce({ id: 12, permissionType: 'edit_workouts', trainerId: 901, isActive: true, notes: 'Existing note', update })
      .mockResolvedValueOnce({ id: 12, permissionType: 'edit_workouts' });

    const response = await request(app)
      .put('/api/trainer-permissions/12/extend')
      .send({ expiresAt, reason: 'Extended' });

    expect(response.status).toBe(200);
    expect(permissionFindByPk).toHaveBeenNthCalledWith(1, 12);
    // `notes` is the real audit column (rule 58) — the API still accepts `reason` and maps it.
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      expiresAt: expect.any(Date),
      notes: 'Extended',
    }));
    expect(update.mock.calls[0][0]).not.toHaveProperty('reason');
    expect(permissionFindByPk).toHaveBeenNthCalledWith(2, 12, expect.any(Object));
  });
});
