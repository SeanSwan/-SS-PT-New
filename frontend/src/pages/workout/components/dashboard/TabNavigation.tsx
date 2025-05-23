/**
 * TabNavigation Component
 * ======================
 * Navigation tabs for the workout dashboard
 */

import React, { memo } from 'react';
import styled from 'styled-components';

// Styled Components
const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #eaeaea;
  margin-bottom: 24px;
  overflow-x: auto;
  
  @media (max-width: 576px) {
    padding-bottom: 4px;
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 20px;
  font-size: 1rem;
  background-color: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.active ? '#4a90e2' : 'transparent'};
  color: ${props => props.active ? '#4a90e2' : '#666'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
  
  &:hover {
    color: #4a90e2;
    background-color: rgba(74, 144, 226, 0.05);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
  }
  
  @media (max-width: 576px) {
    padding: 8px 12px;
    font-size: 0.9rem;
  }
`;

// Props interface
interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs?: Array<{
    id: string;
    label: string;
    disabled?: boolean;
  }>;
}

/**
 * TabNavigation Component
 */
const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  tabs = [
    { id: 'progress', label: 'Progress' },
    { id: 'planner', label: 'Workout Planner' },
    { id: 'sessions', label: 'Recent Sessions' }
  ]
}) => {
  return (
    <TabContainer>
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          active={activeTab === tab.id}
          onClick={() => !tab.disabled && setActiveTab(tab.id)}
          disabled={tab.disabled}
        >
          {tab.label}
        </Tab>
      ))}
    </TabContainer>
  );
};

// Export memoized component for better performance
export default memo(TabNavigation);
