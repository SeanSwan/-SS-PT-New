/**
 * useWorkoutDraft.ts
 * ====================
 * Phase 3c.1 (launch charter P1-6): debounced localStorage autosave + restore
 * for the canonical WorkoutLogger.
 *
 * WHY: in-gym logging happens on phones; a backgrounded/killed tab used to lose
 * every typed set. This hook persists the in-progress form per user+client+date
 * and offers a one-tap restore on the next mount of the SAME context.
 *
 * CONTRACT
 * - Key: `ss-workout-draft:{userId}:{clientId}:{date}` — self-mode and
 *   trainer-for-client drafts never collide.
 * - Persist: debounced (WORKOUT_DRAFT_DEBOUNCE_MS) whenever enabled and the
 *   form has content (≥1 exercise or non-empty notes). Empty forms are never
 *   persisted; disabling (initialData present / save landed) stops writes.
 * - Offer: on mount, a valid stored draft is exposed as `pendingDraft`. The
 *   CONSUMER gates visibility (empty form only) — this hook never mutates form
 *   state itself.
 * - restore() hands the payload to the caller and deletes the key (the live
 *   form becomes the source of truth; edits re-persist naturally).
 * - clear() is called by the logger on confirmed save AND duplicate-exists so
 *   stale drafts can never resurrect over server truth.
 * - All storage access is try/catch — private-mode/quota failures degrade to
 *   "no autosave", never a crash.
 * - Drafts older than WORKOUT_DRAFT_MAX_AGE_MS are treated as absent and purged.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { ExerciseEntry } from '../../services/nasmApiService';

export const WORKOUT_DRAFT_PREFIX = 'ss-workout-draft:';
export const WORKOUT_DRAFT_DEBOUNCE_MS = 1000;
export const WORKOUT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface WorkoutDraftPayload {
  v: 1;
  savedAt: string;
  exercises: ExerciseEntry[];
  sessionNotes: string;
  overallIntensity: number | null;
  /** M6: absolute rest-timer end (epoch ms) — a mid-rest reload resumes. */
  restEndsAt?: number | null;
}

const safeStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const buildWorkoutDraftKey = (
  userId: number | undefined,
  clientId: number | undefined,
  date: string
): string | null => {
  if (typeof userId !== 'number' || !Number.isFinite(userId)) return null;
  if (typeof clientId !== 'number' || !Number.isFinite(clientId)) return null;
  if (!date) return null;
  return `${WORKOUT_DRAFT_PREFIX}${userId}:${clientId}:${date}`;
};

export const parseWorkoutDraft = (raw: string | null): WorkoutDraftPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutDraftPayload>;
    if (!parsed || parsed.v !== 1) return null;
    if (!Array.isArray(parsed.exercises)) return null;
    if (typeof parsed.savedAt !== 'string') return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age > WORKOUT_DRAFT_MAX_AGE_MS) return null;
    return {
      v: 1,
      savedAt: parsed.savedAt,
      exercises: parsed.exercises as ExerciseEntry[],
      sessionNotes: typeof parsed.sessionNotes === 'string' ? parsed.sessionNotes : '',
      overallIntensity:
        typeof parsed.overallIntensity === 'number' ? parsed.overallIntensity : null,
      restEndsAt:
        typeof parsed.restEndsAt === 'number' && parsed.restEndsAt > 0 ? parsed.restEndsAt : null,
    };
  } catch {
    return null;
  }
};

/**
 * Synchronous mount-time peek — lets `?loadPlan=today` defer to an existing
 * draft without an effect-order race (the offer effect and the plan-load
 * effect both fire on mount; this reads storage directly instead).
 */
export const hasStoredWorkoutDraft = (
  userId: number | undefined,
  clientId: number | undefined,
  date: string
): boolean => {
  const key = buildWorkoutDraftKey(userId, clientId, date);
  const storage = safeStorage();
  if (!key || !storage) return false;
  try {
    const draft = parseWorkoutDraft(storage.getItem(key));
    return Boolean(draft && draft.exercises.length > 0);
  } catch {
    return false;
  }
};

/** Drop stale/corrupt drafts so day-scoped keys never accumulate. */
export const purgeStaleWorkoutDrafts = (): void => {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(WORKOUT_DRAFT_PREFIX)) continue;
      if (!parseWorkoutDraft(storage.getItem(key))) doomed.push(key);
    }
    doomed.forEach((key) => storage.removeItem(key));
  } catch {
    /* storage unavailable — nothing to purge */
  }
};

