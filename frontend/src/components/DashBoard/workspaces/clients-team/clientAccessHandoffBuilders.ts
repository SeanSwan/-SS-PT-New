import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import { normalizeClientSource } from './clientSessionSignal';
import type { ManualClientCreationHandoff } from './manualClientCreationHandoff';

export interface ClientHubToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toOptionalPositiveInteger = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;

const resetEmailWasSent = (data: Record<string, unknown>): boolean => (
  data.resetEmailSent === true ||
  data.emailSent === true ||
  data.credentialAction === 'reset_link_sent' ||
  data.credentialAction === 'reset_email_sent' ||
  data.credentialMode === 'reset_link_sent' ||
  data.credentialMode === 'reset_email_sent'
);

export const buildPasswordResetHandoff = (
  selectedClient: ClientOption,
  responseData: unknown,
): ManualClientCreationHandoff => {
  const data = toRecord(responseData);
  const resetEmailSent = resetEmailWasSent(data);
  const resetUrl = toOptionalString(data.resetUrl);
  const resetUnavailable = data.credentialIssue === 'reset_link_unavailable' || data.credentialMode === 'reset_link_unavailable' || data.error === 'reset_link_unavailable';
  return {
    clientId: String(selectedClient.id),
    clientName: getClientDisplayName(selectedClient),
    clientEmail: selectedClient.email || '',
    clientSource: normalizeClientSource(selectedClient.clientSource),
    credentialMode: resetEmailSent
      ? 'reset_link_sent'
      : resetUrl
        ? 'reset_link_ready'
        : resetUnavailable
          ? 'reset_link_unavailable'
          : 'reset_link_needed',
    resetEmailSent,
    resetUrl,
    resetExpiresAt: toOptionalString(data.resetExpiresAt),
    resetExpiresInMinutes: toOptionalPositiveInteger(data.expiresInMinutes),
    credentialIssue: resetUnavailable ? 'reset_link_unavailable' : undefined,
    message: resetEmailSent
      ? 'Secure login link was sent to the client. No password is shown in this handoff.'
      : resetUrl
        ? 'Email delivery did not complete. Copy this one-hour reset link directly to the client.'
        : resetUnavailable
          ? 'Reset link could not be generated. Use Send reset link after the account issue is resolved.'
          : 'Reset email did not complete and no reset link returned. Try Send reset link again before the client logs in.',
  };
};

export const buildPasswordResetToast = (
  handoff: ManualClientCreationHandoff,
  responseMessage?: string,
): ClientHubToastOptions => {
  const description = responseMessage || handoff.message;
  if (handoff.credentialMode === 'reset_link_ready') {
    return { title: 'Reset link ready to copy', description, variant: 'default' };
  }
  if (handoff.credentialMode === 'reset_link_unavailable') {
    return { title: 'Reset link unavailable', description, variant: 'destructive' };
  }
  if (handoff.credentialMode === 'reset_link_needed') {
    return { title: 'Reset link needs review', description, variant: 'destructive' };
  }
  return { title: 'Reset link sent', description, variant: 'default' };
};

const getClaimCode = (data: Record<string, unknown>): string | undefined => (
  toOptionalString(data.claimCode) ??
  toOptionalString(data.claimToken) ??
  toOptionalString(data.token)
);

export const buildClaimLinkHandoff = (
  selectedClient: ClientOption,
  responseData: unknown,
): ManualClientCreationHandoff => {
  const data = toRecord(responseData);
  const claimCode = getClaimCode(data);
  const claimUrl = toOptionalString(data.claimUrl);
  const claimReady = Boolean(claimCode || claimUrl);

  return {
    clientId: String(selectedClient.id),
    clientName: getClientDisplayName(selectedClient),
    clientEmail: selectedClient.email || '',
    clientSource: normalizeClientSource(selectedClient.clientSource),
    credentialMode: claimReady ? 'claim_link_ready' : 'claim_link_needed',
    claimCode,
    claimUrl,
    claimExpiresAt: toOptionalString(data.claimExpiresAt) ?? toOptionalString(data.expiresAt),
    message: claimReady
      ? 'Claim link is ready for account activation.'
      : 'Claim link could not be generated. Try Generate claim link again before the client logs in.',
  };
};

export const buildClaimLinkToast = (
  handoff: ManualClientCreationHandoff,
  responseMessage?: string,
): ClientHubToastOptions => ({
  title: handoff.credentialMode === 'claim_link_ready' ? 'Claim link ready' : 'Claim link needs review',
  description: responseMessage || handoff.message,
  variant: handoff.credentialMode === 'claim_link_ready' ? 'default' : 'destructive',
});