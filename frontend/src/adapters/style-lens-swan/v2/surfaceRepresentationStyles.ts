/**
 * Blueprint: surfaceRepresentationStyles (Swan adapter, Recipe v2)
 * Parents: WorkoutLoggerLensFrame + WorkoutPlannerLensFrame (via
 * LensPlanFrame's representationStyles prop).
 * Purpose: The shared production-surface mapping from resolved lens
 * variants (data-lens2-* attrs) onto surface primitives (.lens2-row /
 * .lens2-display / .lens2-actions). Card-level restyles only — law grids,
 * inputs, and write actions are host-fixed and deliberately NOT
 * addressable from here. Rule 43: css helper required.
 */
import { css } from 'styled-components';

export const surfaceRepresentationStyles = css`
  /* Exercise cards — collection representation */
  &[data-lens2-collection='command-rows'] .lens2-row {
    border-radius: var(--world-row-radius, 3px);
    border-left: 3px solid var(--world-accent, var(--accent-primary, #60c0f0));
    padding: 1.25rem 1.5rem;
  }

  &[data-lens2-collection='arcade-cards'] .lens2-row {
    border-radius: var(--world-row-radius, 22px);
  }

  /* Display typography — surface titles keep the recipe's typeface character
     but at HOST scale: the world-title-font tokens are authored for the Lab
     hero (clamp up to 76px) and must never blow out a working h2. */
  &[data-lens2-display] .lens2-display {
    font: var(--world-title-font, inherit);
    font-size: min(1.6rem, 6vw);
    line-height: 1.25;
    letter-spacing: var(--world-letter-spacing, normal);
  }

  /* Primary action arrangement — footer action bar */
  &[data-lens2-action='command-rail'] .lens2-actions {
    flex-direction: column;
    align-items: stretch;
  }

  &[data-lens2-action='glass-dock'] .lens2-actions {
    justify-content: center;
    border-radius: var(--world-panel-radius, 26px);
  }
`;
