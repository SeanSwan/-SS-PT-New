/**
 * ============================================================================
 * FILE: PlanDetailsStep.tsx
 * PURPOSE: Step 0 of WorkoutPlanBuilder — plan name, goal, dates, client
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the plan details form (name, goal, description,
 * start/end dates, and optional client selector when no clientId is provided).
 *
 * HOW IT FITS IN THE APP: Rendered by WorkoutPlanBuilder when activeStep === 0.
 *
 * KEY DECISIONS: Client selector only appears when clientId prop is not passed
 * (i.e., the builder is used outside a specific client context).
 */

/**
 * ┌─── SUB-COMPONENT: PlanDetailsStep ─────────────────────────┐
 * │ PARENT: WorkoutPlanBuilder                                   │
 * │ PURPOSE: Collect plan metadata (name, goal, dates, client)   │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ [Plan Name]        [Goal ▼]          │                     │
 * │ │ [Description textarea]               │                     │
 * │ │ [Start Date]       [End Date]        │                     │
 * │ │ [Client ▼] (conditional)             │                     │
 * │ └──────────────────────────────────────┘                     │
 * │ Props: { plan, handlePlanDetailChange, goals, clientId,      │
 * │         mockClients }                                        │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Input change] -> handlePlanDetailChange(field, value)       │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import type { WorkoutPlan } from '../../hooks/useWorkoutMcp';
import {
  FormGrid,
  FieldGroup,
  FieldLabel,
  StyledInput,
  StyledTextarea,
  NativeSelect,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface PlanDetailsStepProps {
  plan: WorkoutPlan;
  handlePlanDetailChange: (field: keyof WorkoutPlan, value: any) => void;
  goals: { value: string; label: string }[];
  clientId?: string;
  mockClients: { id: string; name: string; email: string }[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const PlanDetailsStep: React.FC<PlanDetailsStepProps> = ({
  plan,
  handlePlanDetailChange,
  goals,
  clientId,
  mockClients,
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      <FormGrid $cols="1fr 1fr">
        <FieldGroup>
          <FieldLabel htmlFor="plan-name">Plan Name</FieldLabel>
          <StyledInput
            id="plan-name"
            type="text"
            value={plan.name}
            onChange={(e) => handlePlanDetailChange('name', e.target.value)}
            placeholder="Enter plan name"
            required
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="plan-goal">Goal</FieldLabel>
          <NativeSelect
            id="plan-goal"
            value={plan.goal}
            onChange={(e) => handlePlanDetailChange('goal', e.target.value)}
          >
            {goals.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </NativeSelect>
        </FieldGroup>
      </FormGrid>

      <div style={{ marginTop: 20 }}>
        <FieldGroup>
          <FieldLabel htmlFor="plan-description">Description</FieldLabel>
          <StyledTextarea
            id="plan-description"
            value={plan.description}
            onChange={(e) => handlePlanDetailChange('description', e.target.value)}
            placeholder="Describe the workout plan"
            rows={3}
          />
        </FieldGroup>
      </div>

      <FormGrid $cols="1fr 1fr" style={{ marginTop: 20 }}>
        <FieldGroup>
          <FieldLabel htmlFor="plan-start-date">Start Date</FieldLabel>
          <StyledInput
            id="plan-start-date"
            type="date"
            value={plan.startDate || ''}
            onChange={(e) => handlePlanDetailChange('startDate', e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="plan-end-date">End Date</FieldLabel>
          <StyledInput
            id="plan-end-date"
            type="date"
            value={plan.endDate || ''}
            onChange={(e) => handlePlanDetailChange('endDate', e.target.value)}
          />
        </FieldGroup>
      </FormGrid>

      {!clientId && (
        <div style={{ marginTop: 20 }}>
          <FieldGroup>
            <FieldLabel htmlFor="plan-client">Assign to Client</FieldLabel>
            <NativeSelect
              id="plan-client"
              value={plan.clientId}
              onChange={(e) => handlePlanDetailChange('clientId', e.target.value)}
            >
              <option value="">Select a client...</option>
              {mockClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </NativeSelect>
          </FieldGroup>
        </div>
      )}
    </div>
  );
};

export default React.memo(PlanDetailsStep);
