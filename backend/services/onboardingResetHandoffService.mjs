/**
 * onboardingResetHandoffService.mjs
 * =================================
 * Builds the secure reset-link handoff for admin/trainer onboarding creates.
 *
 * The service mirrors the Client Hub manual-create credential contract: email
 * delivery success is preferred, but delivery failure can still return a
 * one-hour reset URL for explicit staff handoff when the token was generated.
 */
import {
  PasswordResetEmailDeliveryError,
  sendPasswordResetEmailForUser,
} from './auth/passwordResetEmailService.mjs';

const toOptionalString = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const toOptionalPositiveInteger = (value) => (
  Number.isSafeInteger(value) && value > 0 ? value : undefined
);

const resetHandoffPayload = ({ emailSent, resetUrl, resetExpiresAt, expiresInMinutes, credentialIssue }) => {
  const hasResetUrl = Boolean(resetUrl);
  const credentialAction = credentialIssue === 'reset_link_unavailable'
    ? 'reset_link_unavailable'
    : (emailSent ? 'reset_link_sent' : (hasResetUrl ? 'reset_link_ready' : 'reset_link_needed'));

  return {
    credentialAction,
    credentialMode: credentialAction,
    resetEmailSent: emailSent === true,
    ...(resetUrl ? { resetUrl } : {}),
    ...(resetExpiresAt ? { resetExpiresAt } : {}),
    ...(expiresInMinutes ? { expiresInMinutes } : {}),
    ...(credentialIssue ? { credentialIssue } : {}),
  };
};

const extractResetHandoff = (source = {}) => ({
  resetUrl: toOptionalString(source.resetUrl),
  resetExpiresAt: toOptionalString(source.resetExpiresAt),
  expiresInMinutes: toOptionalPositiveInteger(source.expiresInMinutes),
});

const isResetDeliveryError = (error) => (
  error instanceof PasswordResetEmailDeliveryError
  || error?.name === 'PasswordResetEmailDeliveryError'
);

export async function buildOnboardingResetLinkHandoff(
  user,
  {
    sendReset = sendPasswordResetEmailForUser,
    logger = console,
  } = {},
) {
  try {
    const reset = await sendReset(user, { includeResetUrl: true });
    return resetHandoffPayload({
      emailSent: reset?.emailSent === true,
      ...extractResetHandoff(reset),
    });
  } catch (resetError) {
    logger?.warn?.('[Onboarding Controller] Password reset handoff failed:', resetError.message);

    const resetHandoff = isResetDeliveryError(resetError) ? extractResetHandoff(resetError) : {};

    return resetHandoffPayload({
      emailSent: false,
      ...resetHandoff,
      ...(resetHandoff.resetUrl ? {} : { credentialIssue: 'reset_link_unavailable' }),
    });
  }
}

export default {
  buildOnboardingResetLinkHandoff,
};
