import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DegradedResponse } from '../../../../../services/aiWorkoutService';
import {
  LongHorizonDegradedState,
  LongHorizonIdleState,
  LongHorizonSavedState,
} from './LongHorizonStatusScreens';

const DEGRADED: DegradedResponse = {
  success: true,
  degraded: true,
  code: 'AI_DEGRADED_MODE',
  message: 'Swan Coach is temporarily unavailable.',
  fallback: {
    type: 'template_suggestions',
    templateSuggestions: [],
    reasons: ['Gemini unavailable', 'Fallback engaged'],
  },
  failoverTrace: [],
};

describe('LongHorizonStatusScreens', () => {
  it('starts configuration from the idle state', () => {
    const onConfigure = vi.fn();

    render(<LongHorizonIdleState clientName="Sean" isSubmitting={false} onConfigure={onConfigure} />);
    fireEvent.click(screen.getByRole('button', { name: /configure plan/i }));

    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('renders degraded reasons and exposes retry/back actions', () => {
    const onRetry = vi.fn();
    const onBackToConfigure = vi.fn();

    render(
      <LongHorizonDegradedState
        degradedData={DEGRADED}
        isSubmitting={false}
        onRetry={onRetry}
        onBackToConfigure={onBackToConfigure}
      />,
    );

    expect(screen.getByText('Gemini unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to configure/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBackToConfigure).toHaveBeenCalledTimes(1);
  });

  it('summarizes saved plans and warnings', () => {
    render(
      <LongHorizonSavedState
        savedPlanId={101}
        savedBlockCount={4}
        validationWarnings={['Review tempo']}
        eligibilityWarnings={['Check attendance']}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Plan ID:/)).toHaveTextContent('101');
    expect(screen.getByText('Review tempo')).toBeInTheDocument();
    expect(screen.getByText('Check attendance')).toBeInTheDocument();
  });
});
