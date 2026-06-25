import { normalizeClientSource, normalizeSessionBillingMode } from '../clientSessionSignal';

export interface SettingsTabContentProps {
  clientId: number | string;
  clientName?: string;
  onClientUpdated?: (updates: { sessionBillingMode?: string }) => void;
}

export const CLIENT_SOURCE_POLICIES = {
  swanstudios: {
    label: 'SwanStudios paid',
    note: 'Deduct after completed logged workouts.',
  },
  move_fitness: {
    label: 'Move Fitness free tracking',
    note: 'Free tracking - no deduction.',
  },
  external: {
    label: 'External free tracking',
    note: 'No deduction until this client is reclassified.',
  },
} as const;

export const NO_PAY_POLICY = {
  label: 'SwanStudios no-pay',
  note: 'No session balance required; scheduling and training do not deduct paid credits.',
} as const;

type ClientSourceKey = keyof typeof CLIENT_SOURCE_POLICIES;

export const getClientSourcePolicy = (source: string, sessionBillingMode?: string) => {
  if (normalizeSessionBillingMode(sessionBillingMode) === 'no_session_required') {
    return NO_PAY_POLICY;
  }

  return CLIENT_SOURCE_POLICIES[normalizeClientSource(source) as ClientSourceKey];
};