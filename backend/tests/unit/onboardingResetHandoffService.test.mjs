import { describe, expect, it, vi } from 'vitest';
import { buildOnboardingResetLinkHandoff } from '../../services/onboardingResetHandoffService.mjs';

describe('onboarding reset-link handoff service', () => {
  it('requests a reset URL so staff can copy the same link when email succeeds', async () => {
    const user = { id: 42 };
    const sendReset = vi.fn(async () => ({
      emailSent: true,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-06-29T06:00:00.000Z',
      expiresInMinutes: 60,
    }));

    const result = await buildOnboardingResetLinkHandoff(user, { sendReset, logger: { warn: vi.fn() } });

    expect(sendReset).toHaveBeenCalledWith(user, { includeResetUrl: true });
    expect(result).toEqual({
      credentialAction: 'reset_link_sent',
      credentialMode: 'reset_link_sent',
      resetEmailSent: true,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-06-29T06:00:00.000Z',
      expiresInMinutes: 60,
    });
  });

  it('returns reset_link_ready when email delivery fails after a reset token is generated', async () => {
    const deliveryError = new Error('email unavailable');
    deliveryError.name = 'PasswordResetEmailDeliveryError';
    deliveryError.resetUrl = 'https://app.example.test/reset-password/manual-token';
    deliveryError.resetExpiresAt = '2026-06-29T06:00:00.000Z';
    deliveryError.expiresInMinutes = 60;
    const logger = { warn: vi.fn() };

    const result = await buildOnboardingResetLinkHandoff({ id: 77 }, {
      sendReset: vi.fn(async () => { throw deliveryError; }),
      logger,
    });

    expect(result).toEqual({
      credentialAction: 'reset_link_ready',
      credentialMode: 'reset_link_ready',
      resetEmailSent: false,
      resetUrl: 'https://app.example.test/reset-password/manual-token',
      resetExpiresAt: '2026-06-29T06:00:00.000Z',
      expiresInMinutes: 60,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[Onboarding Controller] Password reset handoff failed:',
      'email unavailable',
    );
  });

  it('marks the reset link unavailable when no reset URL is available', async () => {
    const result = await buildOnboardingResetLinkHandoff({ id: 88 }, {
      sendReset: vi.fn(async () => { throw new Error('secret missing'); }),
      logger: { warn: vi.fn() },
    });

    expect(result).toEqual({
      credentialAction: 'reset_link_unavailable',
      credentialMode: 'reset_link_unavailable',
      resetEmailSent: false,
      credentialIssue: 'reset_link_unavailable',
    });
  });
});
