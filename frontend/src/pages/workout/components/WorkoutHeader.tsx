import React from 'react';
import styled from 'styled-components';

interface WorkoutHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  clientList: any[];
  selectedClient: string | null;
  onClientChange: (clientId: string) => void;
  userRole: string;
}

const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  activeTab,
  onTabChange,
  clientList,
  selectedClient,
  onClientChange,
  userRole
}) => {
  return (
    <HeaderContainer>
      <HeaderTop>
        <HeaderTitle>Workout Tracking</HeaderTitle>
        
        {/* Client selector for trainers/admins */}
        {(userRole === 'trainer' || userRole === 'admin') && (
          <ClientSelector>
            <label htmlFor="client-select">Client:</label>
            <select 
              id="client-select"
              value={selectedClient || ''}
              onChange={(e) => onClientChange(e.target.value)}
            >
              <option value="">Select a client</option>
              {clientList.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
          </ClientSelector>
        )}
      </HeaderTop>
      
      <TabsContainer>
        <TabButton 
          active={activeTab === 'planner'} 
          onClick={() => onTabChange('planner')}
        >
          Workout Planner
        </TabButton>
        <TabButton 
          active={activeTab === 'exercises'} 
          onClick={() => onTabChange('exercises')}
        >
          Exercise Library
        </TabButton>
        <TabButton 
          active={activeTab === 'progress'} 
          onClick={() => onTabChange('progress')}
        >
          Client Progress
        </TabButton>
        <TabButton 
          active={activeTab === 'sessions'} 
          onClick={() => onTabChange('sessions')}
        >
          Recent Sessions
        </TabButton>
      </TabsContainer>
    </HeaderContainer>
  );
};

// Styled components
const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const ClientSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  label {
    font-weight: 500;
  }
  
  select {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background-color: white;
    min-width: 200px;
    font-family: inherit;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #dee2e6;
`;

interface TabButtonProps {
  active: boolean;
}

const TabButton = styled.button<TabButtonProps>`
  padding: 12px 20px;
  background-color: ${props => props.active ? 'white' : '#f8f9fa'};
  color: ${props => props.active ? '#007bff' : '#333'};
  border: none;
  border-bottom: ${props => props.active ? '2px solid #007bff' : 'none'};
  cursor: pointer;
  font-weight: ${props => props.active ? '600' : '400'};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.active ? 'white' : '#e9ecef'};
  }
  
  &:focus {
    outline: none;
  }
`;

export default WorkoutHeader;