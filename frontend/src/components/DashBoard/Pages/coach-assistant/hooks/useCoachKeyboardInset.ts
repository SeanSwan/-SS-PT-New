/**
 * HOOK: useCoachKeyboardInset
 * PURPOSE: Keep the Coach composer visible above the on-screen keyboard.
 *
 * iOS does not shrink 100dvh when the keyboard opens; the visualViewport API
 * is the only honest signal. While the keyboard occludes the layout viewport,
 * this hook writes the occluded height to --coach-kb-inset on the shell so
 * the chat column shortens and the sticky dock stays reachable (NEXT-CHAT W3
 * "input never hidden by the keyboard").
 */
import { useEffect, type RefObject } from 'react';

const INSET_VAR = '--coach-kb-inset';

export function useCoachKeyboardInset(shellRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!viewport) return undefined;

    const applyInset = () => {
      const shell = shellRef.current;
      if (!shell) return;
      // Pinch/accessibility zoom shrinks viewport.height with NO keyboard —
      // only a 1:1 scale shrink is keyboard occlusion.
      if (Math.abs(viewport.scale - 1) > 0.01) {
        shell.style.setProperty(INSET_VAR, '0px');
        return;
      }
      const occluded = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      // Ignore sub-pixel noise; only react to a real keyboard-sized occlusion.
      shell.style.setProperty(INSET_VAR, occluded > 40 ? `${Math.round(occluded)}px` : '0px');
    };

    applyInset();
    viewport.addEventListener('resize', applyInset);
    viewport.addEventListener('scroll', applyInset);
    return () => {
      viewport.removeEventListener('resize', applyInset);
      viewport.removeEventListener('scroll', applyInset);
      shellRef.current?.style.removeProperty(INSET_VAR);
    };
  }, [shellRef]);
}
