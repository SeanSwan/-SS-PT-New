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
  /**
   * ONE STORE OWNS THE COMPOSER AT A TIME. The controller mounts this hook alongside
   * useCoachClientNotebook over the SAME `commandText`. While notebook mode is active the
   * notebook owns it, so this hook must go fully inert — otherwise a thread switch flips this
   * hook's key, it restores the other thread's chat draft into the shared composer, and the
   * notebook's write effect then sees that foreign text and overwrites/removes the trainer's
   * clinical note. Proven by useCoachDraftStores.composed.test.tsx.
   */
  enabled = true,
) {
  const key = coachDraftKey(threadKey, scope);
  const restoreKeyRef = useRef(key);

  useEffect(() => {
    // Stay armed while disabled: track the key so re-enabling does not treat the first
    // render back as a scope change and clobber the composer.
    if (!enabled) {
      restoreKeyRef.current = key;
      return;
    }
    try {
      const saved = window.sessionStorage.getItem(key) || '';
      const scopeChanged = restoreKeyRef.current !== key;
      restoreKeyRef.current = key;
      setCommandText((current) => (scopeChanged ? saved : current.trim() ? current : saved));
    } catch {
      // Storage unavailable (private mode/quota) - drafts just do not persist.
    }
  }, [enabled, key, setCommandText]);

  const writeKeyRef = useRef(key);
  useEffect(() => {
    if (!enabled) {
      writeKeyRef.current = key;
      return undefined;
    }
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
  }, [commandText, enabled, key]);
}