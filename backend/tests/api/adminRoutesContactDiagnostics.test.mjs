import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindAll } = vi.hoisted(() => ({
  mockFindAll: vi.fn()
}));

vi.mock('../../middleware/auth.mjs', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorizeAdmin: (_req, _res, next) => next()
}));

vi.mock('../../database.mjs', () => ({
  default: {
    models: {
      User: {
        findAll: vi.fn(() => Promise.resolve([]))
      }
    }
  }
}));

vi.mock('../../models/contact.mjs', () => ({
  default: {
    findAll: mockFindAll,
    findByPk: vi.fn()
  }
}));

vi.mock('../../controllers/userManagementController.mjs', () => ({
  default: {
    getAllUsers: vi.fn(),
    updateUser: vi.fn(),
    promoteToClient: vi.fn(),
    promoteToAdmin: vi.fn(),
    getRecentSignups: vi.fn(),
    getDashboardStats: vi.fn(),
    getSignupsList: vi.fn(),
    getDatabaseHealth: vi.fn()
  }
}));

vi.mock('../../routes/adminClientRoutes.mjs', async () => {
  const router = express.Router();
  return { default: router };
});

const adminRoutes = (await import('../../routes/adminRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

describe('admin contact diagnostic routes', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it('does not expose the retired contacts debug endpoint', async () => {
    await request(makeApp())
      .get('/api/admin/contacts/debug')
      .expect(404);
  });

  it('does not return raw database error details from recent contacts', async () => {
    mockFindAll.mockRejectedValue(new Error('database host leaked detail'));

    const response = await request(makeApp())
      .get('/api/admin/contacts/recent')
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: 'Failed to fetch recent contacts'
    });
    expect(response.body).not.toHaveProperty('error');
    expect(response.body).not.toHaveProperty('errorType');
  });
});
