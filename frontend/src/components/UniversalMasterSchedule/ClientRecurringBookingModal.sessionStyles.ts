import styled from 'styled-components';
import { BodyText } from './ui';

export const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--bg-surface, #1A1A24) 70%, transparent);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
    border-radius: 3px;
  }
`;

export const SessionCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  background: ${({ $selected }) =>
    $selected
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-surface, #1A1A24))'
      : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent)'};
  border: 1px solid ${({ $selected }) =>
    $selected
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)'};
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  text-align: left;

  &:hover {
    background: ${({ $selected }) =>
      $selected
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, var(--bg-surface, #1A1A24))'
        : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, var(--bg-surface, #1A1A24))'};
    border-color: ${({ $selected }) =>
      $selected
        ? 'var(--accent-primary, #60C0F0)'
        : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent)'};
  }

  &:active {
    transform: scale(0.99);
  }
`;

export const SessionCheckbox = styled.span<{ $checked?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${({ $checked }) =>
    $checked
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 28%, transparent)'};
  background: ${({ $checked }) => $checked ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;

  svg {
    color: var(--text-inverse, #0F172A);
  }
`;

export const SessionInfo = styled.span`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

export const SessionDate = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);

  svg {
    color: var(--accent-primary, #60C0F0);
    flex-shrink: 0;
  }
`;

export const SessionTime = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));

  svg {
    color: var(--text-muted, rgba(224, 236, 244, 0.52));
    flex-shrink: 0;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.52));
  }
`;

export const SessionMeta = styled.span`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
`;

export const SessionTrainer = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.64));

  svg {
    color: var(--text-muted, rgba(224, 236, 244, 0.44));
  }
`;

export const SessionLocation = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.52));

  svg {
    color: var(--text-muted, rgba(224, 236, 244, 0.36));
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;

  svg {
    color: var(--text-muted, rgba(224, 236, 244, 0.36));
  }
`;

export const ConfirmSummary = styled.div`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border-radius: 10px;
  padding: 1rem;
`;

export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
`;

export const SummaryValue = styled(BodyText)<{ $tone?: 'default' | 'danger' | 'success' }>`
  font-weight: 600;
  font-size: ${({ $tone }) => $tone === 'default' ? '1.25rem' : 'inherit'};
  color: ${({ $tone }) => {
    if ($tone === 'danger') return 'var(--error, #EF4444)';
    if ($tone === 'success') return 'var(--success, #22C55E)';
    return 'inherit';
  }};
`;

export const SummaryDivider = styled.hr`
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  margin: 0.5rem 0;
`;

export const ConfirmSessionList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

export const ConfirmSessionItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);

  &:last-child {
    border-bottom: none;
  }
`;
