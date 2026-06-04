import styled from 'styled-components';
import { BodyText, ErrorText, SmallText } from './ui';

export const ModalErrorText = styled(ErrorText)`
  margin-bottom: 1rem;
`;

export const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const StepTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);

  svg {
    color: var(--accent-primary, #60C0F0);
  }
`;

export const StepDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
`;

export const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
`;

export const StepDot = styled.div<{ $active?: boolean; $completed?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
  background: ${({ $active, $completed }) => {
    if ($active) return 'var(--accent-primary, #60C0F0)';
    if ($completed) return 'var(--success, #22C55E)';
    return 'color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)';
  }};
  color: ${({ $active, $completed }) =>
    $active || $completed
      ? 'var(--text-inverse, #0F172A)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.48))'};
  border: 2px solid ${({ $active, $completed }) => {
    if ($active) return 'var(--accent-primary, #60C0F0)';
    if ($completed) return 'var(--success, #22C55E)';
    return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent)';
  }};
`;

export const StepLine = styled.div<{ $completed?: boolean }>`
  width: 40px;
  height: 2px;
  background: ${({ $completed }) =>
    $completed
      ? 'var(--success, #22C55E)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent)'};
  transition: background 0.2s ease;
`;

export const ResultPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 8px;
  margin-top: 0.5rem;
`;

export const ResultCount = styled.span<{ $hasResults?: boolean }>`
  font-weight: 600;
  color: ${({ $hasResults }) =>
    $hasResults ? 'var(--success, #22C55E)' : 'var(--error, #EF4444)'};
`;

export const SelectionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const SmallButton = styled.button`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-surface, #1A1A24));
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  }
`;

export const CreditsBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-surface, #1A1A24));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
`;

export const StrongBodyText = styled(BodyText)`
  font-weight: 600;
`;

export const SelectedCountText = styled(StrongBodyText)<{ $active?: boolean }>`
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'inherit'};
`;

export const ConfirmListLabel = styled(SmallText)`
  display: block;
  margin-bottom: 0.5rem;
`;
