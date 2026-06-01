/**
 * clientCredentialCommandDispatchers.mjs
 * ======================================
 * Safe account-help command handlers for Swan Coach. Credential commands must
 * never accept, generate, echo, or log raw passwords through AI command text.
 */
import { getAllModels } from '../../../models/index.mjs';
import { sendPasswordResetEmailForUser } from '../../auth/passwordResetEmailService.mjs';

function toSafeId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function dispatchSendClientPasswordReset(params = {}, ctx = {}) {
  if (ctx.user?.role !== 'admin') {
    throw new Error('Only admins can send password reset links.');
  }

  const clientId = toSafeId(params.clientId || ctx.resolvedClient?.id);
  if (!clientId) {
    throw new Error('A resolved client is required before sending a reset link.');
  }

  const { User } = getAllModels();
  if (!User?.findOne) {
    throw new Error('User model is not available for password reset.');
  }

  const client = await User.findOne({ where: { id: clientId, role: 'client' } });
  if (!client) {
    throw new Error('Client not found.');
  }

  const reset = await sendPasswordResetEmailForUser(client);
  return {
    credentialAction: 'reset_email_sent',
    clientId,
    resetEmailSent: reset.emailSent === true,
    expiresInMinutes: reset.expiresInMinutes,
  };
}

export default {
  dispatchSendClientPasswordReset,
};
