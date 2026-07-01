/**
 * clientOnboardAccessHandoffService.mjs
 * =====================================
 * Normalizes the access handoff returned by the direct client-onboard route.
 *
 * Claim links remain the preferred path for Coach/admin quick capture. If a
 * caller explicitly disables claim-token generation, the forced-password
 * account still needs a usable reset-link handoff instead of a dead login state.
 */
import { buildOnboardingResetLinkHandoff } from './onboardingResetHandoffService.mjs';

const trimTrailingSlash = (value) => String(value || 'https://sswanstudios.com').replace(/\/+$/, '');

const toOptionalString = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const toOptionalPositiveInteger = (value) => (
  Number.isSafeInteger(value) && value > 0 ? value : undefined
);

const toOptionalIsoString = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return toOptionalString(value);
};

const claimHandoff = ({ claimData, frontendUrl }) => {
  const claimCode = toOptionalString(claimData?.plainToken);
  if (!claimCode) return null;

  return {
    credentialMode: 'claim_link_ready',
    claimCode,
    claimUrl: `${trimTrailingSlash(frontendUrl)}/claim/${claimCode}`,
    ...(toOptionalIsoString(claimData?.expires) ? { claimExpiresAt: toOptionalIsoString(claimData.expires) } : {}),
  };
};

const resetCredentialMode = (resetHandoff) => (
  toOptionalString(resetHandoff?.credentialIssue) === 'reset_link_unavailable'
    ? 'reset_link_unavailable'
    : (toOptionalString(resetHandoff?.credentialMode)
      || toOptionalString(resetHandoff?.credentialAction)
      || (resetHandoff?.resetEmailSent === true || resetHandoff?.emailSent === true
        ? 'reset_link_sent'
        : (toOptionalString(resetHandoff?.resetUrl) ? 'reset_link_ready' : 'reset_link_needed')))
);

export async function buildClientOnboardAccessHandoff({
  user,
  claimData,
  frontendUrl,
  buildResetHandoff = buildOnboardingResetLinkHandoff,
} = {}) {
  const claim = claimHandoff({ claimData, frontendUrl });
  if (claim) return claim;

  const resetHandoff = await buildResetHandoff(user);
  const resetUrl = toOptionalString(resetHandoff?.resetUrl);
  const resetExpiresAt = toOptionalString(resetHandoff?.resetExpiresAt);
  const expiresInMinutes = toOptionalPositiveInteger(resetHandoff?.expiresInMinutes);
  const credentialIssue = toOptionalString(resetHandoff?.credentialIssue);

  return {
    credentialMode: resetCredentialMode(resetHandoff),
    resetEmailSent: resetHandoff?.resetEmailSent === true || resetHandoff?.emailSent === true,
    ...(resetUrl ? { resetUrl } : {}),
    ...(resetExpiresAt ? { resetExpiresAt } : {}),
    ...(expiresInMinutes ? { expiresInMinutes } : {}),
    ...(credentialIssue ? { credentialIssue } : {}),
  };
}

export default {
  buildClientOnboardAccessHandoff,
};