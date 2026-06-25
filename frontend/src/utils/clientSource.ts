export type ClientSource = 'swanstudios' | 'move_fitness' | 'external';
export type SessionBillingMode = 'paid_sessions' | 'no_session_required';

const NON_DEDUCTING_CLIENT_SOURCES = new Set<ClientSource>(['move_fitness', 'external']);

export interface ClientBillingPolicyInput {
  clientSource?: string | null;
  sessionBillingMode?: string | null;
}

export const normalizeClientSource = (clientSource?: string | null): ClientSource => {
  if (typeof clientSource !== 'string') return 'swanstudios';

  const normalized = clientSource
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'move_fitness' || normalized === 'movefitness') return 'move_fitness';
  if (normalized === 'external') return 'external';
  return 'swanstudios';
};

export const normalizeSessionBillingMode = (
  sessionBillingMode?: string | null,
): SessionBillingMode => {
  if (typeof sessionBillingMode !== 'string') return 'paid_sessions';

  const normalized = sessionBillingMode
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    normalized === 'no_pay'
    || normalized === 'nopay'
    || normalized === 'free_session'
    || normalized === 'free_sessions'
    || normalized === 'free_training'
    || normalized === 'no_session'
    || normalized === 'no_sessions'
    || normalized === 'no_session_required'
  ) {
    return 'no_session_required';
  }

  return 'paid_sessions';
};

export const isNonDeductingClientSource = (clientSource?: string | null): boolean =>
  NON_DEDUCTING_CLIENT_SOURCES.has(normalizeClientSource(clientSource));

export const isNoSessionRequiredBillingMode = (sessionBillingMode?: string | null): boolean =>
  normalizeSessionBillingMode(sessionBillingMode) === 'no_session_required';

export const isNonDeductingClientAccount = (client?: ClientBillingPolicyInput | null): boolean => (
  isNonDeductingClientSource(client?.clientSource)
  || isNoSessionRequiredBillingMode(client?.sessionBillingMode)
);