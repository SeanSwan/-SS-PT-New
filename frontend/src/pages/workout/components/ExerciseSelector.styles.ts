import styled from 'styled-components';

export const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 20px;
  background: color-mix(in srgb, var(--card-bg, #141419) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, transparent);
  border-radius: 8px;
`;

export const SelectorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    color: var(--text-primary, #e0ecf4);
    font-size: 18px;
  }
`;

export const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SearchInput = styled.input`
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

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FilterSelect = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  color: var(--text-primary, #e0ecf4);
  background: var(--surface-elevated, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  border-radius: 6px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: var(--accent-cyan, #60c0f0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  }
`;

export const StateMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  text-align: center;
`;

export const ErrorMessage = styled(StateMessage)`
  color: var(--danger, #c92a54);
`;

export const ExerciseList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-color: color-mix(in srgb, var(--accent-cyan, #60c0f0) 34%, transparent) transparent;
`;

export const ExerciseCard = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 12%, transparent);
  border-radius: 8px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-cyan, #60c0f0) 34%, transparent);
    box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
  }
`;

export const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: color-mix(in srgb, var(--bg-base, #030712) 50%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 12%, transparent);
`;

export const ExerciseType = styled.span`
  color: var(--accent-cyan, #60c0f0);
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
`;

export const ExerciseDifficulty = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  font-weight: 700;
`;

export const ExerciseName = styled.h4`
  display: -webkit-box;
  min-height: 50px;
  margin: 0;
  padding: 12px 12px 8px;
  overflow: hidden;
  color: var(--text-primary, #e0ecf4);
  font-size: 16px;
  line-height: 1.3;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

export const MuscleGroups = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 12px;
`;

export const MuscleTag = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  background: color-mix(in srgb, var(--accent-purple, #8b5cf6) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8b5cf6) 22%, transparent);
  border-radius: 999px;
  font-size: 12px;
`;

export const ExerciseFooter = styled.div`
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 12%, transparent);
`;

export const AddButton = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  color: var(--text-primary, #e0ecf4);
  background: var(--brand-primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 30%, transparent);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;

  &:hover:not(:disabled) {
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-purple, #8b5cf6) 24%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-cyan, #60c0f0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;
