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
  inlineRecorderDriver,
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

  it('captures inline, with no recorder overlay, when browser speech is unavailable', async () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    await renderAdmittedPage();

    const mic = screen.getByRole('button', { name: /start voice recording/i });
    expect(mic).not.toBeDisabled();

    fireEvent.click(mic);

    expect(inlineRecorderDriver.toggle).toHaveBeenCalledTimes(1);
    // The regression this whole change exists to prevent: one press must not
    // raise a full-screen module the speaker then has to walk out of.
    expect(screen.queryByRole('dialog', { name: /voice recording/i })).toBeNull();
  });

  it('hands a runtime browser-speech failure to the inline recorder, not an overlay', async () => {
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

    expect(inlineRecorderDriver.toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/switching to inline recording/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /voice recording/i })).toBeNull();
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

    act(() => { inlineRecorderDriver.onTranscribed?.('Log squats 3 by 10'); });

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
