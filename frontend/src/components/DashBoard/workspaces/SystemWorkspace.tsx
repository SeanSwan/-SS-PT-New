import React from 'react';
import {
  Monitor, ShieldCheck, Zap, Settings,
  DollarSign,
} from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';
import { StyledBox } from '@/components/ui/StyledBox';

const allTabs: WorkspaceTab[] = [
  { id: 'health', label: 'Health', icon: <Monitor size={18} />, path: '/dashboard/system' },
  { id: 'security', label: 'Security', icon: <ShieldCheck size={18} />, path: '/dashboard/system/security' },
  { id: 'automation', label: 'Automation', icon: <Zap size={18} />, path: '/dashboard/system/automation' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/dashboard/system/settings' },
  { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} />, path: '/dashboard/system/settings/pricing' },
];

// Hide pure-mock tabs (no backend API) in production
const tabs = import.meta.env.DEV ? allTabs : allTabs.filter(t => t.id !== 'security');

const SystemWorkspace: React.FC = () => (
  <>
    <StyledBox as="div" $style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="general"
        label="System Assistant"
        emptyHint="Ask about health, security, automation..."
        defaultOpen={false}
      />
    </StyledBox>
    <WorkspaceContainer
      title="System"
      subtitle="System health, security, and administrative settings"
      tabs={tabs}
    />
  </>
);

export default SystemWorkspace;
