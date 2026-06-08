import { normalizeClientSource } from './clientSessionSignal';

export type ClientSourceTone = 'ss' | 'mf' | 'external';

export const getClientSourceTone = (source?: string): ClientSourceTone => {
  const normalizedSource = normalizeClientSource(source);
  if (normalizedSource === 'move_fitness') return 'mf';
  if (normalizedSource === 'external') return 'external';
  return 'ss';
};

export const getClientSourceLabel = (source?: string): string => {
  const normalizedSource = normalizeClientSource(source);
  if (normalizedSource === 'move_fitness') return 'Move Fitness';
  if (normalizedSource === 'external') return 'External';
  return 'SwanStudios';
};

export const getClientSourceShortLabel = (source?: string): string => {
  const normalizedSource = normalizeClientSource(source);
  if (normalizedSource === 'move_fitness') return 'MF';
  if (normalizedSource === 'external') return 'EXT';
  return 'SS';
};
