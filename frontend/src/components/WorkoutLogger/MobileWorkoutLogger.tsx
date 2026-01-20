import React from 'react';

interface MobileWorkoutLoggerProps {
  clientId: number;
  onComplete: (workoutData: unknown) => void;
  onCancel: () => void;
  isOffline?: boolean;
}

const MobileWorkoutLogger: React.FC<MobileWorkoutLoggerProps> = () => null;

export default MobileWorkoutLogger;
