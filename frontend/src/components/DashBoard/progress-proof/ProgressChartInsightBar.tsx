/**
 * COMPONENT: ProgressChartInsightBar
 * PARENT: AdminProgressChartsGrid.* cards and CanonicalProgressChartsGrid.* cards
 * PURPOSE: Shared C11 chart-environment insight chrome - one truthful momentum
 *          strip (delta vs prior, best mark, record tone) plus a facts rail
 *          (Latest / Best / Avg / Logged or category equivalents) so every
 *          progress chart carries coaching context, not just axes.
 * DATA POLICY: Renders ONLY precomputed facts from verified chart points;
 *              renders nothing when both pulse and facts are absent.
 */

import React from 'react';
import { Compass } from 'lucide-react';
import type { ProgressChartPulse } from './progressChartPulse';
import type { ProgressChartFact } from './progressChartFacts';
import NextMilestoneGravity from './NextMilestoneGravity';
import {
  CoachRead,
  FactPill,
  FactRail,
  InsightWrap,
  MomentumDetail,
  MomentumLabel,
  MomentumStrip,
  MomentumValue,
} from './ProgressChartInsightBar.styles';

interface ProgressChartInsightBarProps {
  pulse?: ProgressChartPulse | null;
  facts?: ProgressChartFact[];
  testId?: string;
}

const ProgressChartInsightBar: React.FC<ProgressChartInsightBarProps> = ({
  pulse = null,
  facts = [],
  testId,
}) => {
  const showPulse = Boolean(pulse && pulse.tone !== 'empty');
  const showFacts = facts.length > 0;
  if (!showPulse && !showFacts) return null;

  return (
    <InsightWrap data-testid={testId}>
      {showPulse && pulse && (
        <MomentumStrip $tone={pulse.tone} aria-label={`${pulse.label}: ${pulse.value}`}>
          <MomentumLabel>{pulse.label}</MomentumLabel>
          <MomentumValue>{pulse.value}</MomentumValue>
          <MomentumDetail>{pulse.detail}</MomentumDetail>
          {typeof pulse.progressToNext === 'number' && (
            <NextMilestoneGravity
              progressToNext={pulse.progressToNext}
              remainingLabel={pulse.remainingLabel}
              atPeak={pulse.tone === 'record'}
            />
          )}
          {pulse.coachAction && (
            <CoachRead>
              <Compass size={13} aria-hidden="true" />
              <span>{pulse.coachAction}</span>
            </CoachRead>
          )}
        </MomentumStrip>
      )}
      {showFacts && (
        <FactRail>
          {facts.map((fact) => (
            <FactPill key={fact.id} $emphasis={fact.emphasis ?? 'default'}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </FactPill>
          ))}
        </FactRail>
      )}
    </InsightWrap>
  );
};

export default React.memo(ProgressChartInsightBar);
