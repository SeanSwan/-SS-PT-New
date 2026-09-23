/**
 * FILE: coachSendSequence.ts
 * PURPOSE: Tell a superseded send apart from a refused one (brain-v4 C2 class fix).
 *
 * `useAIChat.sendMessageWithConversation` returns null for two different reasons:
 *  - SUPERSEDED: a newer send (or a thread switch) aborted this one. The newer
 *    work reports its own result, so this one must stay silent;
 *  - REFUSED: the publication/admission/scope checks declined to send at all
 *    (roughly 30 `return null` paths). Nothing reached the coach.
 * The chat-response interpreter only sees `null`, so it used to treat every null
 * as superseded and the operator's message vanished without a word — the exact
 * shape of hostile-review C2. The caller is the only place that knows whether a
 * newer send happened, so it records a sequence number per controller instance.
 *
 * The key is the controller's composer ref: one stable object per mounted
 * Command Center / Workspace, so two mounted surfaces never share a counter and
 * an unmounted surface's counter is collected with it (WeakMap).
 */

import { useEffect, useRef } from 'react';

type SequenceKey = object;

const sequences = new WeakMap<SequenceKey, number>();

/** Start a send; returns the token to check when the send resolves. */
export function beginCoachSend(key: SequenceKey): number {
  const next = (sequences.get(key) ?? 0) + 1;
  sequences.set(key, next);
  return next;
}

/** A thread switch or new thread outranks any send still in flight. */
export function supersedeCoachSends(key: SequenceKey): void {
  sequences.set(key, (sequences.get(key) ?? 0) + 1);
}

/** True when nothing newer started since `token` was issued. */
export function isLatestCoachSend(key: SequenceKey, token: number): boolean {
  return (sequences.get(key) ?? 0) === token;
}

/**
 * Any change of the conversation's SCOPE (client switch, re-admission) outranks a
 * send still in flight: its null must not surface in the new scope as a notice
 * that carries — and would restore or retry — the previous scope's words.
 */
export function useSupersedeCoachSendsOnScope(key: SequenceKey, scopeKey: string): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    supersedeCoachSends(key);
  }, [key, scopeKey]);
}

/** Refused BEFORE the message POST: the words never reached the coach, so they go back. */
export const REFUSED_SEND_NOTICE = {
  actor: 'system' as const,
  label: 'message not sent',
  body: 'Swan Coach did not send this message: the conversation was not ready for it (scope, client, or sign-in check). Your message was not sent, and your words are back in the composer — send again, or start a new chat.',
  attachments: ['not sent'],
};

/** Refused AFTER a request: the message may be in the thread, so nothing is handed back to resend. */
export const UNCONFIRMED_SEND_NOTICE = {
  actor: 'system' as const,
  label: 'reply not shown',
  body: 'Swan Coach could not show the reply here: the conversation\'s scope or sign-in check changed while it was answering. Your message may already be saved in the thread — open it from Conversations before sending it again.',
  attachments: ['may already be saved'],
};
