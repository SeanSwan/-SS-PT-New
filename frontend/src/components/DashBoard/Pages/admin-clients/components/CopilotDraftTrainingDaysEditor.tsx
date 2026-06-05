/**
 * CopilotDraftTrainingDaysEditor
 *
 * Purpose: Renders editable training days and exercise rows for a generated
 * workout draft while the parent owns draft state and persistence.
 */

import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Exercise, WorkoutDay } from './copilot-types';
import {
  AddButton,
  DayContent,
  DayHeader,
  DaySection,
  ExerciseCard,
  ExerciseHeader,
  FormGrid,
  FormGroup,
  Label,
  RemoveButton,
  SectionTitle,
  SmallInput,
} from './copilot-shared-styles';
import {
  DayExerciseCount,
  ExerciseLabel,
} from './CopilotDraftReview.styles';

interface CopilotDraftTrainingDaysEditorProps {
  days: WorkoutDay[];
  expandedDays: Set<number>;
  toggleDay: (dayIdx: number) => void;
  updateDay: <K extends keyof WorkoutDay>(dayIdx: number, field: K, value: WorkoutDay[K]) => void;
  updateExercise: <K extends keyof Exercise>(
    dayIdx: number,
    exIdx: number,
    field: K,
    value: Exercise[K],
  ) => void;
  addExercise: (dayIdx: number) => void;
  removeExercise: (dayIdx: number, exIdx: number) => void;
}

const CopilotDraftTrainingDaysEditor: React.FC<CopilotDraftTrainingDaysEditorProps> = ({
  days,
  expandedDays,
  toggleDay,
  updateDay,
  updateExercise,
  addExercise,
  removeExercise,
}) => (
  <>
    <SectionTitle>Training Days ({days.length})</SectionTitle>
    {days.map((day, dayIdx) => (
      <DaySection key={dayIdx}>
        <DayHeader onClick={() => toggleDay(dayIdx)}>
          {expandedDays.has(dayIdx) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Day {day.dayNumber}: {day.name}</span>
          <DayExerciseCount>
            {day.exercises.length} exercises
          </DayExerciseCount>
        </DayHeader>

        {expandedDays.has(dayIdx) && (
          <DayContent>
            <FormGrid>
              <FormGroup>
                <Label htmlFor={`copilot-day-name-${dayIdx}`}>Day Name</Label>
                <SmallInput
                  id={`copilot-day-name-${dayIdx}`}
                  value={day.name}
                  onChange={(e) => updateDay(dayIdx, 'name', e.target.value)}
                  maxLength={100}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor={`copilot-day-focus-${dayIdx}`}>Focus</Label>
                <SmallInput
                  id={`copilot-day-focus-${dayIdx}`}
                  value={day.focus || ''}
                  onChange={(e) => updateDay(dayIdx, 'focus', e.target.value)}
                  placeholder="e.g. Chest, Shoulders"
                  maxLength={200}
                />
              </FormGroup>
            </FormGrid>

            {day.exercises.map((ex, exIdx) => (
              <ExerciseCard key={exIdx}>
                <ExerciseHeader>
                  <ExerciseLabel>
                    Exercise {exIdx + 1}
                  </ExerciseLabel>
                  <RemoveButton
                    aria-label={`Remove ${ex.name || `exercise ${exIdx + 1}`}`}
                    onClick={() => removeExercise(dayIdx, exIdx)}
                  >
                    <Trash2 size={14} />
                  </RemoveButton>
                </ExerciseHeader>
                <FormGrid>
                  <FormGroup>
                    <Label htmlFor={`copilot-exercise-name-${dayIdx}-${exIdx}`}>Name</Label>
                    <SmallInput
                      id={`copilot-exercise-name-${dayIdx}-${exIdx}`}
                      value={ex.name}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      maxLength={200}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`copilot-exercise-scheme-${dayIdx}-${exIdx}`}>Sets x Reps</Label>
                    <SmallInput
                      id={`copilot-exercise-scheme-${dayIdx}-${exIdx}`}
                      value={ex.setScheme || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'setScheme', e.target.value)}
                      placeholder="e.g. 4x8-10"
                      maxLength={100}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`copilot-exercise-rest-${dayIdx}-${exIdx}`}>Rest (seconds)</Label>
                    <SmallInput
                      id={`copilot-exercise-rest-${dayIdx}-${exIdx}`}
                      type="number"
                      min={0}
                      max={600}
                      value={ex.restPeriod ?? ''}
                      onChange={(e) => updateExercise(
                        dayIdx,
                        exIdx,
                        'restPeriod',
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`copilot-exercise-tempo-${dayIdx}-${exIdx}`}>Tempo</Label>
                    <SmallInput
                      id={`copilot-exercise-tempo-${dayIdx}-${exIdx}`}
                      value={ex.tempo || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'tempo', e.target.value)}
                      placeholder="e.g. 3-1-2-0"
                      maxLength={50}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label htmlFor={`copilot-exercise-intensity-${dayIdx}-${exIdx}`}>Intensity Guideline</Label>
                    <SmallInput
                      id={`copilot-exercise-intensity-${dayIdx}-${exIdx}`}
                      value={ex.intensityGuideline || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'intensityGuideline', e.target.value)}
                      placeholder="e.g. 75-80% 1RM"
                      maxLength={500}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label htmlFor={`copilot-exercise-notes-${dayIdx}-${exIdx}`}>Notes</Label>
                    <SmallInput
                      id={`copilot-exercise-notes-${dayIdx}-${exIdx}`}
                      value={ex.notes || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'notes', e.target.value)}
                      placeholder="Coach notes..."
                      maxLength={1000}
                    />
                  </FormGroup>
                </FormGrid>
              </ExerciseCard>
            ))}
            <AddButton onClick={() => addExercise(dayIdx)}>
              <Plus size={14} /> Add Exercise
            </AddButton>
          </DayContent>
        )}
      </DaySection>
    ))}
  </>
);

export default React.memo(CopilotDraftTrainingDaysEditor);
