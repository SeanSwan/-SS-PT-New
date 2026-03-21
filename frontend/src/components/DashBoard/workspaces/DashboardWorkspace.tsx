import React from 'react';
import { Shield, Bell, Clock, Activity } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';

const tabs: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: <Shield size={18} />, path: '/dashboard/home' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, path: '/dashboard/home/notifications' },
  { id: 'approvals', label: 'Pending Approvals', icon: <Clock size={18} />, path: '/dashboard/home/approvals' },
  { id: 'snapshot', label: 'System Snapshot', icon: <Activity size={18} />, path: '/dashboard/home/snapshot' },
];

const DashboardWorkspace: React.FC = () => (
  <>
    <div style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="general"
        label="Dashboard Assistant"
        emptyHint="Ask about overview, notifications, approvals..."
        defaultOpen={false}
      />
    </div>
    <WorkspaceContainer
      title="Dashboard"
      subtitle="Executive command center overview"
      tabs={tabs}
    />
  </>
);

export default DashboardWorkspace;
