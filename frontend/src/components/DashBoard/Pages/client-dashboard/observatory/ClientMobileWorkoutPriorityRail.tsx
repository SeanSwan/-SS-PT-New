/**
 * FILE: ClientMobileWorkoutPriorityRail.tsx
 * PURPOSE: Mobile-only current-workout priority rail for client onboarding flow.
 */

import React, { useEffect, useState } from 'react';
import { MobilePriorityRail } from './ClientObservatoryShell.styles';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';

const MOBILE_PRIORITY_QUERY = '(max-width: 760px)';

interface ClientMobileWorkoutPriorityRailProps {
  currentWorkout?: CurrentClientWorkout | null;
  currentWorkoutError?: boolean;
  currentWorkoutLoading?: boolean;
  onNavigate: (path: string) => void;
}

const viewportMatchesMobilePriority = (): boolean => (
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(MOBILE_PRIORITY_QUERY).matches
);

function useMobilePriorityRail(): boolean {
  const [showMobilePriority, setShowMobilePriority] = useState(viewportMatchesMobilePriority);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(MOBILE_PRIORITY_QUERY);
    const sync = () => setShowMobilePriority(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return showMobilePriority;
}

const ClientMobileWorkoutPriorityRail: React.FC<ClientMobileWorkoutPriorityRailProps> = ({
  currentWorkout,
  currentWorkoutError,
  currentWorkoutLoading,
  onNavigate,
}) => {
  const showMobilePriority = useMobilePriorityRail();

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
