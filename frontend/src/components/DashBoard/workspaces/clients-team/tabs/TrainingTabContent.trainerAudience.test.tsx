import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    clearError: vi.fn(),
    error: null,
    messages: [],
    newChat: vi.fn(),
    sendMessageWithConversation: vi.fn(),
    sending: false,
  }),
}));

vi.mock('../../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    cancelCommand: vi.fn(),
    confirmCommand: vi.fn(),
    executeCommand: vi.fn(),
    executingCommand: false,
  }),
}));

vi.mock('../../../../WorkoutManagement/WorkoutPlanBuilder', () => ({
  default: () => <div data-testid="workout-plan-builder" />,
}));

vi.mock('./ClientWorkoutPlansPanel', () => ({
  default: () => <div data-testid="client-workout-plans-panel" />,
}));

vi.mock('../../../../WorkoutLogger/WorkoutLogger', () => ({
  default: ({ onComplete }: { onComplete: (formData: unknown) => void }) => (
    <button type="button" data-testid="workout-logger" onClick={() => onComplete({ id: 'fixture-form' })}>
      Complete Mock Workout
    </button>
  ),
}));

vi.mock('../../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: () => <div data-testid="plaud-merge-workspace" />,
}));

vi.mock('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel', () => ({
  default: () => <div data-testid="workout-copilot-panel" />,
}));

vi.mock('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel', () => ({
  default: () => <div data-testid="workout-history-panel" />,
}));

import TrainingTabContent from './TrainingTabContent';

const renderTrainerTraining = (props: Partial<ComponentProps<typeof TrainingTabContent>> = {}) => render(
  <TrainingTabContent clientId={424242} clientName="Fixture Client" audience="trainer" {...props} />
);

describe('TrainingTabContent trainer audience', () => {
  it('shows only Today and Plan workflow modes to trainers', async () => {
    renderTrainerTraining();
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
    const modeRail = screen.getByRole('tablist', { name: /training workflow modes/i });
    const modeTabs = Array.from(modeRail.querySelectorAll('[role="tab"]'));
    expect(modeTabs).toHaveLength(2);
    expect(screen.queryByRole('tab', { name: /history & inputs/i })).not.toBeInTheDocument();
  });

  it('coerces an admin-gated PLAUD deep link to the trainer logger', async () => {
    renderTrainerTraining({ initialSection: 'plaud' });
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
    expect(screen.queryByTestId('plaud-merge-workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /today/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps trainers on Today with an inline save receipt after logging a workout', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    renderTrainerTraining({ onSectionChange });
    await user.click(await screen.findByRole('button', { name: /complete mock workout/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/workout saved/i);
    expect(screen.getByRole('tab', { name: /today/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('workout-history-panel')).not.toBeInTheDocument();
    expect(onSectionChange).toHaveBeenCalledWith('logger');
  });

  it('still opens Plan mode with the vault and Build Plan lanes for trainers', async () => {
    const user = userEvent.setup();
    renderTrainerTraining();
    await user.click(screen.getByRole('tab', { name: /plan vault/i }));
    expect(await screen.findByTestId('client-workout-plans-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /build plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^coach draft/i })).toBeInTheDocument();
  });
});
