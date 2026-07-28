/**
 * COMPONENT: WorkoutPlannerPageLayout
 * PURPOSE: Owns the rendered workout planner shell while WorkoutPlannerPage
 * keeps behavior orchestration, query parsing, and hook wiring.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import TeachModeSidebar from './TeachModeSidebar';
import WorkoutPlannerBuilderPanel from './WorkoutPlannerBuilderPanel';
import WorkoutPlannerCommandPanel from './WorkoutPlannerCommandPanel';
import WorkoutPlannerConfirmDialog from './WorkoutPlannerConfirmDialog';
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import WorkoutPlannerSavedPlansSection from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerStatusAssistantStrip from './WorkoutPlannerStatusAssistantStrip';
import { Page, ThreePanel } from './WorkoutPlannerStyles';
import {
  buildWorkoutPlannerCoachReviewRoute,
  buildWorkoutPlannerLoggerRoute,
} from './workoutPlannerHandoffRoutes';

type CommandProps = React.ComponentProps<typeof WorkoutPlannerCommandPanel>;
type StatusProps = React.ComponentProps<typeof WorkoutPlannerStatusAssistantStrip>;
type RolodexProps = React.ComponentProps<typeof WorkoutPlannerRolodexPanel>;
type BuilderProps = React.ComponentProps<typeof WorkoutPlannerBuilderPanel>;
type TeachModeProps = React.ComponentProps<typeof TeachModeSidebar>;
type SavedPlansProps = React.ComponentProps<typeof WorkoutPlannerSavedPlansSection>;
type ConfirmDialogProps = React.ComponentProps<typeof WorkoutPlannerConfirmDialog>;

type WorkoutPlannerPageLayoutProps = CommandProps & StatusProps & RolodexProps & BuilderProps &
  SavedPlansProps & ConfirmDialogProps & {
    teachModeProps: TeachModeProps;
  };

const WorkoutPlannerPageLayout: React.FC<WorkoutPlannerPageLayoutProps> = ({
  plannerReturnTo, teachModeOpen, clients, clientsLoading, selectedClientId, selectedClient,
  phaseNumber, category, goal, planDuration, sessionsPerWeek, equipmentProfiles,
  trainingIntensityMode, hardcoreMethod, generationMode,
  equipmentProfilesLoading, selectedEquipmentProfileId, generating, generatingPlan,
  clientGenBlocked, clientSelfGenStatus, isViewerClient, onReturnToClientHub, onTeachModeToggle,
  onClientSelectionChange, onPhaseNumberChange, onCategoryChange, onGoalChange, onPlanDurationChange,
  onEquipmentProfileChange, onSessionsPerWeekChange, onTrainingIntensityModeChange,
  onHardcoreMethodChange, onGenerationModeChange, onGenerateSingle, onGeneratePlan, statusMsg, degradedIntelligence,
  hasPlanExercises, onDismissStatus, filteredExerciseCount, activeFilterCount, exercisesLoading, searchQuery,
  filterCategory, sourceFilter, exerciseTypeFilter, equipmentFilter, impactFilter, exerciseRowRenderer,
  onSearchQueryChange, onFilterCategoryChange, onSourceFilterChange, onExerciseTypeFilterChange,
  onEquipmentFilterChange, onImpactFilterChange, onClearFilters, saving, planExercises, hasGeneratedHorizonPlan,
  loadedPlanId, savedPlans, isDirty, phase, explanations, showExplanations, onSaveDraft,
  onSaveAndActivate, onUpdateLoaded, onUpdateAndActivate, onDuplicateLoadedPlan, onCreatePdf, onSelectExercise,
  onUpdateExercise, onRemoveExercise, onBrowseAddExercise, onSelectGuidedCandidate, onClearGuidedCandidates, onToggleExplanations, teachModeProps,
  generatedPlan, selectedMesoDay, guidedCandidates, generatingCandidates, onSelectedMesoDayChange, savedPlansLoading, archiveBlockedFor,
  onLoad, onActivate, onRename, onDuplicate, onArchive, onSetPrimary, pdfDialogPlan, pdfDialogMode,
  pdfSaving, pdfOpening, onViewPdf, onUpdatePdf, onSavePdf, onUploadPdf, onClosePdfDialog, request, onClose,
}) => {
  const location = useLocation();
  const generatedPlanCoachReviewRoute = React.useMemo(() => buildWorkoutPlannerCoachReviewRoute({
    pathname: location.pathname,
    search: location.search,
    selectedClientId,
    selectedMesoDay,
    generatedPlan,
  }), [generatedPlan, location.pathname, location.search, selectedClientId, selectedMesoDay]);
  const activePlanLoggerRoute = React.useMemo(() => buildWorkoutPlannerLoggerRoute({
    pathname: location.pathname,
    search: location.search,
    selectedClientId,
  }), [location.pathname, location.search, selectedClientId]);

  return (
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
        trainingIntensityMode={trainingIntensityMode}
        hardcoreMethod={hardcoreMethod}
        generationMode={generationMode}
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
        onTrainingIntensityModeChange={onTrainingIntensityModeChange}
        onHardcoreMethodChange={onHardcoreMethodChange}
        onGenerationModeChange={onGenerationModeChange}
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
          generatingCandidates={generatingCandidates}
          guidedCandidates={guidedCandidates}
          generationMode={generationMode}
          phase={phase}
          explanations={explanations}
          showExplanations={showExplanations}
          generatedPlan={generatedPlan}
          coachReviewRoute={generatedPlanCoachReviewRoute}
          selectedMesoDay={selectedMesoDay}
          phaseNumber={phaseNumber}
          selectedClient={selectedClient}
          onSaveDraft={onSaveDraft}
          onSaveAndActivate={onSaveAndActivate}
          onUpdateLoaded={onUpdateLoaded}
          onUpdateAndActivate={onUpdateAndActivate}
          onDuplicateLoadedPlan={onDuplicateLoadedPlan}
          onCreatePdf={onCreatePdf}
          onSelectExercise={onSelectExercise}
          onUpdateExercise={onUpdateExercise}
          onRemoveExercise={onRemoveExercise}
          onBrowseAddExercise={onBrowseAddExercise}
          onSelectGuidedCandidate={onSelectGuidedCandidate}
          onClearGuidedCandidates={onClearGuidedCandidates}
          onToggleExplanations={onToggleExplanations}
          onSelectedMesoDayChange={onSelectedMesoDayChange}
          onPhaseNumberChange={onPhaseNumberChange}
        />
        {teachModeOpen && <TeachModeSidebar {...teachModeProps} onClose={onTeachModeToggle} />}
      </ThreePanel>

      <WorkoutPlannerSavedPlansSection
        clients={clients}
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
        onSetPrimary={onSetPrimary}
        pdfDialogPlan={pdfDialogPlan}
        pdfDialogMode={pdfDialogMode}
        pdfSaving={pdfSaving}
        pdfOpening={pdfOpening}
        onViewPdf={onViewPdf}
        onUpdatePdf={onUpdatePdf}
        onSavePdf={onSavePdf}
        onUploadPdf={onUploadPdf}
        onClosePdfDialog={onClosePdfDialog}
        activePlanLoggerRoute={activePlanLoggerRoute}
      />
      <WorkoutPlannerConfirmDialog request={request} onClose={onClose} />
    </Page>
  );
};

export default WorkoutPlannerPageLayout;
