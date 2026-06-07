/**
 * WorkoutPlanBuilder exercise selection modal.
 *
 * Isolates the modal shell from the builder so the main wizard stays focused
 * on plan state, navigation, and save behavior.
 */

import React from 'react';
import { X } from 'lucide-react';
import type { Exercise, WorkoutPlanDay } from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';
import {
  GhostButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalPanel,
  RoundIconButton,
} from './WorkoutPlanBuilderStyles';

interface WorkoutPlanBuilderExerciseModalProps {
  open: boolean;
  currentDay: WorkoutPlanDay | null;
  workoutDays: WorkoutPlanDay[];
  setExerciseLibraryOpen: (open: boolean) => void;
  addExerciseToDay: (dayIndex: number, exercise: Exercise) => void;
}

const WorkoutPlanBuilderExerciseModal: React.FC<WorkoutPlanBuilderExerciseModalProps> = ({
  open,
  currentDay,
  workoutDays,
  setExerciseLibraryOpen,
  addExerciseToDay,
}) => {
  const close = () => setExerciseLibraryOpen(false);

  const handleExerciseSelect = (exercise: Exercise) => {
    if (!currentDay) return;
    const dayIndex = workoutDays.findIndex(day => day.dayNumber === currentDay.dayNumber);
    if (dayIndex === -1) return;
    addExerciseToDay(dayIndex, exercise);
    close();
  };

  return (
    <ModalOverlay $open={open} onClick={close}>
      <ModalPanel onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          Select Exercise for {currentDay?.name}
          <RoundIconButton type="button" onClick={close} aria-label="Close dialog">
            <X size={18} />
          </RoundIconButton>
        </ModalHeader>
        <ModalContent>
          <ExerciseLibrary onExerciseSelect={handleExerciseSelect} />
        </ModalContent>
        <ModalFooter>
          <GhostButton onClick={close}>Close</GhostButton>
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutPlanBuilderExerciseModal;
