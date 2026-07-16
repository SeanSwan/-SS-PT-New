/**
 * ============================================================================
 * FILE: TodayTrainingModule.styles.ts
 * PURPOSE: Style the shared Today module with responsive Crystalline Swan UI.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the module shell, facts, exercise list, and
 * action controls. HOW IT FITS IN THE APP: TodayTrainingModule composes these
 * styles in both client Home hosts. KEY DECISIONS: Buttons keep 44px targets,
 * mobile stacks at 640px, and motion is removed when the OS requests it.
 * NASM PROTOCOL CONTEXT: Presentation only; it does not prescribe training.
 */
import styled, { css } from 'styled-components';

export const Shell = styled.section`
  position: relative;
  display: grid;
  gap: 14px;
  margin: 0 0 18px;
  padding: clamp(16px, 2vw, 24px);
  overflow: hidden;
  color: var(--text-primary, #e0ecf4);
  background: linear-gradient(145deg, var(--surface-elevated, #003080), var(--bg-base, #030712) 78%);
  background:
    radial-gradient(circle at 88% 10%, color-mix(in srgb, var(--accent-primary, #60c0f0) 15%, transparent), transparent 38%),
    linear-gradient(145deg, var(--surface-elevated, #003080), var(--bg-base, #030712) 78%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 42%, transparent);
  border-radius: 18px;
  box-shadow: 0 16px 42px color-mix(in srgb, var(--bg-base, #030712) 70%, transparent);

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(var(--accent-primary, #60c0f0), var(--accent-purple, #8b5cf6));
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
`;

export const Kicker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60c0f0);
  font: 700 0.72rem/1.2 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 6px 0 0;
  color: var(--text-primary, #e0ecf4);
  font: 700 clamp(1.15rem, 2.2vw, 1.55rem)/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const Status = styled.span<{ $kind: string }>`
  flex: 0 0 auto;
  padding: 7px 10px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 14%, var(--surface-dark, #1a1a24));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 36%, transparent);
  border-radius: 999px;
  font: 700 0.72rem/1 var(--font-ui, 'Sora', sans-serif);

  ${({ $kind }) => $kind === 'completed' && css`
    border-color: color-mix(in srgb, var(--accent-gold, #c6a84b) 55%, transparent);
  `}
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

export const MetaPill = styled.span`
  padding: 5px 9px;
  color: var(--text-secondary, #c5d5e3);
  background: color-mix(in srgb, var(--surface-dark, #1a1a24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 13%, transparent);
  border-radius: 999px;
  font: 600 0.76rem/1.2 var(--font-data, 'Fira Code', monospace);
`;

export const ExerciseList = styled.ul`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Exercise = styled.li`
  min-width: 0;
  padding: 10px 12px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--bg-base, #030712) 64%, transparent);
  border-left: 2px solid var(--accent-purple, #8b5cf6);
  border-radius: 8px;
  font: 600 0.82rem/1.3 var(--font-ui, 'Sora', sans-serif);
  overflow-wrap: anywhere;
`;

export const Overflow = styled.span`
  align-self: center;
  color: var(--text-secondary, #c5d5e3);
  font: 600 0.78rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $primary }) => $primary
    ? 'var(--primary, #002060)'
    : 'color-mix(in srgb, var(--surface-dark, #1a1a24) 78%, transparent)'};
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 34%, transparent);
  border-radius: 10px;
  font: 700 0.78rem/1.2 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-purple, #8b5cf6) 26%, transparent);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-purple, #8b5cf6) 72%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;