/**
 * ============================================================================
 * FILE: NASMExerciseRolodex.previewHighlightSync.test.tsx — finding F7.
 *
 * THE DEFECT
 *   Preview and highlight were independent state. The effect on
 *   [filteredResults, isOpen] reset ONLY the preview (to results[0]), while
 *   `highlightIndex` kept a stale value — so the pane named one exercise and
 *   Enter added another.
 *
 * THE FIRST FIX WAS ALSO WRONG (hostile review findings 3 and 4)
 *   It set BOTH to row 0. That made a bare Enter commit `catalog[0]` with ZERO
 *   typing — an empty query returns the whole catalog, and the log surface adds
 *   with no confirm and no undo — and it broke useRolodexDeepLink's promise that
 *   an inexact query "never" surprise-adds a different exercise.
 *
 * THE INVARIANT, STATED CORRECTLY (round-2 review finding 1)
 *   An earlier version of this header claimed preview and highlight "agree on
 *   EMPTY" and that "the pane never names a row Enter would not honour". BOTH
 *   ARE FALSE, and this file's own first test proves it: on open the preview
 *   names row 0 while the highlight is -1 (none).
 *
 *   What is actually true:
 *     - on open, preview = row 0, highlight = NONE, so Enter in the SEARCH INPUT
 *       is inert (`highlightIndex >= 0` is required);
 *     - the preview pane carries its own Add button, and THAT is a real gesture —
 *       it commits the previewed row (NASMExerciseRolodexPreview.tsx);
 *     - after an explicit hover or click, preview and highlight DO agree, and
 *       Enter commits the row the pane names.
 *   So the pane is a suggestion reachable by its own control, and the input's
 *   Enter is inert until the user chooses. It is not "they always agree".
 *
 * Harness mirrors NASMExerciseRolodex.selectionBehavior.test.tsx.
 * ============================================================================
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';
import { StyledBox } from '@/components/ui/StyledBox';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

const { mockUseExerciseSearch, mockScrollToRow } = vi.hoisted(() => ({
  mockUseExerciseSearch: vi.fn(),
  mockScrollToRow: vi.fn(),
}));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: mockScrollToRow } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, style, id, role, 'aria-label': ariaLabel }: any) => (
    <StyledBox as="div" id={id} role={role} aria-label={ariaLabel} $style={style}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <RowComponent
          key={index}
          index={index}
          {...reactWindowStyleProps({ height: rowHeight, top: index * rowHeight })}
        />
      ))}
    </StyledBox>
  ),
}));

vi.mock('./useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('./useExerciseSearch')>('./useExerciseSearch');
  return { ...actual, useExerciseSearch: () => mockUseExerciseSearch() };
});

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

const setResults = (results: ExerciseSlim[]) => {
  mockUseExerciseSearch.mockReturnValue({
    results,
    allExercises: results,
    isSearching: false,
    isLoading: false,
    setQuery: vi.fn(),
    setCategory: vi.fn(),
    query: '',
    category: null,
    refresh: vi.fn(),
    loadState: 'ready',
    refreshError: null,
  });
};

const selectedRowName = (): string | null => {
  const selected = document.querySelector('[role="option"][aria-selected="true"]');
  if (!selected) return null;
  // Scoped to the NAME element. It used to read whatever the row rendered FIRST, which was the name
  // only until the row gained a media column; a row may now legitimately lead with a placeholder.
  return (selected.querySelector('[data-testid="exercise-row-name"]')?.textContent ?? '').trim();
};

const previewedName = (): string | null => {
  const node = screen.queryByText(/previewing/i);
  if (!node) return null;
  return (node.textContent ?? '').replace(/^.*previewing\s*/i, '').trim();
};

const rowByName = (name: string) => {
  const rows = Array.from(document.querySelectorAll('[role="option"]'));
  return rows.find((row) => (row.textContent ?? '').includes(name)) as HTMLElement | undefined;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

describe('preview may suggest; only a CHOICE may be committed (F7)', () => {
  it('previews row 0 on open but selects NOTHING, so a bare Enter cannot commit', () => {
    // The accidental-commit guard. The pane may suggest the first result — mobile
    // has no hover, so that at-a-glance preview is a real affordance — but nothing
    // is SELECTED, and Enter requires `highlightIndex >= 0`.
    setResults([A, B, C]);
    render(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(previewedName()).toBe(A.name);
    expect(selectedRowName()).toBeNull();
  });

  it('agrees once a row is explicitly chosen', () => {
    setResults([A, B, C]);
    render(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    const row = rowByName(B.name);
    expect(row).toBeTruthy();
    fireEvent.mouseEnter(row as HTMLElement);

    expect(previewedName()).toBe(B.name);
    expect(selectedRowName()).toBe(B.name);
  });

  it('drops the CHOICE when the result set changes, rather than re-pointing it', () => {
    setResults([A, B, C]);
    const view = render(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.mouseEnter(rowByName(C.name) as HTMLElement);
    expect(selectedRowName()).toBe(C.name);

    setResults([C, A, B]);
    view.rerender(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    // Nothing is selected, so Enter cannot commit a row the user never chose in
    // THIS result set. The pane falls back to suggesting the new first row.
    expect(selectedRowName()).toBeNull();
    expect(previewedName()).toBe(C.name);
  });

  it('keeps the choice dropped after the result set shrinks', () => {
    setResults([A, B, C]);
    const view = render(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    setResults([B]);
    view.rerender(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(selectedRowName()).toBeNull();
    expect(previewedName()).toBe(B.name);

    fireEvent.mouseEnter(rowByName(B.name) as HTMLElement);
    expect(selectedRowName()).toBe(B.name);
    expect(previewedName()).toBe(B.name);
  });

  it('marks nothing selected when there are no results', () => {
    setResults([]);
    render(<NASMExerciseRolodex isOpen onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  });
});
