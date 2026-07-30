/**
 * COMPONENT: WorkoutPlannerPage
 * PURPOSE: Admin/trainer workout planning orchestration.
 * FLOW: route client -> AI/manual plan -> save/activate -> saved-plan vault.
 * Keep rendering, styles, helpers, and network actions extracted.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import WorkoutPlannerPageLayout from './WorkoutPlannerPageLayout';
import { type WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { useWorkoutPlannerClientState } from './useWorkoutPlannerClientState';
import { useWorkoutPlannerEquipmentProfileState } from './useWorkoutPlannerEquipmentProfileState';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';
import { useWorkoutPlannerPageActions } from './useWorkoutPlannerPageActions';
import { useWorkoutPlannerPlanContentState } from './useWorkoutPlannerPlanContentState';
import { useWorkoutPlannerRolodexState } from './useWorkoutPlannerRolodexState';
import { useWorkoutPlannerCoachSurface } from './useWorkoutPlannerCoachSurface';
import { type PlannerHorizonSelection } from './workoutPlannerAiEvents.types';
import { applyPlannerGenerateOverrides, type PlannerGenerateOverrides } from './workoutPlannerGenerateIntent';
import { useWorkoutPlannerTrainingStyleState } from './useWorkoutPlannerTrainingStyleState';
import { useWorkoutPlannerLoadPlanActions } from './useWorkoutPlannerLoadPlanActions';
import { useWorkoutPlannerRoutePlanLoad } from './useWorkoutPlannerRoutePlanLoad';
import { useWorkoutPlannerPdfActions } from './useWorkoutPlannerPdfActions';
import { useWorkoutPlannerSaveActions } from './useWorkoutPlannerSaveActions';
import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';
import { type WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import { buildWorkoutPlannerSelfClient, parseWorkoutPlannerClientId } from './WorkoutPlannerClientIdentity';
import { type PlanExercise, type WorkoutCategory, type GeneratedPlan, type PlanDuration, OPT_PHASES, type PlanGoal } from './WorkoutPlannerTypes';
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';
import { generationModeForPlannerView, readPlannerViewMode } from './plannerViewMode';
import { resolveWorkoutPlannerReturnTo } from './workoutPlannerReturnTo';
import { useWorkoutPlannerDebateResultHydration } from './workoutPlannerDebateResultHydration';
const WorkoutPlannerPage: React.FC = () => {
  const { authAxios, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmRequest, setConfirmRequest] = useState<WorkoutPlannerConfirmRequest | null>(null);
  const closeConfirmDialog = useCallback(() => setConfirmRequest(null), []);

  const routeRequestedClientId = useMemo(() => parseWorkoutPlannerClientId(searchParams.get('clientId')), [searchParams]);
  const selfPlannerClient = useMemo(() => buildWorkoutPlannerSelfClient(user, searchParams.get('self') === '1' && !routeRequestedClientId), [routeRequestedClientId, searchParams, user]);
  const requestedClientId = selfPlannerClient?.id ?? routeRequestedClientId;
  const plannerReturnTo = useMemo(
    () => resolveWorkoutPlannerReturnTo(searchParams.get('returnTo'), user?.role),
    [searchParams, user?.role],
  );

  const [phaseNumber, setPhaseNumber] = useState(2); const [category, setCategory] = useState<WorkoutCategory>('full_body');
  const [goal, setGoal] = useState<PlanGoal>('general_fitness'); const [planDuration, setPlanDuration] = useState<PlanDuration>('single');
  const [generationMode, setGenerationMode] = useState<SwanCoachGenerationMode>(() => generationModeForPlannerView(readPlannerViewMode())); const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [selectedMesoDay, setSelectedMesoDay] = useState(1); const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<WorkoutPlannerStatusMessage | null>(null);
  const [selectedHorizonTarget, setSelectedHorizonTarget] = useState<PlannerHorizonSelection | null>(null);
  const phase = useMemo(() => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1], [phaseNumber]);
  const { trainingIntensityMode, hardcoreMethod, setHardcoreMethod, handleTrainingIntensityModeChange } = useWorkoutPlannerTrainingStyleState();

  const handleSwapBlocked = useCallback((text: string) => setStatusMsg({ type: 'error', text }), []);
  const {
    selectedExercise,
    setSelectedExercise, swapTarget, beginSwap, cancelSwap, beginHorizonSwap, removeHorizonExerciseAt,
    filteredExerciseCount,
    activeFilterCount,
    exercisesLoading,
    searchQuery,
    filterCategory,
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
    exerciseRowRenderer, searchExercises,
    setSearchQuery,
    setFilterCategory,
    setSourceFilter,
    setExerciseTypeFilter,
    setEquipmentFilter,
    setImpactFilter,
    clearSearchForBrowse, clearRolodexFilters,
  } = useWorkoutPlannerRolodexState({ phase, planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, onSwapBlocked: handleSwapBlocked });

  const {
    loadedPlanId,
    loadedPlanName,
    categoryLabel,
    hasGeneratedHorizonPlan,
    currentExercisesSig,
    isDirty,
    buildPlanData,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    resetLoadedPlanState,
  } = useWorkoutPlannerPlanContentState({
    phase,
    phaseNumber,
    category,
    goal,
    planExercises,
    generatedPlan,
  });

  const {
    equipmentProfiles,
    equipmentProfilesLoading,
    selectedEquipmentProfileId,
    handleEquipmentProfileChange,
  } = useWorkoutPlannerEquipmentProfileState({
    authAxios,
    userId: user?.id,
    userRole: user?.role,
  });

  const {
    generating,
    generatingPlan,
    degradedIntelligence,
    explanations,
    showExplanations,
    guidedCandidates,
    generatingCandidates,
    safetyGateReview, acknowledgingSafetyGate, confirmSafetyGateReview, cancelSafetyGateReview,
    clearExplanations, clearGuidedCandidates,
    handleSwanCoachWorkoutGenerate, handleGeneratePlan,
    handleSelectGuidedCandidate, handleToggleExplanations,
  } = useWorkoutPlannerGenerationActions({
    authAxios,
    category,
    goal,
    phaseNumber,
    planDuration,
    sessionsPerWeek,
    selectedEquipmentProfileId,
    trainingIntensityMode,
    hardcoreMethod,
    generationMode,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber,
    setStatusMsg,
    resetLoadedPlanState,
  });

  const {
    clients,
    selectedClientId,
    clientsLoading,
    selectedClient,
    clientSelfGenStatus,
    isViewerClient,
    clientGenBlocked,
    handleClientSelectionChange,
  } = useWorkoutPlannerClientState({
    authAxios,
    user,
    requestedClientId,
    selfClient: selfPlannerClient,
    setPlanExercises,
    setGeneratedPlan,
    clearExplanations,
    resetLoadedPlanState,
  });

  useWorkoutPlannerDebateResultHydration({ authAxios, debateJobId: searchParams.get('debateJobId'), selectedClientId, selectedClientName: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : undefined, setGeneratedPlan, setPlanExercises, setStatusMsg, resetLoadedPlanState });

  const requestSwanCoachWorkoutForSelectedClient = useCallback((overrides?: PlannerGenerateOverrides) => { applyPlannerGenerateOverrides(overrides, { setCategory, setGoal, setPhaseNumber }); void handleSwanCoachWorkoutGenerate(selectedClientId, overrides); }, [handleSwanCoachWorkoutGenerate, selectedClientId]);
  const requestPlanGenerateForSelectedClient = useCallback(() => { void handleGeneratePlan(selectedClientId); }, [handleGeneratePlan, selectedClientId]);
  const coachDock = useWorkoutPlannerCoachSurface({ selectedClientId, planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, selectedHorizonTarget, searchExercises, onGenerate: requestSwanCoachWorkoutForSelectedClient, phase, phaseNumber });

  const {
    savedPlans, savedPlansClientId, savedPlansLoading, fetchSavedPlans, archiveBlockedFor,
    handleCardActivate, handlePlanSetPrimary, handleCardRename, handleCardDuplicate, handleCardArchive,
    pdfDialogPlan, pdfDialogMode, pdfSaving, pdfOpening,
    handlePlanPdfView, handlePlanPdfUpdate, handlePlanPdfSave, handlePlanPdfUpload, closePlanPdfDialog,
  } = useWorkoutPlannerSavedPlansState({
    authAxios,
    selectedClientId,
    loadedPlanId,
    currentExercisesSig,
    setSavedSnapshot,
    setLoadedPlanName,
    resetLoadedPlanState,
    setStatusMsg,
    setConfirmRequest,
  });

  const {
    saving,
    handleSaveDraft,
    handleSaveAndActivate,
    handleUpdateLoaded,
    handleUpdateAndActivate,
  } = useWorkoutPlannerSaveActions({
    authAxios,
    selectedClientId,
    planExercisesLength: planExercises.length,
    hasGeneratedHorizonPlan,
    loadedPlanId, loadedPlanRevision: savedPlans.find((plan) => plan.id === loadedPlanId)?.contentRevision ?? 1,
    planDuration,
    userRole: user?.role,
    phaseName: phase.name,
    phaseNumber,
    categoryLabel,
    goal,
    clients,
    buildPlanData,
    currentExercisesSig,
    fetchSavedPlans,
    setSavedSnapshot,
    setLoadedPlanId,
    setLoadedPlanName,
    setStatusMsg,
  });

  const { handleCreateBuilderPdf } = useWorkoutPlannerPdfActions({ selectedClient, planExercisesLength: planExercises.length, hasGeneratedHorizonPlan, planDuration, userRole: user?.role, goal, phaseNumber, buildPlanData, setStatusMsg });
  const { loadPlanIntoBuilder } = useWorkoutPlannerLoadPlanActions({
    authAxios,
    selectedClientId,
    phaseName: phase.name,
    phaseNumber,
    category,
    goal,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber,
    setGoal,
    setCategory,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    setStatusMsg,
  });

  useWorkoutPlannerRoutePlanLoad({ loadPlanIntoBuilder, requestedPlanId: searchParams.get('planId'), routeClientId: routeRequestedClientId, routeMode: searchParams.get('mode'), savedPlans, savedPlansClientId, selectedClientId, setStatusMsg });
  const {
    removeExercise,
    updateExercise,
    handleLoadPlan,
    handleReturnToClientHub,
    handleTeachModeToggle,
    handlePlanDurationChange,
    handleDuplicateLoadedPlan,
    handleBrowseAddExercise,
  } = useWorkoutPlannerPageActions({
    plannerReturnTo,
    navigate,
    isDirty,
    loadedPlanId,
    loadedPlanName,
    loadPlanIntoBuilder,
    handleCardDuplicate,
    clearSearchForBrowse,
    setTeachModeOpen,
    setPlanDuration,
    setGeneratedPlan,
    setPlanExercises,
    setConfirmRequest,
  });

  return <WorkoutPlannerPageLayout {...{
    plannerReturnTo, teachModeOpen, clients, clientsLoading, selectedClientId, selectedClient, phaseNumber, category,
    goal, planDuration, sessionsPerWeek, equipmentProfiles, trainingIntensityMode, hardcoreMethod, generationMode, equipmentProfilesLoading,
    selectedEquipmentProfileId, generating, generatingPlan, clientGenBlocked, clientSelfGenStatus, isViewerClient, statusMsg, degradedIntelligence,
    filteredExerciseCount, activeFilterCount, exercisesLoading, searchQuery, filterCategory, sourceFilter,
    exerciseTypeFilter, equipmentFilter, impactFilter, exerciseRowRenderer, saving, planExercises,
    hasGeneratedHorizonPlan, loadedPlanId, savedPlans, isDirty, phase, explanations, showExplanations,
    generatedPlan, selectedMesoDay, guidedCandidates, generatingCandidates, savedPlansLoading, archiveBlockedFor, request: confirmRequest,
    safetyGateReview, acknowledgingSafetyGate, onConfirmSafetyGate: confirmSafetyGateReview, onCancelSafetyGate: cancelSafetyGateReview,
    teachModeProps: { exercise: selectedExercise, phaseNumber, onPhaseChange: setPhaseNumber }, coachDock,
    onReturnToClientHub: handleReturnToClientHub, onTeachModeToggle: handleTeachModeToggle,
    onClientSelectionChange: handleClientSelectionChange, onPhaseNumberChange: setPhaseNumber,
    onCategoryChange: setCategory, onGoalChange: setGoal, onEquipmentProfileChange: handleEquipmentProfileChange,
    onPlanDurationChange: handlePlanDurationChange, onSessionsPerWeekChange: setSessionsPerWeek, onGenerateSingle: requestSwanCoachWorkoutForSelectedClient,
    onTrainingIntensityModeChange: handleTrainingIntensityModeChange, onHardcoreMethodChange: setHardcoreMethod,
    onGenerationModeChange: setGenerationMode,
    onGeneratePlan: requestPlanGenerateForSelectedClient, hasPlanExercises: planExercises.length > 0 || hasGeneratedHorizonPlan,
    onDismissStatus: () => setStatusMsg(null), onSearchQueryChange: setSearchQuery,
    onFilterCategoryChange: setFilterCategory, onSourceFilterChange: setSourceFilter,
    onExerciseTypeFilterChange: setExerciseTypeFilter, onEquipmentFilterChange: setEquipmentFilter,
    onImpactFilterChange: setImpactFilter, onClearFilters: clearRolodexFilters,
    onSaveDraft: handleSaveDraft, onSaveAndActivate: handleSaveAndActivate,
    onUpdateLoaded: handleUpdateLoaded, onUpdateAndActivate: handleUpdateAndActivate,
    onDuplicateLoadedPlan: handleDuplicateLoadedPlan, onCreatePdf: handleCreateBuilderPdf, onSelectExercise: setSelectedExercise,
    onUpdateExercise: updateExercise, onRemoveExercise: removeExercise, onBrowseAddExercise: handleBrowseAddExercise, swapTarget, onBeginSwap: beginSwap, onCancelSwap: cancelSwap, onBeginHorizonSwap: beginHorizonSwap, onRemoveHorizonExercise: removeHorizonExerciseAt, onHorizonSelectionChange: setSelectedHorizonTarget,
    onToggleExplanations: handleToggleExplanations, onSelectGuidedCandidate: handleSelectGuidedCandidate,
    onClearGuidedCandidates: clearGuidedCandidates, onSelectedMesoDayChange: setSelectedMesoDay,
    onLoad: handleLoadPlan, onActivate: handleCardActivate, onRename: handleCardRename, onPlansChanged: () => { void fetchSavedPlans(selectedClientId); },
    onDuplicate: handleCardDuplicate, onArchive: handleCardArchive, onSetPrimary: handlePlanSetPrimary,
    pdfDialogPlan, pdfDialogMode, pdfSaving, pdfOpening, onViewPdf: handlePlanPdfView, onUpdatePdf: handlePlanPdfUpdate,
    onSavePdf: handlePlanPdfSave, onUploadPdf: handlePlanPdfUpload, onClosePdfDialog: closePlanPdfDialog, onClose: closeConfirmDialog,
  }} />;
};
export default WorkoutPlannerPage;
