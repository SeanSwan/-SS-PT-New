/**
 * Schedule Ask stages a local chat draft only after the intended scope is admitted.
 * The existing selection adapter owns deadlines and protected-draft decisions.
 * No independent TTL may discard an Ask while that decision is still pending.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type AskPin = { kind: 'keep' } | { kind: 'pin'; clientId: number | null };

export function planSessionAsk(args: {
  slotClientId: number | null; known: boolean; pinnedClientId: number | null; clientMode: boolean;
}): AskPin {
  const { slotClientId, known, pinnedClientId, clientMode } = args;
  if (clientMode) return { kind: 'keep' };
  if (known && slotClientId !== null) return pinnedClientId === slotClientId ? { kind: 'keep' } : { kind: 'pin', clientId: slotClientId };
  return pinnedClientId === null ? { kind: 'keep' } : { kind: 'pin', clientId: null };
}

type PendingAsk = {
  actorKey: string | null; clientId: number | null; text: string;
  initialPin: number | null; startGeneration: number; threadKey: string; initialThreadKey: string;
  needsAdmission: boolean; sawPin: boolean; sawThread: boolean;
};
type AskArgs = {
  actorKey: string | null;
  threadKey?: string;
  noteMode: boolean;
  clientPin: { clients: Array<{ id: number }>; selectedClientId: number | null; onSelectClient: (id: number | null) => void };
  admission: { phase: string; targetUserId: number | null; requestGeneration: number; returning: boolean };
  isClientMode: boolean;
  write: (text: string) => void;
  closeSheets: () => void;
  notify: (message: string | null) => void;
};
const FAILED = new Set(['invalid', 'denied', 'unavailable', 'blocked-return', 'retired']);

export function useAskAboutSession(args: AskArgs) {
  const { actorKey, threadKey = '', noteMode, clientPin, admission, isClientMode, write, closeSheets, notify } = args;
  const pinned = clientPin.selectedClientId ?? null;
  const pendingRef = useRef<PendingAsk | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const cancel = (message = "Schedule question cancelled. Choose the intended client and use Ask again.") => {
      pendingRef.current = null;
      notify(message);
    };
    if (pending.actorKey !== actorKey || !actorKey || noteMode || admission.returning) {
      cancel(); return;
    }
    if (threadKey !== pending.threadKey && (pending.sawThread || threadKey !== pending.initialThreadKey)) {
      cancel(); return;
    }
    if (threadKey === pending.threadKey) pending.sawThread = true;
    if (pinned !== pending.clientId && (pending.sawPin || pinned !== pending.initialPin)) {
      cancel(); return;
    }
    if (pinned === pending.clientId) pending.sawPin = true;
    const started = !pending.needsAdmission || admission.requestGeneration > pending.startGeneration;
    if (!started) return;
    // The pin and route effects can both re-admit the SAME target (including a
    // retirement generation between them). Generations are not user intent.
    // Actor, route thread, pin changes and the final accepted target fence this Ask.
    if (FAILED.has(admission.phase)) {
      cancel("Couldn't prepare the schedule question because client access was not confirmed. Check the client and use Ask again.");
      return;
    }
    if (admission.phase !== 'ready') return;
    if (admission.targetUserId !== pending.clientId) { cancel(); return; }
    if (pinned !== pending.clientId || threadKey !== pending.threadKey) return;
    pendingRef.current = null; // consume before writing; effect replay cannot duplicate it
    notify(null);
    write(pending.text);
  }, [actorKey, threadKey, noteMode, admission, pinned, notify, write, revision]);

  useEffect(() => () => { pendingRef.current = null; }, []);

  return useCallback((slot: { clientId: number | null; startsAt: Date }) => {
    pendingRef.current = null; // the latest explicit Ask replaces the older intent
    if (noteMode) {
      notify('Leave client-note mode before using Ask. Your note draft has been kept.');
      return;
    }
    if (!actorKey) { notify("Couldn't prepare the schedule question. Sign in and use Ask again."); return; }
    const known = slot.clientId !== null && clientPin.clients.some((client) => client.id === slot.clientId);
    const plan = planSessionAsk({ slotClientId: slot.clientId, known, pinnedClientId: pinned, clientMode: isClientMode });
    const time = slot.startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const text = isClientMode
      ? `Help me get ready for my ${time} session today.`
      : `Prep me for today's ${time} session: recent workouts, what changed, and one thing to watch.`;
    if (isClientMode) {
      notify(null); write(text); closeSheets(); return;
    }
    pendingRef.current = {
      actorKey, clientId: plan.kind === 'pin' ? plan.clientId : pinned, text,
      initialPin: pinned, startGeneration: admission.requestGeneration,
      threadKey: plan.kind === 'pin' ? '' : threadKey, initialThreadKey: threadKey,
      needsAdmission: plan.kind === 'pin', sawPin: plan.kind === 'keep',
      sawThread: plan.kind === 'keep' || threadKey === '',
    };
    notify('Preparing schedule question — waiting for client access. Nothing has been sent.');
    if (plan.kind === 'pin') clientPin.onSelectClient(plan.clientId);
    setRevision((value) => value + 1);
    closeSheets();
  }, [actorKey, threadKey, noteMode, admission, clientPin, closeSheets, isClientMode, notify, pinned, write]);
}
