/**
 * ============================================================================
 * FILE: dashboardSidebarPolicy.ts
 * PURPOSE: Decide which member-dashboard tabs render the outer 300px profile
 *          rail alongside their content.
 * ============================================================================
 *
 * WHY THIS IS A MODULE AND NOT AN INLINE TERNARY
 * ----------------------------------------------
 * The rail used to be opt-out, applied by default to every tab. Home already
 * renders three rails of its own (CreatorShell), so it ended up with two nested
 * rail systems and a squeezed content column at laptop widths.
 *
 * The policy is now opt-IN and lives here so it can be asserted directly. The
 * two failure modes are not symmetric: a tab that is wrongly full-width still
 * reads fine, while a tab that is wrongly crushed is the defect this replaced.
 * A tab added later and never considered here renders full width — safe by
 * omission, which is the point.
 */

import type { TabId } from './types/UserDashboardTypes';

/**
 * The tabs that opt IN to the outer profile rail.
 *
 * This is an allowlist, not an exclusion list, and the difference is the whole
 * point. An exclusion list gives the rail to every tab nobody has thought about
 * yet - including tabs added years from now - which is the crush failure mode
 * this module exists to prevent. Membership here is a deliberate statement that
 * the tab is a simple content column with room to spare beside it.
 *
 * Deliberately absent: `home` (owns CreatorShell's own three-rail layout) and
 * `nutrition` (a focus-mode task surface, see ObservatoryShell `focusMode`).
 */
const TABS_WITH_PROFILE_SIDEBAR: ReadonlySet<string> = new Set<string>([
  'groups',
  'reels',
  'friends',
  'challenges',
  'notifications',
  'creative',
  'photos',
  'about',
  'activity',
  'progress',
  'profile',
]);

export function shouldShowProfileSidebar(activeTab: TabId | string | null | undefined): boolean {
  if (!activeTab) return false;
  // Case-insensitive: the signature accepts a bare string, and a caller passing
  // 'Home' must not silently reinstate the rail Home was excluded from.
  return TABS_WITH_PROFILE_SIDEBAR.has(String(activeTab).toLowerCase());
}

export function isFocusModeTab(activeTab: TabId | string | null | undefined): boolean {
  return activeTab === 'nutrition';
}
