import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  getPasswordResetSecret: vi.fn(() => 'unit-test-jwt-secret'),
  hashPasswordResetToken: vi.fn(() => 'hashed-reset-token'),
  sendPasswordResetEmailForUser: vi.fn(),
}));

vi.mock('../../services/geoIpService.mjs', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { register } = await import('../../controllers/authController.mjs');
const { validate } = await import('../../middleware/validationMiddleware.mjs');

const validRegistration = (overrides = {}) => ({
  firstName: 'Casey',
  lastName: 'Athlete',
  email: 'casey@example.com',
  username: 'casey_athlete',
  password: 'Password123!',
  role: 'client',
  ...overrides,
});

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

const runRegisterValidation = async (body) => {
  const req = {
    body,
    path: '/api/auth/register',
    method: 'POST',
  };
  const res = createResponse();
  const middlewares = validate('register');

  for (const middleware of middlewares.slice(0, -1)) {
    await middleware.run(req);
  }

  let nextCalled = false;
  middlewares[middlewares.length - 1](req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

describe('auth register clientSource contract', () => {
  beforeEach(() => {
    mocks.transaction.commit.mockReset();
    mocks.transaction.rollback.mockReset();
    mocks.userModel.findOne.mockReset();
    mocks.userModel.create.mockReset();

    mocks.userModel.findOne.mockResolvedValue(null);
    mocks.userModel.create.mockImplementation(async (payload) => ({
      id: 'user-123',
      ...payload,
      update: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('persists explicit Move Fitness source for public client signup', async () => {
    const req = { body: validRegistration({ clientSource: 'move_fitness' }) };
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'client',
        clientSource: 'move_fitness',
      }),
      expect.objectContaining({ transaction: mocks.transaction }),
    );
    expect(res.body.user.clientSource).toBe('move_fitness');
  });

  it('stamps signup IP as lastLoginIP so registered visitor intelligence can include the new user', async () => {
    const req = { body: validRegistration({ clientSource: 'swanstudios' }) };
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationIP: '127.0.0.1',
        lastLoginIP: '127.0.0.1',
        lastActive: expect.any(Date),
      }),
      expect.objectContaining({ transaction: mocks.transaction }),
    );
  });

  it('normalizes human-form client source before register validation reaches the controller', async () => {
    const { req, res, nextCalled } = await runRegisterValidation(
      validRegistration({ clientSource: ' Move Fitness ' }),
    );

    expect(nextCalled).toBe(true);
    expect(res.json).not.toHaveBeenCalled();
    expect(req.body.clientSource).toBe('move_fitness');
  });

  it.each([
    [' Move Fitness ', 'move_fitness'],
    ['move-fitness', 'move_fitness'],
    ['MOVEFITNESS', 'move_fitness'],
    ['Swan Studios', 'swanstudios'],
  ])('normalizes public client signup source alias %s', async (clientSource, expectedSource) => {
    const req = { body: validRegistration({ clientSource }) };
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'client',
        clientSource: expectedSource,
      }),
      expect.objectContaining({ transaction: mocks.transaction }),
    );
    expect(res.body.user.clientSource).toBe(expectedSource);
  });

  it('rejects client signup when source is omitted instead of silently creating a paid SwanStudios client', async () => {
    const req = { body: validRegistration({ clientSource: undefined }) };
    delete req.body.clientSource;
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/client source/i);
    expect(mocks.userModel.create).not.toHaveBeenCalled();
    expect(mocks.transaction.rollback).toHaveBeenCalled();
  });

  it('rejects invalid public client source values', async () => {
    const req = { body: validRegistration({ clientSource: 'direct' }) };
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/client source/i);
    expect(mocks.userModel.create).not.toHaveBeenCalled();
  });

  it('classifies regular public user signup as external/free-tracking instead of paid SwanStudios source', async () => {
    const req = { body: validRegistration({ role: 'user', clientSource: undefined }) };
    delete req.body.clientSource;
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        clientSource: 'external',
      }),
      expect.objectContaining({ transaction: mocks.transaction }),
    );
    expect(res.body.user.clientSource).toBe('external');
  });

  it('rejects public trainer self-registration before any privileged account is created', async () => {
    const req = { body: validRegistration({ role: 'trainer', clientSource: undefined }) };
    delete req.body.clientSource;
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/trainer accounts/i);
    expect(mocks.userModel.create).not.toHaveBeenCalled();
    expect(mocks.transaction.rollback).toHaveBeenCalled();
  });
});
