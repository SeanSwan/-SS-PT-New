/**
 * FILE: SegmentedTabBar.tsx
 * PURPOSE: Phase 4B — segmented IA for the 14 nutrition tabs (HY3 §b).
 *          4 intent segments (Capture / Insights / Fuel / Explore) + a
 *          sub-pill row of the active segment's tools. Replaces the native
 *          <select> that hid 9 of 14 tabs.
 * HOW IT FITS: NutritionWorkspace renders this under the capture ribbon.
 *          activeTab stays the single source of truth (ids unchanged —
 *          deep links / session storage contract preserved).
 * KEY DECISIONS:
 * - Tapping a segment routes to its first reachable tab (skips gated tabs
 *   while locked) so a segment tap never lands on a disabled surface.
 * - Gated tabs render as DISABLED pills with a Gilded Fern lock glyph —
 *   never hidden (HY3 law).
 * - Mobile ≤768px: segment bar fixes to the bottom (44px+ icon+label items);
 *   pill row stays below the header as a swipeable strip.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';
import {
  NUTRITION_ALL_TABS,
  nutritionPanelId,
  type Tab,
} from './NutritionWorkspace.tabs';
import {
  NUTRITION_SEGMENTS,
  firstReachableTab,
  isGatedNutritionTab,
  segmentForTab,
} from './NutritionWorkspace.segments';
import {
  PillLock,
  SegmentBar,
  SegmentButton,
  SegmentNav,
  SubPill,
  SubPillRow,
} from './SegmentedTabBar.styles';

interface SegmentedTabBarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  /** True when the user's plan lacks AI nutrition — gated tabs lock. */
  premiumLocked: boolean;
}

const MOBILE_NAV_QUERY = '(max-width: 768px)';

/** ≤768px the segment bar becomes a fixed bottom nav. It must portal to
 *  <body> because the workspace card (container-type + backdrop-filter) is
 *  the containing block for fixed descendants — inside it, "fixed" pins to
 *  the card, not the viewport. */
const useMobileNav = (): boolean => {
  const [mobile, setMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_NAV_QUERY).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(MOBILE_NAV_QUERY);
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return mobile;
};

const SegmentedTabBar: React.FC<SegmentedTabBarProps> = ({
  activeTab,
  onSelectTab,
  premiumLocked,
}) => {
  const activeSegment = segmentForTab(activeTab);
  const mobileNav = useMobileNav();
  const segment = NUTRITION_SEGMENTS.find((candidate) => candidate.id === activeSegment)
    || NUTRITION_SEGMENTS[0];

  const segmentBar = (
    <SegmentBar role="group" aria-label="Nutrition section picker">
      {NUTRITION_SEGMENTS.map((candidate) => {
        const Icon = candidate.icon;
        const active = candidate.id === activeSegment;
        return (
          <SegmentButton
            key={candidate.id}
            type="button"
            $active={active}
            aria-pressed={active}
            onClick={() => {
              if (!active) onSelectTab(firstReachableTab(candidate.id, premiumLocked));
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{candidate.label}</span>
          </SegmentButton>
        );
      })}
    </SegmentBar>
  );

  return (
    <SegmentNav aria-label="Nutrition sections">
      {mobileNav ? createPortal(segmentBar, document.body) : segmentBar}

      <SubPillRow role="group" aria-label={`${segment.label} tools`}>
        {segment.tabs.map((tabId) => {
          const config = NUTRITION_ALL_TABS.find((tab) => tab.id === tabId);
          if (!config) return null;
          const active = tabId === activeTab;
          const locked = premiumLocked && isGatedNutritionTab(tabId);
          return (
            <SubPill
              key={tabId}
              type="button"
              $active={active}
              disabled={locked}
              aria-pressed={active}
              aria-controls={active ? nutritionPanelId(tabId) : undefined}
              aria-label={locked ? `${config.label} — locked, upgrade to unlock` : config.label}
              onClick={() => { if (!locked) onSelectTab(tabId); }}
            >
              {config.icon}
              <span>{config.label}</span>
              {locked && <PillLock aria-hidden="true"><Lock size={14} /></PillLock>}
            </SubPill>
          );
        })}
      </SubPillRow>
    </SegmentNav>
  );
};

export default SegmentedTabBar;
