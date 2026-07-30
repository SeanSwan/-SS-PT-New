/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ PlanContextSheet — the plan chip's popover (zone 1).        │
 * │ Reuses the PROVEN pieces, new home: ActivePlanContextStrip  │
 * │ (assignment view) + OPTPhaseIndicator (relocated from the   │
 * │ deleted WorkoutLoggerHeader). The unified "Session source"  │
 * │ control joins here in the Setup-stage slice (§4.5) — this   │
 * │ sheet is context now, control later.                        │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import Sheet from '../primitives/Sheet';
import ActivePlanContextStrip from '../../../ActivePlanContextStrip';
import OPTPhaseIndicator from '../../../OPTPhaseIndicator';
import type { PlannedAssignment } from '../../../WorkoutLogger.localTypes';

const SheetBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--text-primary, #e0ecf4);
`;

const SheetTitle = styled.h2`
  margin: 0;
  font: 700 1rem 'Plus Jakarta Sans', sans-serif;
`;

const EmptyPlanNote = styled.p`
  margin: 0;
  font: 400 0.85rem 'Sora', sans-serif;
  color: var(--text-muted, #94a3b8);
`;

export interface PlanContextSheetProps {
  open: boolean;
  onClose: () => void;
  assignment: PlannedAssignment | null;
  currentOPTPhase: number;
  onOPTPhaseChange: (phase: number) => void;
  clientName: string;
}

const PlanContextSheet: React.FC<PlanContextSheetProps> = ({
  open, onClose, assignment, currentOPTPhase, onOPTPhaseChange, clientName,
}) => (
  <Sheet open={open} onClose={onClose} label='Session plan' historyKey='plan-sheet'>
    <SheetBody>
      <SheetTitle>Session plan</SheetTitle>
      {assignment ? (
        <ActivePlanContextStrip assignment={assignment} />
      ) : (
        <EmptyPlanNote>
          No plan loaded yet — use Load Today&apos;s Plan or Search &amp; Add from the session.
        </EmptyPlanNote>
      )}
      <OPTPhaseIndicator
        currentPhase={currentOPTPhase}
        onPhaseChange={onOPTPhaseChange}
        clientName={clientName}
      />
    </SheetBody>
  </Sheet>
);

export default PlanContextSheet;
