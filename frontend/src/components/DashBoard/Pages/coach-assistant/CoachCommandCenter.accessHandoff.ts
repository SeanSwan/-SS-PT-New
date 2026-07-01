import type {
  CoachCommandClientSource,
  QuickCoachClientResponse,
} from '../../../../services/coachCommandClientService';
import type { CommandLogAccessHandoff, CommandLogResult } from './CoachCommandCenter.data';

const CREDENTIAL_MODES = new Set<CommandLogAccessHandoff['credentialMode']>([
  'claim_link_ready',
  'claim_link_needed',
  'reset_link_sent',
  'reset_link_ready',
  'reset_link_needed',
  'reset_link_unavailable',
]);

const optionalText = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

type AccessCredentialResult = {
  credentialMode?: unknown;
  credentialAction?: unknown;
  credentialIssue?: unknown;
  resetEmailSent?: unknown;
  emailSent?: unknown;
  resetUrl?: unknown;
  claimUrl?: unknown;
  claimCode?: unknown;
};

const isResetLinkUnavailable = (
  handoff?: Pick<CommandLogAccessHandoff, 'credentialMode' | 'credentialIssue'>,
): boolean => (
  handoff?.credentialMode === 'reset_link_unavailable'
  || handoff?.credentialIssue === 'reset_link_unavailable'
);
const ACCESS_HANDOFF_TITLES: Record<CommandLogAccessHandoff['credentialMode'], string> = {
  claim_link_ready: 'Claim link ready',
  claim_link_needed: 'Login handoff needs review',
  reset_link_sent: 'Secure login link sent',
  reset_link_ready: 'Reset link ready',
  reset_link_needed: 'Login handoff needs review',
  reset_link_unavailable: 'Reset link unavailable',
};

export const commandLogAccessHandoffTitle = (handoff: CommandLogAccessHandoff): string => (
  isResetLinkUnavailable(handoff)
    ? 'Reset link unavailable'
    : ACCESS_HANDOFF_TITLES[handoff.credentialMode]
);

export const commandLogAccessHandoffDescription = (handoff: CommandLogAccessHandoff): string => {
  const clientPrefix = handoff.clientName ? `${handoff.clientName}: ` : '';
  if (isResetLinkUnavailable(handoff)) {
    return `${clientPrefix}Reset link could not be generated. Use Send reset link after the account issue is resolved.`;
  }
  if (handoff.credentialMode === 'reset_link_sent') {
    return handoff.resetUrl
      ? `${clientPrefix}Secure login link was sent. Copy this secure reset link if direct handoff is needed.`
      : `${clientPrefix}Secure login link was sent to the client. No password is shown in this command log.`;
  }
  if (handoff.credentialMode === 'reset_link_ready') {
    return `${clientPrefix}Copy this secure reset link so the client can set a password and complete account access.`;
  }
  if (handoff.credentialMode === 'reset_link_needed') {
    return `${clientPrefix}Create or send a secure reset link before the client logs in.`;
  }
  if (handoff.credentialMode === 'claim_link_ready') {
    return `${clientPrefix}Share this claim link or code so the client can complete account access.`;
  }
  return `${clientPrefix}Generate a claim link or code before the client can complete account access.`;
};

export const commandLogAccessHandoffLink = (
  handoff: CommandLogAccessHandoff,
): { url: string; label: 'claim link' | 'reset link' } | null => {
  if (isResetLinkUnavailable(handoff)) return null;
  if (handoff.resetUrl) return { url: handoff.resetUrl, label: 'reset link' };
  if (handoff.claimUrl) return { url: handoff.claimUrl, label: 'claim link' };
  return null;
};

const resolveCredentialMode = (result: AccessCredentialResult): CommandLogAccessHandoff['credentialMode'] | null => {
  const explicitMode = optionalText(result.credentialMode) ?? optionalText(result.credentialAction);
  if (explicitMode && CREDENTIAL_MODES.has(explicitMode as CommandLogAccessHandoff['credentialMode'])) {
    return explicitMode as CommandLogAccessHandoff['credentialMode'];
  }
  if (result.resetEmailSent === true || result.emailSent === true) return 'reset_link_sent';
  if (optionalText(result.resetUrl)) return 'reset_link_ready';
  if (optionalText(result.claimUrl)) return 'claim_link_ready';
  if (optionalText(result.claimCode)) return 'claim_link_ready';
  return null;
};

export function buildCommandLogAccessHandoff({
  result,
  createdName,
  fallbackClientSource,
}: {
  result: QuickCoachClientResponse;
  createdName: string;
  fallbackClientSource: CoachCommandClientSource;
}): CommandLogAccessHandoff | undefined {
  const credentialMode = resolveCredentialMode(result);
  if (!credentialMode) return undefined;

  const credentialIssue = optionalText(result.credentialIssue)
    ?? (credentialMode === 'reset_link_unavailable' ? 'reset_link_unavailable' : null);
  return {
    credentialMode,
    claimCode: optionalText(result.claimCode),
    claimUrl: optionalText(result.claimUrl),
    resetUrl: optionalText(result.resetUrl),
    resetExpiresAt: optionalText(result.resetExpiresAt),
    resetEmailSent: result.resetEmailSent === true || result.emailSent === true,
    ...(credentialIssue ? { credentialIssue } : {}),
    clientName: createdName,
    clientSource: result.client.clientSource || fallbackClientSource,
  };
}

export function commandLogAccessHandoffIntro(handoff?: CommandLogAccessHandoff): string {
  if (!handoff) return '';
  if (isResetLinkUnavailable(handoff)) return 'Reset link could not be generated for client access handoff. ';
  if (handoff.credentialMode === 'reset_link_sent') return 'Secure login link was sent for client access handoff. ';
  if (handoff.credentialMode === 'reset_link_ready') return 'Secure reset link is ready for client access handoff. ';
  if (handoff.credentialMode === 'claim_link_ready') return 'Claim link is ready for client access handoff. ';
  return 'Client access handoff needs review. ';
}

export function commandLogAccessHandoffAttachment(handoff?: CommandLogAccessHandoff): string {
  if (!handoff) return 'client profile ready';
  if (isResetLinkUnavailable(handoff)) return 'reset link unavailable';
  if (handoff.credentialMode === 'reset_link_sent' || handoff.credentialMode === 'reset_link_ready') return 'reset link handoff';
  return handoff.credentialMode === 'claim_link_ready' ? 'claim link ready' : 'access handoff review';
}

export function buildCommandResultAccessHandoff(
  commandResult?: CommandLogResult,
): CommandLogAccessHandoff | undefined {
  if (!commandResult || commandResult.command !== 'reset_client_password') return undefined;
  const result = commandResult.result ?? {};
  const credentialMode = resolveCredentialMode(result);
  if (!credentialMode || !credentialMode.startsWith('reset_')) return undefined;
  const credentialIssue = optionalText(result.credentialIssue)
    ?? (credentialMode === 'reset_link_unavailable' ? 'reset_link_unavailable' : null);
  return {
    credentialMode,
    resetUrl: optionalText(result.resetUrl),
    resetExpiresAt: optionalText(result.resetExpiresAt),
    resetEmailSent: result.resetEmailSent === true || result.emailSent === true,
    ...(credentialIssue ? { credentialIssue } : {}),
    clientName: commandResult.client?.firstName,
  };
}