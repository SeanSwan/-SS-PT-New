/**
 * Legacy import shim for the schedule surface.
 *
 * Older dashboard code imports `Schedule/schedule`. The canonical schedule
 * implementation is now `UniversalSchedule`, which delegates to
 * `UniversalMasterSchedule` with the authenticated user's role context.
 */
import UniversalSchedule from './UniversalSchedule';

export default UniversalSchedule;
