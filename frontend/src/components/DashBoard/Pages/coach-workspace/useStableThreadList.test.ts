import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStableThreadList } from './useStableThreadList';

const A = [{ id: 1 }, { id: 2 }];

describe('useStableThreadList (round-2 review #5)', () => {
  it('keeps the same actor\'s list on screen, marked refreshing, while re-admission empties it', () => {
    const { result, rerender } = renderHook(({ list, refreshing }) => useStableThreadList(list, '1:admin', false, refreshing), { initialProps: { list: A, refreshing: false } });
    rerender({ list: [], refreshing: true });
    expect(result.current).toEqual({ threads: A, refreshing: true });
  });

  it('clears cached rows when a refresh completes with an empty list', () => {
    const { result, rerender } = renderHook(({ list, refreshing }) => useStableThreadList(list, '1:admin', false, refreshing), { initialProps: { list: A, refreshing: false } });
    rerender({ list: [], refreshing: true });
    expect(result.current.threads).toEqual(A);
    rerender({ list: [], refreshing: false });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });

  it('never revives deleted rows during a later refresh after a settled empty result', () => {
    const { result, rerender } = renderHook(({ list, refreshing }) => useStableThreadList(list, '1:admin', false, refreshing), { initialProps: { list: A, refreshing: false } });
    rerender({ list: [], refreshing: false });
    rerender({ list: [], refreshing: true });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });

  it('a different actor never sees the previous list', () => {
    const { result, rerender } = renderHook(({ list, actor }) => useStableThreadList(list, actor, false, true), { initialProps: { list: A, actor: '1:admin' } });
    rerender({ list: [], actor: '2:trainer' });
    expect(result.current).toEqual({ threads: [], refreshing: false });
    rerender({ list: [], actor: '1:admin' });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });

  it('CONTROL: a search with no match shows no match, not the cached list', () => {
    const { result, rerender } = renderHook(({ list, searching }) => useStableThreadList(list, '1:admin', searching, true), { initialProps: { list: A, searching: false } });
    rerender({ list: [], searching: true });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });

  it('does not replace the full-list cache with filtered search rows', () => {
    const { result, rerender } = renderHook(({ list, searching }) => useStableThreadList(list, '1:admin', searching, true), { initialProps: { list: A, searching: false } });
    rerender({ list: [{ id: 2 }], searching: true });
    expect(result.current).toEqual({ threads: [{ id: 2 }], refreshing: false });
    rerender({ list: [], searching: false });
    expect(result.current).toEqual({ threads: A, refreshing: true });
  });

  it('does not retain cached rows without an authenticated actor', () => {
    const { result, rerender } = renderHook(({ list }) => useStableThreadList(list, null, false, true), { initialProps: { list: A } });
    rerender({ list: [] });
    expect(result.current).toEqual({ threads: [], refreshing: false });
  });
});
