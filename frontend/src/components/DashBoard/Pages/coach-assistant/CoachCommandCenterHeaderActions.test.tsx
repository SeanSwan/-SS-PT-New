import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
} from './CoachCommandCenterPage.test.harness';

const openCommandTools = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More command tools$/i }));
  return screen.getByRole('menu', { name: /^More command tools$/i });
};

const openCoachActions = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More coach actions$/i }));
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandCenterPage Floor Mode actions', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('moves workout, intake, and audio tools behind Floor Mode More controls', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    expect(screen.queryByLabelText('Coach header quick actions')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^More coach actions$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();

    const tools = openCommandTools();
    expect(within(tools).getByRole('menuitem', { name: /^Open workout logger$/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(tools).getByRole('menuitem', { name: /^Open workout planner$/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );

    fireEvent.click(within(tools).getByRole('menuitem', { name: /^Audio$/i }));
    expect(screen.getByRole('tab', { name: /^Review/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /^Talk$/i }));
    const actions = openCoachActions();
    expect(within(actions).getByRole('button', { name: /^Import audio$/i })).toBeInTheDocument();
    expect(within(actions).queryByText(/^PLAUD$/i)).not.toBeInTheDocument();
    fireEvent.click(within(actions).getByRole('button', { name: /Review next intake/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^More coach actions$/i })).toHaveAttribute('aria-expanded', 'false');
    clickSpy.mockRestore();
  });
});
