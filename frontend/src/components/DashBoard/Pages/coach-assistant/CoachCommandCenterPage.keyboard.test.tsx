import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach…';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);

describe('CoachCommandCenterPage keyboard submit', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('submits the command dock when Enter is pressed in the textarea', async () => {
    renderPage();

    const composer = composerInput();
    fireEvent.change(composer, { target: { value: 'Chaz' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Chaz',
        'coach_assistant',
        'Friday intake cleanup',
        null,
        'both',
      );
    });
  });

  it('keeps Shift+Enter available for multiline dock drafting', () => {
    renderPage();

    const composer = composerInput();
    fireEvent.change(composer, { target: { value: 'Chaz' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });
});
