export type ClientSource = 'swanstudios' | 'move_fitness' | 'external';

const NON_DEDUCTING_CLIENT_SOURCES = new Set<ClientSource>(['move_fitness', 'external']);

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

export const isNonDeductingClientSource = (clientSource?: string | null): boolean =>
  NON_DEDUCTING_CLIENT_SOURCES.has(normalizeClientSource(clientSource));
