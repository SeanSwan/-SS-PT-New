import React from 'react';
import { Dumbbell, ClipboardList, Activity, Brain } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'plans', label: 'Workout Plans', icon: <Dumbbell size={18} />, path: '/dashboard/workouts' },
  { id: 'logger', label: 'Workout Logger', icon: <ClipboardList size={18} />, path: '/dashboard/workouts/logger' },
  { id: 'movement', label: 'Movement Screen', icon: <Activity size={18} />, path: '/dashboard/workouts/movement' },
  { id: 'ai-protocols', label: 'AI Protocols', icon: <Brain size={18} />, path: '/dashboard/workouts/ai' },
];

const WorkoutsWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Workouts"
    subtitle="Workout plans, logging, movement analysis, and AI protocols"
    tabs={tabs}
  />
);

export default WorkoutsWorkspace;
