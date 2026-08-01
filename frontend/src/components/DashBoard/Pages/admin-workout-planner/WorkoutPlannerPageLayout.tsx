/**
 * COMPONENT: WorkoutPlannerPageLayout
 * PURPOSE: Owns the rendered workout planner shell. S15: consumes the four
 * planner contexts (Data / UI / Actions / Voice) instead of a 179-prop
 * boundary — the JSX below is byte-equivalent to the pre-S15 tree so the
 * S13 golden snapshots hold. Panels keep their prop APIs; only this
 * boundary changed. Zero props (blueprint cap: ≤12).
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import TeachModeSidebar from './TeachModeSidebar';
import WorkoutPlannerBuilderPanel from './WorkoutPlannerBuilderPanel';
import WorkoutPlannerCoachDock from './WorkoutPlannerCoachDock';
import WorkoutPlannerCommandPanel from './WorkoutPlannerCommandPanel';
import WorkoutPlannerCommandPanelV2 from './WorkoutPlannerCommandPanelV2';
import WorkoutPlannerV2Shell from './WorkoutPlannerV2Shell';
import WorkoutPlannerRolodexPanelV2 from './WorkoutPlannerRolodexPanelV2';
import PlannerSaveBarBinding from './PlannerSaveBarBinding';
import { isPlannerIaV2Enabled } from './plannerIaV2Flag';
import { isPlannerLensStylesEnabled } from './lens/plannerLensFlag';
import PlannerLensHost from './lens/PlannerLensHost';
import WorkoutPlannerConfirmDialog from './WorkoutPlannerConfirmDialog';
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import WorkoutPlannerSavedPlansSection from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerStatusAssistantStrip from './WorkoutPlannerStatusAssistantStrip';
import WorkoutPlannerLensFrame from './WorkoutPlannerLensFrame';
import SafetyGateModal from '../../../cortex/SafetyGateModal';
import { Page, ThreePanel } from './WorkoutPlannerStyles';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerUI } from './plannerContexts/PlannerUIContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';
import { usePlannerVoice } from './plannerContexts/PlannerVoiceContext';
import {
  buildWorkoutPlannerCoachReviewRoute,
  buildWorkoutPlannerLoggerRoute,
} from './workoutPlannerHandoffRoutes';

const WorkoutPlannerPageLayout: React.FC = () => {
  const data = usePlannerData();
  const ui = usePlannerUI();
  const act = usePlannerActions();
  const { coachDock } = usePlannerVoice();

  const { plannerReturnTo } = data;
  const {
    phaseNumber, category, goal, planDuration, sessionsPerWeek, generationMode,
    planExercises, generatedPlan, selectedMesoDay, phase,
  } = data.local;
  const { teachModeOpen, statusMsg, confirmRequest, safetyGateReview, acknowledgingSafetyGate } = ui;
  const { trainingIntensityMode, hardcoreMethod } = data.trainingStyle;
  const {
    clients, clientsLoading, selectedClientId, selectedClient,
    clientSelfGenStatus, isViewerClient, clientGenBlocked,
  } = data.clientState;
  const { equipmentProfiles, equipmentProfilesLoading, selectedEquipmentProfileId } = data.equipment;
  const {
    generating, generatingPlan, degradedIntelligence, explanations, showExplanations,
    guidedCandidates, generatingCandidates,
  } = data.generation;
  const {
    selectedExercise, swapTarget, filteredExerciseCount, activeFilterCount, exercisesLoading,
    searchQuery, filterCategory, sourceFilter, exerciseTypeFilter, equipmentFilter, impactFilter,
    exerciseRowRenderer,
  } = data.rolodex;
  const { loadedPlanId, hasGeneratedHorizonPlan, isDirty } = data.planContent;
  const {
    savedPlans, savedPlansLoading, archiveBlockedFor,
    pdfDialogPlan, pdfDialogMode, pdfSaving, pdfOpening,
  } = data.savedPlansState;
  const { saving } = data.saveActions;
  const hasPlanExercises = planExercises.length > 0 || hasGeneratedHorizonPlan;

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
    generatedPlan,
  }), [generatedPlan, location.pathname, location.search, selectedClientId]);

  return (
    <WorkoutPlannerLensFrame>
    <Page>
      {/* S16: V2 command panel ships DARK — PLANNER_IA_V2 default OFF. */}
      {isPlannerIaV2Enabled() ? <WorkoutPlannerCommandPanelV2 /> : (
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
        onReturnToClientHub={act.pageActions.handleReturnToClientHub}
        onTeachModeToggle={act.pageActions.handleTeachModeToggle}
        onClientSelectionChange={act.clientState.handleClientSelectionChange}
        onPhaseNumberChange={act.setters.setPhaseNumber}
        onCategoryChange={act.setters.setCategory}
        onGoalChange={act.setters.setGoal}
        onEquipmentProfileChange={act.equipment.handleEquipmentProfileChange}
        onPlanDurationChange={act.pageActions.handlePlanDurationChange}
        onSessionsPerWeekChange={act.setters.setSessionsPerWeek}
        onTrainingIntensityModeChange={act.trainingStyle.handleTrainingIntensityModeChange}
        onHardcoreMethodChange={act.trainingStyle.setHardcoreMethod}
        onGenerationModeChange={act.setters.setGenerationMode}
        onGenerateSingle={act.requestSwanCoachWorkoutForSelectedClient}
        onGeneratePlan={act.requestPlanGenerateForSelectedClient}
      />
      )}

      <WorkoutPlannerStatusAssistantStrip
        statusMsg={statusMsg}
        plannerReturnTo={plannerReturnTo}
        activePlanLoggerRoute={activePlanLoggerRoute}
        selectedClientId={selectedClientId}
        degradedIntelligence={degradedIntelligence}
        hasPlanExercises={hasPlanExercises}
        onReturnToClientHub={act.pageActions.handleReturnToClientHub}
        onDismissStatus={() => act.setters.setStatusMsg(null)}
      />

      {(() => {
      const iaV2 = isPlannerIaV2Enabled();
      const rolodexEl = (
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
          onSearchQueryChange={act.rolodex.setSearchQuery}
          onFilterCategoryChange={act.rolodex.setFilterCategory}
          onSourceFilterChange={act.rolodex.setSourceFilter}
          onExerciseTypeFilterChange={act.rolodex.setExerciseTypeFilter}
          onEquipmentFilterChange={act.rolodex.setEquipmentFilter}
          onImpactFilterChange={act.rolodex.setImpactFilter}
          onClearFilters={act.rolodex.clearRolodexFilters}
        />
      );
      const builderEl = (
        <WorkoutPlannerBuilderPanel
          legacyActionsHidden={iaV2}
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
          onSaveDraft={act.saveActions.handleSaveDraft}
          onSaveAndActivate={act.saveActions.handleSaveAndActivate}
          onUpdateLoaded={act.saveActions.handleUpdateLoaded}
          onUpdateAndActivate={act.saveActions.handleUpdateAndActivate}
          onDuplicateLoadedPlan={act.pageActions.handleDuplicateLoadedPlan}
          onCreatePdf={act.pdf.handleCreateBuilderPdf}
          swapTarget={swapTarget}
          onSelectExercise={act.rolodex.setSelectedExercise}
          onUpdateExercise={act.pageActions.updateExercise}
          onRemoveExercise={act.pageActions.removeExercise}
          onBeginSwap={act.rolodex.beginSwap}
          onCancelSwap={act.rolodex.cancelSwap}
          onBeginHorizonSwap={act.rolodex.beginHorizonSwap}
          onRemoveHorizonExercise={act.rolodex.removeHorizonExerciseAt}
          onHorizonSelectionChange={act.setters.setSelectedHorizonTarget}
          onBrowseAddExercise={act.pageActions.handleBrowseAddExercise}
          onSelectGuidedCandidate={act.generation.handleSelectGuidedCandidate}
          onClearGuidedCandidates={act.generation.clearGuidedCandidates}
          onToggleExplanations={act.generation.handleToggleExplanations}
          onSelectedMesoDayChange={act.setters.setSelectedMesoDay}
          onPhaseNumberChange={act.setters.setPhaseNumber}
        />
      );
      const teachEl = teachModeOpen
        ? <TeachModeSidebar exercise={selectedExercise} phaseNumber={phaseNumber} onPhaseChange={act.setters.setPhaseNumber} onClose={act.pageActions.handleTeachModeToggle} />
        : null;
      // planner_* commands are admin/trainer only — no dock for client self-planner viewers (R1).
      const coachDockEl = !isViewerClient && <WorkoutPlannerCoachDock {...coachDock} clientName={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}`.trim() : null} />;

      if (iaV2) {
        return (
          <WorkoutPlannerV2Shell
            teachModeOpen={teachModeOpen}
            rolodex={<WorkoutPlannerRolodexPanelV2 />}
            builder={builderEl}
            teach={teachEl}
            coachDock={coachDockEl || undefined}
            saveBar={<PlannerSaveBarBinding />}
          />
        );
      }
      // S19: the lens fleet replaces the ThreePanel region ONLY under its
      // flag; studio-classic renders this exact tree, so OFF and ON-default
      // are the same pixels (L9).
      if (isPlannerLensStylesEnabled()) {
        return <PlannerLensHost teachModeOpen={teachModeOpen} rolodex={rolodexEl} builder={builderEl} teach={teachEl} coachDock={coachDockEl} />;
      }
      return (
        <>
          <ThreePanel $teachModeOpen={teachModeOpen}>
            {rolodexEl}
            {builderEl}
            {teachEl}
          </ThreePanel>
          {coachDockEl}
        </>
      );
      })()}

      <WorkoutPlannerSavedPlansSection
        selectedClientId={selectedClientId}
        savedPlans={savedPlans}
        savedPlansLoading={savedPlansLoading}
        loadedPlanId={loadedPlanId}
        archiveBlockedFor={archiveBlockedFor}
        onLoad={act.pageActions.handleLoadPlan}
        onActivate={act.savedPlansState.handleCardActivate}
        onRename={act.savedPlansState.handleCardRename}
        onDuplicate={act.savedPlansState.handleCardDuplicate}
        onArchive={act.savedPlansState.handleCardArchive}
        onSetPrimary={act.savedPlansState.handlePlanSetPrimary}
        pdfDialogPlan={pdfDialogPlan}
        pdfDialogMode={pdfDialogMode}
        pdfSaving={pdfSaving}
        pdfOpening={pdfOpening}
        onViewPdf={act.savedPlansState.handlePlanPdfView}
        onUpdatePdf={act.savedPlansState.handlePlanPdfUpdate}
        onSavePdf={act.savedPlansState.handlePlanPdfSave}
        onUploadPdf={act.savedPlansState.handlePlanPdfUpload}
        onClosePdfDialog={act.savedPlansState.closePlanPdfDialog}
        activePlanLoggerRoute={activePlanLoggerRoute}
        onPlansChanged={() => { void act.savedPlansState.fetchSavedPlans(selectedClientId); }}
      />
      <WorkoutPlannerConfirmDialog request={confirmRequest} onClose={act.closeConfirmDialog} />
      <SafetyGateModal
        open={Boolean(safetyGateReview)}
        signals={safetyGateReview?.signals ?? []}
        missingData={safetyGateReview?.missingData ?? []}
        confirming={acknowledgingSafetyGate}
        onConfirm={act.generation.confirmSafetyGateReview}
        onCancel={act.generation.cancelSafetyGateReview}
      />
    </Page>
    </WorkoutPlannerLensFrame>
  );
};

export default WorkoutPlannerPageLayout;
