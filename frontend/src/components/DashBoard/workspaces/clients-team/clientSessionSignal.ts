import { isNonDeductingClientAccount, isNonDeductingClientSource, normalizeSessionBillingMode } from '../../../../utils/clientSource';
export { isNonDeductingClientAccount, isNonDeductingClientSource, normalizeClientSource, normalizeSessionBillingMode } from '../../../../utils/clientSource';
export type { ClientSource, SessionBillingMode } from '../../../../utils/clientSource';

export type ClientSessionSignalTone = 'default' | 'gold' | 'warning' | 'neutral';

export interface ClientSessionSignalInput {
  clientSource?: string | null;
  sessionBillingMode?: string | null;
  availableSessions?: number | string | null;
}

export interface ClientSessionSignal {
  label: string;
  note: string;
  tone: ClientSessionSignalTone;
}

export const normalizeAvailableSessions = (availableSessions?: number | string | null): number => {
  const parsed = Number(availableSessions ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

export const getClientSessionSignal = (client: ClientSessionSignalInput): ClientSessionSignal => {
  const sessions = normalizeAvailableSessions(client.availableSessions);
  if (isNonDeductingClientAccount(client)) {
    return normalizeSessionBillingMode(client.sessionBillingMode) === 'no_session_required'
      ? { label: 'no-pay training', note: 'no session deduction', tone: 'neutral' }
      : { label: 'free tracking', note: 'no deduction', tone: 'neutral' };
  }

  return {
    label: `${sessions} paid ${sessions === 1 ? 'session' : 'sessions'}`,
    note: sessions <= 2 ? 'refill soon' : 'deducts when logged',
    tone: sessions <= 2 ? 'warning' : 'gold',
  };
};
