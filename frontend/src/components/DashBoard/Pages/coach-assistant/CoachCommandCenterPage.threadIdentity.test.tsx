import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadConversationMock,
  renderPage,
  resetCoachCommandCenterMocks,
  setCoachCommandCenterActiveConversation,
  setCoachCommandCenterConversations,
} from './CoachCommandCenterPage.test.harness';

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);

const conversationsWithClients = [
  {
    id: 101,
    title: 'Friday intake cleanup',
    context: 'coach_assistant',
    status: 'active',
    messageCount: 4,
    lastMessageAt: '2026-05-14T11:30:00.000Z',
    createdAt: '2026-05-14T10:00:00.000Z',
    targetUserId: 77,
  },
  {
    id: 102,
    title: 'Client confirmation holds',
    context: 'coach_assistant',
    status: 'resumable',
    messageCount: 2,
    lastMessageAt: '2026-05-13T19:30:00.000Z',
    createdAt: '2026-05-13T18:00:00.000Z',
    targetUserId: 88,
  },
];

describe('CoachCommandCenterPage thread identity', () => {
  beforeEach(() => {
    resetCoachCommandCenterMocks();
    setCoachCommandCenterConversations(conversationsWithClients);
  });

  it('opens a history thread with an explicit active-thread identity header', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.click(screen.getByRole('tab', { name: /^History/i }));
    const historyPanel = document.getElementById('coach-tabpanel-history') as HTMLElement;
    fireEvent.click(within(historyPanel).getByRole('button', { name: /Client confirmation holds/i }));

    await waitFor(() => expect(screen.getByRole('tab', { name: /^Talk$/i })).toHaveAttribute('aria-selected', 'true'));
    const header = screen.getByRole('region', { name: /active coach thread/i });
    expect(within(header).getByText('Client confirmation holds')).toBeInTheDocument();
    expect(within(header).getByText('Client #88')).toBeInTheDocument();
    expect(within(header).getByText('2 msgs')).toBeInTheDocument();
    expect(within(header).getByText('resumable')).toBeInTheDocument();
    expect(composerInput()).toHaveValue('');
  });

  it('loads a direct threadId route into chat without staging composer text', async () => {
    renderPage('/dashboard/admin/coach-assistant?threadId=102&clientId=88');

    await waitFor(() => expect(loadConversationMock).toHaveBeenCalledWith(102));
    const header = screen.getByRole('region', { name: /active coach thread/i });
    expect(within(header).getByText('Client confirmation holds')).toBeInTheDocument();
    expect(composerInput()).toHaveValue('');
  });

  it('labels loaded conversation messages as thread history provenance', () => {
    setCoachCommandCenterActiveConversation();
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.getAllByText('Loaded thread history').length).toBeGreaterThan(0);
  });
});
