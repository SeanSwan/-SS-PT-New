import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';
import SessionCard, { SessionCardData } from '../Cards/SessionCard';

interface DraggableSessionProps {
  session: SessionCardData;
  onClick?: () => void;
  disabled?: boolean;
}

const DraggableSession: React.FC<DraggableSessionProps> = ({ session, onClick, disabled }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `session-${session.id}`,
    data: { session },
    disabled
  });

  return (
    <DraggableWrapper
      ref={setNodeRef}
      $isDragging={isDragging}
      $disabled={Boolean(disabled)}
      {...(!disabled ? listeners : undefined)}
      {...(!disabled ? attributes : undefined)}
    >
      <SessionCard session={session} onClick={onClick ? () => onClick() : undefined} />
    </DraggableWrapper>
  );
};

export default DraggableSession;

const DraggableWrapper = styled.div<{ $isDragging: boolean; $disabled: boolean }>`
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grab')};

  &:active {
    cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grabbing')};
  }
`;
