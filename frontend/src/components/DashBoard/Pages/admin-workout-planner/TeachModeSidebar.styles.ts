import styled from 'styled-components';

export const SkeletonSpacer = styled.div`
  height: 16px;
`;

export const ExerciseName = styled.div`
  margin-bottom: 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
`;

export const TeachTabLabel = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

export const TeachErrorBox = styled.div`
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 8px;
  border-left: 3px solid var(--danger, #C92A54);
  background: color-mix(in srgb, var(--danger, #C92A54) 6%, transparent);
`;

export const TeachErrorText = styled.p`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 6px 14px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
