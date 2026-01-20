import React from 'react';
import styled from 'styled-components';
import CustomModal from '../../../../UniversalMasterSchedule/ui/CustomModal';
import { EnhancedAdminClient } from '../EnhancedAdminClientManagementView';

const Summary = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const NameRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Name = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const DetailCard = styled.div`
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 12px;
  padding: 0.9rem 1rem;
`;

const DetailLabel = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 0.35rem;
`;

const DetailValue = styled.div`
  color: #ffffff;
  font-weight: 600;
`;

interface ClientDetailsModalProps {
  open: boolean;
  onClose: () => void;
  client: EnhancedAdminClient;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ open, onClose, client }) => {
  const fullName = `${client.firstName} ${client.lastName}`;
  const roleLabel = client.role ? client.role.toUpperCase() : 'CLIENT';
  const statusLabel = client.isActive ? 'Active' : 'Inactive';

  return (
    <CustomModal
      isOpen={open}
      onClose={onClose}
      title="Client Details"
      size="large"
    >
      <Summary>
        <NameRow>
          <Name>{fullName}</Name>
          <Subtitle>{client.email}</Subtitle>
          <Subtitle>
            {roleLabel} • {statusLabel}
          </Subtitle>
        </NameRow>
      </Summary>

      <DetailsGrid>
        <DetailCard>
          <DetailLabel>Username</DetailLabel>
          <DetailValue>{client.username || 'Not set'}</DetailValue>
        </DetailCard>
        <DetailCard>
          <DetailLabel>Phone</DetailLabel>
          <DetailValue>{client.phone || 'Not provided'}</DetailValue>
        </DetailCard>
        <DetailCard>
          <DetailLabel>Trainer</DetailLabel>
          <DetailValue>{client.trainerName || 'Unassigned'}</DetailValue>
        </DetailCard>
        <DetailCard>
          <DetailLabel>Current Program</DetailLabel>
          <DetailValue>{client.currentProgram || 'None'}</DetailValue>
        </DetailCard>
        <DetailCard>
          <DetailLabel>Available Sessions</DetailLabel>
          <DetailValue>{client.availableSessions ?? 0}</DetailValue>
        </DetailCard>
        <DetailCard>
          <DetailLabel>Engagement Level</DetailLabel>
          <DetailValue>{client.engagementLevel || 'Unknown'}</DetailValue>
        </DetailCard>
      </DetailsGrid>
    </CustomModal>
  );
};

export default ClientDetailsModal;
