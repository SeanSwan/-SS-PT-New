/**
 * PlanHeader Component
 * ===================
 * Handles tab navigation and displays the section header
 */

import React from 'react';
import { TabContainer, Tab, PlannerHeader } from '../../../styles/WorkoutPlanner.styles';

type TabType = 'create' | 'manage' | 'edit';

interface PlanHeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

/**
 * PlanHeader Component
 * 
 * Displays the tab navigation and section header
 */
const PlanHeader: React.FC<PlanHeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <>
      <TabContainer>
        <Tab 
          active={activeTab === 'create'} 
          onClick={() => setActiveTab('create')}
        >
          Create New Plan
        </Tab>
        <Tab 
          active={activeTab === 'manage'} 
          onClick={() => setActiveTab('manage')}
        >
          Manage Plans
        </Tab>
        {activeTab === 'edit' && (
          <Tab active={true}>
            Edit Plan
          </Tab>
        )}
      </TabContainer>
      
      {(activeTab === 'create' || activeTab === 'edit') && (
        <PlannerHeader>
          {activeTab === 'create' ? 'Create Workout Plan' : 'Edit Workout Plan'}
        </PlannerHeader>
      )}
    </>
  );
};

export default PlanHeader;
