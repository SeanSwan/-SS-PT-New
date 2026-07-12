/**
 * Read-only adapter around the canonical WorkoutLogger Rolodex.
 */
import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import NASMExerciseRolodex from "../../../WorkoutLogger/NASMExerciseRolodex";
import type { ExerciseSlim } from "../../../WorkoutLogger/useExerciseSearch";
import {
  CloseButton,
  RolodexBackdrop,
  RolodexDrawer,
  RolodexHeader,
} from "./WorkoutDesignRolodex.styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseSlim) => void;
}

const WorkoutDesignRolodex: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;
  return createPortal(
    <RolodexBackdrop
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <RolodexDrawer
        role="dialog"
        aria-modal="true"
        aria-label="Exercise Rolodex"
      >
        <RolodexHeader>
          <div>
            <h2>Shared Exercise Rolodex</h2>
            <p>
              Read-only library search. Selecting an exercise updates prototype
              state only.
            </p>
          </div>
          <CloseButton
            type="button"
            aria-label="Close Exercise Rolodex"
            onClick={onClose}
          >
            <X size={20} />
          </CloseButton>
        </RolodexHeader>
        <NASMExerciseRolodex
          isOpen={isOpen}
          onClose={onClose}
          onSelectExercise={(exercise) => {
            onSelect(exercise);
            onClose();
          }}
        />
      </RolodexDrawer>
    </RolodexBackdrop>,
    document.body,
  );
};

export default WorkoutDesignRolodex;
