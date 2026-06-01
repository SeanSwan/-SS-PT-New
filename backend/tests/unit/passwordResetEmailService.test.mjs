import { afterEach, describe, expect, it, vi } from 'vitest';

describe('password reset email service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PASSWORD_RESET_SECRET;
    delete process.env.JWT_SECRET;
  });

  it('stores a hashed reset token and emails only the raw reset link', async () => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret-with-enough-entropy';
    const update = vi.fn(async () => {});
    const sendEmail = vi.fn(async () => ({ success: true }));
    const user = { id: 42, email: 'client@example.test', update };

    const { sendPasswordResetEmailForUser } = await import('../../services/auth/passwordResetEmailService.mjs');

    const result = await sendPasswordResetEmailForUser(user, {
      frontendUrl: 'https://app.example.test',
      now: () => 1700000000000,
      sendEmail,
    });

    expect(update).toHaveBeenCalledWith({
      resetPasswordToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      resetPasswordExpires: new Date(1700003600000),
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'client@example.test',
      subject: 'SwanStudios Password Reset',
      text: expect.stringMatching(/https:\/\/app\.example\.test\/reset-password\/[a-f0-9]{64}/),
    }));
    expect(sendEmail.mock.calls[0][0].text).not.toContain(update.mock.calls[0][0].resetPasswordToken);
    expect(result).toMatchObject({
      emailSent: true,
      expiresInMinutes: 60,
    });
  });

  it('hashes clicked reset tokens with the same HMAC helper used for storage', async () => {
    const { hashPasswordResetToken } = await import('../../services/auth/passwordResetEmailService.mjs');

    const hashed = hashPasswordResetToken('raw-token-value', 'unit-reset-secret');

    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPasswordResetToken('raw-token-value', 'unit-reset-secret')).toBe(hashed);
    expect(hashPasswordResetToken('raw-token-value', 'different-secret')).not.toBe(hashed);
  });

  it('uses a dedicated password reset secret without requiring the JWT fallback first', async () => {
    process.env.PASSWORD_RESET_SECRET = 'dedicated-reset-secret';
    delete process.env.JWT_SECRET;

    const { getPasswordResetSecret } = await import('../../services/auth/passwordResetEmailService.mjs');

    expect(getPasswordResetSecret()).toBe('dedicated-reset-secret');
  });
});
