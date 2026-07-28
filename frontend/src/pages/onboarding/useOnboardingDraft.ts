/**
 * ============================================================================
 * FILE: useOnboardingDraft.ts
 * PURPOSE: Keep a client's in-progress onboarding assessment on their own
 *          device so closing a tab does not destroy 8 sections of work.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-27 (launch audit S4)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ClientOnboardingWizard held every answer in React state and only POSTed on
 * the final step. A client who reached section 6 and closed the tab lost all of
 * it, silently, with no warning. That is the real reason a thorough assessment
 * "feels too long" — length is only painful when it is fragile.
 *
 * SCOPE + PRIVACY (rule 8)
 * - Draft lives in localStorage on the client's OWN device. Nothing extra is
 *   sent anywhere; the wizard's existing submit is still the only network write.
 * - The key is scoped per user id, so two people sharing a browser profile
 *   never inherit each other's health answers.
 * - The draft is CLEARED on successful submit and on explicit discard, so the
 *   health/injury answers do not linger after they have been persisted server-side.
 * - Storage failures (Safari private mode, quota, disabled storage) are caught
 *   and ignored — a draft is a convenience and must never break the wizard.
 *
 * STALENESS
 * Drafts older than DRAFT_TTL_DAYS are discarded on read. A months-old answer
 * about someone's injuries is more likely to be wrong than helpful.
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const KEY_PREFIX = 'swan.onboarding.draft';
const DRAFT_TTL_DAYS = 30;
const DRAFT_TTL_MS = DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface OnboardingDraft {
  formData: Record<string, unknown>;
  currentStep: number;
  savedAt: number;
}

export const draftKeyFor = (userId?: string | number | null): string =>
  `${KEY_PREFIX}.${userId ?? 'anonymous'}`;

const safeStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Read a draft, discarding anything malformed or past its TTL. */
export function readDraft(
  userId?: string | number | null,
  now: number = Date.now()
): OnboardingDraft | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(draftKeyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.savedAt !== 'number' ||
      typeof parsed.formData !== 'object' ||
      parsed.formData === null
    ) {
      store.removeItem(draftKeyFor(userId));
      return null;
    }
    if (now - parsed.savedAt > DRAFT_TTL_MS) {
      store.removeItem(draftKeyFor(userId));
      return null;
    }
    return {
      formData: parsed.formData as Record<string, unknown>,
      currentStep: Number.isInteger(parsed.currentStep) ? (parsed.currentStep as number) : 0,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function writeDraft(
  userId: string | number | null | undefined,
  draft: Omit<OnboardingDraft, 'savedAt'>,
  now: number = Date.now()
): boolean {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(draftKeyFor(userId), JSON.stringify({ ...draft, savedAt: now }));
    return true;
  } catch {
    return false; // quota / private mode — never surface as an error
  }
}

export function clearDraft(userId?: string | number | null): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(draftKeyFor(userId));
  } catch {
    /* ignore */
  }
}

export interface UseOnboardingDraftOptions {
  userId?: string | number | null;
  /** Disable persistence entirely (admin-creating-a-client flows). */
  enabled?: boolean;
}

/**
 * Persists {formData, currentStep} for the given user and reports when the
 * last save happened, so the UI can tell the truth about being saved.
 */
export function useOnboardingDraft({ userId, enabled = true }: UseOnboardingDraftOptions) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hydrated = useRef(false);

  const restore = useCallback((): OnboardingDraft | null => {
    if (!enabled) return null;
    const draft = readDraft(userId);
    if (draft) setSavedAt(draft.savedAt);
    return draft;
  }, [enabled, userId]);

  const save = useCallback(
    (formData: Record<string, unknown>, currentStep: number) => {
      if (!enabled) return;
      // Do not write an empty draft — it would resurrect a discarded session.
      if (!formData || Object.keys(formData).length === 0) return;
      const now = Date.now();
      if (writeDraft(userId, { formData, currentStep }, now)) setSavedAt(now);
    },
    [enabled, userId]
  );

  const discard = useCallback(() => {
    clearDraft(userId);
    setSavedAt(null);
  }, [userId]);

  useEffect(() => {
    hydrated.current = true;
  }, []);

  return { restore, save, discard, savedAt, hasDraft: savedAt !== null };
}

export default useOnboardingDraft;
