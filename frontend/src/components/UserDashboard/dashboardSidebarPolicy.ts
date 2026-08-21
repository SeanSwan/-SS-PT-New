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
 * Tabs that render their own internal rails or are focused task surfaces, and
 * therefore must NOT also receive the outer profile rail.
 */
const TABS_WITHOUT_PROFILE_SIDEBAR: ReadonlySet<string> = new Set<string>([
  // Owns CreatorShell's three-rail layout.
  'home',
  // Focus-mode task surface (see ObservatoryShell `focusMode`).
  'nutrition',
]);

export function shouldShowProfileSidebar(activeTab: TabId | string | null | undefined): boolean {
  if (!activeTab) return false;
  return !TABS_WITHOUT_PROFILE_SIDEBAR.has(String(activeTab));
}

export function isFocusModeTab(activeTab: TabId | string | null | undefined): boolean {
  return activeTab === 'nutrition';
}
