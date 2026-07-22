/**
 * HOOK: useKeypadField (Arc L / L2 wiring)
 * Coarse-pointer detection + per-row keypad state + the ONE-HOP advance law (Kimi-binding):
 * Done on weight → opens the reps keypad directly; Done on reps → closes (RPE/Log are always
 * user-initiated — never focus theft). "Use system keyboard" flips this row to native inputs
 * for the session (SR escape hatch — readOnly announces as dimmed).
 */
import { useCallback, useMemo, useState } from 'react';

export type KeypadFieldKind = 'weight' | 'reps';

export function usePointerCoarse(): boolean {
  return useMemo(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
  ), []);
}

export function useKeypadField(commit: (field: KeypadFieldKind, value: number) => void) {
  const coarse = usePointerCoarse();
  const [openFor, setOpenFor] = useState<KeypadFieldKind | null>(null);
  const [systemKeyboard, setSystemKeyboard] = useState(false);

  const keypadActive = coarse && !systemKeyboard;

  const openKeypad = useCallback((field: KeypadFieldKind) => {
    if (keypadActive) setOpenFor(field);
  }, [keypadActive]);

  const onCommit = useCallback((value: number) => {
    if (!openFor) return;
    commit(openFor, value);
  }, [commit, openFor]);

  const onClose = useCallback(() => {
    // One-hop advance: weight → reps keypad; reps → done (no RPE focus theft).
    setOpenFor((prev) => (prev === 'weight' ? 'reps' : null));
  }, []);

  const useSystemKeyboard = useCallback(() => {
    setSystemKeyboard(true);
    setOpenFor(null);
  }, []);

  return { keypadActive, openFor, openKeypad, onCommit, onClose, useSystemKeyboard };
}
