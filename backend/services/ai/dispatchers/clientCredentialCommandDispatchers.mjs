/**
 * clientCredentialCommandDispatchers.mjs
 * ======================================
 * Safe account-help command handlers for Swan Coach. Credential commands must
 * never accept, generate, echo, or log raw passwords through AI command text.
 */
import { getAllModels } from '../../../models/index.mjs';
import { INACTIVE_PASSWORD_RESET_MESSAGE, sendPasswordResetEmailForUser } from '../../auth/passwordResetEmailService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const toOptionalHandoffString = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalHandoffMinutes = (value) => (
  Number.isSafeInteger(value) && value > 0 ? value : undefined
);

const passwordResetHandoffFrom = (source) => ({
  resetUrl: toOptionalHandoffString(source?.resetUrl),
  resetExpiresAt: toOptionalHandoffString(source?.resetExpiresAt),
  expiresInMinutes: toOptionalHandoffMinutes(source?.expiresInMinutes),
});

const resetCredentialActionFor = (resetEmailSent, resetUrl) => (
  resetEmailSent ? 'reset_link_sent' : (resetUrl ? 'reset_link_ready' : 'reset_link_needed')
);

const appendPasswordResetHandoff = (data, handoff) => ({
  ...data,
  ...(handoff.resetUrl ? { resetUrl: handoff.resetUrl } : {}),
  ...(handoff.resetExpiresAt ? { resetExpiresAt: handoff.resetExpiresAt } : {}),
  ...(handoff.expiresInMinutes ? { expiresInMinutes: handoff.expiresInMinutes } : {}),
});

export async function dispatchSendClientPasswordReset(params = {}, ctx = {}) {
  if (ctx.user?.role !== 'admin') {
    throw new Error('Only admins can send password reset links.');
  }

  const clientId = resolveCommandClientId(params, ctx);
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
  if (client.isActive === false) {
    throw new Error(INACTIVE_PASSWORD_RESET_MESSAGE);
  }

  let resetEmailSent = false;
  let resetHandoff = {};
  try {
    const reset = await sendPasswordResetEmailForUser(client, { includeResetUrl: true });
    resetEmailSent = reset.emailSent === true;
    resetHandoff = passwordResetHandoffFrom(reset);
  } catch (error) {
    resetHandoff = passwordResetHandoffFrom(error);
    if (!resetHandoff.resetUrl) {
      return appendPasswordResetHandoff({
        credentialAction: 'reset_link_unavailable',
        credentialMode: 'reset_link_unavailable',
        credentialIssue: 'reset_link_unavailable',
        clientId,
        resetEmailSent: false,
        emailSent: false,
      }, resetHandoff);
    }
  }

  const credentialAction = resetCredentialActionFor(resetEmailSent, resetHandoff.resetUrl);

  return appendPasswordResetHandoff({
    credentialAction,
    credentialMode: credentialAction,
    clientId,
    resetEmailSent,
    emailSent: resetEmailSent,
  }, resetHandoff);
}

export default {
  dispatchSendClientPasswordReset,
};
