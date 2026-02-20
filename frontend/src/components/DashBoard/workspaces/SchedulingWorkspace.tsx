import React from 'react';
import { Calendar, Clock, Link } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'master-schedule', label: 'Master Schedule', icon: <Calendar size={18} />, path: '/dashboard/scheduling' },
  { id: 'sessions', label: 'Sessions', icon: <Clock size={18} />, path: '/dashboard/scheduling/sessions' },
  { id: 'assignments', label: 'Assignments', icon: <Link size={18} />, path: '/dashboard/scheduling/assignments' },
];

const SchedulingWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Scheduling"
    subtitle="Session scheduling and assignment management"
    tabs={tabs}
  />
);

export default SchedulingWorkspace;
