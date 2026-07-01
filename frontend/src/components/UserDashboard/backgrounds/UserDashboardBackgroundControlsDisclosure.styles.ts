/**
 * FILE: UserDashboardBackgroundControlsDisclosure.styles.ts
 * PURPOSE: Button-like collapsed shell for dashboard background controls.
 * PARENT: UserDashboardBackgroundControlsDisclosure.tsx.
 */
import styled from 'styled-components';

export const BackgroundDisclosureDetails = styled.details`
  position: relative;
  width: min(100%, 460px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #003080) 22%, transparent), transparent 68%),
    color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent);
  box-shadow: 0 18px 42px color-mix(in srgb, var(--bg-base, #030712) 28%, transparent);
  overflow: hidden;

  &[open] {
    width: 100%;
  }
`;

export const BackgroundDisclosureSummary = styled.summary`
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  list-style: none;
  color: var(--text-primary, #E0ECF4);

  &::-webkit-details-marker { display: none; }
  &::marker { display: none; }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -4px;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const BackgroundDisclosureTitle = styled.span`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 9px;

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }

  span,
  strong {
    min-width: 0;
  }

  span {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--text-primary, #E0ECF4);
  }

  strong {
    font-family: 'Fira Code', ui-monospace, monospace;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-primary, #60C0F0);
  }

  @media (max-width: 560px) {
    flex-wrap: wrap;
  }
`;

export const BackgroundDisclosureMeta = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 0.67rem;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);

  svg {
    transition: transform 0.2s ease;
  }

  details[open] & svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg { transition: none; }
  }
`;

export const BackgroundDisclosureBody = styled.div`
  max-height: min(58vh, 620px);
  padding: 1rem;
  overflow-y: auto;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 30%, transparent);
`;
