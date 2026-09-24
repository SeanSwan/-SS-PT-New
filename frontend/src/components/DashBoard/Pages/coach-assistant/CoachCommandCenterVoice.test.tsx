/**
 * ============================================================================
 * FILE: CoachCommandCenterVoice.test.tsx
 * PURPOSE: Mounted Coach voice-INPUT behaviour (dictation, recorder fallback,
 *          the approval-gated command lane, and the honesty of the action file).
 * ============================================================================
 * Rule 4 split: the module mocks / render helpers live in
 * `CoachCommandCenterVoice.testHarness.tsx`; the foreground lifecycle suite is
 * the sibling `CoachCommandCenterVoiceLifecycle.test.tsx`.
 */
import { readFileSync } from 'node:fs';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeCommandMock,
  renderAdmittedPage,
  renderPage,
  resetVoiceFixture,
  sendMessageWithConversationMock,
  setRecorderSupport,
  speechHookParams,
  speechMock,
} from './CoachCommandCenterVoice.testHarness';

describe('CoachCommandCenter voice input', () => {
  beforeEach(resetVoiceFixture);

  it('routes the command center Mic button into browser speech input', async () => {
    await renderAdmittedPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('disables the command center Mic button when no voice capture mode is available', () => {
    speechMock.speechSupported = false;

    renderPage();

    expect(screen.getByRole('button', { name: /voice dictation/i })).toBeDisabled();
  });

  it('opens the server transcription recorder when browser speech is unavailable', async () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    await renderAdmittedPage();

    const mic = screen.getByRole('button', { name: /start voice recording/i });
    expect(mic).not.toBeDisabled();

    fireEvent.click(mic);
    expect(screen.getByRole('dialog', { name: /voice recording/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mock transcribe/i }));
    expect(screen.getByPlaceholderText(/talk or type to swan coach/i)).toHaveValue('Log squats 3 by 10');
    expect(screen.getByText(/voice command captured - press send to continue/i)).toBeInTheDocument();
  });

  it('opens recorder capture when browser speech fails at runtime', async () => {
    setRecorderSupport(true);
    await renderAdmittedPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);

    act(() => {
      speechHookParams.current?.onRuntimeUnavailable?.({
        message: 'Browser speech service failed.',
        canTryRecorder: true,
      });
    });

    expect(screen.getByRole('dialog', { name: /voice recording/i })).toBeInTheDocument();
    expect(screen.getByText(/recorder fallback opened/i)).toBeInTheDocument();
  });

  it('routes transcribed workout commands through the approval-gated command lane', async () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);
    executeCommandMock.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Review this workout draft before saving.',
      operationId: 'voice-op-1',
      command: 'log_workout',
      params: {},
      client: null,
      details: { source: 'voice_recorder' },
      isDestructive: false,
    });

    await renderAdmittedPage();

    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock transcribe/i }));
    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    await waitFor(() => {
      expect(executeCommandMock).toHaveBeenCalledWith(
        'Log squats 3 by 10',
        expect.objectContaining({ selectedClientId: null, inputMode: 'voice' }),
      );
    });
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });

  it('keeps fake voice toggles out of the command action factory', () => {
    const actionSource = readFileSync(
      'src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts',
      'utf8',
    );

    expect(actionSource).not.toContain('Voice input listening');
    expect(actionSource).not.toContain('setVoiceActive');
    expect(actionSource).not.toContain('voiceActive');
  });
});
