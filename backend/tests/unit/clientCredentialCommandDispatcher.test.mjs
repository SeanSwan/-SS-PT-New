import { afterEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 7, role: 'admin' };
const trainerUser = { id: 8, role: 'trainer' };

async function loadDispatcher({ client = { id: 42, role: 'client', email: 'client@example.test' } } = {}) {
  vi.resetModules();

  const findOne = vi.fn(async () => client);
  const sendPasswordResetEmailForUser = vi.fn(async () => ({
    emailSent: true,
    expiresInMinutes: 60,
  }));

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      User: { findOne },
    }),
  }));
  vi.doMock('../../services/auth/passwordResetEmailService.mjs', () => ({
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
    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    expect(result).toMatchObject({
      clientId: 42,
      resetEmailSent: true,
      expiresInMinutes: 60,
      credentialAction: 'reset_email_sent',
    });
    expect(JSON.stringify(result)).not.toContain('client@example.test');
    expect(JSON.stringify(result)).not.toMatch(/newPassword|temporaryPassword/i);
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

  it('sends reset links to the selected client when params contain stale client identity', async () => {
    const { dispatchSendClientPasswordReset, findOne, sendPasswordResetEmailForUser } = await loadDispatcher();

    const result = await dispatchSendClientPasswordReset({ clientId: 999 }, {
      user: adminUser,
      resolvedClient: { id: 42 },
    });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 42, role: 'client' } });
    expect(sendPasswordResetEmailForUser).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    expect(result).toMatchObject({ clientId: 42, credentialAction: 'reset_email_sent' });
  });
});
