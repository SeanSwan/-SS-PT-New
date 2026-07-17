/**
 * Voice-first Report Room tests: capability fallback, transcript de-duplication,
 * review-before-send behavior, and target-field control.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SupportVoiceCapture from './SupportVoiceCapture';

interface FakeResult { isFinal: boolean; transcript: string }

class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  processLocally = false;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  handlerAttachedWhenAborted = false;
  abortCount = 0;
  constructor() { FakeRecognition.last = this; }
  start() { this.started = true; }
  stop() { this.started = false; this.onend?.(); }
  abort() { this.abortCount += 1; this.handlerAttachedWhenAborted = Boolean(this.onend); this.started = false; }
  emitError(error: string) { this.onerror?.({ error } as SpeechRecognitionErrorEvent); }
  emitEnd() { this.onend?.(); }
  emit(results: FakeResult[], resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: results.map((result) => ({
        isFinal: result.isFinal,
        length: 1,
        0: { transcript: result.transcript, confidence: 0.9 },
        item: () => ({ transcript: result.transcript, confidence: 0.9 }),
      })),
    } as unknown as SpeechRecognitionEvent);
  }
}

const speechWindow = window as Window;

beforeEach(() => {
  delete speechWindow.SpeechRecognition;
  delete speechWindow.webkitSpeechRecognition;
  FakeRecognition.last = null;
});

afterEach(() => {
  delete speechWindow.SpeechRecognition;
  delete speechWindow.webkitSpeechRecognition;
});

describe('SupportVoiceCapture', () => {
  it('keeps the manual fallback visible when browser dictation is unavailable', () => {
    render(
      <SupportVoiceCapture
        target="description"
        onTargetChange={vi.fn()}
        onAppend={vi.fn()}
      />,
    );

    expect(screen.getByText(/private on-device dictation is not available/i)).toBeInTheDocument();
    expect(screen.getByText(/device keyboard dictation/i)).toBeInTheDocument();
  });

  it('appends only finalized speech to the selected field and never auto-submits', () => {
    speechWindow.SpeechRecognition = FakeRecognition as unknown as SpeechRecognitionConstructor;
    const onAppend = vi.fn();
    render(
      <SupportVoiceCapture
        target="description"
        onTargetChange={vi.fn()}
        onAppend={onAppend}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    expect(screen.getByRole('button', { name: /stop listening/i })).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      FakeRecognition.last?.emit([{ isFinal: false, transcript: 'The checkout' }]);
    });
    expect(screen.getByText('The checkout')).toBeInTheDocument();
    expect(onAppend).not.toHaveBeenCalled();

    act(() => {
      FakeRecognition.last?.emit([{ isFinal: true, transcript: 'The checkout froze after payment.' }]);
    });
    expect(onAppend).toHaveBeenCalledTimes(1);
    expect(onAppend).toHaveBeenCalledWith('description', 'The checkout froze after payment.');

    act(() => {
      FakeRecognition.last?.emit([{ isFinal: true, transcript: 'The checkout froze after payment.' }]);
    });
    expect(onAppend).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/nothing is sent until you review and choose send report/i)).toBeInTheDocument();
  });

  it('detaches recognition callbacks before aborting on unmount', () => {
    speechWindow.SpeechRecognition = FakeRecognition as unknown as SpeechRecognitionConstructor;
    const { unmount } = render(
      <SupportVoiceCapture
        target="description"
        onTargetChange={vi.fn()}
        onAppend={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    const activeRecognition = FakeRecognition.last;
    expect(activeRecognition?.started).toBe(true);

    unmount();

    expect(activeRecognition?.started).toBe(false);
    expect(activeRecognition?.handlerAttachedWhenAborted).toBe(false);
  });

  it('ignores a stale end event after restarting from a recognition error', () => {
    speechWindow.SpeechRecognition = FakeRecognition as unknown as SpeechRecognitionConstructor;
    render(
      <SupportVoiceCapture
        target="description"
        onTargetChange={vi.fn()}
        onAppend={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    const failedRecognition = FakeRecognition.last;
    act(() => failedRecognition?.emitError('network'));
    expect(screen.getByRole('button', { name: /start talking/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    const restartedRecognition = FakeRecognition.last;
    expect(restartedRecognition).not.toBe(failedRecognition);
    expect(screen.getByRole('button', { name: /stop listening/i })).toBeInTheDocument();

    act(() => failedRecognition?.emitEnd());

    expect(screen.getByRole('button', { name: /stop listening/i })).toBeInTheDocument();
    expect(restartedRecognition?.started).toBe(true);
  });

  it('disposes recognition when the browser throws during start', () => {
    class ThrowingRecognition extends FakeRecognition {
      start() { throw new Error('start failed'); }
    }
    speechWindow.SpeechRecognition = ThrowingRecognition as unknown as SpeechRecognitionConstructor;
    render(
      <SupportVoiceCapture
        target="description"
        onTargetChange={vi.fn()}
        onAppend={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    const failedRecognition = FakeRecognition.last;

    expect(screen.getByRole('alert')).toHaveTextContent(/could not start/i);
    expect(failedRecognition?.abortCount).toBe(1);
    expect(failedRecognition?.handlerAttachedWhenAborted).toBe(false);
  });
});
