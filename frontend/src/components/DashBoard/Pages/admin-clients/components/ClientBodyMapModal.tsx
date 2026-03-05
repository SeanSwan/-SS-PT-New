/**
 * ClientBodyMapModal.tsx
 * ======================
 * Admin/trainer modal wrapper for the Pain & Injury Body Map.
 * Opens from the kebab menu on client cards for quick access.
 */
import React from 'react';
import { HeartPulse, X } from 'lucide-react';
import styled from 'styled-components';
import {
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
} from './copilot-shared-styles';
import BodyMap from '../../../../BodyMap';

const WidePanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
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
  return (
    <ModalOverlay onClick={onClose}>
      <WidePanel onClick={(e) => e.stopPropagation()}>
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
          <BodyMap userId={clientId} mode="trainer" />
        </ModalBody>
      </WidePanel>
    </ModalOverlay>
  );
};

export default ClientBodyMapModal;
