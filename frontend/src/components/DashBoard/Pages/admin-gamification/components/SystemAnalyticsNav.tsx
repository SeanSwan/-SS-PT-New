/**
 * Tab and time-range controls for SystemAnalytics.
 */

import React from 'react';
import { Activity, Award, Gift, TrendingUp, Trophy, Users } from 'lucide-react';
import { ANALYTICS_TABS, TIME_RANGES } from './SystemAnalytics.data';
import { TabBar, TabButton, TimeRangeButton } from './SystemAnalyticsFrame.styles';
import type { AnalyticsTab, AnalyticsTimeRange as AnalyticsTimeRangeValue } from './SystemAnalytics.types';

const tabIcon = (tab: AnalyticsTab) => {
  switch (tab) {
    case 'users':
      return <Users size={18} />;
    case 'achievements':
      return <Trophy size={18} />;
    case 'rewards':
      return <Gift size={18} />;
    case 'tiers':
      return <Award size={18} />;
    case 'trends':
      return <TrendingUp size={18} />;
    default:
      return <Activity size={18} />;
  }
};

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  onChange: (tab: AnalyticsTab) => void;
}

export const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({ activeTab, onChange }) => (
  <TabBar role="tablist" aria-label="Gamification analytics tabs">
    {ANALYTICS_TABS.map(tab => (
      <TabButton
        key={tab.value}
        role="tab"
        type="button"
        $active={activeTab === tab.value}
        aria-selected={activeTab === tab.value}
        onClick={() => onChange(tab.value)}
      >
        {tabIcon(tab.value)}
        {tab.label}
      </TabButton>
    ))}
  </TabBar>
);

interface AnalyticsTimeRangeProps {
  value: AnalyticsTimeRangeValue;
  onChange: (range: AnalyticsTimeRangeValue) => void;
}

export const AnalyticsTimeRange: React.FC<AnalyticsTimeRangeProps> = ({ value, onChange }) => (
  <TabBar aria-label="Analytics time range">
    {TIME_RANGES.map(range => (
      <TimeRangeButton
        key={range.value}
        type="button"
        $active={value === range.value}
        onClick={() => onChange(range.value)}
      >
        {range.label}
      </TimeRangeButton>
    ))}
  </TabBar>
);
