/**
 * FILE: useCoachClientNotebook.ts
 * PURPOSE: Fast, client-bound note capture through the existing Coach composer.
 *
 * Notes are explicit trainer writes to /api/notes/:clientId. The AI handoff only
 * stages a review-only prompt; it never silently converts notes into workout logs.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Dispatch,
  FormEvent,
  RefObject,
  SetStateAction,
} from 'react';
import apiService from '../../../../../services/api.service';
import {
  isPublicationAdmitted,
  isPublicationTokenLive,
  readPublicationScope,
  type PublicationBinding,
} from '../../../../../hooks/coachPublicationScope';

const NOTE_DRAFT_PREFIX = 'ss-coach-client-note-draft:';
const NOTE_MAX_CHARS = 4000;

export type CoachNotebookControls = {
  active: boolean;
  clientPinned: boolean;
  saving: boolean;
  onDraftWorkouts: () => void;
  onToggle: () => void;
};

type UseCoachClientNotebookParams = {
  /**
   * Authenticated staff member. Load-bearing for privacy, NOT cosmetic: sessionStorage is
   * per-TAB, not per-identity, and this surface is built for a shared floor device. Without
   * it, staff A's unsent client note reloads into staff B's session in the same tab.
   */
  actorId?: string | number | null;
  clientId: number | null;
  clientLabel: string;
  commandText: string;
  commandTextRef: RefObject<HTMLTextAreaElement>;
  setCommandText: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
  /**
   * Plan 55 C4 — live admission. Absent keeps today's behaviour (the binding is
   * dormant until C3 wires the controller), present means the notebook is a
   * boundary: a note may only be restored, persisted, prefilled or POSTed while
   * the admitted target is the client this notebook is pinned to.
   */
  binding?: PublicationBinding;
};

function draftKey(actorId: string | number | null | undefined, clientId: number): string {
  // Mirrors coachDraftKey()'s actor:client shape so the two stores can never disagree
  // about whose draft is whose.
  return `${NOTE_DRAFT_PREFIX}${actorId ?? 'unknown-actor'}:${clientId}`;
}
export { draftKey as coachNotebookDraftKey };


export function buildWorkoutDraftFromNotesPrompt(): string {
  return [
    'Using the saved trainer notes and verified workout history for the pinned client,',
    'prepare review-only workout_log or split_plan proposals.',
    'Separate observed facts from inferred filler and label every estimate as AI-estimated historical filler.',
    'Keep dates evidence-backed, never invent pain or medical facts, never exceed real observed loads,',
    'and do not save or log anything until I approve the review cards.',
  ].join(' ');
}

