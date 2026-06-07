import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  LongHorizonPlan,
  MesocycleBlock,
  SwanCoachPlanningFingerprint,
} from '../../../../../services/aiWorkoutService';
import LongHorizonPlanReviewEditor from './LongHorizonPlanReviewEditor';

const draftPlan: LongHorizonPlan = {
  planName: 'Strength Foundation',
  horizonMonths: 6,
  summary: 'Build consistent strength capacity.',
  blocks: [
    {
      sequence: 1,
      nasmFramework: 'OPT',
      optPhase: 2,
      phaseName: 'Stabilization Endurance',
      focus: 'movement quality',
      durationWeeks: 4,
      sessionsPerWeek: 3,
      entryCriteria: 'cleared intake',
      exitCriteria: 'consistent sessions',
      notes: 'Keep impact controlled.',
    },
  ],
};

const reviewRequiredPlanning: SwanCoachPlanningFingerprint = {
  createdBy: 'swan_coach_planning',
  identityMode: 'client_id_only',
  horizonWeeks: 24,
  sessionsPerWeek: 3,
  primaryGoal: 'strength',
  nasmPhase: 'strength',
  nasmDomainsApplied: ['OPT', 'Corrective Exercise', 'Performance Enhancement'],
  planInputsUsed: {
    workoutHistory: true,
    painInjury: true,
    movementCompensations: false,
  },
  dataCategoriesUsed: ['workout history', 'pain/injury entries'],
  missingDataCategories: ['movement assessment'],
  rules: ['Never send names to the planning model'],
  safetyGate: {
    status: 'review_required',
    reviewRequiredSignals: ['missing_movement_screen'],
    missingCriticalData: ['movement assessment'],
  },
};

describe('LongHorizonPlanReviewEditor', () => {
  it('keeps review edits, export, and regenerate actions wired', () => {
    const onUpdatePlanField = vi.fn();
    const onUpdateBlock = vi.fn();
    const onSetTrainerNotes = vi.fn();
    const onExportPdf = vi.fn();
    const onRegenerate = vi.fn();

    render(
      <LongHorizonPlanReviewEditor
        clientName="Sean Swan"
        plan={draftPlan}
        warnings={['Progress data is limited.']}
        auditLogId={null}
        swanCoachPlanning={null}
        planningReviewAcknowledged={false}
        setPlanningReviewAcknowledged={vi.fn()}
        trainerNotes="Initial coaching note"
        setTrainerNotes={onSetTrainerNotes}
        expandedBlocks={new Set([0])}
        onToggleBlock={vi.fn()}
        onUpdatePlanField={onUpdatePlanField}
        onUpdateBlock={onUpdateBlock}
        onExportPdf={onExportPdf}
        onRegenerate={onRegenerate}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText('Progress data is limited.')).toBeInTheDocument();
    expect(screen.getByText(/regenerate to create a valid audit link/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'Strength Foundation Updated' },
    });
    expect(onUpdatePlanField).toHaveBeenCalledWith('planName', 'Strength Foundation Updated');

    fireEvent.change(screen.getByLabelText(/duration \(weeks\)/i), {
      target: { value: '8' },
    });
    expect(onUpdateBlock).toHaveBeenCalledWith(0, 'durationWeeks', 8);

    fireEvent.change(screen.getByLabelText(/trainer notes/i), {
      target: { value: 'Approved with trainer notes.' },
    });
    expect(onSetTrainerNotes).toHaveBeenCalledWith('Approved with trainer notes.');

    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));
    expect(onExportPdf).toHaveBeenCalledWith(draftPlan, 'Sean Swan');

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('collapses block fields when a block is not expanded', () => {
    const onToggleBlock = vi.fn();

    render(
      <LongHorizonPlanReviewEditor
        clientName="Sean Swan"
        plan={draftPlan}
        warnings={[]}
        auditLogId={31}
        swanCoachPlanning={null}
        planningReviewAcknowledged={false}
        setPlanningReviewAcknowledged={vi.fn()}
        trainerNotes=""
        setTrainerNotes={vi.fn()}
        expandedBlocks={new Set()}
        onToggleBlock={onToggleBlock}
        onUpdatePlanField={vi.fn()}
        onUpdateBlock={vi.fn<
          [number, keyof MesocycleBlock, MesocycleBlock[keyof MesocycleBlock]],
          void
        >()}
        onExportPdf={vi.fn()}
        onRegenerate={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByLabelText(/phase name/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /block 1/i }));
    expect(onToggleBlock).toHaveBeenCalledWith(0);
  });

  it('shows Swan Coach planning coverage and records acknowledgement', () => {
    const setAcknowledged = vi.fn();

    render(
      <LongHorizonPlanReviewEditor
        clientName="Sean Swan"
        plan={draftPlan}
        warnings={[]}
        auditLogId={31}
        swanCoachPlanning={reviewRequiredPlanning}
        planningReviewAcknowledged={false}
        setPlanningReviewAcknowledged={setAcknowledged}
        trainerNotes=""
        setTrainerNotes={vi.fn()}
        expandedBlocks={new Set()}
        onToggleBlock={vi.fn()}
        onUpdatePlanField={vi.fn()}
        onUpdateBlock={vi.fn()}
        onExportPdf={vi.fn()}
        onRegenerate={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText('Swan Coach Data Coverage')).toBeInTheDocument();
    expect(screen.getByText('Coach review required')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed the swan coach planning signals/i }));
    expect(setAcknowledged).toHaveBeenCalledWith(true);
  });
});
