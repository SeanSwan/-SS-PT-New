/**
 * COMPONENT: WorkoutPlannerCommandPanel
 * PURPOSE: Renders planner header, client/phase/category/goal controls,
 * generation action, self-service status, and duration selectors.
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
    <Header>
      <HeaderLeft>
        <HeaderIcon><Dumbbell size={22} /></HeaderIcon>
        <div>
          <Title>Swan Studios Workout Planner</Title>
          <Subtitle>Build intelligent, periodized training programs with 880+ exercises</Subtitle>
        </div>
      </HeaderLeft>
      {plannerReturnTo && (
        <TeachToggle type="button" onClick={onReturnToClientHub}>
          <ArrowLeft size={16} />
          Back to Client Hub
        </TeachToggle>
      )}
      <TeachToggle type="button" $active={teachModeOpen} onClick={onTeachModeToggle}>
        <BookOpen size={16} />
        Teach Mode {teachModeOpen ? 'On' : 'Off'}
      </TeachToggle>
    </Header>

    <ControlRow>
      <Select
        value={selectedClientId ?? ''}
        onChange={event => onClientSelectionChange(event.target.value)}
        aria-label="Select client"
      >
        {clientsLoading ? (
          <option>Loading clients...</option>
        ) : clients.length === 0 ? (
          <option>No clients found</option>
        ) : (
          clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.firstName} {client.lastName}
            </option>
          ))
        )}
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
      {planDuration === 'single' ? (
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
      )}
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
        <option value="">
          {equipmentProfilesLoading
            ? 'Loading equipment...'
            : equipmentProfiles.length === 0 ? 'No equipment profiles' : 'Any trainer equipment'}
        </option>
        {equipmentProfiles.map(profile => (
          <option key={profile.id} value={profile.id}>
            {profile.name} - {profile.locationType.replace(/_/g, ' ')} - {profile.equipmentCount} items
          </option>
        ))}
      </Select>
      <ActionBtn
        $variant="cosmic"
        onClick={planDuration === 'single' ? onGenerateSingle : onGeneratePlan}
        disabled={generating || generatingPlan || !selectedClientId || clientGenBlocked}
        title={clientGenBlocked
          ? 'Self-service workout plan generation is not enabled for your account. Ask your admin to turn it on.'
          : undefined}
      >
        {generating || generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {generating || generatingPlan ? 'Planning...' : planDuration === 'single' ? 'Swan Coach Generate' : 'Swan Coach Plan'}
      </ActionBtn>
    </ControlRow>

    {selectedClient ? (
      <ClientSelfGenPill $status={clientGenBlocked ? 'blocked' : clientSelfGenStatus}>
        <Sparkles size={12} />
        <span>
          Self-service plan generation:{' '}
          <strong>{
            clientGenBlocked
              ? 'Disabled for your account'
              : clientSelfGenStatus === 'enabled' ? 'Enabled' : 'Disabled'
          }</strong>
          {!isViewerClient && clientSelfGenStatus === 'disabled' ? (
            <PillHint> - admins can flip this from the client details panel</PillHint>
          ) : null}
        </span>
      </ClientSelfGenPill>
    ) : null}

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
            {[1, 2, 3, 4, 5, 6].map(count => (
              <option key={count} value={count}>{count}x/week</option>
            ))}
          </SmallSelect>
        </>
      )}
    </PlanModeBar>
  </>
);

export default WorkoutPlannerCommandPanel;
