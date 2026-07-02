/**
 * ============================================================================
 * FILE: manualClientCreationHandoff.ts
 * PURPOSE: Sanitized post-create access handoff for admin-created clients.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Converts create-client API responses into a safe UI model for the admin Client
 * Hub. It intentionally exposes reset/claim-link status only; raw temporary
 * passwords are not part of the contract.
 *
 * HOW IT FITS IN THE APP:
 * useManualClientCreation builds this handoff immediately after manual client
 * creation so admins know whether SwanStudios clients received a secure login
 * reset and Move Fitness/external clients have a claim-link path.
 */

import type {
  ClientSource,
  CreateClientRequest,
} from '../../../../services/adminClientService';
import { getClientDisplayName } from './clientIdentity';
import { normalizeClientSource } from './clientSessionSignal';

export type ManualClientCreationCredentialMode =
  | 'reset_link_sent'
  | 'reset_link_ready'
  | 'reset_link_needed'
  | 'reset_link_unavailable'
  | 'claim_link_ready'
  | 'claim_link_needed';

export interface ManualClientCreationHandoff {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientSource: ClientSource;
  credentialMode: ManualClientCreationCredentialMode;
  claimCode?: string;
  claimUrl?: string;
  claimExpiresAt?: string;
  resetEmailSent?: boolean;
  resetUrl?: string;
  resetExpiresAt?: string;
  resetExpiresInMinutes?: number;
  credentialIssue?: string;
  message: string;
}

interface BuildManualClientCreationHandoffParams {
  data: CreateClientRequest;
  response: unknown;
  resetEmailSent: boolean | null;
}

interface ManualClientCreationHandoffContext {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientSource: ClientSource;
  claimCode?: string;
  claimUrl?: string;
  claimExpiresAt?: string;
  resetUrl?: string;
  resetExpiresAt?: string;
  resetExpiresInMinutes?: number;
  credentialIssue?: string;
  credentialModeHint?: ManualClientCreationCredentialMode;
}

const CLAIM_READY_MESSAGE = 'Claim link is ready for account activation.';
const CLAIM_NEEDED_MESSAGE = 'Client was created, but no claim link returned. Generate a claim link before the client logs in.';
const RESET_SENT_MESSAGE = 'Secure login link was sent to the client. No password is shown in this handoff.';
const RESET_READY_MESSAGE = 'Email delivery did not complete. Copy this one-hour reset link directly to the client.';
const RESET_NEEDED_MESSAGE = 'Client was created, but no reset link returned. Use Send reset link before the client logs in.';
const RESET_UNAVAILABLE_MESSAGE = 'Reset link could not be generated. Use Send reset link after the account issue is resolved.';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toRecord = (value: unknown): Record<string, unknown> => (
  isRecord(value) ? value : {}
);

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const firstOptionalString = (values: unknown[]): string | undefined => (
  values.map(toOptionalString).find((value) => value !== undefined)
);

const firstString = (values: unknown[]): string => (
  firstOptionalString(values) ?? ''
);

const isPositiveSafeInteger = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const numberClientId = (value: unknown): string => (
  isPositiveSafeInteger(value) ? String(value) : ''
);

const toOptionalPositiveInteger = (value: unknown): number | undefined => (
  isPositiveSafeInteger(value) ? value : undefined
);

const normalizeResetCredentialMode = (value: unknown): ManualClientCreationCredentialMode | undefined => {
  const mode = toOptionalString(value);
  if (mode === 'reset_email_sent') return 'reset_link_sent';
  if (mode === 'reset_email_needed') return 'reset_link_needed';
  if (mode === 'reset_link_sent' || mode === 'reset_link_needed' || mode === 'reset_link_unavailable') return mode;
  return undefined;
};

const trimmedString = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
);

const stringClientId = (value: unknown): string => {
  const trimmed = trimmedString(value);
  return /^\d+$/.test(trimmed) ? trimmed : '';
};

export const toClientId = (value: unknown): string | null => (
  firstString([numberClientId(value), stringClientId(value)]) || null
);

const getResponseData = (response: unknown): Record<string, unknown> => {
  const responseRecord = toRecord(response);
  return toRecord(responseRecord.data);
};

export const getCreatedClient = (response: unknown): Record<string, unknown> => (
  toRecord(getResponseData(response).client)
);

