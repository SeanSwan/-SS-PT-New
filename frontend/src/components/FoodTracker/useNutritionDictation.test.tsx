/**
 * useNutritionDictation tests (Slice 1.6, round-2 TC-2)
 * =====================================================
 * Covers the two things that actually matter for safe voice capture:
 *   1. graceful capability detection (supported true/false from the CURRENT window),
 *   2. finalized-chunk de-dupe — re-firing `onresult` with already-seen final results
 *      must NOT re-append them (the processedRef guard), so a spoken meal isn't doubled.
 * The lazy ctor resolution (TC-3) is what makes stubbing `window.SpeechRecognition`
 * before render possible.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNutritionDictation } from './useNutritionDictation';

interface FakeResult { isFinal: boolean; transcript: string; }

class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() { FakeRecognition.last = this; }
  start() { this.started = true; }
  stop() { this.started = false; }
  emit(results: FakeResult[]) {
    this.onresult?.({ results: results.map((r) => ({ isFinal: r.isFinal, 0: { transcript: r.transcript } })) });
  }
}

const win = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };

beforeEach(() => {
  delete win.SpeechRecognition;
  delete win.webkitSpeechRecognition;
  FakeRecognition.last = null;
});

afterEach(() => {
  delete win.SpeechRecognition;
  delete win.webkitSpeechRecognition;
  vi.restoreAllMocks();
});

describe('useNutritionDictation', () => {
  it('reports supported:false when the browser has no Speech API', () => {
    const { result } = renderHook(() => useNutritionDictation(vi.fn()));
    expect(result.current.supported).toBe(false);
  });

  it('reports supported:true and starts listening when the API is present', () => {
    win.SpeechRecognition = FakeRecognition;
    const { result } = renderHook(() => useNutritionDictation(vi.fn()));
    expect(result.current.supported).toBe(true);

    act(() => { result.current.toggle(); });
    expect(result.current.listening).toBe(true);
    expect(FakeRecognition.last?.started).toBe(true);
  });

  it('appends only newly-finalized chunks across repeated onresult events (no duplication)', () => {
    win.webkitSpeechRecognition = FakeRecognition;
    const onAppend = vi.fn();
    const { result } = renderHook(() => useNutritionDictation(onAppend));

    act(() => { result.current.toggle(); });
    const rec = FakeRecognition.last!;

    act(() => { rec.emit([{ isFinal: true, transcript: 'I ate ' }]); });
    expect(onAppend).toHaveBeenCalledTimes(1);
    expect(onAppend).toHaveBeenLastCalledWith('I ate');

    // Same final result re-sent PLUS a new final result — only the new one appends.
    act(() => {
      rec.emit([
        { isFinal: true, transcript: 'I ate ' },
        { isFinal: true, transcript: 'a banana' },
      ]);
    });
    expect(onAppend).toHaveBeenCalledTimes(2);
    expect(onAppend).toHaveBeenLastCalledWith('a banana');
  });

  it('ignores interim (non-final) results until they finalize', () => {
    win.SpeechRecognition = FakeRecognition;
    const onAppend = vi.fn();
    const { result } = renderHook(() => useNutritionDictation(onAppend));

    act(() => { result.current.toggle(); });
    const rec = FakeRecognition.last!;

    act(() => { rec.emit([{ isFinal: false, transcript: 'half a' }]); });
    expect(onAppend).not.toHaveBeenCalled();

    act(() => { rec.emit([{ isFinal: true, transcript: 'half a sandwich' }]); });
    expect(onAppend).toHaveBeenCalledTimes(1);
    expect(onAppend).toHaveBeenLastCalledWith('half a sandwich');
  });
});
