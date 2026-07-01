import { afterEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 7, role: 'admin' };
const trainerUser = { id: 8, role: 'trainer' };

async function loadDispatcher({
  client = { id: 42, role: 'client', email: 'client@example.test' },
  resetResult = null,
  resetError = null,
} = {}) {
  vi.resetModules();

  const findOne = vi.fn(async () => client);
  const sendPasswordResetEmailForUser = vi.fn(async () => {
    if (resetError) throw resetError;
    return resetResult || {
      emailSent: true,
      expiresInMinutes: 60,
    };
  });

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      User: { findOne },
    }),
  }));
  vi.doMock('../../services/auth/passwordResetEmailService.mjs', () => ({
    INACTIVE_PASSWORD_RESET_MESSAGE: 'Client is inactive. Reactivate the client before sending a password reset link.',
    sendPasswordResetEmailForUser,
  }));

  const module = await import('../../services/ai/dispatchers/clientCredentialCommandDispatchers.mjs');
  return { ...module, findOne, sendPasswordResetEmailForUser };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('client credential command dispatchers', () => {
  it('sends a reset link for an admin without echoing client email or password data', async () => {
    const { dispatchSendClientPasswordReset, findOne, sendPasswordResetEmailForUser } = await loadDispatcher();

    const result = await dispatchSendClientPasswordReset({ clientId: 42 }, { user: adminUser });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 42, role: 'client' } });
    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { includeResetUrl: true }
    );
    expect(result).toMatchObject({
      clientId: 42,
      resetEmailSent: true,
      expiresInMinutes: 60,
      credentialAction: 'reset_link_sent',
      credentialMode: 'reset_link_sent',
    });
    expect(JSON.stringify(result)).not.toContain('client@example.test');
    expect(JSON.stringify(result)).not.toMatch(/newPassword|temporaryPassword/i);
  });

  it('returns a copyable reset handoff when email delivery fails after link generation', async () => {
    const resetUrl = 'https://sswanstudios.com/reset-password/manual-token';
    const resetExpiresAt = '2026-06-30T04:00:00.000Z';
    const resetError = Object.assign(new Error('SMTP unavailable'), {
      emailSent: false,
      resetUrl,
      resetExpiresAt,
      expiresInMinutes: 60,
    });
    const { dispatchSendClientPasswordReset, sendPasswordResetEmailForUser } = await loadDispatcher({ resetError });

    const result = await dispatchSendClientPasswordReset({ clientId: 42 }, { user: adminUser });

    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { includeResetUrl: true }
    );
    expect(result).toMatchObject({
      clientId: 42,
      credentialAction: 'reset_link_ready',
      credentialMode: 'reset_link_ready',
      resetEmailSent: false,
      emailSent: false,
      resetUrl,
      resetExpiresAt,
      expiresInMinutes: 60,
    });
    expect(JSON.stringify(result)).not.toMatch(/newPassword|temporaryPassword|client@example.test/i);
  });

  it('returns a reset-link-unavailable handoff when no reset URL can be generated', async () => {
    const resetError = new Error('FRONTEND_URL missing');
    const { dispatchSendClientPasswordReset, sendPasswordResetEmailForUser } = await loadDispatcher({ resetError });

    const result = await dispatchSendClientPasswordReset({ clientId: 42 }, { user: adminUser });

    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { includeResetUrl: true }
    );
    expect(result).toMatchObject({
      clientId: 42,
      credentialAction: 'reset_link_unavailable',
      credentialMode: 'reset_link_unavailable',
      credentialIssue: 'reset_link_unavailable',
      resetEmailSent: false,
      emailSent: false,
    });
    expect(result.resetUrl).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/FRONTEND_URL|newPassword|temporaryPassword|client@example.test/i);
  });

  it('rejects non-admin credential resets', async () => {
    const { dispatchSendClientPasswordReset } = await loadDispatcher();

    await expect(dispatchSendClientPasswordReset({ clientId: 42 }, { user: trainerUser }))
      .rejects.toThrow(/admins can send password reset links/i);
  });

  it('fails closed when the resolved client record is missing', async () => {
    const { dispatchSendClientPasswordReset } = await loadDispatcher({ client: null });

    await expect(dispatchSendClientPasswordReset({ clientId: 42 }, { user: adminUser }))
      .rejects.toThrow(/client not found/i);
  });

  it('rejects inactive clients before sending reset links', async () => {
    const { dispatchSendClientPasswordReset, sendPasswordResetEmailForUser } = await loadDispatcher({
      client: { id: 42, role: 'client', email: 'client@example.test', isActive: false },
    });

    await expect(dispatchSendClientPasswordReset({ clientId: 42 }, { user: adminUser }))
      .rejects.toThrow(/reactivate the client before sending a password reset link/i);
    expect(sendPasswordResetEmailForUser).not.toHaveBeenCalled();
  });

  it('sends reset links to the selected client when params contain stale client identity', async () => {
    const { dispatchSendClientPasswordReset, findOne, sendPasswordResetEmailForUser } = await loadDispatcher();

    const result = await dispatchSendClientPasswordReset({ clientId: 999 }, {
      user: adminUser,
      resolvedClient: { id: 42 },
    });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 42, role: 'client' } });
    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { includeResetUrl: true }
    );
    expect(result).toMatchObject({
      clientId: 42,
      credentialAction: 'reset_link_sent',
      credentialMode: 'reset_link_sent',
    });
  });
});
