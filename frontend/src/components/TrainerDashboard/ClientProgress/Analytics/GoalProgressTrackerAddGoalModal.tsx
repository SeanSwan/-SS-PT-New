import React from 'react';
import { X } from 'lucide-react';
import {
  DEFAULT_GOAL_DRAFT,
  GOAL_CATEGORY_OPTIONS,
  NewGoalDraft,
} from './GoalProgressTracker.logic';
import {
  AccentButton,
  BodyText,
  ErrorText,
  FieldLabel,
  FormGrid,
  GhostButton,
  IconBtn,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  Overlay,
  PanelTitle,
  StyledSelect,
  TextInput,
} from './GoalProgressTracker.styles';

interface GoalProgressTrackerAddGoalModalProps {
  isOpen: boolean;
  draft: NewGoalDraft;
  goalActionError: string | null;
  isSavingGoal: boolean;
  onClose: () => void;
  onCreateGoal: () => void;
  onDraftChange: (draft: NewGoalDraft) => void;
}

const GoalProgressTrackerAddGoalModal: React.FC<GoalProgressTrackerAddGoalModalProps> = ({
  isOpen,
  draft,
  goalActionError,
  isSavingGoal,
  onClose,
  onCreateGoal,
  onDraftChange,
}) => {
  if (!isOpen) return null;

  const updateDraft = (patch: Partial<NewGoalDraft>) => {
    onDraftChange({ ...draft, ...patch });
  };

  return (
    <Overlay onClick={onClose}>
      <ModalPanel onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <PanelTitle>Create Goal</PanelTitle>
          <IconBtn onClick={onClose}>
            <X size={18} />
          </IconBtn>
        </ModalHeader>

        <ModalBody>
          <FormGrid>
            <FieldLabel>
              Goal title
              <TextInput
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Pushup volume"
              />
            </FieldLabel>
            <FieldLabel>
              Category
              <StyledSelect
                value={draft.category || DEFAULT_GOAL_DRAFT.category}
                onChange={(event) => updateDraft({ category: event.target.value })}
              >
                {GOAL_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </StyledSelect>
            </FieldLabel>
            <FieldLabel>
              Target value
              <TextInput
                min="0"
                type="number"
                value={draft.targetValue}
                onChange={(event) => updateDraft({ targetValue: event.target.value })}
              />
            </FieldLabel>
            <FieldLabel>
              Unit
              <TextInput
                value={draft.unit}
                onChange={(event) => updateDraft({ unit: event.target.value })}
              />
            </FieldLabel>
            <FieldLabel>
              Target date
              <TextInput
                type="date"
                value={draft.deadline}
                onChange={(event) => updateDraft({ deadline: event.target.value })}
              />
            </FieldLabel>
          </FormGrid>
          {goalActionError && (
            <ErrorText>
              <BodyText $danger>{goalActionError}</BodyText>
            </ErrorText>
          )}
        </ModalBody>

        <ModalFooter>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <AccentButton onClick={onCreateGoal} disabled={isSavingGoal}>
            {isSavingGoal ? 'Saving...' : 'Save Goal'}
          </AccentButton>
        </ModalFooter>
      </ModalPanel>
    </Overlay>
  );
};

export default GoalProgressTrackerAddGoalModal;
