/**
 * SHARED LOGIC: DashboardTeachMeGuide route-refiner helpers.
 * PURPOSE: Keeps role route modules small and consistent while preserving the
 * guide contract: copy and navigation only, with no data writes.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';

export type GuidePatch = Partial<DashboardTeachMeGuideCopy>;

export const includesAny = (path: string, targets: string[]) => (
  targets.some((target) => path.includes(target))
);

export const applyPatch = (
  base: DashboardTeachMeGuideCopy,
  patch: GuidePatch,
): DashboardTeachMeGuideCopy => ({ ...base, ...patch });
