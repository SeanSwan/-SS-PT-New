import React from 'react';
import { Sparkles } from 'lucide-react';
import { getCompanionV2Insight } from './companionV2Insights';

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
    <section aria-label="Companion insight">
      <strong><Sparkles size={14} aria-hidden /> {insight.title}</strong>
      <p>{insight.body}</p>
      <small>Bond {insight.bondPercent}% · {insight.nextActionLabel}</small>
    </section>
  );
};

export default CompanionV2InsightCard;
