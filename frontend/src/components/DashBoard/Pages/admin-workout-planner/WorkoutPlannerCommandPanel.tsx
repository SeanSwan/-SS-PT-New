/**
 * COMPONENT: WorkoutPlannerCommandPanel
 * PURPOSE: Composes planner command sections while preserving the page-layout
 * prop contract for client, phase, equipment, generation, and plan-duration controls.
 */

import React from 'react';
import type {
  PlanDuration,
  PlannerEquipmentProfile,
  PlanGoal,
  PlannerClient,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
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
  onGenerateSingle,
  onGeneratePlan,
}) => (
  <>
    <WorkoutPlannerHeaderSection
      plannerReturnTo={plannerReturnTo}
      teachModeOpen={teachModeOpen}
      onReturnToClientHub={onReturnToClientHub}
      onTeachModeToggle={onTeachModeToggle}
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
  </>
);

export default WorkoutPlannerCommandPanel;
