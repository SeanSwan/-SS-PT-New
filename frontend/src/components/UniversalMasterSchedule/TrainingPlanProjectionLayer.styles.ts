/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.styles.ts
 * PURPOSE: Style the calm read-only UMS plan overlay across the device matrix.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the distinct projection shell, date groups,
 * plan cards, scope notices, and 44px controls with Crystalline Swan tokens.
 * HOW IT FITS IN THE APP: Consumed only by TrainingPlanProjectionLayer.
 * KEY DECISIONS: No pointer tracking or looped motion; responsive grids wrap
 * from 320px through 4K, and reduced-motion users receive static transitions.
 */

import styled, { css } from 'styled-components';

export const Layer = styled.section`
  position: relative;
  display: grid;
  gap: 14px;
  margin: 14px 0;
  padding: clamp(14px, 2vw, 22px);
  overflow: hidden;
  color: var(--text-primary, #e0ecf4);
  background:
    radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--accent-gold, #c6a84b) 12%, transparent), transparent 38%),
    linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated, #003080) 72%, var(--bg-base, #030712)), var(--bg-base, #030712));
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 38%, transparent);
  border-radius: 18px;
  box-shadow: 0 16px 38px color-mix(in srgb, var(--bg-base, #030712) 66%, transparent);

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-gold, #c6a84b), var(--accent-primary, #60c0f0), transparent);
  }
`;

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const HeadingGroup = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 11px;
  align-items: start;
`;

export const IconFrame = styled.span`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: var(--accent-gold, #c6a84b);
  background: color-mix(in srgb, var(--surface-dark, #1a1a24) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 44%, transparent);
  border-radius: 12px;
`;

export const Kicker = styled.div`
  color: var(--accent-primary, #60c0f0);
  font: 700 0.68rem/1.2 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 4px 0 2px;
  color: var(--text-primary, #e0ecf4);
  font: 750 clamp(1.05rem, 2vw, 1.4rem)/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const Subtitle = styled.p`
  margin: 0;
  max-width: 70ch;
  color: var(--text-secondary, #b8c8d8);
  font: 500 0.8rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 640px) {
    justify-content: stretch;
  }
`;

export const SafetyBadge = styled.span`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px;
  color: var(--accent-gold, #c6a84b);
  background: color-mix(in srgb, var(--surface-dark, #1a1a24) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 38%, transparent);
  border-radius: 999px;
  font: 700 0.72rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const ControlButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 13px;
  color: var(--text-primary, #e0ecf4);
  background: var(--primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 42%, transparent);
  border-radius: 11px;
  font: 700 0.76rem/1.2 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-purple, #8b5cf6) 28%, transparent);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-purple, #8b5cf6) 72%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    flex: 1 1 150px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const Notice = styled.p`
  margin: 0;
  padding: 9px 11px;
  color: var(--text-secondary, #b8c8d8);
  background: color-mix(in srgb, var(--accent-gold, #c6a84b) 8%, transparent);
  border-left: 3px solid var(--accent-gold, #c6a84b);
  border-radius: 8px;
  font: 600 0.76rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const Groups = styled.div`
  display: grid;
  gap: 14px;
`;

export const DateGroup = styled.section`
  display: grid;
  gap: 9px;
`;

export const DateHeading = styled.h3`
  margin: 0;
  color: var(--accent-primary, #60c0f0);
  font: 700 0.78rem/1.2 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0.04em;
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 10px;

  @media (min-width: 2560px) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  @media (min-width: 3840px) { grid-template-columns: repeat(5, minmax(0, 1fr)); }
`;

export const Card = styled.article`
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 13px;
  background: linear-gradient(155deg, color-mix(in srgb, var(--surface-dark, #1a1a24) 90%, transparent), color-mix(in srgb, var(--primary, #002060) 34%, var(--bg-base, #030712)));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 24%, transparent);
  border-radius: 13px;
  overflow-wrap: anywhere;
`;

export const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

export const ClientName = styled.span`
  color: var(--text-secondary, #b8c8d8);
  font: 650 0.72rem/1.25 var(--font-ui, 'Sora', sans-serif);
`;

export const Status = styled.span<{ $completed: boolean }>`
  flex: 0 0 auto;
  padding: 5px 8px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 36%, transparent);
  border-radius: 999px;
  font: 700 0.68rem/1 var(--font-ui, 'Sora', sans-serif);

  ${({ $completed }) => $completed && css`
    color: var(--accent-gold, #c6a84b);
    border-color: color-mix(in srgb, var(--accent-gold, #c6a84b) 48%, transparent);
  `}
`;

export const PlanTitle = styled.p`
  margin: 0;
  color: var(--text-secondary, #b8c8d8);
  font: 600 0.72rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const DayLabel = styled.h4`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font: 750 0.98rem/1.3 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--text-secondary, #b8c8d8);
  font: 600 0.68rem/1.25 var(--font-data, 'Fira Code', monospace);
`;

export const Detail = styled.p`
  margin: 0;
  color: var(--text-secondary, #b8c8d8);
  font: 500 0.76rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const Coexistence = styled.p`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #c6a84b);
  font: 700 0.72rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const StateMessage = styled.div`
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  color: var(--text-secondary, #b8c8d8);
  background: color-mix(in srgb, var(--surface-dark, #1a1a24) 72%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60c0f0) 26%, transparent);
  border-radius: 10px;
  font: 600 0.8rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-secondary, #b8c8d8);
  font: 600 0.72rem/1.3 var(--font-ui, 'Sora', sans-serif);

  @media (max-width: 480px) { align-items: stretch; flex-direction: column; }
`;
/** S2: honest drift — caution semantics, never earned gold. */
export const Overdue = styled.span`
  flex: 0 0 auto;
  padding: 5px 8px;
  color: var(--warning, #f59e0b);
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 42%, transparent);
  border-radius: 999px;
  font: 700 0.68rem/1 var(--font-ui, 'Sora', sans-serif);
`;
