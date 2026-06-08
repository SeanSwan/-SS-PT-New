/**
 * BLUEPRINT: WorkoutPlannerSavedPlansSection
 * PURPOSE: Renders the saved workout-plan library list, loading state,
 * empty state, and card actions outside the planner page shell.
 */

import React from 'react';
import { ClipboardList, Star } from 'lucide-react';
import SavedPlanCard, { type SavedPlanSummary } from './SavedPlanCard';
import WorkoutPlanPdfDialog, { type WorkoutPlanPdfDialogMode } from './WorkoutPlanPdfDialog';
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
  SavedPlansCount,
  SavedPlansEmpty,
  SavedPlansLoading,
} from './WorkoutPlannerPage.styles';

export type { SavedPlanSummary } from './SavedPlanCard';

interface WorkoutPlannerSavedPlansSectionProps {
  selectedClientId: number | null;
  savedPlans: SavedPlanSummary[];
  savedPlansLoading: boolean;
  loadedPlanId: string | null;
  archiveBlockedFor: (planStatus: string) => boolean;
  onLoad: (planId: string, planName: string) => void;
  onActivate: (planId: string, planName: string) => void;
  onRename: (planId: string, newName: string) => void;
  onDuplicate: (planId: string, planName: string) => void;
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
}

const WorkoutPlannerSavedPlansSection: React.FC<WorkoutPlannerSavedPlansSectionProps> = ({
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
}) => {
  if (!selectedClientId) return null;

  const defaultSixMonthPlan = savedPlans.find(plan => (
    plan.horizonKey === 'six_month' || plan.horizonLabel === '6 Month'
  ));
  const primaryPlan = savedPlans.find(plan => plan.isPrimary)
    || savedPlans.find(plan => plan.status === 'active')
    || defaultSixMonthPlan
    || savedPlans[0]
    || null;
  const handlePrimaryArcChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const plan = savedPlans.find(item => item.id === event.target.value);
    if (plan && plan.id !== primaryPlan?.id) onSetPrimary(plan.id, plan.name);
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
            </PlanModeBar>
            <MesocycleGrid>
              {savedPlans.map(plan => (
                <SavedPlanCard
                  key={plan.id}
                  plan={plan}
                  loaded={loadedPlanId === plan.id}
                  archiveBlocked={archiveBlockedFor(plan.status)}
                  onLoad={onLoad}
                  onActivate={onActivate}
                  onRename={onRename}
                  onDuplicate={onDuplicate}
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
