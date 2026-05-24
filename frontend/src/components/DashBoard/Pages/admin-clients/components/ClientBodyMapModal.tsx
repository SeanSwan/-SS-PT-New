/**
 * ClientBodyMapModal.tsx
 * ======================
 * Admin/trainer modal wrapper for the Pain & Injury Body Map.
 * Opens from the kebab menu on client cards for quick access.
 */
import React, { Suspense } from 'react';
import { HeartPulse, X } from 'lucide-react';
import styled from 'styled-components';
import {
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
} from './copilot-shared-styles';

const BodyMap = React.lazy(() => import('../../../../BodyMap'));

const WidePanel = styled.div`
  background: var(--bg-elevated, rgba(10, 10, 15, 0.98));
  border-radius: 12px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #141419);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
  }
`;

interface ClientBodyMapModalProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
}

const ClientBodyMapModal: React.FC<ClientBodyMapModalProps> = ({
  clientId,
  clientName,
  onClose,
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

  return (
    <ModalOverlay
      aria-label={`Body map for ${clientName}`}
      aria-modal="true"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="dialog"
      tabIndex={-1}
    >
      <WidePanel>
        <ModalHeader>
          <ModalTitle>
            <HeartPulse size={20} />
            Body Map — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          <Suspense fallback={<div style={{ color: 'var(--text-secondary, rgba(224, 236, 244, 0.65))' }}>Loading body map...</div>}>
            <BodyMap userId={clientId} mode="trainer" />
          </Suspense>
        </ModalBody>
      </WidePanel>
    </ModalOverlay>
  );
};

export default ClientBodyMapModal;
