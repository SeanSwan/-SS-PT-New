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
      Example charts will stay hidden until real workout logs exist. Log your
      first session to start filling exercise usage, streaks, and progress data.
    </EmptyText>
    <LogButton type="button" onClick={onLogWorkout}>
      <Dumbbell size={16} />
      Log Your First Workout
    </LogButton>
  </EmptyState>
);

export default WorkoutsTabEmptyState;
