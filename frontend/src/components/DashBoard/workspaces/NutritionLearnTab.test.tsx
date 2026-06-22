import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NutritionLearnTab from './NutritionLearnTab';

describe('NutritionLearnTab', () => {
  it('keeps education copy care-first without deficiency or deficit framing', async () => {
    const user = userEvent.setup();

    render(<NutritionLearnTab />);
    await user.click(screen.getByRole('button', { name: /micronutrients/i }));

    expect(document.body.textContent).not.toMatch(/\bdeficien(?:t|cy|cies)\b/i);
    expect(screen.getByText(/low vitamin d status/i)).toBeInTheDocument();
  });

  it('keeps hydration and timing education copy away from fear or deficit framing', async () => {
    const user = userEvent.setup();

    render(<NutritionLearnTab />);

    await user.click(screen.getByRole('button', { name: /hydration science/i }));
    expect(document.body.textContent).not.toMatch(/\balready dehydrated\b/i);
    expect(document.body.textContent).not.toMatch(/\bDrink 16-20 oz\b|\b7-10 oz every\b|\b16-24 oz\b|\bminimum\b/i);
    expect(screen.getByText(/hydration status can affect/i)).toBeInTheDocument();
    expect(screen.getByText(/start hydrated with steady sips/i)).toBeInTheDocument();
    expect(screen.getByText(/use body size, climate, medication guidance, and urine color/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nutrient timing/i }));
    expect(document.body.textContent).not.toMatch(/\bcaloric deficit\b|\bspike insulin\b/i);
    expect(screen.getByText(/protein plus carbohydrates/i)).toBeInTheDocument();
  });
});
