/**
 * HOOK: useWorkoutPlannerOrchestration
 * PURPOSE: S15 (JARVIS blueprint §4.7) — the planner's single behavior spine.
 * Every hook the old 299-line WorkoutPlannerPage called now composes HERE;
 * WorkoutPlannerProvider slices the result into the four planner contexts.
 * FLOW: route params -> client/plan/rolodex/generation state -> save/pdf/load
 * actions -> coach dock surface. Behavior is a verbatim transplant of the
 * pre-S15 page wiring — no logic changes in this slice (S13 fence holds).
 */

import { useState, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { type WorkoutPlannerStatusMessage } from '../WorkoutPlannerStatusAssistantStrip';
import { useWorkoutPlannerClientState } from '../useWorkoutPlannerClientState';
import { useWorkoutPlannerEquipmentProfileState } from '../useWorkoutPlannerEquipmentProfileState';
import { useWorkoutPlannerGenerationActions } from '../useWorkoutPlannerGenerationActions';
import { useWorkoutPlannerPageActions } from '../useWorkoutPlannerPageActions';
import { useWorkoutPlannerPlanContentState } from '../useWorkoutPlannerPlanContentState';
import { useWorkoutPlannerRolodexState } from '../useWorkoutPlannerRolodexState';
import { useWorkoutPlannerCoachSurface } from '../useWorkoutPlannerCoachSurface';
import { type PlannerHorizonSelection } from '../workoutPlannerAiEvents.types';
import { applyPlannerGenerateOverrides, type PlannerGenerateOverrides } from '../workoutPlannerGenerateIntent';
import { useWorkoutPlannerTrainingStyleState } from '../useWorkoutPlannerTrainingStyleState';
import { useWorkoutPlannerLoadPlanActions } from '../useWorkoutPlannerLoadPlanActions';
import { useWorkoutPlannerRoutePlanLoad } from '../useWorkoutPlannerRoutePlanLoad';
import { useWorkoutPlannerPdfActions } from '../useWorkoutPlannerPdfActions';
import { useWorkoutPlannerSaveActions } from '../useWorkoutPlannerSaveActions';
import { useWorkoutPlannerSavedPlansState } from '../useWorkoutPlannerSavedPlansState';
import { type WorkoutPlannerConfirmRequest } from '../WorkoutPlannerConfirmDialog';
import { buildWorkoutPlannerSelfClient, parseWorkoutPlannerClientId } from '../WorkoutPlannerClientIdentity';
import { type WorkoutCategory, type PlanDuration, type PlanGoal } from '../WorkoutPlannerTypes';
import type { SwanCoachGenerationMode } from '../WorkoutPlannerGuidedCandidateTypes';
import { generationModeForPlannerView, readPlannerViewMode } from '../plannerViewMode';
import { resolveWorkoutPlannerReturnTo } from '../workoutPlannerReturnTo';
import { useWorkoutPlannerDebateResultHydration } from '../workoutPlannerDebateResultHydration';
import { selectPlannerPhase } from '../plannerLogic/plannerSelectors';
import {
  useWorkoutPlannerDraftMutation, type PlannerDayScope,
} from './useWorkoutPlannerDraftMutation';

export const useWorkoutPlannerOrchestration = () => {
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
  // P58: the TWO existing draft state values, moved mechanically into the one
  // owner helper. Same values, same setter signatures, same provider ownership.
  const draftMutation = useWorkoutPlannerDraftMutation();
  const { planExercises, generatedPlan, setPlanExercises, setGeneratedPlan } = draftMutation;
  const [selectedMesoDay, setSelectedMesoDay] = useState(1); const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<WorkoutPlannerStatusMessage | null>(null);
  const [selectedHorizonTarget, setSelectedHorizonTarget] = useState<PlannerHorizonSelection | null>(null);
  // S17: mobile IA tab (PLANNER_IA_V2 shell only; inert for the V1 tree).
  const [plannerActiveTab, setPlannerActiveTab] = useState<'program' | 'builder' | 'exercises'>('builder');
  const phase = useMemo(() => selectPlannerPhase(phaseNumber), [phaseNumber]);
  const trainingStyle = useWorkoutPlannerTrainingStyleState();
  const selectedClientRef = useRef<number | null>(null);

  // P58: selected-day / phase / duration intents retire accepted add-swap work
  // BEFORE their setter — a day or phase A-B-A inside one tick therefore still
  // retires the old operation permanently.
  const setSelectedHorizonTargetSafely = useCallback<Dispatch<SetStateAction<PlannerHorizonSelection | null>>>((action) => {
    draftMutation.retire();
    setSelectedHorizonTarget(action);
  }, [draftMutation]);
  const setPhaseNumberSafely = useCallback<Dispatch<SetStateAction<number>>>((action) => {
    draftMutation.retire();
    setPhaseNumber(action);
  }, [draftMutation]);
  const setPlanDurationSafely = useCallback<Dispatch<SetStateAction<PlanDuration>>>((action) => {
    draftMutation.beginReplacement();
    setPlanDuration(action);
  }, [draftMutation]);

  const handleSwapBlocked = useCallback((text: string) => setStatusMsg({ type: 'error', text }), []);
  const rolodex = useWorkoutPlannerRolodexState({ phase, planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, onSwapBlocked: handleSwapBlocked });

  const planContent = useWorkoutPlannerPlanContentState({
    phase,
    phaseNumber,
    category,
    goal,
    planExercises,
    generatedPlan,
  });

  const equipment = useWorkoutPlannerEquipmentProfileState({
    authAxios,
    userId: user?.id,
    userRole: user?.role,
  });

  const generation = useWorkoutPlannerGenerationActions({
    authAxios,
    category,
    goal,
    phaseNumber,
    planDuration,
    sessionsPerWeek,
    selectedEquipmentProfileId: equipment.selectedEquipmentProfileId,
    trainingIntensityMode: trainingStyle.trainingIntensityMode,
    hardcoreMethod: trainingStyle.hardcoreMethod,
    generationMode,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber: setPhaseNumberSafely,
    setStatusMsg,
    resetLoadedPlanState: planContent.resetLoadedPlanState,
    onBeforeDraftReplacement: draftMutation.beginReplacement,
    getCurrentClientId: () => selectedClientRef.current,
  });

  const clientState = useWorkoutPlannerClientState({
    authAxios,
    user,
    requestedClientId,
    selfClient: selfPlannerClient,
    setPlanExercises,
    setGeneratedPlan,
    clearExplanations: generation.clearExplanations,
    resetLoadedPlanState: planContent.resetLoadedPlanState,
    onBeforeSelectedClientChange: draftMutation.retire,
  });
  const { selectedClientId, selectedClient } = clientState;
  selectedClientRef.current = selectedClientId;

  // P58-R1: bind the committed scope at the committed boundary (raw actor id
  // and raw role from AuthContext, actual target and selected day). A committed
  // identity/day/configuration change retires accepted work even when the
  // change was driven outside the explicit intent wrappers.
  const plannerDayScope = useMemo<PlannerDayScope>(() => {
    const selected = selectedHorizonTarget
      ?? (generatedPlan?.weeks?.length ? { weekNumber: generatedPlan.weeks[0].weekNumber, dayIndex: 0 } : null);
    return generatedPlan?.weeks?.length && selected
      ? { kind: 'horizon', weekNumber: selected.weekNumber, dayIndex: selected.dayIndex }
      : { kind: 'builder' };
  }, [generatedPlan, selectedHorizonTarget]);
  const plannerRouteKey = `${searchParams.get('planId') ?? ''}|${searchParams.get('mode') ?? ''}|${searchParams.get('debateJobId') ?? ''}`;
  useLayoutEffect(() => {
    draftMutation.bindScope({
      actorId: user?.id ?? null,
      actorRole: user?.role ?? null,
      targetClientId: selectedClientId,
      clientsLoading: clientState.clientsLoading,
      day: plannerDayScope,
      configurationKey: plannerRouteKey,
    });
  }, [draftMutation, user?.id, user?.role, selectedClientId, clientState.clientsLoading, plannerDayScope, plannerRouteKey]);

  useWorkoutPlannerDebateResultHydration({ authAxios, debateJobId: searchParams.get('debateJobId'), selectedClientId, selectedClientName: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : undefined, setGeneratedPlan, setPlanExercises, setStatusMsg, resetLoadedPlanState: planContent.resetLoadedPlanState });

  const { handleSwanCoachWorkoutGenerate, handleGeneratePlan } = generation;
  const requestSwanCoachWorkoutForSelectedClient = useCallback((overrides?: PlannerGenerateOverrides) => { applyPlannerGenerateOverrides(overrides, { setCategory, setGoal, setPhaseNumber: setPhaseNumberSafely }); void handleSwanCoachWorkoutGenerate(selectedClientId, overrides); }, [handleSwanCoachWorkoutGenerate, selectedClientId, setPhaseNumberSafely]);
  const requestPlanGenerateForSelectedClient = useCallback(() => { void handleGeneratePlan(selectedClientId); }, [handleGeneratePlan, selectedClientId]);
  const coachDock = useWorkoutPlannerCoachSurface({ selectedClientId, planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, selectedHorizonTarget, searchExercises: rolodex.searchExercises, onGenerate: requestSwanCoachWorkoutForSelectedClient, phase, phaseNumber, draftMutation });

  const savedPlansState = useWorkoutPlannerSavedPlansState({
    authAxios,
    selectedClientId,
    loadedPlanId: planContent.loadedPlanId,
    currentExercisesSig: planContent.currentExercisesSig,
    setSavedSnapshot: planContent.setSavedSnapshot,
    setLoadedPlanName: planContent.setLoadedPlanName,
    resetLoadedPlanState: planContent.resetLoadedPlanState,
    setStatusMsg,
    setConfirmRequest,
  });

  const saveActions = useWorkoutPlannerSaveActions({
    authAxios,
    selectedClientId,
    planExercisesLength: planExercises.length,
    hasGeneratedHorizonPlan: planContent.hasGeneratedHorizonPlan,
    loadedPlanId: planContent.loadedPlanId, loadedPlanRevision: planContent.loadedPlanRevision,
    planDuration,
    userRole: user?.role,
    phaseName: phase.name,
    phaseNumber,
    categoryLabel: planContent.categoryLabel,
    goal,
    clients: clientState.clients,
    buildPlanData: planContent.buildPlanData,
    currentExercisesSig: planContent.currentExercisesSig,
    fetchSavedPlans: savedPlansState.fetchSavedPlans,
    setSavedSnapshot: planContent.setSavedSnapshot,
    setLoadedPlanId: planContent.setLoadedPlanId,
    setLoadedPlanName: planContent.setLoadedPlanName,
    setLoadedPlanRevision: planContent.setLoadedPlanRevision,
    setStatusMsg,
  });

  const pdf = useWorkoutPlannerPdfActions({ selectedClient, planExercisesLength: planExercises.length, hasGeneratedHorizonPlan: planContent.hasGeneratedHorizonPlan, planDuration, userRole: user?.role, goal, phaseNumber, buildPlanData: planContent.buildPlanData, setStatusMsg });
  const loadPlan = useWorkoutPlannerLoadPlanActions({
    authAxios,
    selectedClientId,
    phaseName: phase.name,
    phaseNumber,
    category,
    goal,
    buildGeneratedSnapshot: planContent.buildGeneratedSnapshot,
    buildManualSnapshot: planContent.buildManualSnapshot,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber: setPhaseNumberSafely,
    setGoal,
    setCategory,
    setLoadedPlanId: planContent.setLoadedPlanId,
    setLoadedPlanName: planContent.setLoadedPlanName,
    setLoadedPlanRevision: planContent.setLoadedPlanRevision,
    setSavedSnapshot: planContent.setSavedSnapshot,
    setStatusMsg,
    onBeforeDraftReplacement: draftMutation.beginReplacement,
  });

  useWorkoutPlannerRoutePlanLoad({ loadPlanIntoBuilder: loadPlan.loadPlanIntoBuilder, requestedPlanId: searchParams.get('planId'), routeClientId: routeRequestedClientId, routeMode: searchParams.get('mode'), savedPlans: savedPlansState.savedPlans, savedPlansClientId: savedPlansState.savedPlansClientId, selectedClientId, setStatusMsg });

  const pageActions = useWorkoutPlannerPageActions({
    plannerReturnTo,
    navigate,
    isDirty: planContent.isDirty,
    loadedPlanId: planContent.loadedPlanId,
    loadedPlanName: planContent.loadedPlanName,
    loadPlanIntoBuilder: loadPlan.loadPlanIntoBuilder,
    handleCardDuplicate: savedPlansState.handleCardDuplicate,
    clearSearchForBrowse: rolodex.clearSearchForBrowse,
    setTeachModeOpen,
    setPlanDuration: setPlanDurationSafely,
    setGeneratedPlan,
    setPlanExercises,
    setConfirmRequest,
  });

  return {
    plannerReturnTo,
    local: {
      phaseNumber, category, goal, planDuration, generationMode, sessionsPerWeek,
      planExercises, generatedPlan, selectedMesoDay, teachModeOpen, statusMsg,
      selectedHorizonTarget, phase, confirmRequest,
    },
    setters: {
      setPhaseNumber: setPhaseNumberSafely, setCategory, setGoal, setGenerationMode, setSessionsPerWeek,
      setSelectedMesoDay, setSelectedHorizonTarget: setSelectedHorizonTargetSafely, setStatusMsg, setPlannerActiveTab,
    },
    plannerActiveTab,
    trainingStyle, rolodex, planContent, equipment, generation, clientState,
    savedPlansState, saveActions, pdf, coachDock, pageActions,
    requestSwanCoachWorkoutForSelectedClient, requestPlanGenerateForSelectedClient,
    closeConfirmDialog,
  };
};

export type WorkoutPlannerOrchestration = ReturnType<typeof useWorkoutPlannerOrchestration>;
