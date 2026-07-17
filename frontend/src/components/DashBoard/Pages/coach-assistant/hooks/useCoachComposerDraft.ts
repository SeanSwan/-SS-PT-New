/**
 * HOOK: useCoachComposerDraft (v2 P1.4)
 * PURPOSE: A trainer interrupted mid-dictation must not lose their words.
 *
 * Mirrors the composer into sessionStorage per authenticated actor, selected
 * client, and thread. This prevents a draft for one client or signed-in user
 * from appearing in another coaching context.
 */
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

const DEBOUNCE_MS = 400;
type DraftScope = { actorId?: string | number | null; clientId?: number | null };

export function coachDraftKey(threadKey: string | number | null, scope: DraftScope = {}): string {
  const actor = scope.actorId ?? 'unknown-actor';
  const client = scope.clientId ?? 'unscoped';
  return `swan-coach-draft:${actor}:${client}:${threadKey ?? 'new'}`;
}

export function useCoachComposerDraft(
  threadKey: string | number | null,
  commandText: string,
  setCommandText: Dispatch<SetStateAction<string>>,
  scope: DraftScope = {},
) {
  const key = coachDraftKey(threadKey, scope);
  const restoreKeyRef = useRef(key);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(key) || '';
      const scopeChanged = restoreKeyRef.current !== key;
      restoreKeyRef.current = key;
      setCommandText((current) => (scopeChanged ? saved : current.trim() ? current : saved));
    } catch {
      // Storage unavailable (private mode/quota) - drafts just do not persist.
    }
  }, [key, setCommandText]);

  const writeKeyRef = useRef(key);
  useEffect(() => {
    if (writeKeyRef.current !== key) {
      writeKeyRef.current = key;
      return undefined;
    }
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