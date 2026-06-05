import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLongHorizonErrorFlags } from './longHorizonErrors';
import LongHorizonErrorState from './LongHorizonErrorState';

describe('LongHorizonErrorState', () => {
  it('renders waiver guidance for waiver consent errors', () => {
    render(
      <LongHorizonErrorState
        state="error"
        errorMessage="Waiver missing"
        errorFlags={getLongHorizonErrorFlags('AI_WAIVER_MISSING')}
        approveErrors={[]}
        validationWarnings={[]}
        isSubmitting={false}
        onRetry={vi.fn()}
        onAddOverride={vi.fn()}
        onBackToConfigure={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/waiver consent is missing or outdated/i)).toBeInTheDocument();
  });

  it('calls retry and override actions when those branches are available', () => {
    const onRetry = vi.fn();
    const onAddOverride = vi.fn();

    render(
      <LongHorizonErrorState
        state="approve_error"
        errorMessage="Override required"
        errorFlags={{
          ...getLongHorizonErrorFlags('AI_RATE_LIMITED'),
          isOverrideReasonError: true,
        }}
        approveErrors={[]}
        validationWarnings={[]}
        isSubmitting={false}
        onRetry={onRetry}
        onAddOverride={onAddOverride}
        onBackToConfigure={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    fireEvent.click(screen.getByRole('button', { name: /add override reason/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onAddOverride).toHaveBeenCalledTimes(1);
  });
});
