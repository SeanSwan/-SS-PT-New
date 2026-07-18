/**
 * Dashboards v2 — useCrystallizeMilestone (KIMI-DASHBOARDS §4). Confirm-first: the server records the
 * crystallization and returns 200 BEFORE the cinematic beat plays (Rule 14 — no optimistic lie). On a
 * POST error: no animation, tile unchanged, toast. Re-POST of an already-crystallized id returns 200
 * (idempotent) and simply replays the moment. The overlay/timeline/focus-trap are the SHIPPED lens
 * controller (useCrystallizeTransition); this hook only wires the write to the commit beat.
 */
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { useCrystallizeTransition } from '../lensBindings';
import { useWorldKey } from '../useWorldKey';
import { authHeaders } from '../authHeaders';
import type { Milestone, Role } from '../types';

export function useCrystallizeMilestone(role: Role, refresh: () => void) {
  const { phase, reduced, variant, overlayProps, crystallizeTo } = useCrystallizeTransition({
    surfaceId: `dashboard.${role}`,
  });
  const worldKey = useWorldKey();

  const onCrystallize = useCallback(
    async (m: Milestone) => {
      try {
        const res = await fetch(`/api/achievements/${encodeURIComponent(m.id)}/crystallize`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ worldKey }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        toast.error('Couldn’t crystallize. Try again.');
        return; // no optimistic lie — the tile stays as-is
      }
      crystallizeTo(() => refresh(), { settleAnnouncement: `${m.title} crystallized` });
    },
    [worldKey, crystallizeTo, refresh],
  );

  return { onCrystallize, overlayProps, phase, reduced, variant };
}
