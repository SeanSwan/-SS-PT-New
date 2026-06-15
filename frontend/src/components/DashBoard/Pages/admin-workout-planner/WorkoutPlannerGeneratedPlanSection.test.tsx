import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import WorkoutPlannerGeneratedPlanSection from './WorkoutPlannerGeneratedPlanSection';
import type { GeneratedPlan } from './WorkoutPlannerTypes';

const oneWeekGeneratedPlan: GeneratedPlan = {
  clientId: 91,
  clientName: 'Client 91',
  planSummary: {
    durationWeeks: 1,
    sessionsPerWeek: 1,
    totalSessions: 1,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [{
    mesocycle: 1,
    weeks: '1-1',
    nasmPhase: 2,
    phaseName: 'Strength Endurance',
    focus: 'foundation',
    params: { sets: '2-4', reps: '8-12', intensity: '70-80%', tempo: '2-0-2', rest: '0-60s' },
    overloadStrategy: 'Intro week',
    deloadWeek: null,
  }],
  weeklySchedule: [{
    dayNumber: 1,
    focus: 'full body',
    category: 'full_body',
  }],
  recommendations: [],
  equipmentContext: {
    profileId: 77,
    availableEquipment: ['Dumbbell (free_weights)', 'Bench (support)'],
    resistanceTypes: ['dumbbell'],
  },
  weeks: [{
    weekNumber: 1,
    focus: 'foundation',
    days: [{
      dayNumber: 1,
      name: 'W1D1: full body',
      focus: 'full body',
      exercises: [{
        exerciseId: 'trial-ex-1',
        exerciseName: 'NASM Trial Squat',
        sets: 3,
        targetReps: '10',
        restSeconds: 60,
      }],
    }],
  }],
};

describe('WorkoutPlannerGeneratedPlanSection', () => {
  it('renders populated exercise detail for 1-week generated plans', () => {
    cleanup();
    render(
      <WorkoutPlannerGeneratedPlanSection
        generatedPlan={oneWeekGeneratedPlan}
        selectedMesoDay={1}
        phaseNumber={2}
        selectedClient={null}
        onSelectedMesoDayChange={vi.fn()}
        onPhaseNumberChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Detailed Schedule')).toBeInTheDocument();
    expect(screen.getByText('Training Blocks')).toBeInTheDocument();
    expect(screen.queryByText(/4-Week Blocks/i)).not.toBeInTheDocument();
    expect(screen.getByText('Training Environment')).toBeInTheDocument();
    expect(screen.getByText(/Dumbbell \(free_weights\), Bench \(support\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial Squat - 3 x 10/i)).toBeInTheDocument();
    expect(screen.getByText(/Review the detailed schedule before saving or assigning/i)).toBeInTheDocument();
    expect(screen.queryByText(/Click exercises in the Rolodex/i)).not.toBeInTheDocument();
  });

  it('uses Swan Coach wording for generated plan recommendations', () => {
    cleanup();
    render(
      <WorkoutPlannerGeneratedPlanSection
        generatedPlan={{
          ...oneWeekGeneratedPlan,
          recommendations: ['Progress load only when form quality stays stable.'],
        }}
        selectedMesoDay={1}
        phaseNumber={2}
        selectedClient={null}
        onSelectedMesoDayChange={vi.fn()}
        onPhaseNumberChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Swan Coach Recommendations')).toBeInTheDocument();
    expect(screen.queryByText('AI Recommendations')).not.toBeInTheDocument();
  });

  it('surfaces coach review guardrails before a weak generated plan is saved', () => {
    cleanup();
    render(
      <WorkoutPlannerGeneratedPlanSection
        generatedPlan={{
          ...oneWeekGeneratedPlan,
          recommendations: [],
          recommendationDetails: [],
          rationale: [],
          weeks: [],
        }}
        selectedMesoDay={1}
        phaseNumber={2}
        selectedClient={null}
        onSelectedMesoDayChange={vi.fn()}
        onPhaseNumberChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Coach Review Guardrails')).toBeInTheDocument();
    expect(screen.getByText('Warmup/prep cue missing')).toBeInTheDocument();
    expect(screen.getByText('Cooldown/recovery cue missing')).toBeInTheDocument();
    expect(screen.getByText('Rationale missing')).toBeInTheDocument();
  });

  it('offers a one-click Coach review handoff for the selected generated day', () => {
    cleanup();
    render(
      <WorkoutPlannerGeneratedPlanSection
        generatedPlan={oneWeekGeneratedPlan}
        selectedMesoDay={1}
        phaseNumber={2}
        selectedClient={null}
        coachReviewRoute="/dashboard/admin/coach-assistant?intent=plan_review"
        onSelectedMesoDayChange={vi.fn()}
        onPhaseNumberChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /review generated day 1 in coach/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intent=plan_review');
  });
});
