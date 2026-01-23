import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import styled from 'styled-components';
import SessionCard, { SessionCardData } from '../Cards/SessionCard';
import type { Alternative, Conflict } from '../Conflicts/ConflictPanel';

export interface DragDropResult {
  sessionId: string | number;
  newDate: Date;
  newHour: number;
  trainerId?: string | number;
}

export interface ConflictCheckResult {
  conflicts: Conflict[];
  alternatives: Alternative[];
}

interface DragDropManagerProps {
  children: React.ReactNode;
  onDragEnd: (result: DragDropResult) => void;
  checkConflicts: (
    sessionId: string | number,
    newDate: Date,
    newHour: number,
    trainerId?: string | number
  ) => Promise<ConflictCheckResult>;
  onConflict?: (payload: {
    session: SessionCardData;
    conflicts: Conflict[];
    alternatives: Alternative[];
    drop: DragDropResult;
  }) => void;
}

const DragDropManager: React.FC<DragDropManagerProps> = ({
  children,
  onDragEnd,
  checkConflicts,
  onConflict
}) => {
  const [activeSession, setActiveSession] = useState<SessionCardData | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isValidDrop, setIsValidDrop] = useState(true);
  const [lastCheckKey, setLastCheckKey] = useState<string | null>(null);
  const [lastDrop, setLastDrop] = useState<DragDropResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const resetState = () => {
    setActiveSession(null);
    setConflicts([]);
    setAlternatives([]);
    setIsValidDrop(true);
    setLastCheckKey(null);
    setLastDrop(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const session = event.active.data.current?.session as SessionCardData | undefined;
    if (session) {
      setActiveSession(session);
      setConflicts([]);
      setAlternatives([]);
    }
  };

  const handleDragOver = async (event: DragOverEvent) => {
    if (!event.over || !activeSession) {
      return;
    }

    const dropData = event.over.data.current;
    if (!dropData?.date || typeof dropData.hour !== 'number') {
      return;
    }

    const drop = {
      sessionId: activeSession.id,
      newDate: dropData.date as Date,
      newHour: dropData.hour as number,
      trainerId: dropData.trainerId as string | number | undefined
    };

    const nextKey = `${drop.sessionId}-${drop.newDate.toISOString()}-${drop.newHour}-${drop.trainerId ?? 'none'}`;
    if (nextKey === lastCheckKey) {
      return;
    }

    setLastCheckKey(nextKey);
    setLastDrop(drop);

    const result = await checkConflicts(drop.sessionId, drop.newDate, drop.newHour, drop.trainerId);
    const hardConflicts = result.conflicts.filter((conflict) => conflict.type === 'hard');

    setConflicts(result.conflicts);
    setAlternatives(result.alternatives);
    setIsValidDrop(hardConflicts.length === 0);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || !activeSession) {
      resetState();
      return;
    }

    if (!lastDrop) {
      resetState();
      return;
    }

    if (isValidDrop) {
      onDragEnd(lastDrop);
      resetState();
      return;
    }

    if (conflicts.length > 0 && onConflict) {
      onConflict({
        session: activeSession,
        conflicts,
        alternatives,
        drop: lastDrop
      });
    }

    resetState();
  };

  const overlay = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    return (
      <GhostCard $isValid={isValidDrop}>
        <SessionCard session={activeSession} />
      </GhostCard>
    );
  }, [activeSession, isValidDrop]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>{overlay}</DragOverlay>
    </DndContext>
  );
};

export default DragDropManager;

const GhostCard = styled.div<{ $isValid: boolean }>`
  opacity: 0.85;
  transform: scale(1.05) rotate(2deg);
  box-shadow: ${({ $isValid }) =>
    $isValid
      ? '0 0 30px rgba(0, 255, 255, 0.5)'
      : '0 0 30px rgba(255, 71, 87, 0.5)'};
  border-radius: 12px;
  transition: box-shadow 150ms ease-out;
`;
