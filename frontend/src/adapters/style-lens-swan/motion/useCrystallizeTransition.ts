/**
 * useCrystallizeTransition — Swan Lens C4 signature moment controller (Slice 2 / §2.2, §2.4).
 *
 * The Crystallize is an IN-APP calm moment fired when the lens switches. It CONSUMES the real
 * motion system (surfaceMotionTiers licence × useAnimationTier capability, effective = min) — no
 * parallel motion-token file. Reduced-motion is the OR of THREE real triggers (profile motionMode,
 * capability 'essential', prefers-reduced-motion) with a fail-closed PRM read. It never reads
 * `data-motion-mode` (ScopedLensFrame's frame-scoped vocabulary — wrong axis).
 *
 * Shipped READY-to-wire for World-Engine Lane A (the Apply handler is theirs): Lane A wraps its
 * existing `commitAppearance` in `crystallizeTo(commit)` and renders <CrystallizeOverlay {...overlayProps}/>.
 * Commit runs exactly once; on any timer exception the transition forces idle and still commits once.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppearanceProfile } from '../../../core/style-lens-os/types';
import { resolveMotionTier, tierAllows } from '../../../core/motion/surfaceMotionTiers';
import { useAnimationTier } from '../../../hooks/useAnimationTier';
import { useLensViewport } from '../viewport/useLensViewport';

export type CrystallizePhase = 'idle' | 'charging' | 'settling';
export type CrystallizeVariant = 'static' | 'fade' | 'sweep';

/** The appearance-settings surface. UNLICENSED today → resolveMotionTier fails safe to M0 (static)
 *  until Lane A registers it (integration note §2.8 step 1). */
export const CRYSTALLIZE_SURFACE_ID = 'settings.appearance';

/** Design-spec choreography — viewport-keyed. NOT a token file (§2.9). settle = total − charge. */
export const CRYSTALLIZE_TIMING = {
  hand: { charge: 100, total: 320 },
  lap: { charge: 110, total: 400 },
  desk: { charge: 120, total: 480 },
  wall: { charge: 120, total: 480 },
} as const;

export interface CrystallizeOverlayProps {
  phase: CrystallizePhase;
  variant: CrystallizeVariant;
  chargeMs: number;
  settleMs: number;
  announcement: string;
}
export interface CrystallizeController {
  phase: CrystallizePhase;
  reduced: boolean;
  variant: CrystallizeVariant;
  overlayProps: CrystallizeOverlayProps;
  crystallizeTo(commit: () => void, opts?: { settleAnnouncement?: string }): void;
}

/** Fail-closed PRM read: matchMedia absent OR throwing → treated as reduce:true (motion fails closed). */
function usePrefersReducedMotionFailClosed(): boolean {
  const read = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  };
  const [reduced, setReduced] = useState<boolean>(read);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      setReduced(true);
      return;
    }
    const onChange = () => setReduced(read());
    onChange();
    // Legacy MediaQueryList (Safari <14, some test shims) expose addListener but not addEventListener.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    if (typeof legacy.addListener === 'function') {
      legacy.addListener(onChange);
      return () => legacy.removeListener?.(onChange);
    }
    return undefined;
  }, []);
  return reduced;
}

