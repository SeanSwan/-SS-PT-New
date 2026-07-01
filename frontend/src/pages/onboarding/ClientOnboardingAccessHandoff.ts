export type OnboardingAccessMode =
  | 'reset_link_sent'
  | 'reset_link_ready'
  | 'reset_link_needed'
  | 'reset_link_unavailable'
  | null;

export interface OnboardingAccessHandoffLike {
  credentialAction?: string | null;
  credentialMode?: string | null;
  credentialIssue?: string | null;
  resetEmailSent?: boolean | null;
  resetUrl?: string | null;
}

const optionalString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const normalizeAccessMode = (value: unknown): OnboardingAccessMode => {
  const mode = optionalString(value);
  if (
    mode === 'reset_link_sent'
    || mode === 'reset_link_ready'
    || mode === 'reset_link_needed'
    || mode === 'reset_link_unavailable'
  ) {
    return mode;
  }
  if (mode === 'reset_email_sent') return 'reset_link_sent';
  if (mode === 'reset_email_needed') return 'reset_link_needed';
  return null;
};

export const getOnboardingAccessMode = (handoff: OnboardingAccessHandoffLike | null | undefined): OnboardingAccessMode => {
  if (!handoff) return null;
  if (handoff.credentialIssue === 'reset_link_unavailable') return 'reset_link_unavailable';

  const explicitMode = normalizeAccessMode(handoff.credentialMode) || normalizeAccessMode(handoff.credentialAction);
  if (explicitMode) return explicitMode;

  if (handoff.resetEmailSent === true) return 'reset_link_sent';
  if (optionalString(handoff.resetUrl)) return 'reset_link_ready';
  if (handoff.resetEmailSent === false) return 'reset_link_needed';
  return null;
};

export const getOnboardingAccessStatusLabel = (handoff: OnboardingAccessHandoffLike | null | undefined): string | null => {
  const mode = getOnboardingAccessMode(handoff);
  if (mode === 'reset_link_unavailable') return 'Reset link unavailable';
  if (mode === 'reset_link_ready') return 'Reset link ready to copy';
  if (mode === 'reset_link_sent') return 'Reset link sent';
  if (mode === 'reset_link_needed') return 'Reset link needed';
  return null;
};

export const getOnboardingAccessModalCopy = (handoff: OnboardingAccessHandoffLike | null | undefined): string => {
  const mode = getOnboardingAccessMode(handoff);
  if (mode === 'reset_link_unavailable') {
    return 'Reset link could not be generated. Return to Client Hub and use Send reset link after the account issue is resolved.';
  }
  if (mode === 'reset_link_ready') {
    return 'Email delivery did not complete. Copy the secure one-hour reset link and send it directly to the client.';
  }
  if (mode === 'reset_link_sent') {
    return 'Secure login link sent. The client can set their password from email.';
  }
  if (mode === 'reset_link_needed') {
    return 'No password is shown here. Send a reset link before first login.';
  }
  return 'Your onboarding profile has been saved.';
};
export const getOnboardingResetUrlToCopy = (handoff: OnboardingAccessHandoffLike | null | undefined): string | null => {
  const resetUrl = optionalString(handoff?.resetUrl);
  if (!resetUrl) return null;

  const mode = getOnboardingAccessMode(handoff);
  return mode === 'reset_link_ready' || mode === 'reset_link_sent' ? resetUrl : null;
};
