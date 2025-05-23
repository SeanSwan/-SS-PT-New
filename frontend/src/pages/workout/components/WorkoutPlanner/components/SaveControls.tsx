/**
 * SaveControls Component
 * =====================
 * Displays save and cancel buttons for the workout planner
 */

import React from 'react';
import { ButtonGroup, SaveButton, CancelButton, ErrorText } from '../../../styles/WorkoutPlanner.styles';

interface SaveControlsProps {
  state: {
    handleSave: () => void;
    handleCancel: () => void;
    savingPlan: boolean;
    error: string;
  };
}

/**
 * SaveControls Component
 * 
 * Displays the save and cancel buttons with proper loading states
 */
const SaveControls: React.FC<SaveControlsProps> = ({ state }) => {
  const {
    handleSave,
    handleCancel,
    savingPlan,
    error
  } = state;
  
  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      <ButtonGroup>
        <SaveButton 
          onClick={handleSave}
          disabled={savingPlan}
        >
          {savingPlan ? 'Saving...' : 'Save Plan'}
        </SaveButton>
        <CancelButton 
          onClick={handleCancel}
          disabled={savingPlan}
        >
          Cancel
        </CancelButton>
      </ButtonGroup>
    </>
  );
};

export default SaveControls;
