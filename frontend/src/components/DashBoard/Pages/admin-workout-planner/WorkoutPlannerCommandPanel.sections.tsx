/**
 * Sections: WorkoutPlannerCommandPanel
 * Purpose: Keep the planner command strip readable by isolating header,
 * select controls, generation status, and duration controls.
 */

import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Dumbbell,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type {
  PlanDuration,
  PlannerEquipmentProfile,
  PlanGoal,
  PlannerClient,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';
import { workoutPlannerReturnLabel } from './workoutPlannerReturnTo';
import { generationModeForPlannerView, readPlannerViewMode, writePlannerViewMode, type PlannerViewMode } from './plannerViewMode';
import {
  OPT_PHASES,
  PLAN_DURATIONS,
  PLAN_GOALS,
  WORKOUT_CATEGORIES,
} from './WorkoutPlannerTypes';
import {
  ActionBtn,
  ClientSelfGenPill,
  ControlRow,
  Header,
  HeaderIcon,
  HeaderLeft,
  PillHint,
  PlanModeBar,
  PlanModeLabel,
  Select,
  SmallSelect,
  Subtitle,
  TeachToggle,
  Title,
} from './WorkoutPlannerStyles';
import {
  type ClientSelfGenerationStatus,
  SESSION_OPTIONS,
  clientOptions,
  equipmentPlaceholder,
  formatEquipmentLocation,
  generationHandler,
  generationLabel,
  generationTitle,
  selfGenerationLabel,
} from './WorkoutPlannerCommandPanel.options';

interface HeaderSectionProps {
  plannerReturnTo: string | null;
  teachModeOpen: boolean;
  onReturnToClientHub: () => void;
  onTeachModeToggle: () => void;
  onGenerationModeChange: (mode: SwanCoachGenerationMode) => void;
}

interface ControlsSectionProps {
  clients: PlannerClient[];
  clientsLoading: boolean;
  selectedClientId: number | null;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planDuration: PlanDuration;
  generationMode: SwanCoachGenerationMode;
  equipmentProfiles: PlannerEquipmentProfile[];
  equipmentProfilesLoading: boolean;
  selectedEquipmentProfileId: number | null;
  generating: boolean;
  generatingPlan: boolean;
  clientGenBlocked: boolean;
  onClientSelectionChange: (rawClientId: string) => void;
  onPhaseNumberChange: (phaseNumber: number) => void;
  onCategoryChange: (category: WorkoutCategory) => void;
  onGoalChange: (goal: PlanGoal) => void;
  onEquipmentProfileChange: (rawProfileId: string) => void;
  onGenerateSingle: () => void;
  onGeneratePlan: () => void;
}

interface SelfGenerationSectionProps {
  selectedClient: PlannerClient | null;
  clientGenBlocked: boolean;
  clientSelfGenStatus: ClientSelfGenerationStatus;
  isViewerClient: boolean;
}

interface PlanModeSectionProps {
  planDuration: PlanDuration;
  sessionsPerWeek: number;
  onPlanDurationChange: (duration: PlanDuration) => void;
  onSessionsPerWeekChange: (sessionsPerWeek: number) => void;
}

/**
 * Guided/Power view toggle (Workout-OS C7, §12.2 ruling): Guided (default —
 * Swan Coach proposes candidates, human picks) vs Power (dense auto canvas).
 * Self-contained: owns the persisted preference and presets the generation
 * mode through the existing onGenerationModeChange seam; users can still
 * pick any mode in the generation-mode bar afterwards.
 */
const PlannerViewToggle: React.FC<{ onGenerationModeChange: (mode: SwanCoachGenerationMode) => void }> = ({
  onGenerationModeChange,
}) => {
  const [view, setView] = React.useState<PlannerViewMode>(() => readPlannerViewMode());
  const flip = () => {
    const next: PlannerViewMode = view === 'guided' ? 'power' : 'guided';
    setView(next);
    writePlannerViewMode(next);
    onGenerationModeChange(generationModeForPlannerView(next));
  };
  return (
    <TeachToggle type="button" $active={view === 'guided'} onClick={flip} data-testid="planner-view-toggle">
      <Sparkles size={16} />
      {view === 'guided' ? 'Guided' : 'Power'} Mode
    </TeachToggle>
  );
};

export const WorkoutPlannerHeaderSection: React.FC<HeaderSectionProps> = ({
  plannerReturnTo,
  teachModeOpen,
  onReturnToClientHub,
  onTeachModeToggle,
  onGenerationModeChange,
}) => (
  <Header>
    <HeaderLeft>
      <HeaderIcon><Dumbbell size={22} /></HeaderIcon>
      <div>
        <Title className="lens2-display">Workout Planner</Title>
        <Subtitle>Build intelligent, periodized training programs with 880+ exercises</Subtitle>
      </div>
    </HeaderLeft>
    {plannerReturnTo && (
      <TeachToggle type="button" onClick={onReturnToClientHub}>
        <ArrowLeft size={16} />
        {workoutPlannerReturnLabel(plannerReturnTo, 'back')}
      </TeachToggle>
    )}
    <PlannerViewToggle onGenerationModeChange={onGenerationModeChange} />
    <TeachToggle type="button" $active={teachModeOpen} onClick={onTeachModeToggle}>
      <BookOpen size={16} />
      Teach Mode {teachModeOpen ? 'On' : 'Off'}
    </TeachToggle>
  </Header>
);

export const WorkoutPlannerCategorySelect: React.FC<{
  category: WorkoutCategory;
  planDuration: PlanDuration;
  onCategoryChange: (category: WorkoutCategory) => void;
}> = ({ category, planDuration, onCategoryChange }) => (
  planDuration === 'single' ? (
    <Select
      value={category}
      onChange={event => onCategoryChange(event.target.value as WorkoutCategory)}
      aria-label="Select workout category"
    >
      {WORKOUT_CATEGORIES.map(workoutCategory => (
        <option key={workoutCategory.value} value={workoutCategory.value}>{workoutCategory.label}</option>
      ))}
    </Select>
  ) : (
    <Select
      value="full_body"
      disabled
      aria-label="Workout category (locked to Full Body for multi-week plans)"
      title="Multi-week plans cover the full body across the mesocycles. Switch Plan Duration to 'Single Session' to pick a specific category."
    >
      <option value="full_body">Full Body (multi-week plans)</option>
    </Select>
  )
);

export const WorkoutPlannerControlsSection: React.FC<ControlsSectionProps> = ({
  clients,
  clientsLoading,
  selectedClientId,
  phaseNumber,
  category,
  goal,
  planDuration,
  generationMode,
  equipmentProfiles,
  equipmentProfilesLoading,
  selectedEquipmentProfileId,
  generating,
  generatingPlan,
  clientGenBlocked,
  onClientSelectionChange,
  onPhaseNumberChange,
  onCategoryChange,
  onGoalChange,
  onEquipmentProfileChange,
  onGenerateSingle,
  onGeneratePlan,
}) => {
  const isGenerating = generating || generatingPlan;

  return (
    <ControlRow>
      <Select
        value={selectedClientId ?? ''}
        onChange={event => onClientSelectionChange(event.target.value)}
        aria-label="Select client"
      >
        {clientOptions(clients, clientsLoading)}
      </Select>
      <Select
        value={phaseNumber}
        onChange={event => onPhaseNumberChange(Number(event.target.value))}
        aria-label="Select OPT phase"
      >
        {OPT_PHASES.map(phase => (
          <option key={phase.phase} value={phase.phase}>Phase {phase.phase}: {phase.name}</option>
        ))}
      </Select>
      <WorkoutPlannerCategorySelect
        category={category}
        planDuration={planDuration}
        onCategoryChange={onCategoryChange}
      />
      <Select
        value={goal}
        onChange={event => onGoalChange(event.target.value as PlanGoal)}
        aria-label="Select training goal"
      >
        {PLAN_GOALS.map(planGoal => (
          <option key={planGoal.value} value={planGoal.value}>{planGoal.label}</option>
        ))}
      </Select>
      <Select
        value={selectedEquipmentProfileId ?? ''}
        onChange={event => onEquipmentProfileChange(event.target.value)}
        aria-label="Select equipment profile"
        disabled={equipmentProfilesLoading || equipmentProfiles.length === 0}
        title="Constrain generated workouts and plans to a real training environment."
      >
        <option value="">{equipmentPlaceholder(equipmentProfiles, equipmentProfilesLoading)}</option>
        {equipmentProfiles.map(profile => (
          <option key={profile.id} value={profile.id}>
            {profile.name} - {formatEquipmentLocation(profile.locationType)} - {profile.equipmentCount} items
          </option>
        ))}
      </Select>
      <ActionBtn
        $variant="cosmic"
        onClick={generationHandler(planDuration, onGenerateSingle, onGeneratePlan)}
        disabled={isGenerating || !selectedClientId || clientGenBlocked}
        title={generationTitle(clientGenBlocked)}
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {generationLabel(isGenerating, planDuration, generationMode)}
      </ActionBtn>
    </ControlRow>
  );
};

export const WorkoutPlannerSelfGenerationSection: React.FC<SelfGenerationSectionProps> = ({
  selectedClient,
  clientGenBlocked,
  clientSelfGenStatus,
  isViewerClient,
}) => {
  if (!selectedClient) return null;

  return (
    <ClientSelfGenPill $status={clientGenBlocked ? 'blocked' : clientSelfGenStatus}>
      <Sparkles size={12} />
      <span>
        Self-service plan generation:{' '}
        <strong>{selfGenerationLabel(clientGenBlocked, clientSelfGenStatus)}</strong>
        {!isViewerClient && clientSelfGenStatus === 'disabled' ? (
          <PillHint> - admins can flip this from the client details panel</PillHint>
        ) : null}
      </span>
    </ClientSelfGenPill>
  );
};

export const WorkoutPlannerPlanModeSection: React.FC<PlanModeSectionProps> = ({
  planDuration,
  sessionsPerWeek,
  onPlanDurationChange,
  onSessionsPerWeekChange,
}) => (
  <PlanModeBar>
    <PlanModeLabel><Calendar size={14} /> Plan Duration</PlanModeLabel>
    <SmallSelect
      value={planDuration}
      onChange={event => onPlanDurationChange(event.target.value as PlanDuration)}
      aria-label="Select plan duration"
    >
      {PLAN_DURATIONS.map(duration => (
        <option key={duration.value} value={duration.value}>{duration.label}</option>
      ))}
    </SmallSelect>
    {planDuration !== 'single' && (
      <>
        <PlanModeLabel>Sessions/Week</PlanModeLabel>
        <SmallSelect
          value={sessionsPerWeek}
          onChange={event => onSessionsPerWeekChange(Number(event.target.value))}
          aria-label="Sessions per week"
        >
          {SESSION_OPTIONS.map(count => (
            <option key={count} value={count}>{count}x/week</option>
          ))}
        </SmallSelect>
      </>
    )}
  </PlanModeBar>
);