export interface UseWorkoutDraftOptions {
  userId: number | undefined;
  clientId: number | undefined;
  date: string;
  exercises: ExerciseEntry[];
  sessionNotes: string;
  overallIntensity: number | null;
  /** M6: live rest-timer endsAt (epoch ms) to ride along with the draft. */
  restEndsAt?: number | null;
  enabled: boolean;
}

export interface UseWorkoutDraftResult {
  pendingDraft: WorkoutDraftPayload | null;
  restore: () => WorkoutDraftPayload | null;
  discard: () => void;
  clear: () => void;
}

export function useWorkoutDraft(options: UseWorkoutDraftOptions): UseWorkoutDraftResult {
  const { userId, clientId, date, exercises, sessionNotes, overallIntensity, restEndsAt = null, enabled } = options;
  const key = buildWorkoutDraftKey(userId, clientId, date);
  const [pendingDraft, setPendingDraft] = useState<WorkoutDraftPayload | null>(null);
  const offeredKeyRef = useRef<string | null>(null);
  // Pending debounce timer, cancelable by clear/discard/restore so a stale
  // write can never land AFTER the draft was intentionally dropped (e.g. an
  // edit → submit → duplicate-409 sequence inside one debounce window).
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount/context-change: purge stale drafts, then offer this key's draft once.
  useEffect(() => {
    if (!enabled || !key || offeredKeyRef.current === key) return;
    offeredKeyRef.current = key;
    purgeStaleWorkoutDrafts();
    const storage = safeStorage();
    if (!storage) return;
    try {
      const draft = parseWorkoutDraft(storage.getItem(key));
      if (draft && draft.exercises.length > 0) setPendingDraft(draft);
    } catch {
      /* unreadable storage = no offer */
    }
  }, [enabled, key]);

  // Debounced persist of live form content.
  useEffect(() => {
    if (!enabled || !key) return undefined;
    const hasContent = exercises.length > 0 || sessionNotes.trim().length > 0;
    if (!hasContent) return undefined;
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const storage = safeStorage();
      if (!storage) return;
      try {
        const payload: WorkoutDraftPayload = {
          v: 1,
          savedAt: new Date().toISOString(),
          exercises,
          sessionNotes,
          overallIntensity,
          restEndsAt,
        };
        storage.setItem(key, JSON.stringify(payload));
      } catch {
        /* quota/private mode — autosave silently unavailable */
      }
    }, WORKOUT_DRAFT_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [enabled, key, exercises, sessionNotes, overallIntensity, restEndsAt]);

  const removeKey = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    if (!key) return;
    const storage = safeStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  const restore = useCallback((): WorkoutDraftPayload | null => {
    const draft = pendingDraft;
    setPendingDraft(null);
    removeKey();
    return draft;
  }, [pendingDraft, removeKey]);

  const discard = useCallback(() => {
    setPendingDraft(null);
    removeKey();
  }, [removeKey]);

  const clear = useCallback(() => {
    setPendingDraft(null);
    removeKey();
  }, [removeKey]);

  return { pendingDraft, restore, discard, clear };
}

/* ==================== Restore banner ==================== */

const BannerShell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  border: 1px solid var(--accent-primary, #60c0f0);
  background: var(--surface-elevated, #1a1a24);
  color: var(--text-primary, #e0ecf4);
`;

const BannerCopy = styled.p`
  flex: 1 1 220px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const BannerButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 0 1rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $primary }) => ($primary ? 'transparent' : 'var(--border-subtle, #2a2a36)')};
  background: ${({ $primary }) =>
    $primary ? 'var(--accent-primary-bg, #002060)' : 'transparent'};
  color: var(--text-primary, #e0ecf4);

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export interface WorkoutDraftRestoreBannerProps {
  draft: WorkoutDraftPayload;
  onRestore: () => void;
  onDiscard: () => void;
}

export const WorkoutDraftRestoreBanner: React.FC<WorkoutDraftRestoreBannerProps> = ({
  draft,
  onRestore,
  onDiscard,
}) => (
  <BannerShell role="status" aria-label="Unsaved workout draft available">
    <BannerCopy>
      Unsaved workout draft found — {draft.exercises.length}{' '}
      {draft.exercises.length === 1 ? 'exercise' : 'exercises'} from an earlier session on this
      date.
    </BannerCopy>
    <BannerButton type="button" $primary onClick={onRestore}>
      Restore draft
    </BannerButton>
    <BannerButton type="button" onClick={onDiscard}>
      Discard
    </BannerButton>
  </BannerShell>
);
