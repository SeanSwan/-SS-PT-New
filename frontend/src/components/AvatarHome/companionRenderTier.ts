export type CompanionRenderTier = 'lite' | 'sprite' | 'voxel' | 'three';

export interface CompanionRenderTierInput {
  reducedMotion?: boolean;
  saveData?: boolean;
  deviceMemoryGb?: number | null;
  cpuCores?: number | null;
  viewportWidth?: number | null;
  prefersPremium?: boolean;
}

export const getCompanionRenderTier = (input: CompanionRenderTierInput): CompanionRenderTier => {
  const memory = input.deviceMemoryGb ?? 0;
  const cores = input.cpuCores ?? 0;
  const width = input.viewportWidth ?? 0;

  if (input.reducedMotion || input.saveData) return 'lite';
  if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 2) || (width > 0 && width < 420)) return 'sprite';
  if (input.prefersPremium && memory >= 8 && cores >= 8) return 'three';
  if (memory >= 4 && cores >= 4) return 'voxel';
  return 'sprite';
};
