import React, { useEffect, useMemo, useState } from 'react';
import type { PainEntry } from '../../services/painEntryService';
import PainChartTrendFollowUp from './PainChartTrendFollowUp';
import {
  Panel,
  Header,
  TitleGroup,
  Title,
  Subtitle,
  RiskBadge,
  MetricGrid,
  Metric,
  MetricValue,
  MetricLabel,
  AlertList,
  Alert,
  ConstraintBlock,
  ConstraintText,
  DisclaimerText,
  TabBar,
  TabButton,
  EntryList,
  EntryButton,
  EntryMain,
  EntryName,
  EntryDetail,
  EntryStatus,
  EmptyState,
} from './PainChartInsightPanel.styles';
import {
  buildPainChartInsight,
  formatPainRegionLabel,
  type PainRiskBand,
} from './painChartInsights';

interface PainChartInsightPanelProps {
  entries: PainEntry[];
  isClientMode: boolean;
  onSelectRegion: (regionId: string) => void;
}

type InsightTab = 'active' | 'resolved' | 'timeline';

const riskLabels: Record<PainRiskBand, string> = {
  clear: 'Clear',
  low: 'Low',
  moderate: 'Modify',
  review: 'Review',
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const joinList = (values: string[], empty: string) => values.slice(0, 4).join(', ') || empty;

const PainChartInsightPanel: React.FC<PainChartInsightPanelProps> = ({
  entries,
  isClientMode,
  onSelectRegion,
}) => {
  const [activeTab, setActiveTab] = useState<InsightTab>('active');
  const insight = useMemo(() => buildPainChartInsight(entries), [entries]);

  useEffect(() => {
    if (activeTab === 'active' && insight.activeEntries.length === 0 && insight.resolvedEntries.length > 0) {
      setActiveTab('resolved');
    }
  }, [activeTab, insight.activeEntries.length, insight.resolvedEntries.length]);

  const constraints = insight.workoutConstraints;
  const tabEntries = activeTab === 'active'
    ? insight.activeEntries
    : activeTab === 'resolved'
      ? insight.resolvedEntries
      : insight.timelineEntries;

  const tabs: Array<{ id: InsightTab; label: string; count: number }> = [
    { id: 'active', label: 'Active', count: insight.activeEntries.length },
    { id: 'resolved', label: 'Resolved', count: insight.resolvedEntries.length },
    { id: 'timeline', label: 'Timeline', count: insight.timelineEntries.length },
  ];

  return (
    <Panel aria-label="Pain chart training insight">
      <Header>
        <TitleGroup>
          <Title>Pain Intelligence</Title>
          <Subtitle>
            {isClientMode
              ? 'Your active and resolved reports shape trainer review.'
              : 'Active and resolved reports shape workout constraints.'}
          </Subtitle>
        </TitleGroup>
        <RiskBadge $risk={constraints.riskBand}>{riskLabels[constraints.riskBand]}</RiskBadge>
      </Header>

      <MetricGrid>
        <Metric><MetricValue>{insight.activeEntries.length}</MetricValue><MetricLabel>Active</MetricLabel></Metric>
        <Metric><MetricValue>{insight.resolvedEntries.length}</MetricValue><MetricLabel>Resolved</MetricLabel></Metric>
        <Metric><MetricValue>{insight.severeCount}</MetricValue><MetricLabel>Severe</MetricLabel></Metric>
        <Metric><MetricValue>{insight.moderateCount}</MetricValue><MetricLabel>Moderate</MetricLabel></Metric>
      </MetricGrid>

      {insight.safetyMessages.length > 0 && (
        <AlertList>
          {insight.safetyMessages.map((message) => <Alert key={message}>{message}</Alert>)}
        </AlertList>
      )}

      <PainChartTrendFollowUp severityTrend={insight.severityTrend} reminders={insight.followUpReminders} />

      <ConstraintBlock>
        <ConstraintText><strong>Avoid:</strong> {joinList(constraints.avoidMovements, 'No hard avoid rules from active entries.')}</ConstraintText>
        <ConstraintText><strong>Modify:</strong> {joinList(constraints.modifyMovements, 'No active movement modifications.')}</ConstraintText>
        <ConstraintText><strong>Prep:</strong> {joinList(constraints.warmupPriorities, 'Use normal warm-up progression.')}</ConstraintText>
        {constraints.promptSnippet && <ConstraintText><strong>Coach context:</strong> {constraints.promptSnippet}</ConstraintText>}
        <DisclaimerText>
          These are comfort modifications for training only — not medical advice,
          diagnosis, or treatment. For persistent or severe pain, consult a
          healthcare professional.
        </DisclaimerText>
      </ConstraintBlock>

      <TabBar role="tablist" aria-label="Pain entry history">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} ({tab.count})
          </TabButton>
        ))}
      </TabBar>

      {tabEntries.length > 0 ? (
        <EntryList>
          {tabEntries.map((entry) => (
            <EntryButton key={`${activeTab}-${entry.id}`} type="button" onClick={() => onSelectRegion(entry.bodyRegion)}>
              <EntryMain>
                <EntryName>{formatPainRegionLabel(entry.bodyRegion)}</EntryName>
                <EntryDetail>{entry.painLevel}/10 - {entry.painType || 'reported'} - {entry.side}</EntryDetail>
              </EntryMain>
              <EntryStatus>{entry.isActive ? formatDate(entry.updatedAt) : `Resolved ${formatDate(entry.resolvedAt)}`}</EntryStatus>
            </EntryButton>
          ))}
        </EntryList>
      ) : (
        <EmptyState>{activeTab === 'resolved' ? 'No resolved entries yet.' : 'No entries in this view.'}</EmptyState>
      )}
    </Panel>
  );
};

export default PainChartInsightPanel;