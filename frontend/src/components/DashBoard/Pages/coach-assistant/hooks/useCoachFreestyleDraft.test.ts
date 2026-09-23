/**
 * FILE: useCoachFreestyleDraft.test.ts
 * PURPOSE: The S4-minimal consolidation contract — a freestyle session must
 *          reach the composer, and must not eat anything already in it.
 *
 * The destructive cases are the point. Before this hook existed the overlay's
 * `onStopped` had no consumer at all, so every one of these paths ended with a
 * ten-minute dictation being dropped. A regression here is silent: the UI still
 * closes cleanly, the words are just gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCoachFreestyleDraft,
  freestyleSnapshotToText,
  appendFreestyleDraft,
} from './useCoachFreestyleDraft';
import type { FreestyleSnapshot } from './useFreestyleSession';

const snapshot = (
  texts: string[],
  overrides: Partial<FreestyleSnapshot> = {},
): FreestyleSnapshot => ({
  fragments: texts.map((text, index) => ({ id: index + 1, text, atMs: index * 1000 })),
  wordCount: texts.join(' ').trim().split(/\s+/).filter(Boolean).length,
  elapsedMs: texts.length * 1000,
  accountKey: 'trainer-1',
  ...overrides,
});

describe('freestyleSnapshotToText', () => {
  it('joins phrase fragments into one readable block', () => {
    expect(freestyleSnapshotToText(snapshot(['knee felt tight', 'on the last set'])))
      .toBe('knee felt tight on the last set');
  });

  it('drops empty fragments and squeezes whitespace runs', () => {
    expect(freestyleSnapshotToText(snapshot(['  spaced   out  ', '', '   ', 'tail'])))
      .toBe('spaced out tail');
  });

  it('returns empty string when the recogniser heard nothing', () => {
    expect(freestyleSnapshotToText(snapshot([]))).toBe('');
  });
});

describe('appendFreestyleDraft', () => {
  it('separates dictation from typed text with a visible blank line', () => {
    expect(appendFreestyleDraft('typed note', 'spoken note'))
      .toBe('typed note\n\nspoken note');
  });

  it('does not lead with a separator when the composer was empty', () => {
    expect(appendFreestyleDraft('', 'spoken note')).toBe('spoken note');
    expect(appendFreestyleDraft('   ', 'spoken note')).toBe('spoken note');
  });

  it('leaves the composer untouched when there is nothing to add', () => {
    expect(appendFreestyleDraft('typed note', '')).toBe('typed note');
  });
});

describe('useCoachFreestyleDraft', () => {
  let onCommandTextChange: ReturnType<typeof vi.fn>;
  let onReceipt: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCommandTextChange = vi.fn();
    onReceipt = vi.fn();
  });

  const setup = (commandText = '') =>
    renderHook(
      (props: { commandText: string }) =>
        useCoachFreestyleDraft({
          commandText: props.commandText,
          onCommandTextChange,
          onReceipt,
        }),
      { initialProps: { commandText } },
    );

  it('starts closed and opens on request', () => {
    const { result } = setup();
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('delivers the dictation to the composer and closes', () => {
    const { result } = setup();
    act(() => result.current.open());
    act(() => result.current.handleStopped(snapshot(['left knee', 'felt tight'])));

    expect(onCommandTextChange).toHaveBeenCalledWith('left knee felt tight');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.lastDraftWordCount).toBe(4);
  });

  /**
   * THE REGRESSION THIS HOOK EXISTS TO PREVENT.
   *
   * `handleStopped` is handed to the overlay once and then lives inside it for
   * the whole session. If it read `commandText` from its creating closure it
   * would append to whatever the composer held when the mic OPENED, throwing
   * away everything typed during the dictation. Ten minutes of talking plus a
   * typed note in, that is two losses in one tap.
   */
  it('appends to the composer text as it is at STOP, not as it was at open', () => {
    const { result, rerender } = setup('');
    act(() => result.current.open());

    // The coach types while the mic is still listening.
    rerender({ commandText: 'typed during the session' });

    act(() => result.current.handleStopped(snapshot(['and then I said this'])));

    expect(onCommandTextChange).toHaveBeenCalledWith(
      'typed during the session\n\nand then I said this',
    );
  });

  it('writes nothing when the recogniser produced no words', () => {
    const { result } = setup('typed note');
    act(() => result.current.open());
    act(() => result.current.handleStopped(snapshot([])));

    expect(onCommandTextChange).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.lastDraftWordCount).toBe(0);
  });

  it('emits a completion receipt carrying the session measurements', () => {
    const { result } = setup();
    act(() => result.current.handleStopped(snapshot(['one two three'])));

    expect(onReceipt).toHaveBeenCalledWith({
      reason: 'completed',
      wordCount: 3,
      elapsedMs: 1000,
    });
  });

  it('passes every purge reason through as a receipt', () => {
    const { result } = setup();
    act(() => result.current.handlePurge('ttl'));
    act(() => result.current.handlePurge('account-switch'));

    expect(onReceipt).toHaveBeenNthCalledWith(1, expect.objectContaining({ reason: 'ttl' }));
    expect(onReceipt).toHaveBeenNthCalledWith(2, expect.objectContaining({ reason: 'account-switch' }));
  });

  it('clears the reported draft size when the buffer is purged for ownership', () => {
    const { result } = setup();
    act(() => result.current.handleStopped(snapshot(['a b c'])));
    expect(result.current.lastDraftWordCount).toBe(3);

    act(() => result.current.handlePurge('account-switch'));
    expect(result.current.lastDraftWordCount).toBe(0);
  });

  it('focuses the composer and puts the caret after the dictation', async () => {
    const node = document.createElement('textarea');
    document.body.appendChild(node);
    const composerRef = { current: node };

    const { result } = renderHook(() =>
      useCoachFreestyleDraft({
        commandText: 'typed',
        onCommandTextChange: (value) => { node.value = value; },
        composerRef,
      }),
    );

    act(() => result.current.handleStopped(snapshot(['spoken'])));
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(document.activeElement).toBe(node);
    expect(node.selectionStart).toBe(node.value.length);
    document.body.removeChild(node);
  });
});
