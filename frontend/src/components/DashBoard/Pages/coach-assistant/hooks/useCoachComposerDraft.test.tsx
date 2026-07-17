/**
 * Regression (v2 P1.4): composer drafts survive interruptions per thread key
 * and clear when the text is sent (composer empties).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachComposerDraft, coachDraftKey } from './useCoachComposerDraft';

describe('useCoachComposerDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('saves a debounced draft and clears it when the composer empties', () => {
    let text = 'log bench for 84';
    const setText = vi.fn();
    const { rerender } = renderHook(({ value }) => useCoachComposerDraft(7, value, setText), {
      initialProps: { value: text },
    });
    act(() => vi.advanceTimersByTime(500));
    expect(window.sessionStorage.getItem(coachDraftKey(7))).toBe('log bench for 84');

    text = '';
    rerender({ value: text });
    act(() => vi.advanceTimersByTime(500));
    expect(window.sessionStorage.getItem(coachDraftKey(7))).toBeNull();
  });

  it('restores a saved draft into an empty composer on mount, never over typed text', () => {
    window.sessionStorage.setItem(coachDraftKey('new'), 'draft text');
    const setText = vi.fn();
    renderHook(() => useCoachComposerDraft(null, '', setText));
    const updater = setText.mock.calls[0][0] as (c: string) => string;
    expect(updater('')).toBe('draft text');
    expect(updater('already typing')).toBe('already typing');
  });
});
