/**
 * HOOK: useCoachComposerDraft (v2 P1.4)
 * PURPOSE: A trainer interrupted mid-dictation must not lose their words.
 *
 * Mirrors the composer into sessionStorage per thread key (debounced) and
 * restores it when the surface remounts with an empty composer. On-device
 * only, cleared automatically when the text is sent (composer empties) or
 * the browser tab closes. Never fights a non-empty composer.
 */
import { useEffect, type Dispatch, type SetStateAction } from 'react';

const DEBOUNCE_MS = 400;

export function coachDraftKey(threadKey: string | number | null): string {
  return `swan-coach-draft:${threadKey ?? 'new'}`;
}

export function useCoachComposerDraft(
  threadKey: string | number | null,
  commandText: string,
  setCommandText: Dispatch<SetStateAction<string>>,
) {
  const key = coachDraftKey(threadKey);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) setCommandText((current) => (current.trim() ? current : saved));
    } catch {
      // Storage unavailable (private mode/quota) — drafts just don't persist.
    }
    // Restore only when the draft scope changes, never on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCommandText]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (commandText.trim()) window.sessionStorage.setItem(key, commandText);
        else window.sessionStorage.removeItem(key);
      } catch {
        // Best-effort only.
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [commandText, key]);
}
