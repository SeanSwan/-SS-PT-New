/**
 * BLUEPRINT: WorkoutPlannerSavedPlansSection
 * PURPOSE: Renders the saved workout-plan library list, loading state,
 * empty state, and card actions outside the planner page shell.
 */

import React, { useEffect, useState } from 'react';
import { ClipboardList, Copy, Dumbbell, Star } from 'lucide-react';
import SavedPlanCard, { type SavedPlanSummary } from './SavedPlanCard';
import WorkoutPlanPdfDialog, { type WorkoutPlanPdfDialogMode } from './WorkoutPlanPdfDialog';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';
import type { PlannerClient } from './WorkoutPlannerTypes';
import {
  MesocycleGrid,
  MesocycleSection,
  MesocycleSectionTitle,
  PlanModeBar,
  PlanModeLabel,
  SmallSelect,
  SkeletonBlock,
} from './WorkoutPlannerStyles';
import {
  PlannerHandoffLink,
  SavedPlansCount,
  SavedPlansEmpty,
  SavedPlansLoading,
} from './WorkoutPlannerPage.styles';

export type { SavedPlanSummary } from './SavedPlanCard';

const COPY_HORIZON_OPTIONS = [
  { value: '', label: 'Same Span' },
  { value: '1', label: '1 Week' },
  { value: '4', label: '1 Month' },
  { value: '13', label: '3 Month' },
  { value: '26', label: '6 Month' },
  { value: '52', label: '1 Year' },
];

interface WorkoutPlannerSavedPlansSectionProps {
  clients: PlannerClient[];
  selectedClientId: number | null;
  savedPlans: SavedPlanSummary[];
  savedPlansLoading: boolean;
  loadedPlanId: string | null;
  archiveBlockedFor: (planStatus: string) => boolean;
  onLoad: (planId: string, planName: string) => void;
  onActivate: (planId: string, planName: string) => void;
  onRename: (planId: string, newName: string) => void;
  onDuplicate: (planId: string, planName: string, targetClientId?: number, durationWeeks?: number) => void;
  onArchive: (planId: string, planName: string) => void;
  onSetPrimary: (planId: string, planName: string) => void;
  pdfDialogPlan: SavedPlanSummary | null;
  pdfDialogMode: WorkoutPlanPdfDialogMode;
  pdfSaving: boolean;
  pdfOpening: boolean;
  onViewPdf: (plan: SavedPlanSummary) => void;
  onUpdatePdf: (plan: SavedPlanSummary) => void;
  onSavePdf: (planId: string, pdfUrl: string, fileName: string) => void;
  onUploadPdf: (planId: string, file: File) => void;
  onClosePdfDialog: () => void;
  activePlanLoggerRoute?: string | null;
}

