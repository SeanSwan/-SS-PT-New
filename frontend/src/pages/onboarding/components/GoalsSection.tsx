/**
 * ┌─── SUB-COMPONENT: GoalsSection ────────────────────────────┐
 * │ PARENT: ClientOnboardingWizard (Step 2)                     │
 * │ PURPOSE: Collect client performance goals with categorized  │
 * │          chip selector — 30+ goals across 5 categories      │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ Primary Performance Goal:                │                │
 * │ │ ── Body Composition ──                   │                │
 * │ │ [Fat Loss] [Muscle Gain] [Body Recomp]  │                │
 * │ │ ── Strength & Power ──                   │                │
 * │ │ [Powerlifting] [Olympic WL] [Functional] │                │
 * │ │ ── Sports Performance ──                 │                │
 * │ │ [Golf] [Tennis] [Basketball] [Boxing]... │                │
 * │ │ ── Health & Recovery ──                  │                │
 * │ │ [Mobility] [Injury Recovery] [Posture]   │                │
 * │ │ ── Endurance & Conditioning ──           │                │
 * │ │ [HIIT] [Obstacle Course] [Athletic]      │                │
 * │ │ [Other (specify below)]                  │                │
 * │ │                                          │                │
 * │ │ Why This Goal Matters: [textarea]        │                │
 * │ │ Success in 6 Months: [textarea]          │                │
 * │ │ Desired Timeline: [input]                │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { formData, updateFormData }                          │
 * │ CLICK-OUTCOMES:                                              │
 * │ [GoalChip] → Sets primaryGoal in formData                   │
 * │ [Other chip] → Shows custom goal text input                  │
 * │ GAMIFICATION: Profile completion awards 50 XP                │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
import styled from "styled-components";
import { GOAL_CATEGORIES } from "./GoalConstants";

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Categorized goal chip selector with 30+ options
// WHY: Categories prevent overwhelm when scanning on mobile
// ─────────────────────────────────────────────────────────────

const GoalsSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  const handleGoalSelect = (goal: string) => {
    updateFormData({ primaryGoal: goal });
  };

  return (
    <SectionContainer>
      <FieldGroup label="Primary Performance Goal" required>
        {GOAL_CATEGORIES.map((category) => (
          <CategoryBlock key={category.label}>
            <CategoryLabel>{category.label}</CategoryLabel>
            <GoalChipGrid>
              {category.goals.map((goal) => (
                <GoalChip
                  key={goal}
                  type="button"
                  $selected={formData.primaryGoal === goal}
                  onClick={() => handleGoalSelect(goal)}
                  aria-pressed={formData.primaryGoal === goal}
                >
                  {goal}
                </GoalChip>
              ))}
            </GoalChipGrid>
          </CategoryBlock>
        ))}

        {/* Other option — always last */}
        <CategoryBlock>
          <GoalChipGrid>
            <GoalChip
              type="button"
              $selected={formData.primaryGoal === "Other (specify below)"}
              onClick={() => handleGoalSelect("Other (specify below)")}
              aria-pressed={formData.primaryGoal === "Other (specify below)"}
            >
              Other (specify below)
            </GoalChip>
          </GoalChipGrid>
        </CategoryBlock>

        {formData.primaryGoal === "Other (specify below)" && (
          <InputField
            name="customGoal"
            value={formData.customGoal || ""}
            onChange={handleChange}
            placeholder="Describe your performance goal"
            style={{ marginTop: '0.75rem' }}
          />
        )}
      </FieldGroup>

      <FieldGroup label="Why This Goal Matters To You">
        <TextAreaField
          name="whyGoalMatters"
          value={formData.whyGoalMatters || ""}
          onChange={handleChange}
          placeholder="What's driving your performance optimization?"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="What Does Success Look Like In 6 Months?">
        <TextAreaField
          name="successIn6Months"
          value={formData.successIn6Months || ""}
          onChange={handleChange}
          placeholder="Describe your ideal outcome — be specific (e.g., 'add 20 yards to my drive', 'lose 15 lbs while gaining strength')"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="Desired Timeline">
        <InputField
          name="desiredTimeline"
          value={formData.desiredTimeline || ""}
          onChange={handleChange}
          placeholder="3 months, 6 months, 1 year"
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default GoalsSection;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const CategoryBlock = styled.div`
  margin-bottom: 0.75rem;
`;

const CategoryLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(96, 192, 240, 0.7);
  margin-bottom: 0.5rem;
  padding-left: 2px;
`;

const GoalChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const GoalChip = styled.button<{ $selected: boolean }>`
  padding: 10px 16px;
  border-radius: 12px;
  min-height: 44px;
  border: 1.5px solid ${({ $selected }) => ($selected ? '#8B5CF6' : 'rgba(224, 236, 244, 0.25)')};
  background: ${({ $selected }) => ($selected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 32, 96, 0.3)')};
  color: ${({ $selected }) => ($selected ? '#E0ECF4' : 'rgba(224, 236, 244, 0.7)')};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #60C0F0;
    background: rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;
