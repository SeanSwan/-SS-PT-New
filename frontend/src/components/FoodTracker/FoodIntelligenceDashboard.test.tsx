import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FoodIntelligenceDashboard from './FoodIntelligenceDashboard';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { get: apiMocks.get } }));

describe('FoodIntelligenceDashboard', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
  });

  it('shows safe nutrition-search failure copy without leaking raw provider errors', async () => {
    apiMocks.get.mockRejectedValueOnce({
      response: {
        data: {
          error: 'CalorieNinjas stack trace: upstream token rejected',
        },
      },
    });
    const user = userEvent.setup();

    render(<FoodIntelligenceDashboard />);
    await user.type(screen.getByPlaceholderText(/describe what you ate/i), 'eggs and toast');
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    expect(await screen.findByText(/nutrition intelligence is unavailable right now/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/CalorieNinjas stack trace/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/upstream token rejected/i)).not.toBeInTheDocument();
    });
  });

  it('does not render malformed provider macros as credible nutrition facts', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          items: [{
            name: 'Malformed meal',
            calories: '1e3',
            protein_g: ['45'],
            carbohydrates_total_g: '0x10',
            fat_total_g: '4.5',
            fiber_g: '1e2',
            serving_size_g: '2e2',
          }, {
            name: 'Zero serving meal',
            calories: 90,
            protein_g: 8,
            carbohydrates_total_g: 0,
            fat_total_g: 4,
            fiber_g: 2,
            serving_size_g: '0',
          }],
        },
      },
    });
    const user = userEvent.setup();

    render(<FoodIntelligenceDashboard />);
    await user.type(screen.getByPlaceholderText(/describe what you ate/i), 'bad provider row');
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    expect(await screen.findByText('Malformed meal')).toBeInTheDocument();
    expect(screen.getByText('Zero serving meal')).toBeInTheDocument();
    expect(screen.queryByText('1000 cal')).not.toBeInTheDocument();
    expect(screen.queryByText('45g protein')).not.toBeInTheDocument();
    expect(screen.queryByText('0x10g carbs')).not.toBeInTheDocument();
    expect(screen.queryByText('1e2g fiber')).not.toBeInTheDocument();
    expect(screen.queryByText('Serving: 2e2g')).not.toBeInTheDocument();
    expect(screen.queryByText('Serving: 0g')).not.toBeInTheDocument();
    expect(screen.getByText('4.5g fat')).toBeInTheDocument();
  });

  it('keeps fast-food verdicts care-first without cutting or bulk framing', async () => {
    const user = userEvent.setup();

    render(<FoodIntelligenceDashboard />);
    await user.click(screen.getByRole('tab', { name: /fast food/i }));

    expect(screen.getByText('Double Cheeseburger')).toBeInTheDocument();
    expect(screen.queryByText(/\bcutting\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bbulk\b/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Plan it around your day and training context/i)).toBeInTheDocument();
  });

  it('keeps produce guidance practical without fear-based residue absolutes', async () => {
    const user = userEvent.setup();

    render(<FoodIntelligenceDashboard />);
    await user.click(screen.getByRole('tab', { name: /produce guide/i }));

    const produceCopy = document.body.textContent ?? '';
    expect(screen.getByText('Produce Planning Guide')).toBeInTheDocument();
    expect(produceCopy).toMatch(/Washing well and choosing\s+within your budget/i);
    expect(produceCopy).not.toMatch(/Dirty Dozen|Clean Fifteen|High Risk|Low Risk/i);
    expect(produceCopy).not.toMatch(/Always buy organic|absorbs chemicals|traps pesticides/i);
    expect(produceCopy).not.toMatch(/Very clean produce|conventional is safe|organic recommended/i);
  });
});
