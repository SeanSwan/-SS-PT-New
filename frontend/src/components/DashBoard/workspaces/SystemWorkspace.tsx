import React from 'react';
import {
  Monitor, ShieldCheck, Zap, Server, Settings,
  DollarSign,
} from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const allTabs: WorkspaceTab[] = [
  { id: 'health', label: 'Health', icon: <Monitor size={18} />, path: '/dashboard/system' },
  { id: 'security', label: 'Security', icon: <ShieldCheck size={18} />, path: '/dashboard/system/security' },
  { id: 'automation', label: 'Automation', icon: <Zap size={18} />, path: '/dashboard/system/automation' },
  { id: 'mcp', label: 'MCP', icon: <Server size={18} />, path: '/dashboard/system/mcp' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/dashboard/system/settings' },
  { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} />, path: '/dashboard/system/settings/pricing' },
];

// Hide pure-mock tabs (no backend API) in production
const tabs = import.meta.env.DEV ? allTabs : allTabs.filter(t => t.id !== 'security');

const SystemWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="System"
    subtitle="System health, security, and administrative settings"
    tabs={tabs}
  />
);

export default SystemWorkspace;
