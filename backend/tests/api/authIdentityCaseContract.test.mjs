import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

process.env.JWT_SECRET = 'unit-test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret';

const mocks = vi.hoisted(() => ({
  transaction: {
    commit: vi.fn(),
    rollback: vi.fn(),
  },
  userModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async () => mocks.transaction),
    models: { Friendship: null },
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => mocks.userModel,
}));

vi.mock('../../controllers/notificationController.mjs', () => ({
  createAdminNotification: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('../../services/auth/passwordResetEmailService.mjs', () => ({
  getPasswordResetSecret: vi.fn(() => 'unit-test-reset-secret'),
  hashPasswordResetToken: vi.fn(() => 'hashed-reset-token'),
  sendPasswordResetEmailForUser: vi.fn(),
}));

vi.mock('../../services/geoIpService.mjs', () => ({
  getClientIp: vi.fn(() => '198.51.100.10'),
}));

vi.mock('../../middleware/waiverGate.mjs', () => ({
  getWaiverAccessStatus: vi.fn(async () => ({
    required: false,
    hasLinkedWaiver: true,
    waiverStatus: 'not_required',
    waiverRecordId: null,
    waiverSignedAt: null,
  })),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { login, register } = await import('../../controllers/authController.mjs');

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
};

const expectLowerEquality = (condition, field, value) => {
  expect(condition.attribute.fn).toBe('LOWER');
  expect(condition.attribute.args[0].col).toBe(field);
  expect(condition.comparator).toBe('=');
  expect(condition.logic).toBe(value);
};

describe('auth identity case contract', () => {
  beforeEach(() => {
    mocks.transaction.commit.mockReset();
    mocks.transaction.rollback.mockReset();
    mocks.userModel.findOne.mockReset();
    mocks.userModel.create.mockReset();
  });

  it('matches login email or username exactly without case sensitivity', async () => {
    const user = {
      id: 41,
      email: 'casey@example.com',
      username: 'Casey_Athlete',
      role: 'user',
      isActive: true,
      isLocked: false,
      forcePasswordChange: false,
      failedLoginAttempts: 0,
      checkPassword: vi.fn(async () => true),
      update: vi.fn(async () => undefined),
    };
    mocks.userModel.findOne.mockResolvedValue(user);
    const req = {
      body: { username: 'CASEY@EXAMPLE.COM', password: 'Password123!' },
      ip: '198.51.100.41',
    };
    const res = createResponse();

    await login(req, res);

    const identityConditions = mocks.userModel.findOne.mock.calls[0][0].where[Op.or];
    expect(identityConditions).toHaveLength(2);
    expectLowerEquality(identityConditions[0], 'username', 'casey@example.com');
    expectLowerEquality(identityConditions[1], 'email', 'casey@example.com');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not turn repeated successful logins into a customer lockout', async () => {
    const user = {
      id: 43,
      email: 'repeat@example.com',
      username: 'repeat_customer',
      role: 'client',
      isActive: true,
      isLocked: false,
      forcePasswordChange: false,
      failedLoginAttempts: 0,
      checkPassword: vi.fn(async () => true),
      update: vi.fn(async () => undefined),
    };
    mocks.userModel.findOne.mockResolvedValue(user);

    const statuses = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const req = {
        body: { username: 'repeat_customer', password: 'Password123!' },
        ip: '198.51.100.43',
      };
      const res = createResponse();

      await login(req, res);
      statuses.push(res.statusCode);
    }

    expect(statuses).toEqual(Array(12).fill(200));
  });

  it('rejects registration identity duplicates that differ only by letter case', async () => {
    mocks.userModel.findOne.mockResolvedValue({
      id: 42,
      email: 'casey@example.com',
      username: 'Casey_Athlete',
    });
    const req = {
      body: {
        firstName: 'Casey',
        lastName: 'Athlete',
        email: 'CASEY@example.com',
        username: 'casey_athlete',
        password: 'Password123!',
        role: 'user',
      },
    };
    const res = createResponse();

    await register(req, res);

    const identityConditions = mocks.userModel.findOne.mock.calls[0][0].where[Op.or];
    expect(identityConditions).toHaveLength(2);
    expectLowerEquality(identityConditions[0], 'email', 'casey@example.com');
    expectLowerEquality(identityConditions[1], 'username', 'casey_athlete');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mocks.userModel.create).not.toHaveBeenCalled();
  });
});
