import styled from 'styled-components';
import { countUp } from './TrainerHomeTab.styles';

export const SectionHeading = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
  margin: 0;
`;

export const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 700px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;

export const ActionCard = styled.button<{ $tone: string; $primary?: boolean; $index?: number }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  grid-column: ${({ $primary }) => ($primary ? '1 / -1' : 'auto')};
  min-height: ${({ $primary }) => ($primary ? '78px' : '64px')};
  padding: ${({ $primary }) => ($primary ? '1.05rem 1.2rem' : '0.95rem 1rem')};
  background: var(--bg-elevated, #141419);
  background-clip: padding-box;
  border: 1px solid ${({ $tone, $primary }) =>
    $primary
      ? 'transparent'
      : `color-mix(in srgb, ${$tone} 14%, var(--bg-elevated, #141419))`};
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  transition:
    background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${({ $index = 0 }) => `${$index * 50}ms`};

  /* Primary action: crisp Cosmic Nebula gradient border via pseudo-element. Keeps the card
     grounded in the dark theme so it signals premium without competing with the
     NextActionCard focal point (Gemini hierarchy fix, accepted by GLM 5.2). */
  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 15px;
    background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
    z-index: -1;
    opacity: ${({ $primary }) => ($primary ? 0.8 : 0)};
    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover {
    transform: translateY(-2px);
    background: ${({ $primary }) =>
      $primary
        ? `linear-gradient(135deg,
            color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #141419)),
            color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-elevated, #141419)))`
        : 'var(--bg-elevated, #141419)'};
    border-color: ${({ $primary }) =>
      $primary
        ? 'transparent'
        : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, var(--bg-elevated, #141419))'};
    box-shadow: ${({ $primary }) =>
      $primary
        ? '0 8px 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
        : '0 8px 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'};
  }
  &:hover::before { opacity: ${({ $primary }) => ($primary ? 1 : 0)}; }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ $tone }) => $tone} 70%, transparent);
    outline-offset: 2px;
  }

  &:active { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;

    &:hover { transform: none; }
    &:active { transform: none; }
  }
`;

export const ActionIcon = styled.span<{ $tone: string; $primary?: boolean }>`
  width: ${({ $primary }) => ($primary ? '46px' : '40px')};
  height: ${({ $primary }) => ($primary ? '46px' : '40px')};
  min-width: ${({ $primary }) => ($primary ? '46px' : '40px')};
  border-radius: 10px;
  background: color-mix(in srgb, ${({ $tone }) => $tone} ${({ $primary }) => ($primary ? '18%' : '10%')}, transparent);
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} ${({ $primary }) => ($primary ? '32%' : '15%')}, transparent);
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
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;
