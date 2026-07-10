/**
 * COMPONENT: CoachNotebookMenuItems
 * PURPOSE: Live command-menu controls for client note capture and workout-draft staging.
 */
import React from 'react';
import { ClipboardList, MessageSquareText } from 'lucide-react';
import type { CoachNotebookControls } from './hooks/useCoachClientNotebook';

type CoachNotebookMenuItemsProps = {
  controls: CoachNotebookControls;
  onSelect: (action: () => void) => void;
};

const CoachNotebookMenuItems: React.FC<CoachNotebookMenuItemsProps> = ({
  controls,
  onSelect,
}) => (
  <>
    <button
      type="button"
      role="menuitem"
      disabled={!controls.clientPinned || controls.saving}
      onClick={() => onSelect(controls.onToggle)}
    >
      <MessageSquareText size={17} aria-hidden="true" />
      <span>{controls.active ? 'Return to Coach chat' : 'Capture client notes'}</span>
    </button>
    <button
      type="button"
      role="menuitem"
      disabled={!controls.clientPinned || controls.saving}
      onClick={() => onSelect(controls.onDraftWorkouts)}
    >
      <ClipboardList size={17} aria-hidden="true" />
      <span>Draft workouts from saved notes</span>
    </button>
  </>
);

export default CoachNotebookMenuItems;
