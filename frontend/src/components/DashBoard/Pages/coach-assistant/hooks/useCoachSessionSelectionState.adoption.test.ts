/**
 * Brain-v4 P0.2 (hostile review C2) — through the REAL staff binding, not a test
 * double. `useAIChat.retirement.test.tsx` injects its own adopter; this test proves
 * the binding the Command Center actually passes to `useAIChat` has one.
 */
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCoachSessionSelectionState } from './useCoachSessionSelectionState';

const admission = {
  actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 3,
  targetUserId: null, threadId: null,
};

function mount(staffActor = true) {
  return renderHook(() => useCoachSessionSelectionState({
    actorNumber: 7, rawRole: 'trainer', staffActor, actorKey: staffActor ? '7:trainer' : '',
  }));
}

describe('staff publication binding: created-thread adoption', () => {
  it('exposes an adopter (the create path refuses a bound send without one)', () => {
    const { result } = mount();
    expect(typeof result.current.publicationBinding.adoptCreatedThread).toBe('function');
  });

  it('adopts the created thread and publishes it, so the next send reuses it', async () => {
    const { result } = mount();
    act(() => { result.current.publish(admission as never); });
    const captured = result.current.publicationBinding.getSnapshot();
    expect(captured).toMatchObject({ threadId: null, generation: 3 });
    const adopted = await result.current.publicationBinding.adoptCreatedThread!({
      captured: captured!, operation: {}, thread: { id: 501, role: 'trainer', targetUserId: null },
      signal: new AbortController().signal,
    });
    expect(adopted).toMatchObject({ threadId: 501, generation: 3, targetUserId: null });
    expect(result.current.publicationBinding.getSnapshot()).toEqual(adopted);
  });

  it('refuses after retirement: a stale create can never publish into a new scope', async () => {
    const { result } = mount();
    act(() => { result.current.publish(admission as never); });
    const captured = result.current.publicationBinding.getSnapshot()!;
    act(() => { result.current.retire(); });
    const adopted = await result.current.publicationBinding.adoptCreatedThread!({
      captured, operation: {}, thread: { id: 501, role: 'trainer', targetUserId: null },
      signal: new AbortController().signal,
    });
    expect(adopted).toBeNull();
    expect(result.current.publicationBinding.getSnapshot()).toBeNull();
  });
});
