/**
 * Empty state for the active UserDashboard V3 workout panel.
 */

import React from 'react';
import { Dumbbell, MessageCircle } from 'lucide-react';
import { CoachButton, EmptyActionRow, LogButton } from './WorkoutsTabStyles';
import {
  EmptyIconShell,
  EmptyState,
  EmptyText,
  EmptyTitle,
} from './WorkoutsTabStates.styles';

interface WorkoutsTabEmptyStateProps {
  onAskCoach: () => void;
  onLogWorkout: () => void;
}

const WorkoutsTabEmptyState: React.FC<WorkoutsTabEmptyStateProps> = ({ onAskCoach, onLogWorkout }) => (
  <EmptyState>
    <EmptyIconShell>
      <Dumbbell size={48} />
    </EmptyIconShell>
    <EmptyTitle>No workouts logged yet</EmptyTitle>
    <EmptyText>
      Example charts will stay hidden until real workout logs exist. Log your
      first session to start filling exercise usage, streaks, and progress data.
    </EmptyText>
    <EmptyActionRow>
      <LogButton type="button" onClick={onLogWorkout}>
        <Dumbbell size={16} />
        Log Your First Workout
      </LogButton>
      <CoachButton type="button" onClick={onAskCoach}>
        <MessageCircle size={16} />
        Ask Coach What To Log
      </CoachButton>
    </EmptyActionRow>
  </EmptyState>
);

export default WorkoutsTabEmptyState;
