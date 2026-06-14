/**
 * CoachIntakeQueueScopeTabs.tsx
 * =============================
 * Operational scope filters for the Coach intake queue.
 */
import React from 'react';
import styled from 'styled-components';
import type { CoachIntakeQueueScope } from '../../../../services/coachIntakeService';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';

interface CoachIntakeQueueScopeTabsProps {
  activeScope?: string;
  summary: PlaudIntakeSummary;
  onScopeChange?: (scope: CoachIntakeQueueScope) => void;
}

const SCOPE_TABS: Array<{ key: CoachIntakeQueueScope; label: string; count: keyof PlaudIntakeSummary }> = [
  { key: 'actionable', label: 'Actionable', count: 'actionable' },
  { key: 'ready_review', label: 'Ready', count: 'readyReview' },
  { key: 'needs_client', label: 'Needs client', count: 'needsClient' },
  { key: 'failed', label: 'Failed', count: 'failed' },
];

const SECONDARY_SCOPE_TABS: Array<{ key: CoachIntakeQueueScope; label: string; count: keyof PlaudIntakeSummary }> = [
  { key: 'needs_clarification', label: 'Needs clarity', count: 'needsClarification' },
  { key: 'duplicate_hold', label: 'Duplicate hold', count: 'duplicateHold' },
  { key: 'unprocessed', label: 'Needs action', count: 'unprocessed' },
  { key: 'processing', label: 'Processing', count: 'processing' },
];

const Tabs = styled.div`
  display: grid;
  gap: 8px;
  margin: 0 0 12px;
  min-width: 0;
`;

const PrimaryTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const MoreFilters = styled.div`
  min-width: 0;
`;

const MoreFiltersButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const SecondaryTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent)'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent)'
    : 'color-mix(in srgb, var(--surface-dark, #1A1A24) 72%, transparent)'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  white-space: normal;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export function CoachIntakeQueueScopeTabs({
  activeScope = 'actionable',
  summary,
  onScopeChange,
}: CoachIntakeQueueScopeTabsProps): JSX.Element {
  const secondaryActive = SECONDARY_SCOPE_TABS.some((tab) => tab.key === activeScope);
  const [secondaryOpen, setSecondaryOpen] = React.useState(secondaryActive);

  React.useEffect(() => {
    if (secondaryActive) setSecondaryOpen(true);
  }, [secondaryActive]);

  const renderTab = (tab: typeof SCOPE_TABS[number]) => {
    const count = Number(summary[tab.count] || 0);
    const active = activeScope === tab.key;
    return (
      <TabButton
        key={tab.key}
        type="button"
        aria-pressed={active}
        $active={active}
        onClick={() => onScopeChange?.(tab.key)}
      >
        {tab.label} {count}
      </TabButton>
    );
  };

  return (
    <Tabs role="group" aria-label="Coach intake queue filters">
      <PrimaryTabs>
        {SCOPE_TABS.map(renderTab)}
      </PrimaryTabs>
      <MoreFilters>
        <MoreFiltersButton
          type="button"
          aria-expanded={secondaryOpen}
          onClick={() => setSecondaryOpen((open) => !open)}
        >
          {secondaryOpen ? 'Hide filters' : 'More filters'}
        </MoreFiltersButton>
        {secondaryOpen ? (
          <SecondaryTabs>
            {SECONDARY_SCOPE_TABS.map(renderTab)}
          </SecondaryTabs>
        ) : null}
      </MoreFilters>
    </Tabs>
  );
}

export default CoachIntakeQueueScopeTabs;
