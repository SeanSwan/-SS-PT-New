import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutLoggerRecovery from './WorkoutLoggerRecovery';
import ContextBar from './runner/shell/zones/ContextBar';

describe('WorkoutLogger client information recovery', () => {
  it('keeps the draft promise visible and provides an accessible retry', () => {
    const onRetry = vi.fn();
    render(<WorkoutLoggerRecovery clientInfoStatus="unavailable" onRetry={onRetry} hasDraft />);

    expect(screen.getByText(/client information unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/workout draft is kept/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /retry client information/i });
    expect(retry).toHaveAttribute('aria-live', 'off');
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('announces retained legacy records without offering automatic adoption', () => {
    render(<WorkoutLoggerRecovery clientInfoStatus="ready" onRetry={vi.fn()} legacyQueuePresent />);

    expect(screen.getByText(/older offline records need owner verification/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adopt|import|sync/i })).toBeNull();
  });

  it('does not turn an unknown balance into a zero-credit signal', () => {
    render(
      <ContextBar
        clientFirstName='Client'
        clientLastName='Unavailable'
        availableSessions={null}
        clientInfoUnavailable
        totalSets={0}
        estimatedDuration={0}
        assignment={null}
        currentOPTPhase={1}
        onOPTPhaseChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/information unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 paid sessions/i)).toBeNull();
  });
});