const getClaimCode = (responseData: Record<string, unknown>): string | undefined => (
  firstOptionalString([responseData.claimCode, responseData.claimToken])
);

const getClientName = (
  client: Record<string, unknown>,
  data: CreateClientRequest,
): string => getClientDisplayName({
  id: toClientId(client.id),
  firstName: firstString([client.firstName, data.firstName]),
  lastName: firstString([client.lastName, data.lastName]),
  email: firstString([client.email, data.email]),
  username: firstString([client.username, data.username]),
});

const buildHandoffContext = ({
  data,
  response,
}: BuildManualClientCreationHandoffParams): ManualClientCreationHandoffContext => {
  const responseData = getResponseData(response);
  const client = getCreatedClient(response);
  return {
    clientId: toClientId(client.id),
    clientName: getClientName(client, data),
    clientEmail: firstString([client.email, data.email]),
    clientSource: normalizeClientSource(data.clientSource),
    claimCode: getClaimCode(responseData),
    claimUrl: toOptionalString(responseData.claimUrl),
    claimExpiresAt: toOptionalString(responseData.claimExpiresAt),
    resetUrl: toOptionalString(responseData.resetUrl),
    resetExpiresAt: toOptionalString(responseData.resetExpiresAt),
    resetExpiresInMinutes: toOptionalPositiveInteger(responseData.expiresInMinutes),
    credentialIssue: toOptionalString(responseData.credentialIssue),
    credentialModeHint: normalizeResetCredentialMode(responseData.credentialMode) ?? normalizeResetCredentialMode(responseData.credentialAction),
  };
};

const hasClaimCredential = (context: ManualClientCreationHandoffContext): boolean => (
  Boolean(context.claimUrl) || Boolean(context.claimCode)
);

const claimCredentialMode = (
  context: ManualClientCreationHandoffContext,
): ManualClientCreationCredentialMode => (
  hasClaimCredential(context) ? 'claim_link_ready' : 'claim_link_needed'
);

const claimMessage = (context: ManualClientCreationHandoffContext): string => (
  hasClaimCredential(context) ? CLAIM_READY_MESSAGE : CLAIM_NEEDED_MESSAGE
);

const buildClaimHandoff = (
  context: ManualClientCreationHandoffContext,
): ManualClientCreationHandoff => ({
  ...context,
  credentialMode: claimCredentialMode(context),
  message: claimMessage(context),
});

const resetCredentialMode = (
  context: ManualClientCreationHandoffContext,
  resetEmailSent: boolean | null,
): ManualClientCreationCredentialMode => {
  if (resetEmailSent || context.credentialModeHint === 'reset_link_sent') return 'reset_link_sent';
  if (context.resetUrl) return 'reset_link_ready';
  if (context.credentialModeHint === 'reset_link_unavailable' || context.credentialIssue === 'reset_link_unavailable') return 'reset_link_unavailable';
  return 'reset_link_needed';
};

const resetMessage = (
  context: ManualClientCreationHandoffContext,
  resetEmailSent: boolean | null,
): string => {
  const mode = resetCredentialMode(context, resetEmailSent);
  if (mode === 'reset_link_sent') return RESET_SENT_MESSAGE;
  if (mode === 'reset_link_ready') return RESET_READY_MESSAGE;
  if (mode === 'reset_link_unavailable') return RESET_UNAVAILABLE_MESSAGE;
  return RESET_NEEDED_MESSAGE;
};

const buildResetHandoff = (
  context: ManualClientCreationHandoffContext,
  resetEmailSent: boolean | null,
): ManualClientCreationHandoff => ({
  clientId: context.clientId,
  clientName: context.clientName,
  clientEmail: context.clientEmail,
  clientSource: context.clientSource,
  credentialMode: resetCredentialMode(context, resetEmailSent),
  resetEmailSent: resetEmailSent === true,
  resetUrl: context.resetUrl,
  resetExpiresAt: context.resetExpiresAt,
  resetExpiresInMinutes: context.resetExpiresInMinutes,
  credentialIssue: context.credentialIssue,
  message: resetMessage(context, resetEmailSent),
});

export const buildManualClientCreationHandoff = (
  params: BuildManualClientCreationHandoffParams,
): ManualClientCreationHandoff => {
  const context = buildHandoffContext(params);
  if (context.clientSource !== 'swanstudios') return buildClaimHandoff(context);
  return buildResetHandoff(context, params.resetEmailSent);
};
