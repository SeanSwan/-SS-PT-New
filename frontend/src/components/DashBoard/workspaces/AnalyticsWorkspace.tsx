import React from 'react';
import { BarChart3, DollarSign, FileText, TrendingUp, Globe, PieChart, Award } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';

const allTabs: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} />, path: '/dashboard/analytics' },
  { id: 'charts', label: 'Chart Gallery', icon: <PieChart size={18} />, path: '/dashboard/analytics/charts' },
  { id: 'badges', label: 'Badge Art', icon: <Award size={18} />, path: '/dashboard/analytics/badges' },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={18} />, path: '/dashboard/analytics/revenue' },
  { id: 'performance', label: 'Performance', icon: <FileText size={18} />, path: '/dashboard/analytics/performance' },
  { id: 'bi', label: 'BI Drilldowns', icon: <TrendingUp size={18} />, path: '/dashboard/analytics/bi' },
  { id: 'social', label: 'Social Command', icon: <Globe size={18} />, path: '/dashboard/analytics/social' },
];

// Hide pure-mock tabs (no backend API) in production
const tabs = import.meta.env.DEV ? allTabs : allTabs.filter(t => t.id !== 'performance');

const AnalyticsWorkspace: React.FC = () => (
  <>
    <div style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="data_management"
        label="Analytics Assistant"
        emptyHint="Ask about revenue trends, performance, insights..."
        defaultOpen={false}
      />
    </div>
    <WorkspaceContainer
      title="Analytics"
      subtitle="Data analytics, revenue intelligence, and performance insights"
      tabs={tabs}
    />
  </>
);

export default AnalyticsWorkspace;
