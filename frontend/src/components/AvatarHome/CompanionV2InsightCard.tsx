import React from 'react';
import { Sparkles } from 'lucide-react';
import { getCompanionV2Insight } from './companionV2Insights';
import { InsightCopy, InsightHeading, InsightMeta, InsightShell } from './CompanionV2InsightCard.styles';

interface CompanionV2InsightCardProps {
  stage?: number;
  health?: number;
  happiness?: number;
  moodLabel?: string;
  totalInteractions?: number;
}

const CompanionV2InsightCard: React.FC<CompanionV2InsightCardProps> = ({
  stage = 0,
  health = 0,
  happiness = 0,
  moodLabel = 'content',
  totalInteractions = 0,
}) => {
  const insight = getCompanionV2Insight({ stage, health, happiness, moodLabel, totalInteractions });

  return (
    <InsightShell aria-label="Companion insight">
      <InsightHeading><Sparkles size={14} aria-hidden /> {insight.title}</InsightHeading>
      <InsightCopy>{insight.body}</InsightCopy>
      <InsightMeta>Progress {insight.bondPercent}% · {insight.nextActionLabel}</InsightMeta>
    </InsightShell>
  );
};

export default CompanionV2InsightCard;
