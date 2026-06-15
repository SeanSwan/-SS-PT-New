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
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandOpsRail workout command panel', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('shows route-safe Logger and Planner actions when Coach has a selected route client', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Coach launchpad/i })).toBeInTheDocument();
    expect(within(opsRail).getByText(/one tap to log, build, review, or import/i)).toBeInTheDocument();
    expect(within(opsRail).getByRole('button', { name: /review next intake/i })).toBeInTheDocument();
    expect(within(opsRail).getByText('Client #42')).toBeInTheDocument();
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
    fireEvent.click(within(opsRail).getByRole('button', { name: /draft in chat/i }));
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

  it('offers self logging and a Client Hub picker when no route client is loaded', () => {
    renderPage('/dashboard/admin/coach-assistant');

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Coach launchpad/i })).toBeInTheDocument();
    expect(within(opsRail).getByText(/use your admin self log/i)).toBeInTheDocument();
    expect(within(opsRail).queryByText(/selected client's workout/i)).not.toBeInTheDocument();
    expect(within(opsRail).getByText(/My workout log/i)).toBeInTheDocument();
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/log-my-workout?loadPlan=today',
    );
    expect(within(opsRail).getByRole('link', { name: /pick a client for workout logging/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?intent=log_workout',
    );
    expect(within(opsRail).queryByRole('link', { name: /open planner/i })).not.toBeInTheDocument();
  });

  it('shows an explicit drawer header close control that collapses Ops', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsTrigger = screen.getByRole('button', { name: /^Ops$/i });
    const opsRail = openOpsRail();
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(opsRail).getByText('Client #42')).toBeInTheDocument();

    fireEvent.click(within(opsRail).getByRole('button', { name: /close coach operations/i }));

    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});
