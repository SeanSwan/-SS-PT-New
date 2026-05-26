import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../WorkoutManagement/WorkoutPlanBuilder', () => ({
  default: () => <div data-testid="workout-plan-builder" />,
}));

vi.mock('../../../../WorkoutLogger/WorkoutLogger', () => ({
  default: () => <div data-testid="workout-logger" />,
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

describe('TrainingTabContent daily workflow default', () => {
  it('opens on Workout Logger so the selected-client workflow starts with today', async () => {
    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    expect(
      screen.getByRole('region', { name: /fixture client swan daily training command/i })
    ).toBeInTheDocument();
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout logger/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('workout-plan-builder')).not.toBeInTheDocument();
  });
});
