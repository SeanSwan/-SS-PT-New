/**
 * COMPONENT: WorkoutPlannerPageLayout
 * PURPOSE: Owns the rendered workout planner shell while WorkoutPlannerPage
 * keeps behavior orchestration, query parsing, and hook wiring.
 */

import React from 'react';
import TeachModeSidebar from './TeachModeSidebar';
import WorkoutPlannerBuilderPanel from './WorkoutPlannerBuilderPanel';
import WorkoutPlannerCommandPanel from './WorkoutPlannerCommandPanel';
import WorkoutPlannerConfirmDialog from './WorkoutPlannerConfirmDialog';
import WorkoutPlannerGeneratedPlanSection from './WorkoutPlannerGeneratedPlanSection';
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import WorkoutPlannerSavedPlansSection from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerStatusAssistantStrip from './WorkoutPlannerStatusAssistantStrip';
import { Page, ThreePanel } from './WorkoutPlannerStyles';

type CommandProps = React.ComponentProps<typeof WorkoutPlannerCommandPanel>;
type StatusProps = React.ComponentProps<typeof WorkoutPlannerStatusAssistantStrip>;
type RolodexProps = React.ComponentProps<typeof WorkoutPlannerRolodexPanel>;
type BuilderProps = React.ComponentProps<typeof WorkoutPlannerBuilderPanel>;
type TeachModeProps = React.ComponentProps<typeof TeachModeSidebar>;
type GeneratedPlanProps = React.ComponentProps<typeof WorkoutPlannerGeneratedPlanSection>;
type SavedPlansProps = React.ComponentProps<typeof WorkoutPlannerSavedPlansSection>;
type ConfirmDialogProps = React.ComponentProps<typeof WorkoutPlannerConfirmDialog>;

export type WorkoutPlannerPageLayoutProps = CommandProps & StatusProps & RolodexProps & BuilderProps &
  GeneratedPlanProps & SavedPlansProps & ConfirmDialogProps & {
    teachModeProps: TeachModeProps;
  };

