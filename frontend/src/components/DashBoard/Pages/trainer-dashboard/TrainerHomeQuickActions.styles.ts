import styled from 'styled-components';
import { countUp } from './TrainerHomeTab.styles';

export const SectionHeading = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  margin: 0;
`;

export const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 700px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;

export const ActionCard = styled.button<{ $tone: string; $primary?: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  grid-column: ${({ $primary }) => ($primary ? '1 / -1' : 'auto')};
  min-height: ${({ $primary }) => ($primary ? '78px' : '64px')};
  padding: ${({ $primary }) => ($primary ? '1.05rem 1.2rem' : '0.95rem 1rem')};
  background: ${({ $primary, $tone }) =>
    $primary
      ? `linear-gradient(135deg,
          color-mix(in srgb, ${$tone} 18%, var(--bg-elevated, #141419)),
          color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, var(--bg-elevated, #141419)))`
      : 'var(--bg-elevated, #141419)'};
  border: 1px solid color-mix(in srgb, ${({ $tone, $primary }) => $tone} ${({ $primary }) => ($primary ? '38%' : '10%')}, transparent);
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);
  box-shadow: ${({ $primary, $tone }) =>
    $primary ? `0 16px 34px color-mix(in srgb, ${$tone} 12%, transparent)` : 'none'};

  &:hover {
    border-color: color-mix(in srgb, ${({ $tone }) => $tone} 30%, transparent);
    background: ${({ $primary, $tone }) =>
      $primary
        ? `linear-gradient(135deg,
            color-mix(in srgb, ${$tone} 24%, var(--bg-elevated, #141419)),
            color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-elevated, #141419)))`
        : `color-mix(in srgb, ${$tone} 5%, transparent)`};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px color-mix(in srgb, ${({ $tone }) => $tone} 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ $tone }) => $tone} 70%, transparent);
    outline-offset: 2px;
  }

  &:active { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover { transform: none; }
  }
`;

export const ActionIcon = styled.span<{ $tone: string; $primary?: boolean }>`
  width: ${({ $primary }) => ($primary ? '46px' : '40px')};
  height: ${({ $primary }) => ($primary ? '46px' : '40px')};
  min-width: ${({ $primary }) => ($primary ? '46px' : '40px')};
  border-radius: 10px;
  background: color-mix(in srgb, ${({ $tone, $primary }) => $tone} ${({ $primary }) => ($primary ? '18%' : '10%')}, transparent);
  border: 1px solid color-mix(in srgb, ${({ $tone, $primary }) => $tone} ${({ $primary }) => ($primary ? '32%' : '15%')}, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => $tone};
`;

export const ActionText = styled.span`
  min-width: 0;
  display: grid;
  gap: 0.18rem;
`;

export const ActionOverline = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const ActionLabel = styled.span<{ $primary?: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: ${({ $primary }) => ($primary ? '1rem' : '0.875rem')};
  font-weight: ${({ $primary }) => ($primary ? 800 : 600)};
  color: var(--text-primary, #E0ECF4);
`;

export const ActionDetail = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
`;
