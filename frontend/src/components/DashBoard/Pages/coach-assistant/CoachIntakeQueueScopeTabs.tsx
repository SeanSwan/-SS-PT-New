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
  { key: 'unprocessed', label: 'Needs action', count: 'unprocessed' },
  { key: 'processing', label: 'Processing', count: 'processing' },
  { key: 'failed', label: 'Failed', count: 'failed' },
];

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
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
  return (
    <Tabs role="group" aria-label="Coach intake queue filters">
      {SCOPE_TABS.map((tab) => {
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
      })}
    </Tabs>
  );
}

export default CoachIntakeQueueScopeTabs;
