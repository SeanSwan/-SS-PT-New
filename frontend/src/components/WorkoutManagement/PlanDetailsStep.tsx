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
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface PlanDetailsStepProps {
  plan: WorkoutPlan;
  handlePlanDetailChange: (field: keyof WorkoutPlan, value: any) => void;
  goals: { value: string; label: string }[];
  clientId?: string;
  clientName?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const PlanDetailsStep: React.FC<PlanDetailsStepProps> = ({
  plan,
  handlePlanDetailChange,
  goals,
  clientId,
  clientName,
}) => {
  return (
    <StyledBox as="div" $style={{ marginTop: 16 }}>
      {/* Client badge — shown when clientId is pre-set from Client Detail View */}
      {clientId && (
        <StyledBox as="div" $style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)',
        }}>
          <StyledBox as="span" $style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 12,
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>Client</StyledBox>
          <StyledBox as="span" $style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--accent-primary, #60C0F0)',
          }}>{clientName || `Client #${clientId}`}</StyledBox>
        </StyledBox>
      )}

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

      <StyledBox as="div" $style={{ marginTop: 20 }}>
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
      </StyledBox>

      <StyledBox as={FormGrid} $cols="1fr 1fr" $style={{ marginTop: 20 }}>
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
      </StyledBox>
    </StyledBox>
  );
};

export default React.memo(PlanDetailsStep);
