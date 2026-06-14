import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);
const openOpsRail = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Ops$/i }));
  return screen.getByLabelText('Coach operations rail');
};

describe('CoachCommandOpsRail workout command panel', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('shows route-safe Logger and Planner actions when Coach has a selected route client', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Workout command/i })).toBeInTheDocument();
    expect(within(opsRail).getByText(/Client #42/i)).toBeInTheDocument();
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(opsRail).getByRole('link', { name: /open planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
  });

  it('stages a workout-log prompt and opens PLAUD from Ops without submitting chat', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    let opsRail = openOpsRail();
    fireEvent.click(within(opsRail).getByRole('button', { name: /stage workout log/i }));
    await waitFor(() => {
      expect((composerInput() as HTMLInputElement).value).toContain('Log a workout for the selected client');
    });
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();

    opsRail = openOpsRail();
    fireEvent.click(within(opsRail).getByRole('button', { name: /import plaud audio/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('keeps Logger and Planner navigation locked when no route client is selected', () => {
    renderPage('/dashboard/admin/coach-assistant');

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Workout command/i })).toBeInTheDocument();
    expect(within(opsRail).getByText(/Select a client route/i)).toBeInTheDocument();
    expect(within(opsRail).queryByRole('link', { name: /open logger/i })).not.toBeInTheDocument();
    expect(within(opsRail).queryByRole('link', { name: /open planner/i })).not.toBeInTheDocument();
  });
});
