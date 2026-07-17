import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach...';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);

describe('CoachCommandCenterPage keyboard submit', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('submits the command dock when Enter is pressed in the textarea', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

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
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    const composer = composerInput();
    fireEvent.change(composer, { target: { value: 'Chaz' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });

  it('does not submit while IME composition is using Enter to choose text', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    const composer = composerInput();
    fireEvent.change(composer, { target: { value: 'ime composition sample' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', isComposing: true });

    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });
  it('closes the dock More menu from a window Escape when touch focus stays on the trigger', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    const moreButton = screen.getByRole('button', { name: /^More command tools$/i });
    fireEvent.click(moreButton);
    expect(screen.getByRole('menu', { name: /^More command tools$/i })).toBeInTheDocument();

    moreButton.focus();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: /^More command tools$/i })).not.toBeInTheDocument();
    expect(moreButton).toHaveFocus();
  });

  it('closes the dock More menu when keyboard focus leaves the popup', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.click(screen.getByRole('button', { name: /^More command tools$/i }));
    // v2 P1.3: the command catalog entry is the menu's first item.
    const firstItem = screen.getByRole('menuitem', { name: /^What can I say\?$/i });
    const composer = screen.getByRole('textbox', { name: /message swan coach/i });

    await waitFor(() => expect(firstItem).toHaveFocus());
    fireEvent.blur(firstItem, { relatedTarget: composer });
    composer.focus();

    expect(screen.queryByRole('menu', { name: /^More command tools$/i })).not.toBeInTheDocument();
    expect(composer).toHaveFocus();
  });
  it('supports arrow, Home, and End keyboard navigation across Coach section tabs', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    const talkTab = screen.getByRole('tab', { name: /^Talk$/i });
    expect(talkTab).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(talkTab, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^Review/i })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: /^Review/i })).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(screen.getByRole('tab', { name: /^Review/i }), { key: 'End' });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^History$/i })).toHaveAttribute('aria-selected', 'true');
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: /^History$/i }), { key: 'Home' });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^Talk$/i })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
