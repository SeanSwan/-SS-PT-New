/**
 * Shared low-motion primitives for 25 independent Workout Design Lab compositions.
 */
import React from 'react';
import { BookOpen, Check, Dumbbell, History, ShieldCheck } from 'lucide-react';
import type { WorkoutDesignViewModel } from '../workoutDesignViewModel';
import {
  ActionBar, ContextList, ExerciseRow, ExerciseStack, Primary, Secondary,
} from './conceptShared.styles';

export {
  BodyCopy, Kicker, Panel, PrototypeNote, ReadinessDial, SignalRow, WorldTitle,
} from './conceptShared.styles';

export interface ConceptProps {
  model: WorkoutDesignViewModel;
  conceptName: string;
  primaryActionLabel: string;
  onAction: () => void;
  onOpenRolodex: () => void;
}

export const ExerciseList: React.FC<{ model: WorkoutDesignViewModel }> = ({ model }) => (
  <ExerciseStack className="lens2-collection" aria-label="Prototype workout exercises">
    {model.exercises.map((exercise) => (
      <ExerciseRow className="lens2-row" key={exercise.id}>
        <div><h3>{exercise.name}</h3><p>{exercise.focus}</p></div>
        <dl><dt>Sets × reps</dt><dd>{exercise.sets} × {exercise.reps}</dd></dl>
        <dl><dt>Load</dt><dd>{exercise.load}</dd></dl>
        <dl><dt>Tempo / rest</dt><dd>{exercise.tempo} · {exercise.restSeconds}s</dd></dl>
        <dl><dt>RPE / pain</dt><dd>{exercise.rpe} · {exercise.pain}/10</dd></dl>
      </ExerciseRow>
    ))}
  </ExerciseStack>
);

export const SessionContext: React.FC<{ model: WorkoutDesignViewModel }> = ({ model }) => (
  <ContextList>
    <p><Dumbbell size={18}/><span><strong>{model.planContext}</strong><br/>{model.workoutDate} · {model.dateContext}</span></p>
    <p><History size={18}/><span>{model.historyContext}<br/>{model.missedDaySignal}</span></p>
    <p><BookOpen size={18}/><span>{model.coachNotes}</span></p>
    <p><ShieldCheck size={18}/><span>{model.approvalReceipt}</span></p>
  </ContextList>
);

export const ConceptActions: React.FC<ConceptProps> = ({
  primaryActionLabel, onAction, onOpenRolodex,
}) => (
  <ActionBar className="lens2-actions">
    <Primary type="button" onClick={onAction}><Check size={17}/> {primaryActionLabel}</Primary>
    <Secondary type="button" onClick={onOpenRolodex}><Dumbbell size={17}/> Open Exercise Rolodex</Secondary>
  </ActionBar>
);
