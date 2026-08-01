/**
 * useCoachSpeech.test.ts — S11 acceptance fence.
 * Locks: no client name is EVER speakable (dev throws, prod redacts);
 * tier-1-only speech; barge-in cancel is synchronous; mute persists;
 * speaking never opens the mic (no capture references in the hook).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertNoNames, isTierOneConfirmation, useCoachSpeech } from './useCoachSpeech';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.removeItem('ss.coach.speech.muted.v1');
});

describe('S11 useCoachSpeech', () => {
  it('throws in dev when a roster name token would be spoken', () => {
    expect(() => assertNoNames('Logged for Marcus: bench 3x8', ['Marcus Alvarez']))
      .toThrow(/name token/);
  });

  it('leaves clean utterances untouched and skips short tokens', () => {
    expect(assertNoNames('Logged. Bench, three by eight at one eighty-five.', ['Al Bo']))
      .toBe('Logged. Bench, three by eight at one eighty-five.');
  });

  it('speaks tier-1 confirmations only', () => {
    expect(isTierOneConfirmation('Logged. Bench, three by eight at one eighty-five.')).toBe(true);
    expect(isTierOneConfirmation('Here is your full plan for the next twelve weeks: week one begins with…')).toBe(false);
    expect(isTierOneConfirmation('The client should consider a deload')).toBe(false);
  });

  it('half-duplex by construction: the hook never touches capture or the mic', () => {
    const src = readFileSync(resolve(__dirname, 'useCoachSpeech.ts'), 'utf8');
    expect(src).not.toMatch(/getUserMedia|MediaRecorder|useVoiceCapture/);
    expect(src).toContain('speechSynthesis.cancel'); // synchronous barge-in
  });

  it('the next tap cancels a spoken confirmation and updates speaking state', () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      volume = 1;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    });
    const { result } = renderHook(() => useCoachSpeech());
    act(() => { expect(result.current.speakConfirmation('Logged. One exercise added.')).toBe(true); });
    expect(result.current.speaking).toBe(true);
    fireEvent.pointerDown(window);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.current.speaking).toBe(false);
  });

  it('the next keyboard interaction cancels an owned spoken confirmation', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      volume = 1;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    });
    const { result } = renderHook(() => useCoachSpeech());
    act(() => { result.current.speakConfirmation('Logged. One exercise added.'); });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.current.speaking).toBe(false);
  });

  it('cancels browser speech when its owning surface unmounts', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      volume = 1;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    });
    const { result, unmount } = renderHook(() => useCoachSpeech());
    act(() => { result.current.speakConfirmation('Logged. One exercise added.'); });
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('late completion from an older utterance cannot disown the current speech', () => {
    const cancel = vi.fn();
    const utterances: Array<{ onend: (() => void) | null; onerror: (() => void) | null }> = [];
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      volume = 1;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) { utterances.push(this); }
    });
    const { result, unmount } = renderHook(() => useCoachSpeech());
    act(() => { result.current.speakConfirmation('Logged. First exercise added.'); });
    act(() => { result.current.speakConfirmation('Logged. Second exercise added.'); });
    const beforeUnmount = cancel.mock.calls.length;
    act(() => { utterances[0]?.onend?.(); });
    expect(result.current.speaking).toBe(true);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(beforeUnmount + 1);
  });

  it('does not cancel unrelated browser speech when this hook never spoke', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(public text: string) {}
    });
    const { unmount } = renderHook(() => useCoachSpeech());
    unmount();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('an explicit cancel remains scoped to speech owned by this hook', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(public text: string) {}
    });
    const { result } = renderHook(() => useCoachSpeech());
    act(() => { result.current.cancelSpeech(); });
    expect(cancel).not.toHaveBeenCalled();
  });

  it('mute persists via validated localStorage read', () => {
    const src = readFileSync(resolve(__dirname, 'useCoachSpeech.ts'), 'utf8');
    expect(src).toContain("ss.coach.speech.muted.v1");
    expect(src).toContain("=== '1'");
  });
});
