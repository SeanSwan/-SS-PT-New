export type ClientSourceTone = 'ss' | 'mf' | 'external';

export const getClientSourceTone = (source?: string): ClientSourceTone => {
  if (source === 'move_fitness') return 'mf';
  if (source === 'external') return 'external';
  return 'ss';
};

export const getClientSourceLabel = (source?: string): string => {
  if (source === 'move_fitness') return 'Move Fitness';
  if (source === 'external') return 'External';
  return 'SwanStudios';
};

export const getClientSourceShortLabel = (source?: string): string => {
  if (source === 'move_fitness') return 'MF';
  if (source === 'external') return 'EXT';
  return 'SS';
};
