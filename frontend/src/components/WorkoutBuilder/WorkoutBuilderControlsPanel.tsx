/**
 * WorkoutBuilderControlsPanel
 * ---------------------------
 * Center configuration and results panel for Swan Coach Planning.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { ClientContext, GeneratedPlan, GeneratedWorkout } from '../../hooks/useWorkoutBuilderAPI';
import { CATEGORIES } from './WorkoutBuilderPage.constants';
import type { WorkoutBuilderMode } from './WorkoutBuilderPage.logic';
import {
  CompactConfigField,
  ConfigField,
  ConfigRow,
  ErrorBanner,
  Input,
  Label,
  ModeToggleButton,
  ModeToggleGroup,
  Panel,
  PanelTitle,
  PrimaryButton,
  Select,
} from './WorkoutBuilderPage.styles';
import WorkoutBuilderResults from './WorkoutBuilderResults';

type SetString = Dispatch<SetStateAction<string>>;

interface WorkoutBuilderControlsPanelProps {
  mode: WorkoutBuilderMode;
  setMode: Dispatch<SetStateAction<WorkoutBuilderMode>>;
  category: string;
  setCategory: SetString;
  exerciseCount: string;
  setExerciseCount: SetString;
  rotationPattern: string;
  setRotationPattern: SetString;
  planWeeks: string;
  setPlanWeeks: SetString;
  sessionsPerWeek: string;
  setSessionsPerWeek: SetString;
  primaryGoal: string;
  setPrimaryGoal: SetString;
  equipmentProfileId: string;
  setEquipmentProfileId: SetString;
  context: ClientContext | null;
  loading: boolean;
  parsedClientId: number | null;
  error: string | null;
  workout: GeneratedWorkout | null;
  plan: GeneratedPlan | null;
  onGenerate: () => void;
}

const WorkoutModeFields: React.FC<{
  category: string;
  setCategory: SetString;
  exerciseCount: string;
  setExerciseCount: SetString;
  rotationPattern: string;
  setRotationPattern: SetString;
}> = ({
  category,
  setCategory,
  exerciseCount,
  setExerciseCount,
  rotationPattern,
  setRotationPattern,
}) => (
  <>
    <ConfigField>
      <Label>Category</Label>
      <Select value={category} onChange={event => setCategory(event.target.value)}>
        {CATEGORIES.map(({ value, label }) => (
          <option key={`workout-builder-category-${value}`} value={value}>{label}</option>
        ))}
      </Select>
    </ConfigField>
    <CompactConfigField>
      <Label>Exercises</Label>
      <Input type="number" value={exerciseCount} onChange={event => setExerciseCount(event.target.value)} />
    </CompactConfigField>
    <ConfigField>
      <Label>Rotation</Label>
      <Select value={rotationPattern} onChange={event => setRotationPattern(event.target.value)}>
        <option value="standard">Standard (2:1)</option>
        <option value="aggressive">Aggressive (1:1)</option>
        <option value="conservative">Conservative (3:1)</option>
      </Select>
    </ConfigField>
  </>
);

const PlanModeFields: React.FC<{
  planWeeks: string;
  setPlanWeeks: SetString;
  sessionsPerWeek: string;
  setSessionsPerWeek: SetString;
  primaryGoal: string;
  setPrimaryGoal: SetString;
}> = ({
  planWeeks,
  setPlanWeeks,
  sessionsPerWeek,
  setSessionsPerWeek,
  primaryGoal,
  setPrimaryGoal,
}) => (
  <>
    <CompactConfigField>
      <Label>Weeks</Label>
      <Input type="number" value={planWeeks} onChange={event => setPlanWeeks(event.target.value)} />
    </CompactConfigField>
    <CompactConfigField>
      <Label>Sessions/Week</Label>
      <Input type="number" value={sessionsPerWeek} onChange={event => setSessionsPerWeek(event.target.value)} />
    </CompactConfigField>
    <ConfigField>
      <Label>Goal</Label>
      <Select value={primaryGoal} onChange={event => setPrimaryGoal(event.target.value)}>
        <option value="general_fitness">General Fitness</option>
        <option value="hypertrophy">Hypertrophy</option>
        <option value="strength">Strength</option>
        <option value="fat_loss">Fat Loss</option>
        <option value="athletic_performance">Athletic Performance</option>
      </Select>
    </ConfigField>
  </>
);

const EquipmentProfileField: React.FC<{
  context: ClientContext | null;
  equipmentProfileId: string;
  setEquipmentProfileId: SetString;
}> = ({ context, equipmentProfileId, setEquipmentProfileId }) => {
  if (!context || context.equipment.length === 0) return null;

  return (
    <ConfigField>
      <Label>Location</Label>
      <Select value={equipmentProfileId} onChange={event => setEquipmentProfileId(event.target.value)}>
        <option value="">Any equipment</option>
        {context.equipment.map(profile => (
          <option key={profile.id} value={profile.id}>{profile.name}</option>
        ))}
      </Select>
    </ConfigField>
  );
};

const WorkoutBuilderControlsPanel: React.FC<WorkoutBuilderControlsPanelProps> = ({
  mode,
  setMode,
  category,
  setCategory,
  exerciseCount,
  setExerciseCount,
  rotationPattern,
  setRotationPattern,
  planWeeks,
  setPlanWeeks,
  sessionsPerWeek,
  setSessionsPerWeek,
  primaryGoal,
  setPrimaryGoal,
  equipmentProfileId,
  setEquipmentProfileId,
  context,
  loading,
  parsedClientId,
  error,
  workout,
  plan,
  onGenerate,
}) => (
  <Panel>
    <PanelTitle>
      <ModeToggleGroup>
        <ModeToggleButton type="button" $active={mode === 'workout'} onClick={() => setMode('workout')}>
          Single Workout
        </ModeToggleButton>
        <span>|</span>
        <ModeToggleButton type="button" $active={mode === 'plan'} onClick={() => setMode('plan')}>
          Training Plan
        </ModeToggleButton>
      </ModeToggleGroup>
    </PanelTitle>

    <ConfigRow>
      {mode === 'workout' ? (
        <WorkoutModeFields
          category={category}
          setCategory={setCategory}
          exerciseCount={exerciseCount}
          setExerciseCount={setExerciseCount}
          rotationPattern={rotationPattern}
          setRotationPattern={setRotationPattern}
        />
      ) : (
        <PlanModeFields
          planWeeks={planWeeks}
          setPlanWeeks={setPlanWeeks}
          sessionsPerWeek={sessionsPerWeek}
          setSessionsPerWeek={setSessionsPerWeek}
          primaryGoal={primaryGoal}
          setPrimaryGoal={setPrimaryGoal}
        />
      )}

      <EquipmentProfileField
        context={context}
        equipmentProfileId={equipmentProfileId}
        setEquipmentProfileId={setEquipmentProfileId}
      />
    </ConfigRow>

    <PrimaryButton onClick={onGenerate} disabled={loading || !parsedClientId}>
      {loading ? 'Planning...' : mode === 'workout' ? 'Swan Coach Workout' : 'Swan Coach Plan'}
    </PrimaryButton>

    {error && <ErrorBanner $top={12}>{error}</ErrorBanner>}

    <WorkoutBuilderResults workout={workout} plan={plan} />
  </Panel>
);

export default WorkoutBuilderControlsPanel;
