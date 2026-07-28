import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  setCoachCommandCenterConversations,
} from './CoachCommandCenterPage.test.harness';

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);
const openOpsRail = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More coach actions$/i }));
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandCenter selected thread target routes', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('uses active thread targetUserId for Logger and Planner routes when URL has no clientId', async () => {
    setCoachCommandCenterConversations([
      {
        id: 201,
        title: 'Ava Stone weekly training',
        context: 'coach_assistant',
        status: 'active',
        messageCount: 6,
        lastMessageAt: '2026-06-14T10:00:00.000Z',
        createdAt: '2026-06-13T10:00:00.000Z',
        targetUserId: 424242,
      },
    ]);

    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    await waitFor(() => {
      const header = screen.getByRole('region', { name: /active coach thread/i });
      expect(within(header).getByText('Ava Stone weekly training')).toBeInTheDocument();
    });

    const opsRail = openOpsRail();
    expect(within(opsRail).getByText(/route workout actions for Client #424242/i)).toBeInTheDocument();
    expect(within(opsRail).getByText('Client #424242')).toBeInTheDocument();
    expect(within(opsRail).queryByText(/route workout actions for Ava Stone weekly training/i)).not.toBeInTheDocument();
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=424242&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(opsRail).getByRole('link', { name: /open planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=424242&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242%26tab%3Dtraining%26trainingSection%3Dplans',
    );

    fireEvent.change(composerInput(), { target: { value: 'Bench press 3 sets of 10.' } });
    fireEvent.click(screen.getByRole('button', { name: /send to swan coach/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Bench press 3 sets of 10.',
        'coach_assistant',
        'Ava Stone weekly training',
        424242,
        'both',
      );
    });
  });

  it('rebases stale routed client context when a History thread is selected', async () => {
    setCoachCommandCenterConversations([
      {
        id: 201,
        title: 'Ava Stone weekly training',
        context: 'coach_assistant',
        status: 'active',
        messageCount: 6,
        lastMessageAt: '2026-06-14T10:00:00.000Z',
        createdAt: '2026-06-13T10:00:00.000Z',
        targetUserId: 424242,
      },
      {
        id: 202,
        title: 'Client 42 routed handoff',
        context: 'coach_assistant',
        status: 'active',
        messageCount: 2,
        lastMessageAt: '2026-06-14T09:00:00.000Z',
        createdAt: '2026-06-13T09:00:00.000Z',
        targetUserId: 42,
      },
    ]);

    renderPage(
      '/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42&teachPrompt=Old%20client%20prompt',
    );

    let opsRail = openOpsRail();
    expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );

    fireEvent.click(screen.getByRole('tab', { name: /^History/i }));
    const historyPanel = document.getElementById('coach-tabpanel-history') as HTMLElement;
    fireEvent.click(within(historyPanel).getByRole('button', { name: /Ava Stone weekly training/i }));

    await waitFor(() => {
      opsRail = screen.getByLabelText('Coach operations command surface');
      expect(within(opsRail).getByRole('link', { name: /open logger/i })).toHaveAttribute(
        'href',
        '/dashboard/admin/client-management?clientId=424242&tab=training&trainingSection=logger&loadPlan=today',
      );
    });

    fireEvent.change(composerInput(), { target: { value: 'Write a deload.' } });
    fireEvent.click(screen.getByRole('button', { name: /send to swan coach/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Write a deload.',
        'coach_assistant',
        'Ava Stone weekly training',
        424242,
        'both',
      );
    });
  });
});
