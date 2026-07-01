/**
 * Auth Controller Validate-Token Guard Tests
 * ==========================================
 * Verifies public token validation does not restore inactive or locked accounts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const { mockUserModel } = vi.hoisted(() => ({
  mockUserModel: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => mockUserModel,
  getAllModels: () => ({}),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/apiResponse.mjs', () => ({
  successResponse: vi.fn((res, data, msg) => res.status(200).json({ success: true, data, message: msg })),
  errorResponse: vi.fn((res, msg, code) => res.status(code).json({ success: false, message: msg })),
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../../services/auth/passwordResetEmailService.mjs', () => ({
  getPasswordResetSecret: vi.fn(() => 'test-reset-secret'),
  hashPasswordResetToken: vi.fn((token) => `hashed-${token}`),
  sendPasswordResetEmailForUser: vi.fn(),
}));

vi.mock('../../services/geoIpService.mjs', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
  createAdminNotification: vi.fn(),
}));

vi.mock('../../services/leadCaptureService.mjs', () => ({
  captureLeadFromSignup: vi.fn(),
}));

vi.mock('../../middleware/waiverGate.mjs', () => ({
  getWaiverAccessStatus: vi.fn().mockResolvedValue({
    required: false,
    hasLinkedWaiver: true,
    waiverStatus: 'not_required',
  }),
}));

const TEST_JWT_SECRET = 'test-validate-token-secret';
let previousJwtSecret;

const makeUser = (overrides = {}) => ({
  id: 42,
  role: 'client',
  username: 'client42',
  email: 'client42@example.test',
  firstName: 'Client',
  lastName: 'FortyTwo',
  isActive: true,
  isLocked: false,
  update: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const makeResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const makeRequest = (token) => ({
  headers: {
    authorization: `Bearer ${token}`,
  },
});

const signAccessToken = (id = 42) => jwt.sign(
  { id, role: 'client', tokenType: 'access' },
  TEST_JWT_SECRET,
  { expiresIn: '15m' }
);

describe('authController validateToken account-state guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previousJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('returns a valid true contract for active access tokens', async () => {
    const activeUser = makeUser();
    mockUserModel.findByPk.mockResolvedValue(activeUser);

    const { validateToken } = await import('../../controllers/authController.mjs');
    const res = makeResponse();
    await validateToken(makeRequest(signAccessToken()), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      valid: true,
      user: expect.objectContaining({ id: activeUser.id, email: activeUser.email }),
    }));
    expect(activeUser.update).toHaveBeenCalledWith({ lastActive: expect.any(Date) });
  });

  it('rejects inactive access tokens before restoring the user or touching lastActive', async () => {
    const inactiveUser = makeUser({ isActive: false });
    mockUserModel.findByPk.mockResolvedValue(inactiveUser);

    const { validateToken } = await import('../../controllers/authController.mjs');
    const res = makeResponse();
    await validateToken(makeRequest(signAccessToken()), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      valid: false,
      message: 'Account is inactive. Please contact support.',
    });
    expect(inactiveUser.update).not.toHaveBeenCalled();
  });

  it('rejects locked access tokens before restoring the user or touching lastActive', async () => {
    const lockedUser = makeUser({ isLocked: true });
    mockUserModel.findByPk.mockResolvedValue(lockedUser);

    const { validateToken } = await import('../../controllers/authController.mjs');
    const res = makeResponse();
    await validateToken(makeRequest(signAccessToken()), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      valid: false,
      message: 'Account is locked. Please contact support.',
    });
    expect(lockedUser.update).not.toHaveBeenCalled();
  });
});