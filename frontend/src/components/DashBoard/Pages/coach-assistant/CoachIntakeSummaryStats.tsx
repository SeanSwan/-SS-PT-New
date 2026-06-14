/**
 * CoachIntakeSummaryStats.tsx
 * ============================
 * Reusable queue-pressure summary for the Hive Mind intake workspace.
 */
import React from 'react';
import type { CoachIntakeQueueState } from '../../../../hooks/useCoachIntakeQueue';
import { Stat, StatGrid } from './CoachIntakeWorkspace.styles';

type CoachIntakeSummary = CoachIntakeQueueState['summary'];

interface CoachIntakeSummaryStatsProps {
  summary: CoachIntakeSummary;
  label?: string;
}

export function CoachIntakeSummaryStats({
  summary,
  label = 'Coach intake summary',
}: CoachIntakeSummaryStatsProps): JSX.Element {
  return (
    <StatGrid aria-label={label}>
      <Stat><dt>Actionable</dt><dd>{summary.actionable}</dd></Stat>
      <Stat><dt>Ready</dt><dd>{summary.readyReview}</dd></Stat>
      <Stat><dt>Needs client</dt><dd>{summary.needsClient}</dd></Stat>
      <Stat><dt>Failed</dt><dd>{summary.failed}</dd></Stat>
    </StatGrid>
  );
}

export default CoachIntakeSummaryStats;
