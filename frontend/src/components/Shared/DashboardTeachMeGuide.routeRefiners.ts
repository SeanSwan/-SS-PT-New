/**
 * SHARED LOGIC: DashboardTeachMeGuide role router.
 * PURPOSE: Dispatches route-specific Teach Me copy to compact role modules so
 * each dashboard tab teaches the job currently in front of the user.
 * The refiners are copy-only/navigation-only and never perform writes.
 */

import { refineAdminGuide } from './DashboardTeachMeGuide.adminRouteRefiners';
import { refineClientGuide } from './DashboardTeachMeGuide.clientRouteRefiners';
import type {
  DashboardTeachMeGuideCopy,
  DashboardTeachMeRole,
} from './DashboardTeachMeGuide.logic';
import { refineTrainerGuide } from './DashboardTeachMeGuide.trainerRouteRefiners';
import { refineUserGuide } from './DashboardTeachMeGuide.userRouteRefiners';

export const refineDashboardTeachMeGuide = (
  role: DashboardTeachMeRole,
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (role === 'admin') return refineAdminGuide(path, base);
  if (role === 'trainer') return refineTrainerGuide(path, base);
  if (role === 'client') return refineClientGuide(path, base);
  return refineUserGuide(path, base);
};
