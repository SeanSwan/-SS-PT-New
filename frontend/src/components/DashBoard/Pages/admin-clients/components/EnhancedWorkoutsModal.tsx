/**
 * ┌─── SUB-COMPONENT: EnhancedWorkoutsModal ───────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Modal shell around the shared WorkoutHistoryPanel  │
 * │ OWNER: Claude Opus 4.6 | LAST MODIFIED: 2026-04-15 (Phase 13)│
 * │                                                              │
 * │ Phase 13 (2026-04-15): the content — SummaryBar, tabs,       │
 * │ session/PR cards, ShareToFeedModal — moved into the shared   │
 * │ WorkoutHistoryPanel so Clients & Team's "Workout History"    │
 * │ tab can mount the same architecture without duplication.    │
 * │ This file is now a thin dialog shell.                        │
 * │                                                              │
 * │ ARCHITECTURAL NOTE: WidePanel uses backdrop-filter which     │
 * │ creates a CSS containing block. The panel's own               │
 * │ ShareToFeedModal is rendered as a sibling, not a child, for  │
 * │ the same reason.                                              │
 * │                                                              │
 * │ Props: { open, clientId, clientName, onClose }               │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import { X, Dumbbell } from 'lucide-react';
import {
  ModalOverlay, ModalHeader, ModalTitle, CloseButton,
} from './copilot-shared-styles';
import WorkoutHistoryPanel from './WorkoutHistoryPanel';

const WidePanel = styled.div`
  background: var(--bg-elevated, #0A0A0F);
  border-radius: 12px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 48, 128, 0.4);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #0A0A0F);
  }
`;

interface Props {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
  readOnly?: boolean;
}

const EnhancedWorkoutsModal: React.FC<Props> = ({
  open,
  clientId,
  clientName,
  onClose,
  readOnly = false,
}) => {
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay
      aria-label={`Workout history for ${clientName}`}
      aria-modal="true"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="dialog"
      tabIndex={-1}
    >
      <WidePanel>
        <ModalHeader>
          <ModalTitle>
            <Dumbbell size={20} />
            Workouts — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <WorkoutHistoryPanel
          clientId={clientId}
          clientName={clientName}
          variant="modal"
          active={open}
          readOnly={readOnly}
        />
      </WidePanel>
    </ModalOverlay>
  );
};

export default EnhancedWorkoutsModal;
