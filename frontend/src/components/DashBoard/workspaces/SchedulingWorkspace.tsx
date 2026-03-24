import React from 'react';
import { Calendar, Clock, Link } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';
import AITerminalPanel from '../../Shared/AITerminalPanel';

const tabs: WorkspaceTab[] = [
  { id: 'master-schedule', label: 'Master Schedule', icon: <Calendar size={18} />, path: '/dashboard/scheduling' },
  { id: 'sessions', label: 'Sessions', icon: <Clock size={18} />, path: '/dashboard/scheduling/sessions' },
  { id: 'assignments', label: 'Assignments', icon: <Link size={18} />, path: '/dashboard/scheduling/assignments' },
];

const SchedulingWorkspace: React.FC = () => (
  <>
    <div style={{ padding: '24px 24px 0' }}>
      <AITerminalPanel
        context="scheduling"
        label="Scheduling Assistant"
        emptyHint="I'm your Scheduling Assistant. Ask about session availability, client assignments, or schedule optimization."
        defaultOpen={false}
      />
    </div>
    <WorkspaceContainer
      title="Scheduling"
      subtitle="Session scheduling and assignment management"
      tabs={tabs}
    />
  </>
);

export default SchedulingWorkspace;
