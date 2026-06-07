/**
 * WorkoutBuilderPlanModeFields
 * ----------------------------
 * Extracted plan controls for generated Swan Coach plans, including the
 * assignment default that downstream client-plan reads use for billing posture.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { WorkoutBuilderPlanAssignmentDefault } from '../../hooks/useWorkoutBuilderAPI';
import {
  CompactConfigField,
  ConfigField,
  Input,
  Label,
  Select,
} from './WorkoutBuilderPage.styles';

type SetString = Dispatch<SetStateAction<string>>;

interface WorkoutBuilderPlanModeFieldsProps {
  planWeeks: string;
  setPlanWeeks: SetString;
  sessionsPerWeek: string;
  setSessionsPerWeek: SetString;
  primaryGoal: string;
  setPrimaryGoal: SetString;
  assignmentDefault: WorkoutBuilderPlanAssignmentDefault;
  setAssignmentDefault: Dispatch<SetStateAction<WorkoutBuilderPlanAssignmentDefault>>;
}

const WorkoutBuilderPlanModeFields: React.FC<WorkoutBuilderPlanModeFieldsProps> = ({
  planWeeks,
  setPlanWeeks,
  sessionsPerWeek,
  setSessionsPerWeek,
  primaryGoal,
  setPrimaryGoal,
  assignmentDefault,
  setAssignmentDefault,
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
    <ConfigField>
      <Label>Plan Use</Label>
      <Select
        value={assignmentDefault}
        onChange={event => {
          setAssignmentDefault(event.target.value as WorkoutBuilderPlanAssignmentDefault);
        }}
      >
        <option value="homework">Homework / Diary</option>
        <option value="trainer_session">Trainer-Led Session</option>
      </Select>
    </ConfigField>
  </>
);

export default WorkoutBuilderPlanModeFields;
