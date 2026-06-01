import styled, { css } from 'styled-components';

export const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: color-mix(in srgb, var(--card-bg, #141419) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, transparent);
  border-radius: 8px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  color: var(--text-primary, #e0ecf4);
  font-weight: 700;
`;

export const Input = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  border-radius: 6px;
  font-size: 16px;

  &::placeholder {
    color: var(--text-muted, #8b9bb4);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-cyan, #60c0f0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  }
`;

export const SelectedExercisesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    color: var(--text-primary, #e0ecf4);
    font-size: 16px;
  }
`;

export const ExerciseCount = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 14px;
`;

export const EmptyExercises = styled.div`
  padding: 20px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  text-align: center;
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 86%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-cyan, #60c0f0) 26%, transparent);
  border-radius: 6px;
`;

export const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`;

export const ExerciseItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 12%, transparent);
  border-radius: 6px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const ExerciseInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const ExerciseOrder = styled.div`
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  color: var(--text-primary, #e0ecf4);
  background: var(--brand-primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 30%, transparent);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
`;

export const ExerciseMeta = styled.div`
  min-width: 0;
`;

export const ExerciseName = styled.div`
  overflow: hidden;
  color: var(--text-primary, #e0ecf4);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ExerciseType = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  text-transform: capitalize;
`;

export const ExerciseActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const iconButtonBase = css`
  display: grid;
  place-items: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--accent-cyan, #60c0f0) 14%, var(--surface-elevated, #1a1a24));
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 24%, transparent);
  border-radius: 6px;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--accent-cyan, #60c0f0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-cyan, #60c0f0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }
`;

export const MoveButton = styled.button`
  ${iconButtonBase}
`;

export const RemoveButton = styled.button`
  ${iconButtonBase}
  background: color-mix(in srgb, var(--danger, #c92a54) 16%, var(--surface-elevated, #1a1a24));
  border-color: color-mix(in srgb, var(--danger, #c92a54) 26%, transparent);
`;
