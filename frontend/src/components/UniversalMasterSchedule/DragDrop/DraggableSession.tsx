import React, { useCallback, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';
import SessionCard, { SessionCardData } from '../Cards/SessionCard';

interface DraggableSessionProps {
  session: SessionCardData;
  /**
   * Stable handler that receives the session - pass useCallback-wrapped function
   * to prevent unnecessary SessionCard re-renders
   */
  onSelectSession?: (session: SessionCardData) => void;
  disabled?: boolean;
}

const DraggableSessionComponent: React.FC<DraggableSessionProps> = ({ session, onSelectSession, disabled }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `session-${session.id}`,
    data: { session },
    disabled
  });

  // Create stable onClick handler that passes session to parent
  const handleClick = useCallback(() => {
    onSelectSession?.(session);
  }, [onSelectSession, session]);

  return (
    <DraggableWrapper
      ref={setNodeRef}
      $isDragging={isDragging}
      $disabled={Boolean(disabled)}
      {...(!disabled ? listeners : undefined)}
      {...(!disabled ? attributes : undefined)}
    >
      <SessionCard session={session} onClick={onSelectSession ? handleClick : undefined} />
    </DraggableWrapper>
  );
};

// Memoize to prevent re-renders when parent state changes
// Comparator covers ALL rendered fields to prevent stale data bugs
// NOTE: Must stay aligned with SessionCard's comparator
const DraggableSession = memo(DraggableSessionComponent, (prevProps, nextProps) => {
  const prevS = prevProps.session;
  const nextS = nextProps.session;
  return (
    // Core identity
    prevS.id === nextS.id &&
    prevS.status === nextS.status &&
    prevS.sessionDate === nextS.sessionDate &&
    prevS.isBlocked === nextS.isBlocked &&
    // Rendered text fields
    prevS.clientName === nextS.clientName &&
    prevS.trainerName === nextS.trainerName &&
    prevS.duration === nextS.duration &&
    prevS.location === nextS.location &&
    // Package info
    prevS.packageInfo?.name === nextS.packageInfo?.name &&
    prevS.packageInfo?.sessionsRemaining === nextS.packageInfo?.sessionsRemaining &&
    prevS.packageInfo?.sessionsTotal === nextS.packageInfo?.sessionsTotal &&
    // Indicator fields (must match SessionCard comparator)
    prevS.reminderSent === nextS.reminderSent &&
    prevS.reminderSentDate === nextS.reminderSentDate &&
    prevS.feedbackProvided === nextS.feedbackProvided &&
    prevS.rating === nextS.rating &&
    // Props
    prevProps.disabled === nextProps.disabled &&
    prevProps.onSelectSession === nextProps.onSelectSession
  );
});

export default DraggableSession;

const DraggableWrapper = styled.div<{ $isDragging: boolean; $disabled: boolean }>`
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grab')};

  &:active {
    cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grabbing')};
  }
`;
