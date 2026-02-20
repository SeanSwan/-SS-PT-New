import React from 'react';
import { Shield, Bell, AlertTriangle, Clock, Activity } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: <Shield size={18} />, path: '/dashboard/home' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, path: '/dashboard/home/notifications' },
  { id: 'alerts', label: 'Business Alerts', icon: <AlertTriangle size={18} />, path: '/dashboard/home/alerts' },
  { id: 'approvals', label: 'Pending Approvals', icon: <Clock size={18} />, path: '/dashboard/home/approvals' },
  { id: 'snapshot', label: 'System Snapshot', icon: <Activity size={18} />, path: '/dashboard/home/snapshot' },
];

const DashboardWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Dashboard"
    subtitle="Executive command center overview"
    tabs={tabs}
  />
);

export default DashboardWorkspace;
