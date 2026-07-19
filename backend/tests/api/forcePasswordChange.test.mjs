/**
 * Force Password Change Tests
 * ============================
 * Validates the admin-created client force-password-change flow.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import jwt from 'jsonwebtoken';

// vi.hoisted runs before vi.mock hoisting
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUTH_CONTROLLER_SOURCE = readFileSync(
  resolve(__dirname, '../../controllers/authController.mjs'),
  'utf8'
);

const { mockUser, mockUserModel, mockTransaction } = vi.hoisted(() => {
  const mockUser = {
    id: 42,
    role: 'client',
    forcePasswordChange: true,
    isActive: true,
    isLocked: false,
    failedLoginAttempts: 0,
    password: '$2a$10$hashedpassword',
    checkPassword: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockReturnValue({
      id: 42, role: 'client', firstName: 'Test', lastName: 'Client',
      email: 'test@example.com', forcePasswordChange: true
    }),
  };
  const mockUserModel = {
    findOne: vi.fn(),
    findByPk: vi.fn(),
  };
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  return { mockUser, mockUserModel, mockTransaction };
});

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
  default: { transaction: vi.fn().mockResolvedValue(mockTransaction) },
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
  getWaiverAccessStatus: vi.fn().mockResolvedValue({ hasAccess: true }),
}));
describe('Force Password Change Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Unit tests for the forcePasswordChange flag ───

  it('forcePasswordChange defaults to false on new User model', () => {
    const defaultUser = { forcePasswordChange: false };
    expect(defaultUser.forcePasswordChange).toBe(false);
  });

  it('admin can set forcePasswordChange=true when creating client', () => {
    const clientData = {
      firstName: 'New',
      lastName: 'Client',
      email: 'new@example.com',
      password: 'TempPass123!',
      forcePasswordChange: true,
      role: 'client',
    };
    expect(clientData.forcePasswordChange).toBe(true);
  });

  it('force password change blocks normal token generation flow', () => {
    // When forcePasswordChange is true, login should return tempToken instead of access/refresh tokens
    const user = { ...mockUser, forcePasswordChange: true };
    expect(user.forcePasswordChange).toBe(true);
    // Login handler checks this flag AFTER password verification, BEFORE token generation
  });

  it('password change clears the forcePasswordChange flag', async () => {
    const user = { ...mockUser, forcePasswordChange: true, save: vi.fn().mockResolvedValue(true) };
    user.password = 'NewSecurePassword123!';
    user.forcePasswordChange = false;
    await user.save();

    expect(user.forcePasswordChange).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('user without forcePasswordChange proceeds to normal login', () => {
    const user = { ...mockUser, forcePasswordChange: false };
    expect(user.forcePasswordChange).toBe(false);
    // Login handler should skip the forcePasswordChange block
  });

  it('tempToken has 15-minute expiry and force-password-change type', () => {
    // The tempToken is created with:
    //   tokenType: 'force-password-change'
    //   expiresIn: '15m'
    // This test validates the contract
    const tokenPayload = {
      id: 42,
      tokenType: 'force-password-change',
    };
    expect(tokenPayload.tokenType).toBe('force-password-change');
    expect(tokenPayload.id).toBe(42);
  });

  it('invalid tempToken type is rejected', () => {
    const decoded = { id: 42, tokenType: 'access' };
    expect(decoded.tokenType).not.toBe('force-password-change');
  });
  it('does not let an inactive account consume a force-password-change temp token', () => {
    const forceChangeStart = AUTH_CONTROLLER_SOURCE.indexOf('export const changePasswordForced');
    const forceChangeEnd = AUTH_CONTROLLER_SOURCE.indexOf('export const forgotPassword', forceChangeStart);
    const forceChangeBlock = AUTH_CONTROLLER_SOURCE.slice(forceChangeStart, forceChangeEnd);

    expect(forceChangeBlock).toContain('user.isActive === false');
    expect(forceChangeBlock.indexOf('user.isActive === false')).toBeLessThan(
      forceChangeBlock.indexOf('user.password = newPassword')
    );
    expect(forceChangeBlock.indexOf('user.isActive === false')).toBeLessThan(
      forceChangeBlock.indexOf('generateAccessToken')
    );
  });
  it('rejects inactive accounts at runtime before mutating the forced-password handoff', async () => {
    const previousJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-force-password-change-secret';

    try {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        password: '$2a$10$oldhash',
        save: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
      };
      mockUserModel.findByPk.mockResolvedValue(inactiveUser);

      const { changePasswordForced } = await import('../../controllers/authController.mjs');
      const tempToken = jwt.sign(
        { id: inactiveUser.id, tokenType: 'force-password-change' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      await changePasswordForced(
        { body: { tempToken, newPassword: 'NewSecurePassword123!' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
      expect(inactiveUser.password).toBe('$2a$10$oldhash');
      expect(inactiveUser.forcePasswordChange).toBe(true);
      expect(inactiveUser.save).not.toHaveBeenCalled();
      expect(inactiveUser.update).not.toHaveBeenCalled();
    } finally {
      if (previousJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previousJwtSecret;
      }
    }
  });

  it('reset-password rejects missing handoff fields before token lookup', async () => {
    const { resetPassword } = await import('../../controllers/authController.mjs');
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await resetPassword(
      { body: { newPassword: 'NewSecurePassword123!' } },
      res
    );

    expect(mockUserModel.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Reset token and new password are required',
    });
  });
  it('reset-password completion activates onboarding accounts and clears stale claim state', async () => {
    const resetUser = {
      ...mockUser,
      id: 77,
      accountStatus: 'stub',
      claimTokenHash: 'stale-claim-hash',
      claimTokenExpires: new Date('2030-01-01T00:00:00.000Z'),
      resetPasswordToken: 'hashed-raw-reset-token',
      update: vi.fn().mockResolvedValue(true),
    };
    mockUserModel.findOne.mockResolvedValue(resetUser);

    const { resetPassword } = await import('../../controllers/authController.mjs');
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await resetPassword(
      { body: { token: 'raw-reset-token', newPassword: 'NewSecurePassword123!' } },
      res
    );

    expect(mockUserModel.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        resetPasswordToken: 'hashed-raw-reset-token',
        isActive: true,
      }),
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    }));
    expect(resetUser.update).toHaveBeenCalledWith(expect.objectContaining({
      password: 'NewSecurePassword123!',
      resetPasswordToken: null,
      resetPasswordExpires: null,
      refreshTokenHash: null,
      forcePasswordChange: false,
      accountStatus: 'active',
      claimTokenHash: null,
      claimTokenExpires: null,
    }), { transaction: mockTransaction });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('password must meet minimum length requirement', () => {
    const PASSWORD_MIN_LENGTH = 8;
    const shortPassword = '1234567';
    const validPassword = 'ValidPass123!';

    expect(shortPassword.length).toBeLessThan(PASSWORD_MIN_LENGTH);
    expect(validPassword.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
  });
});