const WorkoutPlannerPageLayout: React.FC<WorkoutPlannerPageLayoutProps> = ({
  plannerReturnTo, teachModeOpen, clients, clientsLoading, selectedClientId, selectedClient,
  phaseNumber, category, goal, planDuration, sessionsPerWeek, equipmentProfiles,
  equipmentProfilesLoading, selectedEquipmentProfileId, generating, generatingPlan,
  clientGenBlocked, clientSelfGenStatus, isViewerClient, onReturnToClientHub, onTeachModeToggle,
  onClientSelectionChange, onPhaseNumberChange, onCategoryChange, onGoalChange, onPlanDurationChange,
  onEquipmentProfileChange, onSessionsPerWeekChange, onGenerateSingle, onGeneratePlan, statusMsg, degradedIntelligence,
  hasPlanExercises, onDismissStatus, filteredExerciseCount, activeFilterCount, exercisesLoading, searchQuery,
  filterCategory, sourceFilter, exerciseTypeFilter, equipmentFilter, impactFilter, exerciseRowRenderer,
  onSearchQueryChange, onFilterCategoryChange, onSourceFilterChange, onExerciseTypeFilterChange,
  onEquipmentFilterChange, onImpactFilterChange, onClearFilters, saving, planExercises, hasGeneratedHorizonPlan,
  loadedPlanId, savedPlans, isDirty, phase, explanations, showExplanations, onSaveDraft,
  onSaveAndActivate, onUpdateLoaded, onUpdateAndActivate, onDuplicateLoadedPlan, onSelectExercise,
  onUpdateExercise, onRemoveExercise, onBrowseAddExercise, onToggleExplanations, teachModeProps,
  generatedPlan, selectedMesoDay, onSelectedMesoDayChange, savedPlansLoading, archiveBlockedFor,
  onLoad, onActivate, onRename, onDuplicate, onArchive, request, onClose,
}) => (
  <Page>
    <WorkoutPlannerCommandPanel
      plannerReturnTo={plannerReturnTo}
      teachModeOpen={teachModeOpen}
      clients={clients}
      clientsLoading={clientsLoading}
      selectedClientId={selectedClientId}
      selectedClient={selectedClient}
      phaseNumber={phaseNumber}
      category={category}
      goal={goal}
      planDuration={planDuration}
      sessionsPerWeek={sessionsPerWeek}
      equipmentProfiles={equipmentProfiles}
      equipmentProfilesLoading={equipmentProfilesLoading}
      selectedEquipmentProfileId={selectedEquipmentProfileId}
      generating={generating}
      generatingPlan={generatingPlan}
      clientGenBlocked={clientGenBlocked}
      clientSelfGenStatus={clientSelfGenStatus}
      isViewerClient={isViewerClient}
      onReturnToClientHub={onReturnToClientHub}
      onTeachModeToggle={onTeachModeToggle}
      onClientSelectionChange={onClientSelectionChange}
      onPhaseNumberChange={onPhaseNumberChange}
      onCategoryChange={onCategoryChange}
      onGoalChange={onGoalChange}
      onEquipmentProfileChange={onEquipmentProfileChange}
      onPlanDurationChange={onPlanDurationChange}
      onSessionsPerWeekChange={onSessionsPerWeekChange}
      onGenerateSingle={onGenerateSingle}
      onGeneratePlan={onGeneratePlan}
    />

    <WorkoutPlannerStatusAssistantStrip
      statusMsg={statusMsg}
      plannerReturnTo={plannerReturnTo}
      selectedClientId={selectedClientId}
      degradedIntelligence={degradedIntelligence}
      hasPlanExercises={hasPlanExercises}
      onReturnToClientHub={onReturnToClientHub}
      onDismissStatus={onDismissStatus}
    />

    <ThreePanel $teachModeOpen={teachModeOpen}>
      <WorkoutPlannerRolodexPanel
        filteredExerciseCount={filteredExerciseCount}
        activeFilterCount={activeFilterCount}
        exercisesLoading={exercisesLoading}
        searchQuery={searchQuery}
        filterCategory={filterCategory}
        sourceFilter={sourceFilter}
        exerciseTypeFilter={exerciseTypeFilter}
        equipmentFilter={equipmentFilter}
        impactFilter={impactFilter}
        exerciseRowRenderer={exerciseRowRenderer}
        onSearchQueryChange={onSearchQueryChange}
        onFilterCategoryChange={onFilterCategoryChange}
        onSourceFilterChange={onSourceFilterChange}
        onExerciseTypeFilterChange={onExerciseTypeFilterChange}
        onEquipmentFilterChange={onEquipmentFilterChange}
        onImpactFilterChange={onImpactFilterChange}
        onClearFilters={onClearFilters}
      />
      <WorkoutPlannerBuilderPanel
        degradedIntelligence={degradedIntelligence}
        saving={saving}
        planExercises={planExercises}
        hasGeneratedHorizonPlan={hasGeneratedHorizonPlan}
        loadedPlanId={loadedPlanId}
        savedPlans={savedPlans}
        isDirty={isDirty}
        generating={generating}
        phase={phase}
        explanations={explanations}
        showExplanations={showExplanations}
        onSaveDraft={onSaveDraft}
        onSaveAndActivate={onSaveAndActivate}
        onUpdateLoaded={onUpdateLoaded}
        onUpdateAndActivate={onUpdateAndActivate}
        onDuplicateLoadedPlan={onDuplicateLoadedPlan}
        onSelectExercise={onSelectExercise}
        onUpdateExercise={onUpdateExercise}
        onRemoveExercise={onRemoveExercise}
        onBrowseAddExercise={onBrowseAddExercise}
        onToggleExplanations={onToggleExplanations}
      />
      {teachModeOpen && <TeachModeSidebar {...teachModeProps} onClose={onTeachModeToggle} />}
    </ThreePanel>

    <WorkoutPlannerGeneratedPlanSection
      generatedPlan={generatedPlan}
      selectedMesoDay={selectedMesoDay}
      phaseNumber={phaseNumber}
      selectedClient={selectedClient}
      onSelectedMesoDayChange={onSelectedMesoDayChange}
      onPhaseNumberChange={onPhaseNumberChange}
    />
    <WorkoutPlannerSavedPlansSection
      selectedClientId={selectedClientId}
      savedPlans={savedPlans}
      savedPlansLoading={savedPlansLoading}
      loadedPlanId={loadedPlanId}
      archiveBlockedFor={archiveBlockedFor}
      onLoad={onLoad}
      onActivate={onActivate}
      onRename={onRename}
      onDuplicate={onDuplicate}
      onArchive={onArchive}
    />
    <WorkoutPlannerConfirmDialog request={request} onClose={onClose} />
  </Page>
);

export default WorkoutPlannerPageLayout;
