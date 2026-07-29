/**
 * Blueprint: ExerciseSetRowControls.styles
 * Parent styles: ExerciseSetRow.styles (extracted for the Rule-4 line cap)
 * Purpose: The Phase-2C per-set log check and the phone-only set-details
 * disclosure. Chrome keeps the Dual-Button Glow law (blue bg → purple
 * glow on hover/focus); the LOGGED state speaks the §12-C2 Train state
 * language instead — earned Gilded Fern, never purple (purple = Coach
 * only on Train surfaces). aria-pressed carries the logged state. Named
 * SetLogCheckButton to stay distinct from QuickLogMode's LogSetButton.
 */
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { TRAIN } from '../../styles/train-tokens';

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
    background: ${withAlpha(TRAIN.done, 0.16)};
    border-color: ${withAlpha(TRAIN.done, 0.6)};
    box-shadow: 0 0 12px ${withAlpha(TRAIN.done, 0.3)};
    color: ${TRAIN.done};
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

    &:focus-visible { outline: 2px solid ${TRAIN.active}; outline-offset: 2px; }
  }
`;

/** Tap-to-fill last-weight chip (blueprint S5, 02 §E) — suggestion only,
 *  never auto-commits; mirrors the OverloadSuggestion pill discipline. */
export const LastWeightChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  min-height: 44px;
  border: 1px solid ${withAlpha(CS.gaming, 0.25)};
  border-radius: 999px;
  background: ${withAlpha(CS.gaming, 0.08)};
  color: ${CS.textMuted};
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  line-height: 1.1;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: ${withAlpha(CS.gaming, 0.18)}; color: ${CS.text}; }
  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 2px; }
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
  &:focus-visible { outline: 2px solid ${TRAIN.active}; outline-offset: 2px; }
`;
