/**
 * ============================================================================
 * FILE: ReviewSaveStep.tsx
 * PURPOSE: Step 3 of WorkoutPlanBuilder — read-only plan review before save
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a read-only summary of the workout plan with
 * stat cards (goal, duration, days/week, client) and collapsible day panels
 * listing all exercises. This is the final review before saving.
 *
 * HOW IT FITS IN THE APP: Rendered by WorkoutPlanBuilder when activeStep === 3.
 *
 * KEY DECISIONS: Read-only view to prevent accidental edits during final review.
 * Duration is calculated from start/end dates.
 */

/**
 * ┌─── SUB-COMPONENT: ReviewSaveStep ─────────────────────────┐
 * │ PARENT: WorkoutPlanBuilder                                   │
 * │ PURPOSE: Final review of plan before saving                  │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ Review & Save Plan                   │                     │
 * │ │ ┌─ Summary Card ────────────────┐    │                     │
 * │ │ │ Plan Name                     │    │                     │
 * │ │ │ Description                   │    │                     │
 * │ │ │ [Goal] [Duration] [Days] [Cl] │    │                     │
 * │ │ └──────────────────────────────┘    │                     │
 * │ │ ▶ Day 1 - 5 exercises               │                     │
 * │ │ ▶ Day 2 - 4 exercises               │                     │
 * │ └──────────────────────────────────────┘                     │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Accordion header] -> toggleAccordion(key)                   │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Flag, Clock, Dumbbell, User, ChevronDown } from 'lucide-react';
import type { WorkoutPlan, WorkoutPlanDay } from '../../hooks/useWorkoutMcp';
import {
  SectionTitle,
  SubTitle,
  SmallText,
  PageTitle,
  BodyText,
  CardPanel,
  FormGrid,
  StatCard,
  StatIcon,
  CollapsibleWrapper,
  CollapsibleHeader,
  CollapsibleBody,
  ListUl,
  ListLi,
  ListItemContent,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface ReviewSaveStepProps {
  plan: WorkoutPlan;
  workoutDays: WorkoutPlanDay[];
  goals: { value: string; label: string }[];
  clientName?: string;
  openAccordions: Record<string, boolean>;
  toggleAccordion: (key: string) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ReviewSaveStep: React.FC<ReviewSaveStepProps> = ({
  plan,
  workoutDays,
  goals,
  clientName,
  openAccordions,
  toggleAccordion,
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      <SectionTitle>Review &amp; Save Plan</SectionTitle>

      <CardPanel>
        <PageTitle style={{ fontSize: '1.5rem' }}>{plan.name}</PageTitle>
        <BodyText $muted>{plan.description}</BodyText>

        <FormGrid $cols="1fr 1fr 1fr 1fr">
          <StatCard>
            <StatIcon><Flag size={36} /></StatIcon>
            <SubTitle>Goal</SubTitle>
            <SmallText $muted>
              {goals.find(g => g.value === plan.goal)?.label}
            </SmallText>
          </StatCard>
          <StatCard>
            <StatIcon><Clock size={36} /></StatIcon>
            <SubTitle>Duration</SubTitle>
            <SmallText $muted>
              {Math.ceil((new Date(plan.endDate!).getTime() - new Date(plan.startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
            </SmallText>
          </StatCard>
          <StatCard>
            <StatIcon><Dumbbell size={36} /></StatIcon>
            <SubTitle>Days per Week</SubTitle>
            <SmallText $muted>
              {workoutDays.length} days
            </SmallText>
          </StatCard>
          <StatCard>
            <StatIcon><User size={36} /></StatIcon>
            <SubTitle>Client</SubTitle>
            <SmallText $muted>
              {clientName || (plan.clientId ? `Client #${plan.clientId}` : 'Not assigned')}
            </SmallText>
          </StatCard>
        </FormGrid>
      </CardPanel>

      {workoutDays.map((day, index) => {
        const accKey = `review-${index}`;
        const isOpen = !!openAccordions[accKey];
        return (
          <CollapsibleWrapper key={index}>
            <CollapsibleHeader
              $open={isOpen}
              onClick={() => toggleAccordion(accKey)}
              type="button"
            >
              <span>{day.name} - {day.exercises?.length || 0} exercises</span>
              <ChevronDown size={18} />
            </CollapsibleHeader>
            <CollapsibleBody $open={isOpen}>
              <ListUl>
                {day.exercises?.map((exercise, exIndex) => (
                  <ListLi key={exIndex}>
                    <ListItemContent>
                      <SmallText>{`Exercise ${exercise.orderInWorkout}: ${exercise.exerciseId}`}</SmallText>
                      <SmallText $muted>{`${exercise.setScheme} - Rest: ${exercise.restPeriod}s - ${exercise.notes}`}</SmallText>
                    </ListItemContent>
                  </ListLi>
                ))}
              </ListUl>
            </CollapsibleBody>
          </CollapsibleWrapper>
        );
      })}
    </div>
  );
};

export default React.memo(ReviewSaveStep);
