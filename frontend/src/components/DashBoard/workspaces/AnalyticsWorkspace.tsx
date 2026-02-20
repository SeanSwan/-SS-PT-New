import React from 'react';
import { BarChart3, DollarSign, FileText, TrendingUp, Globe } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} />, path: '/dashboard/analytics' },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={18} />, path: '/dashboard/analytics/revenue' },
  { id: 'performance', label: 'Performance', icon: <FileText size={18} />, path: '/dashboard/analytics/performance' },
  { id: 'bi', label: 'BI Drilldowns', icon: <TrendingUp size={18} />, path: '/dashboard/analytics/bi' },
  { id: 'social', label: 'Social Command', icon: <Globe size={18} />, path: '/dashboard/analytics/social' },
];

const AnalyticsWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Analytics"
    subtitle="Data analytics, revenue intelligence, and performance insights"
    tabs={tabs}
  />
);

export default AnalyticsWorkspace;
