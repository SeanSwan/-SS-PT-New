/**
 * FILE: useCoachSurfaceContext.compatResolution.test.tsx
 * PURPOSE: plan62 SC-R1/SC-R2 — the extensionless, explicit `.ts`, and explicit `.tsx`
 *          specifiers must reach ONE canonical provider/hook/context implementation, and the
 *          compatibility path must inherit the canonical null `selectedEntityIds` handling.
 *
 *          Rationale: the app bundler (frontend/vite.config.ts:60) prefers `.tsx` before `.ts`,
 *          while TypeScript bundler resolution and vitest.config.ts (default extension order)
 *          prefer `.ts`. Extensionless consumers therefore hit a different module under Vite
 *          than under tsc. These assertions are runtime/module-identity based so they hold the
 *          single-owner contract from the consumer side, not from source text.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CoachSurfaceProvider as ExtensionlessProvider,
  useCoachSurfaceContext as useExtensionlessHook,
} from './useCoachSurfaceContext';
import { CoachSurfaceProvider as CanonicalTsProvider } from './useCoachSurfaceContext.ts';
import CompatDefaultHook, { CoachSurfaceProvider as CompatTsxProvider } from './useCoachSurfaceContext.tsx';

const draftApiState = vi.hoisted(() => ({
  current: { actorId: 7 as number | null, actorRole: 'trainer' as string | null, generation: 2 },
}));

vi.mock('./useCoachSessionDraft', () => ({
  useCoachSessionDraft: () => draftApiState.current,
}));

const mountWith = (
  Provider: React.ComponentType<{ routeKey?: string; surfaceKey?: string; targetUserId?: number | null; selectedEntityIds?: ReadonlyArray<string> | null; children?: React.ReactNode }>,
  props: { routeKey?: string; surfaceKey?: string; targetUserId?: number | null; selectedEntityIds?: ReadonlyArray<string> | null } = {},
) =>
  function Wrapper({ children }: { children?: React.ReactNode }) {
    return React.createElement(Provider, props, children);
  };

describe('plan62 surface-context single owner', () => {
  it('SC-R1: the extensionless specifier reaches the canonical .ts module under this runner', () => {
    expect(ExtensionlessProvider).toBe(CanonicalTsProvider);
  });

  it('SC-R1: the explicit .tsx compatibility path exposes the canonical provider and hook', () => {
    expect(CompatTsxProvider).toBe(CanonicalTsProvider);
    expect(CompatDefaultHook).toBe(useExtensionlessHook);
  });

  it('SC-R1: an explicit .tsx provider shares one React context with extensionless consumers', () => {
    const { result } = renderHook(() => useExtensionlessHook(), {
      wrapper: mountWith(CompatTsxProvider, { routeKey: '/r', surfaceKey: 'desk', targetUserId: 42 }),
    });
    expect(result.current.surfaceToken).toBe('desk:42:2');
    expect(result.current.targetUserId).toBe(42);
  });

  it('SC-R2: explicit null selectedEntityIds through the .tsx path inherits canonical null handling', () => {
    const { result } = renderHook(() => useExtensionlessHook(), {
      wrapper: mountWith(CompatTsxProvider, { routeKey: '/r', surfaceKey: 'desk', targetUserId: 1, selectedEntityIds: null }),
    });
    expect(result.current.selectedEntityIds).toEqual([]);
  });
});