export function useCoachClientNotebook({
  actorId,
  clientId,
  clientLabel,
  commandText,
  commandTextRef,
  setCommandText,
  setSelectedStatus,
  binding,
}: UseCoachClientNotebookParams) {
  const [modeClientId, setModeClientId] = useState<number | null>(null);
  const [modeActorId, setModeActorId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);
  const currentClientIdRef = useRef(clientId);
  const saveOperationRef = useRef(0);
  currentClientIdRef.current = clientId;
  // Live admission is read at call time, never replayed from a captured render.
  const bindingRef = useRef(binding);
  bindingRef.current = binding;
  const actorIdRef = useRef(actorId);
  actorIdRef.current = actorId;
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const admittedNow = useCallback(
    () => isPublicationAdmitted(bindingRef.current, {
      actorId: actorIdRef.current,
      targetUserId: clientIdRef.current,
    }),
    [],
  );
  const selectionAdmitted = isPublicationAdmitted(binding, { actorId, targetUserId: clientId });
  const active = Boolean(clientId
    && modeClientId === clientId
    && modeActorId === (actorId ?? null)
    && selectionAdmitted);

  useEffect(() => {
    saveOperationRef.current += 1;
    setModeActorId(null);
    setModeClientId(null);
    setSaving(false);
    setCommandText('');
  }, [actorId, clientId, setCommandText]);

  useEffect(() => {
    // A blocked selection owns no notebook storage: neither write nor remove.
    if (!active || !clientId || !admittedNow()) return;
    const key = draftKey(actorId, clientId);
    if (commandText.trim()) sessionStorage.setItem(key, commandText);
    else sessionStorage.removeItem(key);
  }, [active, actorId, admittedNow, clientId, commandText]);

  const onToggle = useCallback(() => {
    if (!clientId) {
      setSelectedStatus('Choose a main client before capturing profile notes');
      return;
    }
    if (!admittedNow()) {
      setSelectedStatus('Waiting for the current coaching selection before using Client Notes');
      return;
    }
    const nextActive = !active;
    setModeActorId(nextActive ? (actorId ?? null) : null);
    setModeClientId(nextActive ? clientId : null);
    setCommandText(nextActive ? sessionStorage.getItem(draftKey(actorId, clientId)) || '' : '');
    setSelectedStatus(nextActive
      ? `Client Notes mode - microphone and typing save to ${clientLabel}`
      : 'Coach Chat mode - messages stay bound to the pinned client');
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [
    active,
    actorId,
    admittedNow,
    clientId,
    clientLabel,
    commandTextRef,
    setCommandText,
    setSelectedStatus,
  ]);

  const onDraftWorkouts = useCallback(() => {
    if (!clientId) {
      setSelectedStatus('Choose a main client before drafting workouts from notes');
      return;
    }
    if (!admittedNow()) {
      setSelectedStatus('Waiting for the current coaching selection before drafting from notes');
      return;
    }
    setModeActorId(null);
    setModeClientId(null);
    setCommandText(buildWorkoutDraftFromNotesPrompt());
    setSelectedStatus('Workout-from-notes prompt staged - review before sending');
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [admittedNow, clientId, commandTextRef, setCommandText, setSelectedStatus]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!clientId || saving || !admittedNow()) return;
    const content = commandText.trim();
    if (!content) return;
    if (content.length > NOTE_MAX_CHARS) {
      setSelectedStatus(`Client note is too long (${content.length}/${NOTE_MAX_CHARS} characters)`);
      return;
    }

    // Capture the actor alongside the client: an identity switch mid-save must not clear
    // the NEW actor's draft key (same reason requestClientId is captured).
    const requestActorId = actorId;
    const requestClientId = clientId;
    // Plan 55 C4 — the admitted token this save belongs to. A completion that
    // lands after that admission retired is not a publication.
    const capturedToken = readPublicationScope(bindingRef.current);
    const operationId = saveOperationRef.current + 1;
    saveOperationRef.current = operationId;
    setSaving(true);
    setSelectedStatus(`Saving note to ${clientLabel}`);
    try {
      const response = await apiService.post(`/api/notes/${requestClientId}`, {
        content,
        noteType: 'observation',
        tags: ['coach-command-center'],
        visibility: 'trainer_only',
      });
      if (!isPublicationTokenLive(bindingRef.current, capturedToken)) return;
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Client note was not saved');
      }
      sessionStorage.removeItem(draftKey(requestActorId, requestClientId));
      if (currentClientIdRef.current === requestClientId && saveOperationRef.current === operationId) {
        setCommandText('');
        setSelectedStatus(`Note saved to ${clientLabel} - ready for the next note`);
      }
    } catch (error) {
      if (!isPublicationTokenLive(bindingRef.current, capturedToken)) return;
      const message = (error as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message;
      if (currentClientIdRef.current === requestClientId && saveOperationRef.current === operationId) {
        // The failure is always named as one: a bare server message read like a success.
        setSelectedStatus(`Client note was not saved${message ? ` (${message})` : ''} - your draft is still in the composer`);
      }
    } finally {
      if (saveOperationRef.current === operationId) setSaving(false);
    }
  }, [
    actorId,
    admittedNow,
    clientId,
    clientLabel,
    commandText,
    saving,
    setCommandText,
    setSelectedStatus,
  ]);

  const dockControls: CoachNotebookControls = {
    active,
    clientPinned: Boolean(clientId),
    saving,
    onDraftWorkouts,
    onToggle,
  };

  return {
    dockControls,
    handleSubmit,
  };
}
