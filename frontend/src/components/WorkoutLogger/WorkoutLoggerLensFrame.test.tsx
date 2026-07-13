/**
 * TEST: WorkoutLoggerLensFrame — appearance-profile gate + computed
 * signature of the logger as a Recipe v2 SECOND HOST.
 * Fail-closed contract: with no provider (or any v1 lens id) the frame is
 * a pass-through — zero DOM additions, zero visual change.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LensPlanFrame from '../DashBoard/Pages/workout-design-lab/LensPlanFrame';
import {
  CANDY_GLASS_ARCADE_RECIPE,
  PRISM_TERMINAL_RECIPE,
} from '../../adapters/style-lens-swan/v2/labRecipes';
import { WORKOUT_LOGGER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';
import WorkoutLoggerLensFrame from './WorkoutLoggerLensFrame';
import { surfaceRepresentationStyles } from '../../adapters/style-lens-swan/v2/surfaceRepresentationStyles';

describe('WorkoutLoggerLensFrame gate', () => {
  it('paints nothing without a provider but keeps the frame MOUNTED (no remount on lens switch)', () => {
    const { container } = render(
      <WorkoutLoggerLensFrame>
        <p>logger content</p>
      </WorkoutLoggerLensFrame>,
    );
    expect(screen.getByText('logger content')).toBeInTheDocument();
    expect(container.querySelector('[data-lens2-plan]')).toBeNull();
    expect(screen.getByLabelText('Workout Logger style frame')).toBeInTheDocument();
  });
});

describe('Workout Logger as a Recipe v2 second host (computed signature)', () => {
  const renderWithRecipe = (recipe: typeof CANDY_GLASS_ARCADE_RECIPE) =>
    render(
      <LensPlanFrame
        recipe={recipe}
        manifest={WORKOUT_LOGGER_MANIFEST}
        representationStyles={surfaceRepresentationStyles}
        aria-label="Workout Logger style frame"
      >
        <div className="lens2-row">card</div>
      </LensPlanFrame>,
    );

  it('paints divergent tokens and representation attrs for the Golden Pair', () => {
    const candy = renderWithRecipe(CANDY_GLASS_ARCADE_RECIPE);
    const candyRoot = candy.container.querySelector('[data-lens2-plan]') as HTMLElement;
    expect(candyRoot).not.toBeNull();
    expect(candyRoot.getAttribute('data-lens2-collection')).toBe('arcade-cards');
    expect(candyRoot.style.getPropertyValue('--world-panel-radius')).toBe('26px');
    candy.unmount();

    const prism = renderWithRecipe(PRISM_TERMINAL_RECIPE);
    const prismRoot = prism.container.querySelector('[data-lens2-plan]') as HTMLElement;
    expect(prismRoot).not.toBeNull();
    expect(prismRoot.getAttribute('data-lens2-collection')).toBe('command-rows');
    expect(prismRoot.style.getPropertyValue('--world-panel-radius')).toBe('4px');
    expect(prismRoot.getAttribute('data-lens2-chart')).toBeNull();
  });
});
