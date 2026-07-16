/**
 * FILE: ClientMobileWorkoutPriorityRail.tsx
 * PURPOSE: Mobile-only current-workout priority rail for client onboarding flow.
 */

import React from 'react';
import { MobilePriorityRail } from './ClientObservatoryShell.styles';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';

interface ClientMobileWorkoutPriorityRailProps {
  currentWorkout?: CurrentClientWorkout | null;
  currentWorkoutError?: boolean;
  currentWorkoutLoading?: boolean;
  showMobilePriority: boolean;
  onNavigate: (path: string) => void;
}





const ClientMobileWorkoutPriorityRail: React.FC<ClientMobileWorkoutPriorityRailProps> = ({
  currentWorkout,
  currentWorkoutError,
  currentWorkoutLoading,
  showMobilePriority,
  onNavigate,
}) => {
  if (!showMobilePriority) return null;

  return (
    <MobilePriorityRail aria-label="Today's training priority">
      <ClientCurrentWorkoutCard
        currentWorkout={currentWorkout}
        currentWorkoutError={currentWorkoutError}
        currentWorkoutLoading={currentWorkoutLoading}
        onNavigate={onNavigate}
      />
    </MobilePriorityRail>
  );
};

export default ClientMobileWorkoutPriorityRail;
