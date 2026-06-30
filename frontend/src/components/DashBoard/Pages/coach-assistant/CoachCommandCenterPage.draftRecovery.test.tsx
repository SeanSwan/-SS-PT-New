import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeCommandMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach…';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });

describe('CoachCommandCenterPage draft recovery', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('restores the trainer draft when the chat send fails', async () => {
    const draft = 'Log Ava bench press but do not lose this draft.';
    sendMessageWithConversationMock.mockResolvedValueOnce({
      failed: true,
      originalMessage: draft,
      errorCode: 'NETWORK_ERROR',
      retryable: true,
    });

    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: draft } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(composerInput()).toHaveValue(draft));
    expect(screen.getByText(/Swan Coach command failed - draft restored/i)).toBeInTheDocument();
    expect(screen.getByText(/The command was not completed. No final write was made/i)).toBeInTheDocument();
  });

  it('restores the trainer draft when the command lane fails before chat fallback', async () => {
    const draft = 'List active clients';
    executeCommandMock.mockResolvedValueOnce({ type: 'error', error: 'Command request failed.' });

    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: draft } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(composerInput()).toHaveValue(draft));
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Command lane failed - draft restored/i)).toBeInTheDocument();
    expect(screen.getByText(/No data was changed/i)).toBeInTheDocument();
  });
});