export function useCrystallizeTransition(options?: {
  motionMode?: AppearanceProfile['motionMode'];
  surfaceId?: string;
}): CrystallizeController {
  const motionMode = options?.motionMode ?? 'auto';
  const surfaceId = options?.surfaceId ?? CRYSTALLIZE_SURFACE_ID;
  const capability = useAnimationTier();
  const viewport = useLensViewport();
  const prm = usePrefersReducedMotionFailClosed();

  const reduced = motionMode !== 'auto' || capability === 'essential' || prm;
  const effectiveTier = resolveMotionTier(surfaceId, capability);
  const variant: CrystallizeVariant =
    reduced || !tierAllows(effectiveTier, 'M1')
      ? 'static'
      : viewport === 'hand' || !tierAllows(effectiveTier, 'M2')
        ? 'fade'
        : 'sweep';
  const timing = CRYSTALLIZE_TIMING[viewport];

  const [overlay, setOverlay] = useState<CrystallizeOverlayProps>({
    phase: 'idle',
    variant,
    chargeMs: timing.charge,
    settleMs: timing.total - timing.charge,
    announcement: '',
  });

  const latest = useRef({ variant, timing });
  latest.current = { variant, timing };
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pending = useRef<{ commit: () => void; done: boolean } | null>(null);
  const mounted = useRef(true);

  // Memoized (only touch stable refs + setState) so crystallizeTo's dep array is honest + stable.
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const runPending = useCallback(() => {
    const p = pending.current;
    if (p && !p.done) {
      p.done = true;
      p.commit();
    }
  }, []);
  const clearHtmlAttrs = useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    el.removeAttribute('data-lens-transition');
    el.removeAttribute('data-lens-transition-variant');
    el.style.removeProperty('--lens-crystallize-charge-ms');
    el.style.removeProperty('--lens-crystallize-settle-ms');
  }, []);
  const forceIdle = useCallback(() => {
    clearTimers();
    clearHtmlAttrs();
    if (mounted.current) setOverlay((o) => ({ ...o, phase: 'idle' }));
  }, [clearTimers, clearHtmlAttrs]);

  useEffect(
    () => () => {
      mounted.current = false;
      clearTimers();
      try {
        runPending(); // no half-applied lens on unmount
      } catch (error) {
        // A throwing commit must NOT propagate out of React's unmount cleanup — swallow + surface,
        // and still clear global attrs in finally so <html> is never left dirty (Codex HIGH #2).
        // eslint-disable-next-line no-console
        console.error('[SwanLens] Crystallize commit failed during unmount cleanup.', error);
      } finally {
        clearHtmlAttrs();
      }
    },
    [clearTimers, runPending, clearHtmlAttrs],
  );

  const crystallizeTo = useCallback((commit: () => void, opts?: { settleAnnouncement?: string }) => {
    const { variant: v, timing: t } = latest.current;
    const chargeMs = t.charge;
    const settleMs = t.total - t.charge;
    const announcement = opts?.settleAnnouncement ?? '';

    // Complete any in-flight transition synchronously first — no commit dropped or doubled.
    // A throwing OLD commit must not block the NEW transition or leave attrs stuck (Codex HIGH #1).
    if (pending.current && !pending.current.done) {
      clearTimers();
      try {
        runPending();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[SwanLens] previous Crystallize commit failed during flush; continuing.', error);
      } finally {
        clearHtmlAttrs();
      }
    }
    pending.current = { commit, done: false };

    if (v === 'static') {
      setOverlay({ phase: 'idle', variant: 'static', chargeMs, settleMs, announcement });
      // Synchronous commit — Lane A's Apply try/catch owns any throw. finally clears attrs even
      // when the commit throws, then the error propagates to Lane A as intended (Codex LOW #5).
      try {
        runPending();
      } finally {
        clearHtmlAttrs();
      }
      return;
    }

    if (typeof document !== 'undefined') {
      const el = document.documentElement;
      el.setAttribute('data-lens-transition', 'charging');
      el.setAttribute('data-lens-transition-variant', v);
      el.style.setProperty('--lens-crystallize-charge-ms', `${chargeMs}ms`);
      el.style.setProperty('--lens-crystallize-settle-ms', `${settleMs}ms`);
    }
    setOverlay({ phase: 'charging', variant: v, chargeMs, settleMs, announcement });

    const chargeTimer = setTimeout(() => {
      try {
        runPending(); // attribute swap masked mid-transition
        if (typeof document !== 'undefined') document.documentElement.setAttribute('data-lens-transition', 'settling');
        if (mounted.current) setOverlay((o) => ({ ...o, phase: 'settling' }));
      } catch (error) {
        // Async charge-timer: a thrown commit CANNOT reach Lane A's synchronous Apply try/catch
        // (it already returned), so rethrowing would be an uncatchable async error that also aborts
        // the idle state flush. Fail safe instead — force idle (the app stays on the prior lens,
        // since the swap failed) and surface for observability. The STATIC path still throws
        // synchronously out of crystallizeTo, where Lane A's catch owns the Slice-1 fallback.
        // [Deviation from Kimi §2.2 "rethrow": the async path makes the rethrow unreachable.]
        forceIdle(); // commit already ran once (or threw once) via the done guard; never re-run
        // eslint-disable-next-line no-console
        console.error('[SwanLens] Crystallize commit failed mid-transition; restored prior appearance.', error);
      }
    }, chargeMs);

    const settleTimer = setTimeout(forceIdle, t.total);
    timers.current = [chargeTimer, settleTimer];
  }, [clearTimers, runPending, clearHtmlAttrs, forceIdle]);

  return { phase: overlay.phase, reduced, variant, overlayProps: overlay, crystallizeTo };
}
