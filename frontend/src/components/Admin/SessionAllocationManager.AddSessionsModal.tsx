import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Client } from './SessionAllocationManager.types';
import {
  MANUAL_SESSION_ALLOCATION_MAX,
  MANUAL_SESSION_ALLOCATION_MIN,
  normalizeManualSessionCount,
} from './SessionAllocationManager.logic';
import { Button } from './SessionAllocationManager.layoutStyles';
import { Modal, ModalContent } from './SessionAllocationManager.modalStyles';

interface AddSessionsModalProps {
  client: Client | null;
  open: boolean;
  sessionCount: number;
  reason: string;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onSessionCountChange: (value: number) => void;
  onSubmit: () => void;
}

export const SessionAllocationAddSessionsModal: React.FC<AddSessionsModalProps> = ({
  client,
  open,
  sessionCount,
  reason,
  onClose,
  onReasonChange,
  onSessionCountChange,
  onSubmit,
}) => (
  <AnimatePresence>
    {open && client && (
      <Modal
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onPointerDown={onClose}
      >
        <ModalContent
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <h3>
            <Plus size={20} />
            Add Sessions to {client.firstName} {client.lastName}
          </h3>

          <div className="form-group">
            <label htmlFor="session-allocation-count">Number of Sessions</label>
            <input
              id="session-allocation-count"
              type="number"
              min={MANUAL_SESSION_ALLOCATION_MIN}
              max={MANUAL_SESSION_ALLOCATION_MAX}
              value={sessionCount}
              onChange={(event) => onSessionCountChange(normalizeManualSessionCount(event.target.value))}
              placeholder="Enter number of sessions"
            />
          </div>

          <div className="form-group">
            <label htmlFor="session-allocation-reason">Reason (Optional)</label>
            <textarea
              id="session-allocation-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Reason for adding sessions (e.g., Promotional bonus, Refund, etc.)"
            />
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="success" onClick={onSubmit}>
              <Plus size={16} />
              Add {sessionCount} Session{sessionCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    )}
  </AnimatePresence>
);
