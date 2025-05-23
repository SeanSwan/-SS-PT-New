/**
 * PlanForm Component
 * =================
 * Handles the plan details input form
 */

import React from 'react';
import { FormGroup, InputLabel, TextInput, Select, TextArea } from '../../../styles/WorkoutPlanner.styles';

interface PlanFormProps {
  state: {
    planTitle: string;
    planDescription: string;
    planDuration: string;
    setPlanTitle: (title: string) => void;
    setPlanDescription: (description: string) => void;
    setPlanDuration: (duration: string) => void;
    savingPlan: boolean;
  };
}

/**
 * PlanForm Component
 * 
 * Displays and manages the plan details form fields
 */
const PlanForm: React.FC<PlanFormProps> = ({ state }) => {
  const {
    planTitle,
    planDescription,
    planDuration,
    setPlanTitle,
    setPlanDescription,
    setPlanDuration,
    savingPlan
  } = state;
  
  return (
    <>
      <FormGroup>
        <InputLabel htmlFor="planTitle">Plan Title</InputLabel>
        <TextInput
          id="planTitle"
          value={planTitle}
          onChange={(e) => setPlanTitle(e.target.value)}
          placeholder="e.g., 4-Week Strength Builder"
          disabled={savingPlan}
        />
      </FormGroup>
      
      <FormGroup>
        <InputLabel htmlFor="planDescription">Description</InputLabel>
        <TextArea
          id="planDescription"
          value={planDescription}
          onChange={(e) => setPlanDescription(e.target.value)}
          placeholder="Describe the goals and focus of this workout plan"
          rows={3}
          disabled={savingPlan}
        />
      </FormGroup>
      
      <FormGroup>
        <InputLabel htmlFor="planDuration">Duration (weeks)</InputLabel>
        <Select
          id="planDuration"
          value={planDuration}
          onChange={(e) => setPlanDuration(e.target.value)}
          disabled={savingPlan}
        >
          <option value="1">1 Week</option>
          <option value="2">2 Weeks</option>
          <option value="4">4 Weeks</option>
          <option value="6">6 Weeks</option>
          <option value="8">8 Weeks</option>
          <option value="12">12 Weeks</option>
        </Select>
      </FormGroup>
    </>
  );
};

export default PlanForm;
