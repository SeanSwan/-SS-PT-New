/**
 * FILE: useCoachSurfaceContext.test.ts
 * PURPOSE: G04c — surface identity context (route/surface key, target, bounded selected
 *          entities, shell generation, stable surfaceToken, deskReady).
 *          The token changes only when route/surface/target/generation change and never
 *          embeds transient draft state (no parallel store).
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { CoachSurfaceProvider, useCoachSurfaceContext } from './useCoachSurfaceContext';
import type { CoachSessionDraft, DraftState } from './coachSessionDraftState';

const draftApiState = vi.hoisted(() => ({
  current: {
    actorId: 7 as number | null,
    actorRole: 'trainer' as string | null,
    generation: 2,
    draft: null as CoachSessionDraft | null,
    submitted: null as DraftState['submitted'],
    pendingTargetChange: null as DraftState['pendingTargetChange'],
    begin: vi.fn(),
    edit: vi.fn(),
    freezeForSubmit: vi.fn(),
    resolveTargetChange: vi.fn(),
    discard: vi.fn(),
  },
}));

vi.mock('./useCoachSessionDraft', () => ({
  useCoachSessionDraft: () => draftApiState.current,
}));

const wrapper = (props: {
  routeKey?: string;
  surfaceKey?: string;
  targetUserId?: number | null;
  selectedEntityIds?: ReadonlyArray<string> | null;
}) =>
  function Wrapper({ children }: { children?: React.ReactNode }) {
    return React.createElement(
      CoachSurfaceProvider,
      {
        routeKey: props.routeKey,
        surfaceKey: props.surfaceKey,
        targetUserId: props.targetUserId,
        selectedEntityIds: props.selectedEntityIds,
      },
      children,
    );
  };

beforeEach(() => {
  Object.assign(draftApiState.current, { actorId: 7, actorRole: 'trainer', generation: 2, draft: null, submitted: null, pendingTargetChange: null });
});

describe('G04c surface context', () => {
  it('derives a stable token from surface + target + generation (no draft state)', () => {
    const { result } = renderHook(() => useCoachSurfaceContext(), {
      wrapper: wrapper({ routeKey: '/dashboard/trainer/coach-assistant', surfaceKey: 'coach-assistant', targetUserId: 42 }),
    });
    expect(result.current.surfaceToken).toBe('coach-assistant:42:2');
    expect(result.current.deskReady).toBe(true);
    expect(result.current.targetUserId).toBe(42);
  });

  it('changes the token when the target or generation changes and keeps it stable otherwise', () => {
    const probe = () =>
      renderHook(() => useCoachSurfaceContext(), {
        wrapper: wrapper({ routeKey: '/r', surfaceKey: 'desk', targetUserId: 42 }),
      });
    const first = probe().result.current.surfaceToken;
    expect(first).toBe('desk:42:2');

    Object.assign(draftApiState.current, { generation: 3 });
    const bumped = probe().result.current.surfaceToken;
    expect(bumped).toBe('desk:42:3');

    // Re-render at the same identity yields the same token (stable across remasks).
    const stable = probe().result.current.surfaceToken;
    expect(stable).toBe(bumped);
  });

  it('falls back to the route key when no explicit surface key is provided', () => {
    const { result } = renderHook(() => useCoachSurfaceContext(), {
      wrapper: wrapper({ routeKey: '/dashboard/admin/coach-assistant', targetUserId: null }),
    });
    expect(result.current.surfaceKey).toBe('/dashboard/admin/coach-assistant');
    expect(result.current.targetUserId).toBeNull();
    expect(result.current.surfaceToken).toBe('/dashboard/admin/coach-assistant:no-target:2');
  });

  it('bounds and de-duplicates selected entity ids (max 16, strings only)', () => {
    const ids = Array.from({ length: 20 }, (_, index) => `entity-${index}`);
    const { result } = renderHook(() => useCoachSurfaceContext(), {
      wrapper: wrapper({ routeKey: '/r', surfaceKey: 'desk', targetUserId: 1, selectedEntityIds: ['a', 'a', '', ...ids] }),
    });
    expect(result.current.selectedEntityIds).toHaveLength(16);
    expect(result.current.selectedEntityIds.filter((id) => id === 'a')).toHaveLength(1);
    expect(result.current.selectedEntityIds).not.toContain('');
  });

  it('reports deskReady false until the owner has an authenticated actor', () => {
    Object.assign(draftApiState.current, { actorId: null });
    const { result } = renderHook(() => useCoachSurfaceContext(), {
      wrapper: wrapper({ routeKey: '/r', surfaceKey: 'desk', targetUserId: 1 }),
    });
    expect(result.current.deskReady).toBe(false);
    expect(result.current.generation).toBe(2);
  });

  it('throws outside a provider so consumers cannot silently read a stale surface', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCoachSurfaceContext(), { wrapper: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children) })).toThrow(
      /must be used within CoachSurfaceProvider/,
    );
    spy.mockRestore();
  });
});
