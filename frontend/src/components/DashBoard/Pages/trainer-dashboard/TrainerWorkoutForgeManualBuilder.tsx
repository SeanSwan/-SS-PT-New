/**
 * COMPONENT: TrainerWorkoutForgeManualBuilder
 * PURPOSE: Manual workout-draft controls for TrainerWorkoutForgePage.
 */
import { Dumbbell, Plus, Save, Sparkles, Target, Trash2, User } from 'lucide-react';
import {
  EQUIPMENT_OPTIONS,
  OPT_PHASES,
  type ManualExercise,
} from './TrainerWorkoutForgePage.data';
import {
  ActionBtn,
  ButtonRow,
  Card,
  CardTitle,
  Chip,
  ChipRow,
  ExerciseArea,
  ExerciseGrid,
  ExerciseRow,
  FieldRow,
  HelperCopy,
  Input,
  Label,
  PhaseCard,
  PhaseDetails,
  PhaseGrid,
  PhaseName,
  PhaseNum,
  RemoveExerciseBtn,
} from './TrainerWorkoutForgePage.styles';

interface TrainerWorkoutForgeManualBuilderProps {
  optPhase: number;
  workoutTitle: string;
  duration: string;
  goal: string;
  equipment: string[];
  exercises: ManualExercise[];
  saving: boolean;
  onOptPhaseChange: (phase: number) => void;
  onWorkoutTitleChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onGoalChange: (value: string) => void;
  onToggleEquipment: (equipment: string) => void;
  onAddExercise: () => void;
  onUpdateExercise: (id: string, field: keyof ManualExercise, value: string) => void;
  onRemoveExercise: (id: string) => void;
  onOpenCopilot: () => void;
  onSavePlan: () => void;
}

const TrainerWorkoutForgeManualBuilder = ({
  optPhase,
  workoutTitle,
  duration,
  goal,
  equipment,
  exercises,
  saving,
  onOptPhaseChange,
  onWorkoutTitleChange,
  onDurationChange,
  onGoalChange,
  onToggleEquipment,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onOpenCopilot,
  onSavePlan,
}: TrainerWorkoutForgeManualBuilderProps) => {
  const activePhase = OPT_PHASES.find(p => p.phase === optPhase) || OPT_PHASES[0];

  return (
    <>
      <Card>
        <CardTitle><Target size={18} /> NASM OPT Phase</CardTitle>
        <PhaseGrid>
          {OPT_PHASES.map(p => (
            <PhaseCard key={p.phase} type="button" $active={optPhase === p.phase} onClick={() => onOptPhaseChange(p.phase)}>
              <PhaseNum>Phase {p.phase}</PhaseNum>
              <PhaseName>{p.name}</PhaseName>
            </PhaseCard>
          ))}
        </PhaseGrid>
        <PhaseDetails>
          <div>Reps: <span>{activePhase.reps}</span></div>
          <div>Sets: <span>{activePhase.sets}</span></div>
          <div>Tempo: <span>{activePhase.tempo}</span></div>
          <div>Rest: <span>{activePhase.rest}</span></div>
        </PhaseDetails>
      </Card>

      <Card>
        <CardTitle><Dumbbell size={18} /> Workout Template</CardTitle>
        <Label htmlFor="trainer-forge-title">Title</Label>
        <Input
          id="trainer-forge-title"
          placeholder="e.g. Upper Body Push - Phase 2"
          value={workoutTitle}
          onChange={event => onWorkoutTitleChange(event.target.value)}
        />
        <FieldRow>
          <div>
            <Label htmlFor="trainer-forge-duration">Duration (min)</Label>
            <Input
              id="trainer-forge-duration"
              type="number"
              value={duration}
              onChange={event => onDurationChange(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="trainer-forge-goal">Goal</Label>
            <Input
              id="trainer-forge-goal"
              placeholder="e.g. Strength endurance"
              value={goal}
              onChange={event => onGoalChange(event.target.value)}
            />
          </div>
        </FieldRow>
        <Label>Equipment</Label>
        <ChipRow>
          {EQUIPMENT_OPTIONS.map(eq => (
            <Chip key={eq} type="button" $active={equipment.includes(eq)} onClick={() => onToggleEquipment(eq)}>
              {eq}
            </Chip>
          ))}
        </ChipRow>
      </Card>

      <Card>
        <CardTitle><User size={18} /> Exercises</CardTitle>
        {exercises.length === 0 ? (
          <ExerciseArea>No exercises added yet. Add a manual row or use Swan Coach.</ExerciseArea>
        ) : (
          <ExerciseGrid>
            {exercises.map((exercise, index) => (
              <ExerciseRow key={exercise.id}>
                <div>
                  <Label htmlFor={`${exercise.id}-name`}>Exercise {index + 1} Name</Label>
                  <Input
                    id={`${exercise.id}-name`}
                    value={exercise.name}
                    onChange={event => onUpdateExercise(exercise.id, 'name', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${exercise.id}-sets`}>Sets</Label>
                  <Input
                    id={`${exercise.id}-sets`}
                    value={exercise.sets}
                    onChange={event => onUpdateExercise(exercise.id, 'sets', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${exercise.id}-reps`}>Reps</Label>
                  <Input
                    id={`${exercise.id}-reps`}
                    value={exercise.reps}
                    onChange={event => onUpdateExercise(exercise.id, 'reps', event.target.value)}
                  />
                </div>
                <RemoveExerciseBtn type="button" onClick={() => onRemoveExercise(exercise.id)} aria-label={`Remove exercise ${index + 1}`}>
                  <Trash2 size={16} />
                </RemoveExerciseBtn>
              </ExerciseRow>
            ))}
          </ExerciseGrid>
        )}
        <ButtonRow>
          <ActionBtn type="button" $variant="secondary" onClick={onAddExercise}>
            <Plus size={18} /> Add Exercise
          </ActionBtn>
          <ActionBtn type="button" onClick={onOpenCopilot}>
            <Sparkles size={18} /> Swan Coach Planning
          </ActionBtn>
          <ActionBtn type="button" $variant="secondary" onClick={onSavePlan} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Draft Plan'}
          </ActionBtn>
        </ButtonRow>
        <HelperCopy>Manual drafts save as trainer-reviewable plans. Swan Coach opens the existing review workflow.</HelperCopy>
      </Card>
    </>
  );
};

export default TrainerWorkoutForgeManualBuilder;
