/**
 * COMPONENT: WorkoutPlannerSavedPlansSection
 * PURPOSE: Renders the saved workout-plan library list, loading state,
 * empty state, and card actions outside the planner page shell.
 */

import React from 'react';
import { ClipboardList } from 'lucide-react';
import SavedPlanCard, { type SavedPlanSummary } from './SavedPlanCard';
import {
  MesocycleGrid,
  MesocycleSection,
  MesocycleSectionTitle,
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
}) => {
  if (!selectedClientId) return null;

  return (
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
            />
          ))}
        </MesocycleGrid>
      )}
    </MesocycleSection>
  );
};

export default WorkoutPlannerSavedPlansSection;
