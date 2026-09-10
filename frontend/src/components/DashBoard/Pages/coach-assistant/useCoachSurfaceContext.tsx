/**
 * FILE: useCoachSurfaceContext.ts
 * PURPOSE: Session Desk surface identity — registered route, target, selected entity IDs, and the
 *          shell-owner generation. Consumed by CoachSessionDesk and CoachSessionDeskGate so the
 *          desk knows exactly which surface it is mounted on and can remask on a generation change.
 *
 *          This hook derives a stable surfaceKey from the mounted surface identity. It owns no
 *          draft state — the G04a shell owner is the single draft authority (no parallel store).
 */
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useCoachSessionDraft } from './useCoachSessionDraft';

export type CoachSurfaceKey = string;

export interface CoachSurfaceContextValue {
  /** Registered canonical route the surface is mounted on (e.g. '/dashboard/admin/coach-assistant'). */
  routeKey: string;
  /** Canonical surface key for this mount (e.g. 'coach-assistant'). */
  surfaceKey: string;
  /** Currently selected target client id, or null when no target is selected. */
  targetUserId: number | null;
  /** Selected entity ids on this surface (bounded), e.g. pinned conversation/intent ids. */
  selectedEntityIds: ReadonlyArray<string>;
  /** Shell-owner generation — increments on actor/role logout so stale surfaces remask. */
  generation: number;
  /** Stable token for the current surface; changes only when route/target/generation change. */
  surfaceToken: CoachSurfaceKey;
  /** True when the draft owner has an authenticated actor ready to host a desk task. */
  deskReady: boolean;
}

interface CoachSurfaceProviderProps {
  routeKey?: string;
  surfaceKey?: string;
  targetUserId?: number | null;
  selectedEntityIds?: ReadonlyArray<string> | null;
  children: ReactNode;
}

const CoachSurfaceContext = createContext<CoachSurfaceContextValue | null>(null);

const stableToken = (routeKey: string, surfaceKey: string, targetUserId: number | null, generation: number): CoachSurfaceKey => {
  const parts = [surfaceKey || routeKey || 'unknown', targetUserId ?? 'no-target', generation];
  return parts.join(':');
};

export const CoachSurfaceProvider = ({
  routeKey = '',
  surfaceKey = '',
  targetUserId = null,
  selectedEntityIds = [],
  children,
}: CoachSurfaceProviderProps) => {
  const { actorId, generation } = useCoachSessionDraft();
  const value = useMemo<CoachSurfaceContextValue>(() => {
    const boundedEntities = Array.from(new Set(selectedEntityIds.filter((id) => typeof id === 'string' && id.trim() !== ''))).slice(0, 16);
    return {
      routeKey,
      surfaceKey: surfaceKey || routeKey || 'unknown',
      targetUserId,
      selectedEntityIds: boundedEntities,
      generation,
      surfaceToken: stableToken(routeKey, surfaceKey, targetUserId, generation),
      deskReady: actorId !== null,
    };
  }, [routeKey, surfaceKey, targetUserId, selectedEntityIds, generation, actorId]);

  return <CoachSurfaceContext.Provider value={value}>{children}</CoachSurfaceContext.Provider>;
};

export const useCoachSurfaceContext = (): CoachSurfaceContextValue => {
  const context = useContext(CoachSurfaceContext);
  if (!context) throw new Error('useCoachSurfaceContext must be used within CoachSurfaceProvider');
  return context;
};

export default useCoachSurfaceContext;
