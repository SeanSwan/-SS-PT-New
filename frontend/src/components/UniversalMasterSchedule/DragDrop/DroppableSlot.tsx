import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

interface DroppableSlotProps {
  id: string;
  date: Date;
  hour: number;
  trainerId?: string | number;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({
  id,
  date,
  hour,
  trainerId,
  children,
  onClick,
  disabled = false
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, hour, trainerId },
    disabled
  });

  return (
    <SlotContainer ref={setNodeRef} $isOver={isOver} $disabled={disabled} onClick={onClick}>
      {children || (
        <EmptySlot $isOver={isOver} $disabled={disabled}>
          <span>Available</span>
        </EmptySlot>
      )}
    </SlotContainer>
  );
};

export default DroppableSlot;

const SlotContainer = styled.div<{ $isOver: boolean; $disabled: boolean }>`
  min-height: 80px;
  border-radius: 12px;
  border: 1px dashed ${({ $isOver }) =>
    $isOver ? '#00e5e5' : galaxySwanTheme.primary.main};
  background: ${({ $isOver }) =>
    $isOver ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 255, 255, 0.05)'};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  transition: all 150ms ease-out;

  ${({ $disabled }) =>
    $disabled &&
    `
      opacity: 0.6;
      border-color: rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.02);
    `}

  ${({ $isOver, $disabled }) =>
    $isOver && !$disabled &&
    `
      box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
      transform: scale(1.02);
    `}
`;

const EmptySlot = styled.div<{ $isOver: boolean; $disabled: boolean }>`
  height: 100%;
  padding: 0.5rem;
  border-radius: 10px;
  border: 1px dashed ${galaxySwanTheme.primary.main};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $isOver, $disabled }) => {
    if ($disabled) {
      return galaxySwanTheme.text.secondary;
    }
    return $isOver ? galaxySwanTheme.primary.main : galaxySwanTheme.primary.main;
  }};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;
