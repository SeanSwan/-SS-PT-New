/**
 * COMPONENT: WorkoutPlannerCommandPanel
 * PURPOSE: Composes planner command sections while preserving the page-layout
 * prop contract for client, phase, equipment, generation, and plan-duration controls.
 */

import React from 'react';
import type {
  HardcoreTrainingMethod,
  PlanDuration,
  PlannerEquipmentProfile,
  PlanGoal,
  PlannerClient,
  TrainingIntensityMode,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';
import WorkoutPlannerTrainingStyleSection from './WorkoutPlannerTrainingStyleSection';
import WorkoutPlannerGenerationModeSection from './WorkoutPlannerGenerationModeSection';
import {
  WorkoutPlannerControlsSection,
  WorkoutPlannerHeaderSection,
  WorkoutPlannerPlanModeSection,
  WorkoutPlannerSelfGenerationSection,
} from './WorkoutPlannerCommandPanel.sections';

interface WorkoutPlannerCommandPanelProps {
  plannerReturnTo: string | null;
  teachModeOpen: boolean;
  clients: PlannerClient[];
  clientsLoading: boolean;
  selectedClientId: number | null;
  selectedClient: PlannerClient | null;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planDuration: PlanDuration;
  sessionsPerWeek: number;
  trainingIntensityMode: TrainingIntensityMode;
  hardcoreMethod: HardcoreTrainingMethod;
  generationMode: SwanCoachGenerationMode;
  equipmentProfiles: PlannerEquipmentProfile[];
  equipmentProfilesLoading: boolean;
  selectedEquipmentProfileId: number | null;
  generating: boolean;
  generatingPlan: boolean;
  clientGenBlocked: boolean;
  clientSelfGenStatus: 'enabled' | 'disabled' | 'unknown';
  isViewerClient: boolean;
  onReturnToClientHub: () => void;
  onTeachModeToggle: () => void;
  onClientSelectionChange: (rawClientId: string) => void;
  onPhaseNumberChange: (phaseNumber: number) => void;
  onCategoryChange: (category: WorkoutCategory) => void;
  onGoalChange: (goal: PlanGoal) => void;
  onEquipmentProfileChange: (rawProfileId: string) => void;
  onPlanDurationChange: (duration: PlanDuration) => void;
  onSessionsPerWeekChange: (sessionsPerWeek: number) => void;
  onTrainingIntensityModeChange: (mode: TrainingIntensityMode) => void;
  onHardcoreMethodChange: (method: HardcoreTrainingMethod) => void;
  onGenerationModeChange: (mode: SwanCoachGenerationMode) => void;
  onGenerateSingle: () => void;
  onGeneratePlan: () => void;
}

const WorkoutPlannerCommandPanel: React.FC<WorkoutPlannerCommandPanelProps> = ({
  plannerReturnTo,
  teachModeOpen,
  clients,
  clientsLoading,
  selectedClientId,
  selectedClient,
  phaseNumber,
  category,
  goal,
  planDuration,
  sessionsPerWeek,
  trainingIntensityMode,
  hardcoreMethod,
  generationMode,
  equipmentProfiles,
  equipmentProfilesLoading,
  selectedEquipmentProfileId,
  generating,
  generatingPlan,
  clientGenBlocked,
  clientSelfGenStatus,
  isViewerClient,
  onReturnToClientHub,
  onTeachModeToggle,
  onClientSelectionChange,
  onPhaseNumberChange,
  onCategoryChange,
  onGoalChange,
  onEquipmentProfileChange,
  onPlanDurationChange,
  onSessionsPerWeekChange,
  onTrainingIntensityModeChange,
  onHardcoreMethodChange,
  onGenerationModeChange,
  onGenerateSingle,
  onGeneratePlan,
}) => (
  <>
    <WorkoutPlannerHeaderSection
      plannerReturnTo={plannerReturnTo}
      teachModeOpen={teachModeOpen}
      onReturnToClientHub={onReturnToClientHub}
      onTeachModeToggle={onTeachModeToggle}
      onGenerationModeChange={onGenerationModeChange}
    />
    <WorkoutPlannerControlsSection
      clients={clients}
      clientsLoading={clientsLoading}
      selectedClientId={selectedClientId}
      phaseNumber={phaseNumber}
      category={category}
      goal={goal}
      planDuration={planDuration}
      equipmentProfiles={equipmentProfiles}
      equipmentProfilesLoading={equipmentProfilesLoading}
      selectedEquipmentProfileId={selectedEquipmentProfileId}
      generating={generating}
      generatingPlan={generatingPlan}
      clientGenBlocked={clientGenBlocked}
      generationMode={generationMode}
      onClientSelectionChange={onClientSelectionChange}
      onPhaseNumberChange={onPhaseNumberChange}
      onCategoryChange={onCategoryChange}
      onGoalChange={onGoalChange}
      onEquipmentProfileChange={onEquipmentProfileChange}
      onGenerateSingle={onGenerateSingle}
      onGeneratePlan={onGeneratePlan}
    />
    <WorkoutPlannerSelfGenerationSection
      selectedClient={selectedClient}
      clientGenBlocked={clientGenBlocked}
      clientSelfGenStatus={clientSelfGenStatus}
      isViewerClient={isViewerClient}
    />
    <WorkoutPlannerPlanModeSection
      planDuration={planDuration}
      sessionsPerWeek={sessionsPerWeek}
      onPlanDurationChange={onPlanDurationChange}
      onSessionsPerWeekChange={onSessionsPerWeekChange}
    />
    <WorkoutPlannerGenerationModeSection
      generationMode={generationMode}
      onGenerationModeChange={onGenerationModeChange}
    />
    <WorkoutPlannerTrainingStyleSection
      trainingIntensityMode={trainingIntensityMode}
      hardcoreMethod={hardcoreMethod}
      onTrainingIntensityModeChange={onTrainingIntensityModeChange}
      onHardcoreMethodChange={onHardcoreMethodChange}
    />
  </>
);

export default WorkoutPlannerCommandPanel;
