import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
} from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenterPage header quick actions', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('exposes workout, intake, and PLAUD quick actions before opening the Operations drawer', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const headerActions = screen.getByLabelText('Coach header quick actions');
    expect(screen.getByRole('button', { name: /^Operations$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    expect(headerActions).toHaveTextContent(/Client #42/i);
    expect(within(headerActions).getByRole('link', { name: /Log workout for Client #42/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(headerActions).getByRole('link', { name: /Build workout for Client #42/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );

    fireEvent.click(within(headerActions).getByRole('button', { name: /Review intake queue/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Operations$/i })).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('tab', { name: /^Chat$/i }));
    fireEvent.click(within(headerActions).getByRole('button', { name: /Import PLAUD audio/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    clickSpy.mockRestore();
  });
});
