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

export const TeachHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const TeachCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg-base, #030712) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ExerciseContextGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const ExerciseContextPill = styled.span`
  min-height: 32px;
  padding: 7px 9px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-elevated, #003080) 16%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.35;
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
