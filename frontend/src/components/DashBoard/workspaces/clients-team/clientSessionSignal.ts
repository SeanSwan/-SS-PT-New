export type ClientSessionSignalTone = 'default' | 'gold' | 'warning' | 'neutral';

export interface ClientSessionSignalInput {
  clientSource?: string | null;
  availableSessions?: number | string | null;
}

export interface ClientSessionSignal {
  label: string;
  note: string;
  tone: ClientSessionSignalTone;
}

const NON_DEDUCTING_CLIENT_SOURCES = new Set(['move_fitness', 'external']);

export const isNonDeductingClientSource = (clientSource?: string | null): boolean =>
  typeof clientSource === 'string' && NON_DEDUCTING_CLIENT_SOURCES.has(clientSource);

export const normalizeAvailableSessions = (availableSessions?: number | string | null): number => {
  const parsed = Number(availableSessions ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

export const getClientSessionSignal = (client: ClientSessionSignalInput): ClientSessionSignal => {
  const sessions = normalizeAvailableSessions(client.availableSessions);
  if (isNonDeductingClientSource(client.clientSource)) {
    return { label: 'free tracking', note: 'no deduction', tone: 'neutral' };
  }

  return {
    label: `${sessions} paid ${sessions === 1 ? 'session' : 'sessions'}`,
    note: sessions <= 2 ? 'refill soon' : 'deducts when logged',
    tone: sessions <= 2 ? 'warning' : 'gold',
  };
};
