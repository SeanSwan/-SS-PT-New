/**
 * Brain-v4 P0.2 (hostile review C2, dev half). The selection adapter aborts its
 * in-flight admission on unmount. React StrictMode replays effects (mount, unmount,
 * mount) on the same instance, so the replayed request must be a FRESH one. Before
 * the fix the replay saw the same observation key, issued nothing, and the aborted
 * first request left the staff surface 'unavailable': every send was silently dropped
 * in dev and under the repo's own mounted smoke spec.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequestCoachRouteSelection } from './CoachCommandCenter.controllerEffects';

describe('useRequestCoachRouteSelection under a remount', () => {
  it('re-issues the admission request after a StrictMode effect replay', () => {
    const requestSelection = vi.fn(() => Promise.resolve({ status: 'accepted' }));
    const selection = { requestSelection } as never;
    renderHook(
      () => useRequestCoachRouteSelection('7:trainer|null|null', { targetUserId: null, conversationId: null }, selection),
      { wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode> },
    );
    expect(requestSelection).toHaveBeenCalledTimes(2);
  });

  it('CONTROL: a plain single mount requests exactly once', () => {
    const requestSelection = vi.fn(() => Promise.resolve({ status: 'accepted' }));
    renderHook(() => useRequestCoachRouteSelection('7:trainer|null|null', { targetUserId: null, conversationId: null }, { requestSelection } as never));
    expect(requestSelection).toHaveBeenCalledTimes(1);
  });

  it('CONTROL: a re-render with the same key does not re-request', () => {
    const requestSelection = vi.fn(() => Promise.resolve({ status: 'accepted' }));
    const { rerender } = renderHook(() => useRequestCoachRouteSelection('k', { targetUserId: null, conversationId: null }, { requestSelection } as never));
    rerender();
    expect(requestSelection).toHaveBeenCalledTimes(1);
  });
});
