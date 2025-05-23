/**
 * ClientSelector Component
 * =======================
 * Dropdown for trainers and admins to select which client's data to view
 */

import React, { memo } from 'react';
import styled from 'styled-components';

// Styled Components
const SelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SelectorLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 500;
  color: #666;
  min-width: 120px;
  
  @media (max-width: 576px) {
    margin-bottom: 4px;
  }
`;

const StyledSelect = styled.select`
  flex: 1;
  max-width: 400px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: white;
  transition: border-color 0.2s ease-in-out;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
  
  @media (max-width: 576px) {
    width: 100%;
    max-width: 100%;
  }
`;

// Props interface
interface ClientSelectorProps {
  clients: any[];
  selectedClientId: string;
  currentUser: any;
  onClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * ClientSelector Component
 */
const ClientSelector: React.FC<ClientSelectorProps> = ({
  clients,
  selectedClientId,
  currentUser,
  onClientChange
}) => {
  // Group clients into categories
  const myClients = clients.filter(client => 
    client.id !== currentUser.id && client.role === 'client'
  );
  
  const otherTrainers = clients.filter(client => 
    client.id !== currentUser.id && (client.role === 'trainer' || client.role === 'admin')
  );
  
  return (
    <SelectorContainer>
      <SelectorLabel htmlFor="clientSelect">Viewing data for:</SelectorLabel>
      <StyledSelect 
        id="clientSelect"
        value={selectedClientId}
        onChange={onClientChange}
      >
        <option value={currentUser.id}>
          {currentUser.firstName} {currentUser.lastName} (You)
        </option>
        
        {myClients.length > 0 && (
          <optgroup label="Your Clients">
            {myClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </optgroup>
        )}
        
        {otherTrainers.length > 0 && (
          <optgroup label="Other Trainers">
            {otherTrainers.map(trainer => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.firstName} {trainer.lastName} ({trainer.role})
              </option>
            ))}
          </optgroup>
        )}
      </StyledSelect>
    </SelectorContainer>
  );
};

// Export memoized component for better performance
export default memo(ClientSelector);
