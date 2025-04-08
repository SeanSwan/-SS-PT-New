// File: frontend/src/components/Reports/ClientInformationPanel.tsx

import React from 'react';
import styled from 'styled-components';
import { ClientData } from '../../types/reports';

// Styled Components with defense theme
const Panel = styled.div`
  margin-bottom: 2rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  background-color: #1e1e1e;
  color: #e0e0e0;
  position: relative;
`;

const PanelHeader = styled.div`
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #191919;
  border-bottom: 2px solid #333;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e5c76b;
`;

interface CardSectionProps {
  position?: string;
}

const CardSection = styled.div<CardSectionProps>`
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 100 + Math.random() * 50}%;
  background-position: ${(props) => props.position || 'center'};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 0;
  }
  
  > * {
    position: relative;
    z-index: 1;
  }
`;

const PanelContent = styled(CardSection)`
  padding: 1.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  margin-bottom: 0.5rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: #9e9e9e;
  margin-bottom: 0.25rem;
`;

const InfoValue = styled.div`
  font-weight: 600;
  color: #e0e0e0;
`;

const StatusContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ type: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  
  background-color: ${props => {
    switch (props.type) {
      case 'active': return 'rgba(25, 135, 84, 0.2)';
      case 'inactive': return 'rgba(220, 53, 69, 0.2)';
      case 'vip': return 'rgba(111, 66, 193, 0.2)';
      case 'new': return 'rgba(13, 110, 253, 0.2)';
      case 'primary': return 'rgba(13, 110, 253, 0.2)';
      default: return 'rgba(108, 117, 125, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.type) {
      case 'active': return '#2ecc71';
      case 'inactive': return '#e74c3c';
      case 'vip': return '#9c59b6';
      case 'new': return '#3498db';
      case 'primary': return '#3498db';
      default: return '#95a5a6';
    }
  }};
`;

const ContactsSection = styled(CardSection)`
  padding: 1.5rem;
  margin-top: 1rem;
  border-top: 1px solid #333;
`;

const ContactsTitle = styled.h4`
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: #e5c76b;
`;

const ContactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContactCard = styled(CardSection)`
  border-radius: 6px;
  border: 1px solid #444;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #e5c76b;
  }
`;

const ContactHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ContactName = styled.div`
  font-weight: 600;
  color: #e0e0e0;
`;

const ContactDetail = styled.div`
  font-size: 0.875rem;
  color: #9e9e9e;
`;

interface ClientInformationPanelProps {
  client: ClientData | null;
}

/**
 * Enhanced ClientInformationPanel Component
 * Displays detailed information about a selected client in a secure-themed card layout.
 * Uses marble texture backgrounds and defense theme styling.
 * 
 * @param {ClientInformationPanelProps} props - Component properties
 * @returns {JSX.Element | null} - Rendered component or null if no client selected
 */
const ClientInformationPanel: React.FC<ClientInformationPanelProps> = ({ client }) => {
  if (!client) return null;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Client Information</PanelTitle>
      </PanelHeader>

      <PanelContent position="top left">
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Client Name</InfoLabel>
            <InfoValue>{client.name}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Location</InfoLabel>
            <InfoValue>{client.location || 'Not specified'}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Contact Email</InfoLabel>
            <InfoValue>{client.contactEmail || 'Not provided'}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Camera Type</InfoLabel>
            <InfoValue>{client.cameraType || 'Standard'}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Total Cameras</InfoLabel>
            <InfoValue>{client.cameras || 0}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Status</InfoLabel>
            <StatusContainer>
              {client.isActive ? (
                <StatusBadge type="active">Active</StatusBadge>
              ) : (
                <StatusBadge type="inactive">Inactive</StatusBadge>
              )}
              
              {client.isVIP && <StatusBadge type="vip">VIP</StatusBadge>}
              {client.isNew && <StatusBadge type="new">New</StatusBadge>}
            </StatusContainer>
          </InfoItem>
          
          {client.cameraDetails && (
            <InfoItem style={{ gridColumn: '1 / span 2' }}>
              <InfoLabel>Camera Details</InfoLabel>
              <InfoValue>{client.cameraDetails}</InfoValue>
            </InfoItem>
          )}
          
          <InfoItem>
            <InfoLabel>Address</InfoLabel>
            <InfoValue>
              {[client.location, client.city, client.state, client.zipCode]
                .filter(Boolean)
                .join(', ')}
            </InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>Last Report</InfoLabel>
            <InfoValue>
              {client.lastReportDate 
                ? new Date(client.lastReportDate).toLocaleDateString()
                : 'No reports'
              }
            </InfoValue>
          </InfoItem>
        </InfoGrid>
      </PanelContent>

      {client.contacts && client.contacts.length > 0 && (
        <ContactsSection position="bottom right">
          <ContactsTitle>Contact Persons</ContactsTitle>
          
          <ContactsGrid>
            {client.contacts.map((contact, index) => (
              <ContactCard key={index} position={`${20 + index * 10}% ${30 + index * 5}%`}>
                <ContactHeader>
                  <ContactName>{contact.name}</ContactName>
                  
                  {contact.isPrimary && (
                    <StatusBadge type="primary">Primary</StatusBadge>
                  )}
                </ContactHeader>
                
                <ContactDetail>{contact.email}</ContactDetail>
                <ContactDetail>{contact.phone}</ContactDetail>
              </ContactCard>
            ))}
          </ContactsGrid>
        </ContactsSection>
      )}
    </Panel>
  );
};

export default ClientInformationPanel;