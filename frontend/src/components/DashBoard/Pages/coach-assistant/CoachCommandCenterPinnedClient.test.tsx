/**
 * Coach Command Center pinned-client regression
 * ==============================================
 * Selecting a main client must rebase the URL, isolate the conversation, and
 * bind the next AI message to that client's targetUserId.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  newChatMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  setActiveClientMock,
} from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenter pinned client', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('pins a selected client and starts an isolated client-bound conversation', async () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=41');

    const picker = screen.getByRole('combobox', { name: /main client/i });
    expect(picker).toHaveValue('41');
    expect(screen.getAllByText('Ava Stone').length).toBeGreaterThan(0);

    fireEvent.change(picker, { target: { value: '52' } });

    expect(setActiveClientMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 52,
      firstName: 'Ben',
      lastName: 'Harbor',
    }));
    expect(newChatMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(picker).toHaveValue('52'));
    expect(screen.getAllByText('Ben Harbor').length).toBeGreaterThan(0);

    const composer = screen.getByPlaceholderText(/talk or type to swan coach/i);
    fireEvent.change(composer, { target: { value: 'Summarize today?s coaching priorities.' } });
    fireEvent.click(screen.getByRole('button', { name: /send to swan coach/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Summarize today?s coaching priorities.',
        'coach_assistant',
        expect.stringMatching(/Ben Harbor|Client #52/),
        52,
        'both',
      );
    });
  });

  it('does not expose main-client controls in client self-service mode', () => {
    renderPage('/dashboard/client/coach-assistant', 'client');
    expect(screen.queryByRole('combobox', { name: /main client/i })).not.toBeInTheDocument();
  });
});
