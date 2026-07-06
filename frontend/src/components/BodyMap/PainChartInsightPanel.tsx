import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { PainEntry } from '../../services/painEntryService';
import PainChartTrendFollowUp from './PainChartTrendFollowUp';
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

const riskColors: Record<PainRiskBand, string> = {
  clear: 'var(--accent-primary, #60C0F0)',
  low: 'var(--accent-primary, #60C0F0)',
  moderate: 'var(--data-accent, #50A0F0)',
  review: 'var(--accent-gold, #C6A84B)',
};

const Panel = styled.section`
  margin-top: 20px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: linear-gradient(180deg, var(--bg-elevated, rgba(0, 32, 96, 0.42)), var(--bg-surface, rgba(10, 10, 15, 0.62)));
  padding: 14px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  min-width: 220px;
`;

const Title = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 16px;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 13px;
  line-height: 1.45;
`;

const RiskBadge = styled.span<{ $risk: PainRiskBand }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid ${({ $risk }) => riskColors[$risk]};
  background: rgba(96, 192, 240, 0.08);
  background: color-mix(in srgb, ${({ $risk }) => riskColors[$risk]} 16%, transparent);
  color: ${({ $risk }) => riskColors[$risk]};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  padding: 0 14px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
  gap: 8px;
  margin-top: 14px;
`;

const Metric = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.38);
  padding: 10px;
`;

const MetricValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 18px;
  font-weight: 800;
`;

const MetricLabel = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.62));
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0;
`;

const AlertList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const Alert = styled.div`
  border: 1px solid rgba(198, 168, 75, 0.34);
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.09);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  line-height: 1.45;
  padding: 10px 12px;
`;

const ConstraintBlock = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const ConstraintText = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 13px;
  line-height: 1.5;
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.18))'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.16)' : 'rgba(10, 10, 15, 0.32)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 0 12px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const EntryList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
`;

const EntryButton = styled.button`
  min-height: 54px;
  width: 100%;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.32);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const EntryMain = styled.span`
  display: grid;
  min-width: 0;
  gap: 2px;
`;

const EntryName = styled.span`
  font-weight: 700;
  font-size: 13px;
`;

const EntryDetail = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.66));
  font-size: 12px;
`;

const EntryStatus = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  white-space: nowrap;
`;

const EmptyState = styled.p`
  margin: 12px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.66));
  font-size: 13px;
`;

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