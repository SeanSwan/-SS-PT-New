import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStableThreadList } from './useStableThreadList';

const A = [{ id: 1 }, { id: 2 }];

describe('useStableThreadList (round-2 review #5)', () => {
  it('keeps the same actor\'s list on screen, marked refreshing, while re-admission empties it', () => {
    const { result, rerender } = renderHook(({ list }) => useStableThreadList(list, '1:admin', false), { initialProps: { list: A } });
    rerender({ list: [] });
    expect(result.current).toEqual({ threads: A, refreshing: true });
  });

  it('a different actor never sees the previous list', () => {
    const { result, rerender } = renderHook(({ list, actor }) => useStableThreadList(list, actor, false), { initialProps: { list: A, actor: '1:admin' } });
    rerender({ list: [], actor: '2:trainer' });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });

  it('CONTROL: a search with no match shows no match, not the cached list', () => {
    const { result, rerender } = renderHook(({ list, searching }) => useStableThreadList(list, '1:admin', searching), { initialProps: { list: A, searching: false } });
    rerender({ list: [], searching: true });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });
});
