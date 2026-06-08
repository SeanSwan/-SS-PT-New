import { normalizeClientSource } from '../clientSessionSignal';

export interface SettingsTabContentProps {
  clientId: number | string;
  clientName?: string;
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

type ClientSourceKey = keyof typeof CLIENT_SOURCE_POLICIES;

export const getClientSourcePolicy = (source: string) => {
  return CLIENT_SOURCE_POLICIES[normalizeClientSource(source) as ClientSourceKey];
};
