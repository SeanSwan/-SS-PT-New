/**
 * Blueprint: useAskAboutSession
 * Parent: useCoachWorkspaceModel. "Ask" on a Universal Master Schedule slot.
 *
 * brain-v4 hostile review #8 + the e2e that exposed it:
 *  - pinning the slot's client and pre-writing the prompt in the same tick lost
 *    the prompt: a client switch clears the composer (useCoachClientNotebook), so
 *    the prompt is written only once the pin has landed;
 *  - a slot whose client is NOT in the pin list, while another client is pinned,
 *    used to prep "today's 9:00 session" inside the OTHER client's chat. The chat
 *    returns to general scope instead;
 *  - a draft already in the composer is kept; the prompt is added under it.
 * The prompt carries the time only — never a name (Rule 8).
 */
import { useCallback, useEffect, useState } from 'react';

const PENDING_TTL_MS = 8_000;

export type AskPin = { kind: 'keep' } | { kind: 'pin'; clientId: number | null };

export function planSessionAsk(args: {
  slotClientId: number | null;
  known: boolean;
  pinnedClientId: number | null;
  clientMode: boolean;
}): AskPin {
  const { slotClientId, known, pinnedClientId, clientMode } = args;
  if (clientMode) return { kind: 'keep' };
  if (known && slotClientId !== null) return pinnedClientId === slotClientId ? { kind: 'keep' } : { kind: 'pin', clientId: slotClientId };
  return pinnedClientId === null ? { kind: 'keep' } : { kind: 'pin', clientId: null };
}

export function useAskAboutSession(args: {
  clientPin: { clients: Array<{ id: number }>; selectedClientId: number | null; onSelectClient: (id: number | null) => void };
  isClientMode: boolean;
  write: (text: string) => void;
  closeSheets: () => void;
}) {
  const { clientPin, isClientMode, write, closeSheets } = args;
  const pinned = clientPin.selectedClientId ?? null;
  const [pending, setPending] = useState<{ clientId: number | null; text: string; at: number } | null>(null);

  // A pin that never lands (denied, returned) must not append its prompt later,
  // whenever the scope happens to match again (round-2 review #3).
  useEffect(() => {
    if (!pending) return undefined;
    const expire = window.setTimeout(() => setPending(null), PENDING_TTL_MS);
    return () => window.clearTimeout(expire);
  }, [pending]);

  useEffect(() => {
    if (!pending || pinned !== pending.clientId) return;
    setPending(null);
    if (Date.now() - pending.at <= PENDING_TTL_MS) write(pending.text);
  }, [pending, pinned, write]);

  return useCallback((slot: { clientId: number | null; startsAt: Date }) => {
    const known = slot.clientId !== null && clientPin.clients.some((client) => client.id === slot.clientId);
    const plan = planSessionAsk({ slotClientId: slot.clientId, known, pinnedClientId: pinned, clientMode: isClientMode });
    const time = slot.startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const text = isClientMode
      ? `Help me get ready for my ${time} session today.`
      : `Prep me for today's ${time} session: recent workouts, what changed, and one thing to watch.`;
    if (plan.kind === 'pin') clientPin.onSelectClient(plan.clientId);
    setPending({ clientId: plan.kind === 'pin' ? plan.clientId : pinned, text, at: Date.now() });
    closeSheets();
  }, [clientPin, closeSheets, isClientMode, pinned]);
}
