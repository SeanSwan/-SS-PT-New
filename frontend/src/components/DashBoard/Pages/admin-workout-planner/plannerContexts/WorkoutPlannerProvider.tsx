/**
 * COMPONENT: WorkoutPlannerProvider (S15 — JARVIS blueprint §4.7)
 * PURPOSE: Runs the planner orchestration once and slices it into the four
 * planner contexts (Data / UI / Actions / Voice). This is the ONLY place
 * planner state is assembled; the page mounts it, the layout consumes it.
 * NOTE on memoization: context values are rebuilt per render — identical to
 * the pre-S15 inline-props boundary (the layout was already re-rendered
 * every page render). Lens-fleet slices (S19+) may tighten this if profiled.
 */

import React from 'react';
import { useWorkoutPlannerOrchestration } from './useWorkoutPlannerOrchestration';
import { PlannerDataContext } from './PlannerDataContext';
import { PlannerUIContext } from './PlannerUIContext';
import { PlannerActionsContext } from './PlannerActionsContext';
import { PlannerVoiceContext } from './PlannerVoiceContext';

/** S6-S10 seam: idle voice defaults until the VOICE_MODE_V2 pipeline lands. */
const IDLE_VOICE_STATE = {
  voiceState: 'idle' as const,
  transcript: null as string | null,
  pendingDecodedRows: [] as readonly unknown[],
  clarifyQuestion: null as string | null,
};

const buildContextValues = (o: ReturnType<typeof useWorkoutPlannerOrchestration>) => {
  const data = {
    plannerReturnTo: o.plannerReturnTo,
    local: o.local,
    trainingStyle: o.trainingStyle,
    rolodex: o.rolodex,
    planContent: o.planContent,
    equipment: o.equipment,
    generation: o.generation,
    clientState: o.clientState,
    savedPlansState: o.savedPlansState,
    saveActions: o.saveActions,
  };
  const ui = {
    plannerActiveTab: o.plannerActiveTab,
    teachModeOpen: o.local.teachModeOpen,
    statusMsg: o.local.statusMsg,
    confirmRequest: o.local.confirmRequest,
    safetyGateReview: o.generation.safetyGateReview,
    acknowledgingSafetyGate: o.generation.acknowledgingSafetyGate,
  };
  const actions = {
    setters: o.setters,
    pageActions: o.pageActions,
    rolodex: o.rolodex,
    generation: o.generation,
    savedPlansState: o.savedPlansState,
    saveActions: o.saveActions,
    pdf: o.pdf,
    equipment: o.equipment,
    clientState: o.clientState,
    trainingStyle: o.trainingStyle,
    requestSwanCoachWorkoutForSelectedClient: o.requestSwanCoachWorkoutForSelectedClient,
    requestPlanGenerateForSelectedClient: o.requestPlanGenerateForSelectedClient,
    closeConfirmDialog: o.closeConfirmDialog,
  };
  const voice = { ...IDLE_VOICE_STATE, coachDock: o.coachDock };
  return { data, ui, actions, voice };
};

export type PlannerDataValue = ReturnType<typeof buildContextValues>['data'];
export type PlannerUIValue = ReturnType<typeof buildContextValues>['ui'];
export type PlannerActionsValue = ReturnType<typeof buildContextValues>['actions'];
export type PlannerVoiceValue = ReturnType<typeof buildContextValues>['voice'];

const WorkoutPlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const orchestration = useWorkoutPlannerOrchestration();
  const { data, ui, actions, voice } = buildContextValues(orchestration);

  return (
    <PlannerDataContext.Provider value={data}>
      <PlannerUIContext.Provider value={ui}>
        <PlannerActionsContext.Provider value={actions}>
          <PlannerVoiceContext.Provider value={voice}>
            {children}
          </PlannerVoiceContext.Provider>
        </PlannerActionsContext.Provider>
      </PlannerUIContext.Provider>
    </PlannerDataContext.Provider>
  );
};

export default WorkoutPlannerProvider;