const WorkoutPlannerSavedPlansSection: React.FC<WorkoutPlannerSavedPlansSectionProps> = ({
  clients,
  selectedClientId,
  savedPlans,
  savedPlansLoading,
  loadedPlanId,
  archiveBlockedFor,
  onLoad,
  onActivate,
  onRename,
  onDuplicate,
  onArchive,
  onSetPrimary,
  pdfDialogPlan,
  pdfDialogMode,
  pdfSaving,
  pdfOpening,
  onViewPdf,
  onUpdatePdf,
  onSavePdf,
  onUploadPdf,
  onClosePdfDialog,
  activePlanLoggerRoute,
}) => {
  const [copyTargetClientId, setCopyTargetClientId] = useState<number | null>(selectedClientId);
  const [copyDurationWeeks, setCopyDurationWeeks] = useState<number | null>(null);

  useEffect(() => {
    setCopyTargetClientId(selectedClientId);
  }, [selectedClientId]);

  if (!selectedClientId) return null;

  const defaultSixMonthPlan = savedPlans.find(plan => (
    plan.horizonKey === 'six_month' || plan.horizonLabel === '6 Month'
  ));
  const primaryPlan = savedPlans.find(plan => plan.isPrimary)
    || savedPlans.find(plan => isWorkoutPlanActiveStatus(plan.status))
    || defaultSixMonthPlan
    || savedPlans[0]
    || null;
  const handlePrimaryArcChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const plan = savedPlans.find(item => item.id === event.target.value);
    if (plan && plan.id !== primaryPlan?.id) onSetPrimary(plan.id, plan.name);
  };
  const handleCopyTargetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setCopyTargetClientId(Number.isFinite(value) && value > 0 ? value : selectedClientId);
  };
  const handleCopyDurationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setCopyDurationWeeks(Number.isFinite(value) && value > 0 ? value : null);
  };
  const handlePlanDuplicate = (planId: string, planName: string) => {
    onDuplicate(planId, planName, copyTargetClientId || selectedClientId, copyDurationWeeks || undefined);
  };

  return (
    <>
      <MesocycleSection>
        <MesocycleSectionTitle>
          <ClipboardList size={18} />
          Saved Plans
          {savedPlans.length > 0 && (
            <SavedPlansCount>
              ({savedPlans.length} plan{savedPlans.length !== 1 ? 's' : ''})
            </SavedPlansCount>
          )}
        </MesocycleSectionTitle>

        {savedPlansLoading ? (
          <SavedPlansLoading>
            {Array.from({ length: 2 }, (_, index) => <SkeletonBlock key={index} />)}
          </SavedPlansLoading>
        ) : savedPlans.length === 0 ? (
          <SavedPlansEmpty>
            No saved plans for this client yet. Generate and save a workout plan above.
          </SavedPlansEmpty>
        ) : (
          <>
            <PlanModeBar aria-label="Primary training arc control">
              <PlanModeLabel><Star size={14} /> Primary Arc</PlanModeLabel>
              <SmallSelect
                value={primaryPlan?.id || ''}
                onChange={handlePrimaryArcChange}
                aria-label="Select primary training arc"
              >
                {savedPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {(plan.horizonLabel || '6 Month')} - {plan.name}
                  </option>
                ))}
              </SmallSelect>
              <PlanModeLabel><Copy size={14} /> Copy To</PlanModeLabel>
              <SmallSelect
                value={copyTargetClientId || selectedClientId}
                onChange={handleCopyTargetChange}
                aria-label="Copy duplicate target client"
              >
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </SmallSelect>
              <SmallSelect
                value={copyDurationWeeks || ''}
                onChange={handleCopyDurationChange}
                aria-label="Copy duplicate span"
              >
                {COPY_HORIZON_OPTIONS.map(option => (
                  <option key={option.value || 'same'} value={option.value}>{option.label}</option>
                ))}
              </SmallSelect>              {activePlanLoggerRoute && (
                <PlannerHandoffLink
                  href={activePlanLoggerRoute}
                  aria-label="Open Workout Logger for the current plan"
                  $variant="primary"
                >
                  <Dumbbell size={14} />
                  Log Current Plan
                </PlannerHandoffLink>
              )}
            </PlanModeBar>
            <MesocycleGrid>
              {savedPlans.map((plan, index) => (
                <SavedPlanCard
                  key={plan.id}
                  plan={plan}
                  ordinal={index + 1}
                  loaded={loadedPlanId === plan.id}
                  archiveBlocked={archiveBlockedFor(plan.status)}
                  onLoad={onLoad}
                  onActivate={onActivate}
                  onRename={onRename}
                  onDuplicate={handlePlanDuplicate}
                  onArchive={onArchive}
                  onSetPrimary={onSetPrimary}
                  onViewPdf={onViewPdf}
                  onUpdatePdf={onUpdatePdf}
                />
              ))}
            </MesocycleGrid>
          </>
        )}
      </MesocycleSection>
      <WorkoutPlanPdfDialog
        plan={pdfDialogPlan}
        mode={pdfDialogMode}
        saving={pdfSaving}
        opening={pdfOpening}
        onClose={onClosePdfDialog}
        onEdit={() => pdfDialogPlan && onUpdatePdf(pdfDialogPlan)}
        onSave={onSavePdf}
        onUpload={onUploadPdf}
      />
    </>
  );
};

export default WorkoutPlannerSavedPlansSection;
