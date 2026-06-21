/**
 * Blueprint: TrainerHomeNextActionCard.styles
 * Purpose: premium one-session command card for the trainer home surface.
 * Flow: responsive grid shell, client/time copy, 44px Coach/Log/Schedule actions.
 * Guardrails: styled-components only, Crystalline Swan fallbacks, reduced-motion safe.
 */

import styled from 'styled-components';

export const NextActionCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  gap: 0.95rem;
  min-width: 0;
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, var(--brand-primary, #002060));
  /* Crystalline ice-edge: crisp Royal Depth -> Midnight Sapphire vault gradient with a 1px
     inset top highlight to read like light catching a frozen edge (signature focal moment). */
  background: linear-gradient(145deg, var(--surface-royal-depth, #003080) 0%, var(--brand-primary, #002060) 100%);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent),
    0 20px 40px color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent),
    0 0 30px color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);

  @media (max-width: 520px) {
    padding: 1rem;
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
  font-size: 1.35rem;
  line-height: 1.1;
  overflow-wrap: break-word;
  word-break: normal;

  @media (max-width: 520px) {
    font-size: 1.12rem;
  }
`;

export const NextActionMeta = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, var(--brand-primary, #002060)));
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.45;
  max-width: 42rem;
`;

export const NextActionFlow = styled.ol`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.4rem, 1fr));
  gap: 0.45rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

export const NextActionFlowItem = styled.li`
  min-width: 0;
  padding: 0.55rem 0.65rem;
  min-height: 72px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 30%, transparent);
`;

export const NextActionFlowLabel = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.1;
  overflow-wrap: break-word;
  word-break: normal;
`;

export const NextActionFlowDetail = styled.span`
  display: block;
  margin-top: 0.22rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, var(--brand-primary, #002060)));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  line-height: 1.2;
  overflow-wrap: break-word;
  word-break: normal;
`;

export const NextActionButtons = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(9.25rem, 1fr));
  justify-content: stretch;
  gap: 0.5rem;

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
  width: 100%;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  border: 1px solid ${({ $variant }) => (
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'
  )};
  background: ${({ $variant }) => (
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060))'
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
