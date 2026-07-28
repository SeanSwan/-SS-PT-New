import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

vi.mock('../../../Admin/AdminAccountSwitcher', () => ({
  default: () => <section aria-label="Admin account testing switcher">Mock owner account controls</section>,
}));

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);
const openOpsRail = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More coach actions$/i }));
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandOpsRail workout command panel', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('shows route-safe Logger and Planner actions when Coach has a selected route client', () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dlogger%26loadPlan%3Dtoday',
    );

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Workout command center/i })).toBeInTheDocument();
    expect(within(opsRail).getByText(/pick one move/i)).toBeInTheDocument();
    expect(within(opsRail).getByRole('button', { name: /review next intake/i })).toBeInTheDocument();
    expect(within(opsRail).queryByLabelText('Coach Actions mission checklist')).not.toBeInTheDocument();
    expect(within(opsRail).getByLabelText('Coach Actions target and safety')).toHaveTextContent(/Client #42/);
    expect(within(opsRail).getByLabelText('Coach Actions target and safety')).toHaveTextContent(/Save happens in Logger/i);
    expect(within(opsRail).getAllByText('Client #42').length).toBeGreaterThan(0);
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(opsRail).getByRole('link', { name: /open planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
    expect(within(opsRail).getByRole('link', { name: /resume workflow/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
  });

  it('opens Intake and Audio from Operations without staging prompt text or submitting chat', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    let opsRail = openOpsRail();
    expect(within(opsRail).queryByRole('button', { name: /draft in chat/i })).not.toBeInTheDocument();
    fireEvent.change(composerInput(), { target: { value: 'User-written note stays untouched.' } });
    fireEvent.click(within(opsRail).getByRole('button', { name: /review next intake/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Talk or type to Swan Coach/i)).not.toBeInTheDocument();
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: /^Talk$/i }));
    expect(composerInput()).toHaveValue('User-written note stays untouched.');
    opsRail = openOpsRail();
    fireEvent.click(within(opsRail).getByRole('button', { name: /import audio/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('offers self logging and a Client Hub picker when no route client is loaded', () => {
    renderPage('/dashboard/admin/coach-assistant');

    const opsRail = openOpsRail();
    expect(within(opsRail).getByRole('heading', { name: /Workout command center/i })).toBeInTheDocument();
    expect(within(opsRail).getAllByText(/use your admin self log/i).length).toBeGreaterThan(0);
    expect(within(opsRail).queryByText(/selected client's workout/i)).not.toBeInTheDocument();
    expect(within(opsRail).getByLabelText('Coach Actions target and safety')).toHaveTextContent(/My workout log/);
    expect(within(opsRail).getByLabelText('Coach Actions target and safety')).toHaveTextContent(/Save happens in Logger/i);
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/log-my-workout?loadPlan=today',
    );
    expect(within(opsRail).getByRole('link', { name: /open planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?self=1&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday',
    );
    expect(within(opsRail).getByRole('link', { name: /pick a client for workout logging/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?intent=log_workout',
    );
  });

  it('keeps owner account controls collapsed behind an admin-only toggle', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsRail = openOpsRail();
    const ownerToggle = within(opsRail).getByRole('button', { name: /owner controls/i });

    expect(ownerToggle).toHaveAttribute('aria-controls', 'coach-owner-account-controls');
    expect(ownerToggle).toHaveAttribute('aria-pressed', 'false');
    expect(ownerToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(opsRail).queryByLabelText('Admin account testing switcher')).not.toBeInTheDocument();

    fireEvent.click(ownerToggle);

    expect(ownerToggle).toHaveAttribute('aria-pressed', 'true');
    expect(ownerToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(opsRail).getByLabelText('Admin account testing switcher')).toHaveTextContent('Mock owner account controls');
  });

  it('hides owner account controls for trainer mode', () => {
    renderPage('/dashboard/trainer/coach-assistant', 'trainer');

    const trainerRail = openOpsRail();

    expect(within(trainerRail).queryByRole('button', { name: /owner controls/i })).not.toBeInTheDocument();
  });

  it('keeps Teach Mode guidance collapsed behind a compact toggle', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsRail = openOpsRail();
    const teachToggle = within(opsRail).getByRole('button', { name: /teach mode/i });

    expect(teachToggle).toHaveAttribute('aria-pressed', 'false');
    expect(teachToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(opsRail).queryByLabelText('Teach Mode review guidance')).not.toBeInTheDocument();
    expect(within(opsRail).queryByText(/Review blockers/i)).not.toBeInTheDocument();

    fireEvent.click(teachToggle);

    expect(teachToggle).toHaveAttribute('aria-pressed', 'true');
    expect(teachToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(opsRail).getByLabelText('Teach Mode review guidance')).toHaveTextContent(/Review blockers/i);

    fireEvent.click(within(opsRail).getByRole('button', { name: /hide teach mode guidance/i }));

    expect(teachToggle).toHaveAttribute('aria-pressed', 'false');
    expect(teachToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(opsRail).queryByLabelText('Teach Mode review guidance')).not.toBeInTheDocument();
  });

  it('shows an explicit drawer header close control that collapses Operations', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const opsTrigger = screen.getByRole('button', { name: /^More coach actions$/i });
    const opsRail = openOpsRail();
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(opsRail).getByLabelText('Coach Actions target and safety')).toHaveTextContent('Client #42');

    fireEvent.click(within(opsRail).getByRole('button', { name: /close coach operations/i }));

    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});
