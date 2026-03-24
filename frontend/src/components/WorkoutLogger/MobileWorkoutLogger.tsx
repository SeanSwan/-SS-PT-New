/**
 * MobileWorkoutLogger.tsx — placeholder for mobile-optimized workout logger
 * Will be implemented when React Native migration begins.
 */
import React from 'react';
import styled from 'styled-components';
import { Dumbbell } from 'lucide-react';

interface MobileWorkoutLoggerProps {
  clientId: number;
  onComplete: (workoutData: unknown) => void;
  onCancel: () => void;
  isOffline?: boolean;
}

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted, #94a3b8);
  font-size: 0.9rem;
`;

const MobileWorkoutLogger: React.FC<MobileWorkoutLoggerProps> = ({ onCancel }) => (
  <Placeholder>
    <Dumbbell size={24} />
    <span>Mobile workout logger coming soon.</span>
    <button onClick={onCancel} style={{ padding: '8px 16px', minHeight: 44, cursor: 'pointer' }}>
      Go Back
    </button>
  </Placeholder>
);

export default MobileWorkoutLogger;
