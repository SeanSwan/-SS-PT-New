/**
 * ============================================================================
 * FILE: NASMExerciseRolodex.listNavigation.test.tsx
 *
 * The keyboard contract for the Rolodex result list, tested at the HOOK rather
 * than through the component. This was written while trying to lock F7: driving
 * `keyDown` through the rendered component did not reach the handler, so this
 * isolates which side is at fault — the handler's logic, or the component/test
 * wiring around it.
 *
 * The invariant it pins is the one F7 violated at the state level: the row Enter
 * selects is the row the preview names.
 * ============================================================================
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRolodexListNavigation } from './NASMExerciseRolodex.list';
import type { ExerciseSlim } from './useExerciseSearch';

const ex = (name: string): ExerciseSlim => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  exerciseType: 'strength',
  bodyPartCategory: 'Chest',
  primaryMuscles: ['Chest'],
  equipment: [],
});

const A = ex('Alpha Press');
const B = ex('Bravo Row');
const C = ex('Charlie Squat');

function setup(highlightIndex: number, results: ExerciseSlim[] = [A, B, C]) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const setHighlightIndex = vi.fn();
  const setPreviewExercise = vi.fn();
  const scrollToRow = vi.fn();

  const { result } = renderHook(() => useRolodexListNavigation({
    results,
    highlightIndex,
    listRef: { current: { scrollToRow } } as never,
    onSelect,
    onClose,
    setHighlightIndex,
    setPreviewExercise,
  }));

  const press = (key: string) => {
    const preventDefault = vi.fn();
    act(() => result.current({ key, preventDefault } as never));
    return preventDefault;
  };

  return { press, onSelect, onClose, setHighlightIndex, setPreviewExercise, scrollToRow };
}

describe('useRolodexListNavigation', () => {
  it('Enter selects the HIGHLIGHTED row and prevents the default submit', () => {
    const h = setup(1);
    const preventDefault = h.press('Enter');
    expect(h.onSelect).toHaveBeenCalledTimes(1);
    expect(h.onSelect).toHaveBeenCalledWith(B);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Enter does nothing when nothing is highlighted', () => {
    const h = setup(-1);
    h.press('Enter');
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it('Enter does nothing when the highlighted row is past the end', () => {
    // A shortened result set can leave a stale index; it must not select
    // `undefined` or throw.
    const h = setup(5, [A]);
    h.press('Enter');
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it('ArrowDown moves the highlight AND preview together', () => {
    const h = setup(0);
    h.press('ArrowDown');
    expect(h.setHighlightIndex).toHaveBeenCalledWith(1);
    expect(h.setPreviewExercise).toHaveBeenCalledWith(B);
  });

  it('ArrowDown wraps from the last row to the first', () => {
    const h = setup(2);
    h.press('ArrowDown');
    expect(h.setHighlightIndex).toHaveBeenCalledWith(0);
    expect(h.setPreviewExercise).toHaveBeenCalledWith(A);
  });

  it('ArrowUp wraps from the first row to the last', () => {
    const h = setup(0);
    h.press('ArrowUp');
    expect(h.setHighlightIndex).toHaveBeenCalledWith(2);
    expect(h.setPreviewExercise).toHaveBeenCalledWith(C);
  });

  it('Escape closes and does not select', () => {
    const h = setup(0);
    h.press('Escape');
    expect(h.onClose).toHaveBeenCalledTimes(1);
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it('does not lose an increment when two arrow keys land in ONE batch', () => {
    // Hostile-review finding 12. `act` collapses both dispatches into a single
    // React batch, so a handler reading `highlightIndex` from its closure sees the
    // same render-time value twice and the second write overwrites the first —
    // the highlight would advance by one for two presses.
    const onSelect = vi.fn();
    const setHighlightIndex = vi.fn();
    const setPreviewExercise = vi.fn();
    const { result } = renderHook(() => useRolodexListNavigation({
      results: [A, B, C],
      highlightIndex: 0,
      listRef: { current: { scrollToRow: vi.fn() } } as never,
      onSelect,
      onClose: vi.fn(),
      setHighlightIndex,
      setPreviewExercise,
    }));

    act(() => {
      result.current({ key: 'ArrowDown', preventDefault: vi.fn() } as never);
      result.current({ key: 'ArrowDown', preventDefault: vi.fn() } as never);
    });

    const written = setHighlightIndex.mock.calls.map(([value]) => value);
    expect(written).toEqual([1, 2]);
    expect(setPreviewExercise.mock.calls.map(([value]) => value?.name)).toEqual([B.name, C.name]);
  });

  it('keeps the ref mirror in step with an external highlight change', () => {
    // The ref must follow the prop, or a hover would desync the next keypress.
    const setHighlightIndex = vi.fn();
    const { result, rerender } = renderHook(
      ({ index }) => useRolodexListNavigation({
        results: [A, B, C],
        highlightIndex: index,
        listRef: { current: { scrollToRow: vi.fn() } } as never,
        onSelect: vi.fn(),
        onClose: vi.fn(),
        setHighlightIndex,
        setPreviewExercise: vi.fn(),
      }),
      { initialProps: { index: 0 } },
    );

    rerender({ index: 2 });
    act(() => { result.current({ key: 'ArrowDown', preventDefault: vi.fn() } as never); });

    // From 2 the next row wraps to the first, proving the ref saw the change.
    expect(setHighlightIndex).toHaveBeenCalledWith(0);
  });

  it('writes the highlight and the preview as VALUES, not as an updater', () => {
    // Hostile-review finding 10: the previous version of this test asserted the
    // two setters were called the SAME NUMBER of times, which proved nothing —
    // with both mocked, a call count cannot distinguish "applied together" from
    // "one applied inside the other's updater". These value assertions do:
    // pre-fix `setHighlightIndex` received a FUNCTION and `setPreviewExercise`
    // was only reached from inside that function.
    for (const [key, expectedIndex, expectedExercise] of [
      ['ArrowDown', 1, B],
      ['ArrowUp', 2, C],
    ] as const) {
      const h = setup(0);
      h.press(key);
      expect(h.setHighlightIndex, key).toHaveBeenCalledWith(expectedIndex);
      expect(h.setPreviewExercise, key).toHaveBeenCalledWith(expectedExercise);
      expect(h.setHighlightIndex.mock.calls[0][0], key).not.toBeInstanceOf(Function);
    }
  });
});
