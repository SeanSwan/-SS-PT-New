/**
 * Blueprint: TrainerHomeNextActionCard.styles
 * Purpose: premium one-session command card for the trainer home surface.
 * Flow: responsive grid shell, client/time copy, 44px Coach/Log/Schedule actions.
 * Guardrails: styled-components only, Crystalline Swan fallbacks, reduced-motion safe.
 */

import styled from 'styled-components';

export const NextActionCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(210px, 0.72fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--surface-royal-depth, #003080) 76%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 82%, transparent)
    ),
    var(--bg-elevated, #141419);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent) inset,
    0 18px 42px color-mix(in srgb, var(--bg-base, #030712) 28%, transparent),
    0 0 34px color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`;

export const NextActionCopy = styled.div`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`;

export const NextActionKicker = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
`;

export const NextActionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  line-height: 1.1;
  overflow-wrap: anywhere;
`;

export const NextActionMeta = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.45;
`;

export const NextActionFlow = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const NextActionFlowItem = styled.li`
  min-width: 0;
  padding: 0.55rem 0.65rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 24%, transparent);
`;

export const NextActionFlowLabel = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.1;
  overflow-wrap: anywhere;
`;

export const NextActionFlowDetail = styled.span`
  display: block;
  margin-top: 0.22rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

export const NextActionButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-content: stretch;

    > :last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const NextActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  border: 1px solid ${({ $variant }) => (
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'
  )};
  background: ${({ $variant }) => (
    $variant === 'primary'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0))'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
  )};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: ${({ $variant }) => (
    $variant === 'primary'
      ? '0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
      : 'none'
  )};
  transition:
    border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ $variant }) => (
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent)'
    )};
  }

  &:focus-visible {
    outline: 2px solid ${({ $variant }) => (
      $variant === 'primary'
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--accent-secondary, #8B5CF6)'
    )};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
