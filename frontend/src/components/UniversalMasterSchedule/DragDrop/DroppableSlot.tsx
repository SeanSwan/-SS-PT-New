import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import styled from 'styled-components';

const DROPPABLE_SLOT_THEME = {
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.72))',
  idleSurface: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent)',
  activeSurface: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
  disabledBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent)',
  disabledSurface: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent)',
  activeGlow: '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)',
};

interface DroppableSlotProps {
  id: string;
  date: Date;
  hour: number;
  minute?: number;
  trainerId?: string | number;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({
  id,
  date,
  hour,
  minute = 0,
  trainerId,
  children,
  onClick,
  disabled = false
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, hour, minute, trainerId },
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
    $isOver ? DROPPABLE_SLOT_THEME.primary : DROPPABLE_SLOT_THEME.secondary};
  background: ${({ $isOver }) =>
    $isOver ? DROPPABLE_SLOT_THEME.activeSurface : DROPPABLE_SLOT_THEME.idleSurface};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  transition: all 150ms ease-out;

  ${({ $disabled }) =>
    $disabled &&
    `
      opacity: 0.6;
      border-color: ${DROPPABLE_SLOT_THEME.disabledBorder};
      background: ${DROPPABLE_SLOT_THEME.disabledSurface};
    `}

  ${({ $isOver, $disabled }) =>
    $isOver && !$disabled &&
    `
      box-shadow: ${DROPPABLE_SLOT_THEME.activeGlow};
      transform: scale(1.02);
    `}
`;

const EmptySlot = styled.div<{ $isOver: boolean; $disabled: boolean }>`
  height: 100%;
  padding: 0.5rem;
  border-radius: 10px;
  border: 1px dashed ${DROPPABLE_SLOT_THEME.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $isOver, $disabled }) => {
    if ($disabled) {
      return DROPPABLE_SLOT_THEME.textSoft;
    }
    return $isOver ? DROPPABLE_SLOT_THEME.text : DROPPABLE_SLOT_THEME.primary;
  }};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;
