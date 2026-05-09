/**
 * COMPONENT: SystemAnalytics
 * PURPOSE: Active admin gamification analytics tab with KPI, economy, tier, and trend sections.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [title + description]
 * [analytics tabs] [optional time range]
 * [active analytics section]
 *
 * DATA FLOW:
 * Props In: { data } from useAdminGamificationController.
 * State: active analytics tab and selected time range.
 * API Calls: none here; parent controller builds data from gamification endpoints.
 * Events: tab change, time range change.
 * Children: AnalyticsTabs, AnalyticsTimeRange, and SystemAnalytics* section components.
 *
 * ARCHITECTURE:
 * SystemAnalytics -> AnalyticsTabs
 * SystemAnalytics -> AnalyticsTimeRange
 * SystemAnalytics -> one active analytics section
 */

import React, { useState } from 'react';
import { SystemAnalyticsAchievements } from './SystemAnalyticsAchievements';
import { SystemAnalyticsOverview } from './SystemAnalyticsOverview';
import { SystemAnalyticsRewards } from './SystemAnalyticsRewards';
import { SystemAnalyticsTiers } from './SystemAnalyticsTiers';
import { SystemAnalyticsTrends } from './SystemAnalyticsTrends';
import { SystemAnalyticsUsers } from './SystemAnalyticsUsers';
import { AnalyticsTabs, AnalyticsTimeRange } from './SystemAnalyticsNav';
import { BodyText, CenteredBox, Container, EmptyState, Heading2, Spinner } from './SystemAnalyticsFrame.styles';
import { SubText } from './SystemAnalyticsCard.styles';
import type { AnalyticsTab, AnalyticsTimeRange as AnalyticsTimeRangeValue, SystemAnalyticsData } from './SystemAnalytics.types';

interface SystemAnalyticsProps {
  data: SystemAnalyticsData | null;
}

const SystemAnalytics: React.FC<SystemAnalyticsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRangeValue>('month');

  if (data === null || data === undefined) {
    return (
      <CenteredBox>
        <Spinner />
      </CenteredBox>
    );
  }

  const hasAnyData = Object.keys(data).length > 0;
  if (!hasAnyData) {
    return (
      <EmptyState>
        <SubText>No analytics data available. Please try again later.</SubText>
      </EmptyState>
    );
  }

  return (
    <Container>
      <Heading2>Gamification System Analytics</Heading2>
      <BodyText>View comprehensive analytics for your gamification system. Use these insights to optimize engagement and user experience.</BodyText>

      <AnalyticsTabs activeTab={activeTab} onChange={setActiveTab} />
      {(activeTab === 'trends' || activeTab === 'users') && (
        <AnalyticsTimeRange value={timeRange} onChange={setTimeRange} />
      )}

      {activeTab === 'overview' && <SystemAnalyticsOverview data={data} />}
      {activeTab === 'users' && <SystemAnalyticsUsers data={data} />}
      {activeTab === 'achievements' && <SystemAnalyticsAchievements data={data} />}
      {activeTab === 'rewards' && <SystemAnalyticsRewards data={data} />}
      {activeTab === 'tiers' && <SystemAnalyticsTiers data={data} />}
      {activeTab === 'trends' && <SystemAnalyticsTrends data={data} />}
    </Container>
  );
};

export default React.memo(SystemAnalytics);
