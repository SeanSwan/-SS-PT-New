/**
 * Focused challenge rule-impact signals.
 * Shows trainer/admin whether challenge rules are helping or need attention.
 */

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ChallengeRuleInsight } from './useChallengeResults';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeResultsRuleSignalsProps {
  challengeTitle: string;
  ruleInsights: ChallengeRuleInsight[];
}

const verdictLabel = (value: string): string => {
  if (value === 'not_enough_data') return 'Not Enough Data';
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPercent = (value: number | string | null | undefined): string => `${Math.round(toNumber(value))}%`;
const formatCount = (value: number | string | null | undefined): string => String(Math.max(0, Math.round(toNumber(value))));

const iconForVerdict = (verdict: string) => {
  if (verdict === 'helping') return <CheckCircle2 size={14} aria-hidden="true" />;
  if (verdict === 'hurting') return <AlertTriangle size={14} aria-hidden="true" />;
  return <Activity size={14} aria-hidden="true" />;
};

const ChallengeResultsRuleSignals: React.FC<ChallengeResultsRuleSignalsProps> = ({ challengeTitle, ruleInsights }) => {
  if (ruleInsights.length === 0) return null;

  return (
    <>
      <S.BadgeRow aria-label={`${challengeTitle} rule impact signals`}>
        <S.Badge><Activity size={14} aria-hidden="true" />Rule Signals</S.Badge>
        {ruleInsights.map((insight) => (
          <React.Fragment key={insight.id}>
            <S.Badge>{insight.label}</S.Badge>
            <S.Badge>{iconForVerdict(insight.verdict)}{verdictLabel(insight.verdict)}</S.Badge>
            <S.Badge>{insight.summary}</S.Badge>
            <S.Badge>{formatPercent(insight.evidenceRate)} evidence</S.Badge>
            <S.Badge>{formatCount(insight.offRuleWorkoutEvents)} off-rule</S.Badge>
          </React.Fragment>
        ))}
      </S.BadgeRow>
      {ruleInsights.map((insight) => (
        insight.recommendation ? <S.CardRuleNote key={`${insight.id}-recommendation`}>{insight.recommendation}</S.CardRuleNote> : null
      ))}
    </>
  );
};

export default ChallengeResultsRuleSignals;