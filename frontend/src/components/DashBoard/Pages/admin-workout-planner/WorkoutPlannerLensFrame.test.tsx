/**
 * TEST: WorkoutPlannerLensFrame — appearance-profile gate + computed
 * signature of the planner as a Recipe v2 host.
 * Fail-closed contract: with no provider (or any v1 lens id) the frame is
 * a pass-through — zero DOM additions, zero visual change.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LensPlanFrame from '../workout-design-lab/LensPlanFrame';
import {
  CANDY_GLASS_ARCADE_RECIPE,
  PRISM_TERMINAL_RECIPE,
} from '../../../../adapters/style-lens-swan/v2/labRecipes';
import { WORKOUT_PLANNER_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';
import { surfaceRepresentationStyles } from '../../../../adapters/style-lens-swan/v2/surfaceRepresentationStyles';
import WorkoutPlannerLensFrame from './WorkoutPlannerLensFrame';

describe('WorkoutPlannerLensFrame gate', () => {
  it('paints nothing without a provider but keeps the frame MOUNTED (no remount on lens switch)', () => {
    const { container } = render(
      <WorkoutPlannerLensFrame>
        <p>planner content</p>
      </WorkoutPlannerLensFrame>,
    );
    expect(screen.getByText('planner content')).toBeInTheDocument();
    expect(container.querySelector('[data-lens2-plan]')).toBeNull();
    expect(screen.getByLabelText('Workout Planner style frame')).toBeInTheDocument();
  });
});

describe('Workout Planner as a Recipe v2 host (computed signature)', () => {
  const renderWithRecipe = (recipe: typeof CANDY_GLASS_ARCADE_RECIPE) =>
    render(
      <LensPlanFrame
        recipe={recipe}
        manifest={WORKOUT_PLANNER_MANIFEST}
        representationStyles={surfaceRepresentationStyles}
        aria-label="Workout Planner style frame"
      >
        <div className="lens2-row">plan card</div>
      </LensPlanFrame>,
    );

  it('paints divergent tokens and representation attrs for the Golden Pair', () => {
    const candy = renderWithRecipe(CANDY_GLASS_ARCADE_RECIPE);
    const candyRoot = candy.container.querySelector('[data-lens2-plan]') as HTMLElement;
    expect(candyRoot).not.toBeNull();
    expect(candyRoot.getAttribute('data-lens2-collection')).toBe('arcade-cards');
    expect(candyRoot.style.getPropertyValue('--world-row-radius')).toBe('22px');
    candy.unmount();

    const prism = renderWithRecipe(PRISM_TERMINAL_RECIPE);
    const prismRoot = prism.container.querySelector('[data-lens2-plan]') as HTMLElement;
    expect(prismRoot).not.toBeNull();
    expect(prismRoot.getAttribute('data-lens2-collection')).toBe('command-rows');
    expect(prismRoot.style.getPropertyValue('--world-row-radius')).toBe('3px');
  });
});
