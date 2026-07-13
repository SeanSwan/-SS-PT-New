/**
 * Blueprint: ExerciseSetRowControls.styles
 * Parent styles: ExerciseSetRow.styles (extracted for the Rule-4 line cap)
 * Purpose: The Phase-2C per-set log check and the phone-only set-details
 * disclosure. Dual-Button Glow law: log check = Blue background → Purple
 * glow. aria-pressed carries the logged state. Named SetLogCheckButton to
 * stay distinct from QuickLogMode's full-width LogSetButton.
 */
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const SetLogCheckButton = styled.button`
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  border: 1px solid ${withAlpha(CS.secondary, 0.25)};
  background: ${CS.primaryDeep};
  color: ${CS.text};
  cursor: pointer;
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;

  &:hover { box-shadow: 0 0 14px ${withAlpha(CS.secondary, 0.35)}; }
  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${withAlpha(CS.secondary, 0.2)};
  }
  &[aria-pressed='true'] {
    background: linear-gradient(135deg, ${CS.secondary}, ${CS.primaryDeep});
    border-color: ${withAlpha(CS.secondary, 0.6)};
    box-shadow: 0 0 16px ${withAlpha(CS.secondary, 0.45)};
  }
  svg { width: 20px; height: 20px; }
`;

/** Phone-only disclosure for the secondary set fields (tempo/RPE/form/rest/notes/remove). */
export const SetDetailsToggle = styled.button`
  display: none;

  @media (max-width: 767px) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: calc(100% - 16px);
    margin: 0 8px 8px;
    min-height: 44px;
    background: ${withAlpha(CS.surfaceDark, 0.6)};
    border: 1px dashed ${withAlpha(CS.gaming, 0.25)};
    border-radius: 8px;
    color: ${CS.textMuted};
    font-family: 'Sora', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; }
  }
`;

/** Inline retry action for the rolodex's honest library-load error state. */
export const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 8px;
  padding: 8px 16px;
  border: 1px solid ${withAlpha(CS.gaming, 0.35)};
  border-radius: 0.5rem;
  background: ${withAlpha(CS.gaming, 0.1)};
  color: ${CS.text};
  font: 600 0.8rem 'Sora', sans-serif;
  cursor: pointer;
  &:hover { background: ${withAlpha(CS.gaming, 0.18)}; }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; }
`;
