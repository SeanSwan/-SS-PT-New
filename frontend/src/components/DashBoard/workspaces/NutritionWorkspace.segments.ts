/**
 * FILE: NutritionWorkspace.segments.ts
 * PURPOSE: Phase 4B intent-segment map for the 14 nutrition tabs.
 *          Replaces the native <select> IA per HY3 review §(b):
 *          Capture / Insights / Fuel / Explore.
 * HOW IT FITS: NutritionWorkspace -> SegmentedTabBar consumes this map;
 *          NutritionWorkspace.segments.test.ts locks the 14-id coverage.
 * KEY DECISIONS: Pure data + helpers (no JSX) so vitest covers the mapping
 *          without a DOM. Gated tabs (voice / meal-plan / intelligence) are
 *          listed — never hidden — and render as locked pills when the
 *          subscription lacks AI nutrition.
 */
import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, Compass, Pill, PieChart } from 'lucide-react';
import type { Tab } from './NutritionWorkspace.tabs';

export type NutritionSegmentId = 'capture' | 'insights' | 'fuel' | 'explore';

export interface NutritionSegmentConfig {
  id: NutritionSegmentId;
  label: string;
  icon: LucideIcon;
  /** Tab ids in pill display order. Ids must stay stable — deep links and
   *  session storage may reference them (activeTab contract). */
  tabs: readonly Tab[];
}

/** Tabs behind the Swan Guardian upgrade (CrystallineLockOverlay in
 *  NutritionWorkspace.tsx). Rendered as disabled lock pills when locked. */
export const GATED_NUTRITION_TABS: ReadonlySet<Tab> = new Set<Tab>([
  'voice',
  'meal-plan',
  'intelligence',
]);

export const NUTRITION_SEGMENTS: readonly NutritionSegmentConfig[] = [
  {
    id: 'capture',
    label: 'Capture',
    icon: ClipboardCheck,
    tabs: ['today', 'log', 'voice', 'barcode', 'restaurant', 'hydration'],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: PieChart,
    tabs: ['macros', 'intelligence', 'garden', 'farms'],
  },
  {
    id: 'fuel',
    label: 'Fuel',
    icon: Pill,
    tabs: ['meal-plan', 'supplements'],
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: Compass,
    tabs: ['search', 'learn'],
  },
];

const TAB_TO_SEGMENT = NUTRITION_SEGMENTS.reduce<Record<Tab, NutritionSegmentId>>(
  (map, segment) => {
    segment.tabs.forEach((tab) => {
      map[tab] = segment.id;
    });
    return map;
  },
  {} as Record<Tab, NutritionSegmentId>,
);

/** Segment that owns a tab. Falls back to 'capture' defensively so an
 *  unknown id can never strand the bar without an active segment. */
export const segmentForTab = (tab: Tab): NutritionSegmentId =>
  TAB_TO_SEGMENT[tab] || 'capture';

export const isGatedNutritionTab = (tab: Tab): boolean => GATED_NUTRITION_TABS.has(tab);

/**
 * Landing tab when a segment header is tapped. Skips gated tabs while the
 * subscription is locked so a segment tap never opens a disabled surface.
 * Every segment contains at least one ungated tab (locked by test).
 */
export const firstReachableTab = (segmentId: NutritionSegmentId, locked: boolean): Tab => {
  const segment = NUTRITION_SEGMENTS.find((candidate) => candidate.id === segmentId)
    || NUTRITION_SEGMENTS[0];
  const reachable = locked
    ? segment.tabs.find((tab) => !isGatedNutritionTab(tab))
    : segment.tabs[0];
  return reachable || segment.tabs[0];
};
