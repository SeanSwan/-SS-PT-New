/**
 * Blueprint: TrainerHomeNextActionCard.styles
 * Purpose: client-observatory style proof board for the trainer home surface.
 * Flow: next session copy, Coach/Log/Progress actions, responsive proof rail.
 * Guardrails: styled-components only, Crystalline Swan fallbacks, reduced-motion safe.
 */

import styled from 'styled-components';

export const NextActionCard = styled.section`
  display: grid;
  /* minmax(0,...) both tracks so the 320px right-column floor cannot overflow
     the clipped content area on narrower desktop/tablet widths. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.42fr);
  align-items: center;
  gap: 1rem;
  min-width: 0;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 56%, transparent), transparent 58%),
    linear-gradient(145deg, var(--bg-elevated, #141419) 0%, var(--bg-base, #0A0A0F) 100%);
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 520px) {
    padding: 0.9rem;
  }
`;

export const NextActionCopy = styled.div`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`;

export const NextActionKicker = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--accent-secondary, #8B5CF6);
  font: 850 0.72rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const NextActionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.35rem/1.1 'Plus Jakarta Sans', sans-serif;
  overflow-wrap: break-word;
  word-break: normal;

  @media (max-width: 520px) {
    font-size: 1.12rem;
  }
`;

export const NextActionMeta = styled.p`
  margin: 0;
  max-width: 64rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent));
  font: 650 0.82rem/1.5 'Sora', sans-serif;
`;

export const NextActionFlow = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const NextActionFlowItem = styled.li`
  min-width: 0;
  min-height: 64px;
  padding: 0.62rem 0.7rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 54%, transparent);
`;

export const NextActionFlowLabel = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.74rem/1.1 'Sora', sans-serif;
  overflow-wrap: break-word;
  word-break: normal;
`;

export const NextActionFlowDetail = styled.span`
  display: block;
  margin-top: 0.22rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 650 0.68rem/1.3 'Sora', sans-serif;
  overflow-wrap: break-word;
  word-break: normal;
`;

export const NextActionButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.75rem, 1fr));
  justify-content: stretch;
  gap: 0.5rem;
  grid-column: 1 / -1;

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
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  border: 1px solid ${({ $variant }) => ($variant === 'primary'
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)')};
  background: ${({ $variant }) => ($variant === 'primary'
    ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0))'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  font: 850 0.78rem/1 'Sora', sans-serif;
  cursor: pointer;
  transition:
    border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
