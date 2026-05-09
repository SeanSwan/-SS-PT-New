/**
 * Empty state for the active UserDashboard V3 workout panel.
 */

import React from 'react';
import { Dumbbell } from 'lucide-react';
import { LogButton } from './WorkoutsTabStyles';
import {
  EmptyIconShell,
  EmptyState,
  EmptyText,
  EmptyTitle,
} from './WorkoutsTabStates.styles';

interface WorkoutsTabEmptyStateProps {
  onLogWorkout: () => void;
}

const WorkoutsTabEmptyState: React.FC<WorkoutsTabEmptyStateProps> = ({ onLogWorkout }) => (
  <EmptyState>
    <EmptyIconShell>
      <Dumbbell size={48} />
    </EmptyIconShell>
    <EmptyTitle>No workouts logged yet</EmptyTitle>
    <EmptyText>
      Start logging workouts to see your exercise breakdown by body part.
      Your most-used exercises will appear here as charts.
    </EmptyText>
    <LogButton type="button" onClick={onLogWorkout}>
      <Dumbbell size={16} />
      Log Your First Workout
    </LogButton>
  </EmptyState>
);

export default WorkoutsTabEmptyState;
