/**
 * useConfirmationSheet — read the STORED operation, prove the render, confirm.
 * ===========================================================================
 * Card 1.3. All ceremony logic lives in confirmationSheetState.ts (pure); this
 * hook owns only the effects: read-back, digest, submit, and the arming timer.
 *
 * The read-back is not optional. Rendering the request would re-open exactly the
 * divergence card 1.1 closed — the server injects a clientId at mint, so what the
 * user asked and what the server will execute are different objects.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import { renderDigestOf } from '../../utils/renderDigest';
import {
  armDelayMs, canConfirm, channelPermitted, initialStateAfterRead, nextState,
  TERMINAL_GUIDANCE,
  type SheetEvent, type SheetInput, type SheetState,
} from './confirmationSheetState';
import { resolveIntentBarState } from '../CoachIntentBar/intentBarState';

export interface StoredOperation {
  id: string;
  kind?: string;
  type?: string | null;
  commandType?: string | null;
  description?: string | null;
  params?: Record<string, unknown> | null;
  affectedRecords?: Array<Record<string, unknown>>;
  affectedCount?: number;
  expiresAt?: string;
  clientId?: number | null;
  /** Server-declared: this command has no inverse (flash F-21). */
  irreversible?: boolean;
}

export interface ConfirmationSheetOptions {
  operationId: string;
  input: SheetInput;
  /** The client the operator has locked, for the chip's alarm comparison. */
  lockedClientId?: number | null;
  onDone?: (result: unknown) => void;
  onCancel?: () => void;
}

/** Fallback only — the server's `irreversible` on the stored op is the truth. */
const IRREVERSIBLE_FALLBACK = new Set(['notify_client', 'delete_post', 'export_client_list']);

export function useConfirmationSheet({
  operationId, input, lockedClientId = null, onDone, onCancel,
}: ConfirmationSheetOptions) {
  const [state, setState] = useState<SheetState>('loading');
  const [operation, setOperation] = useState<StoredOperation | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * F-13 (GLM 5.3) / F-12 (flash): every effect below keyed on the `input`
   * OBJECT. A parent passing an inline literal — the natural way to call this —
   * re-created it each render, so the read effect re-fetched on every render and,
   * far worse, the arming effect's cleanup restarted the timer FROM FULL. A
   * periodically re-rendering parent could hold the confirm control dead
   * indefinitely, or flap the operation mid-ceremony. The primitives below are
   * the actual inputs; the object is just their envelope.
   */
  const { tier, isDestructive, affectedCount, physical, irreversible } = input;
  const stableInput = useMemo<SheetInput>(
    () => ({ tier, isDestructive, affectedCount, physical, irreversible }),
    [tier, isDestructive, affectedCount, physical, irreversible],
  );

  const send = useCallback((event: SheetEvent) => {
    setState((current) => nextState(current, event, stableInput));
  }, [stableInput]);

  // ── read-back ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.get(`/api/ai-command/pending/${operationId}`);
        const stored: StoredOperation | undefined = res?.data?.operation;
        if (!stored) throw new Error('no operation');
        if (cancelled) return;
        setOperation(stored);
        // The digest is computed from what we RENDER, so it must be computed
        // from `stored` — never from the request that produced it.
        setDigest(await renderDigestOf(stored));
        if (!cancelled) send({ type: 'read_ok', input: stableInput });
      } catch {
        if (!cancelled) {
          setError('This approval is no longer available. Re-issue the request.');
          send({ type: 'read_failed' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [operationId, stableInput, send]);

  // ── arming ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'arming') return undefined;
    const ms = armDelayMs(stableInput);
    armTimer.current = setTimeout(() => send({ type: 'armed' }), ms);
    return () => { if (armTimer.current) clearTimeout(armTimer.current); };
  }, [state, stableInput, send]);

  // ── confirm ──────────────────────────────────────────────────────────────
  /**
   * @param channel how the human actually confirmed. F-03: `allowedConfirmChannels`
   *   was exported, documented as the M3 split, and called by NOTHING — a guard
   *   only a comment enforced. Now every confirm declares its channel, the split
   *   is checked HERE, and the channel travels to the server so the ceremony is
   *   not purely client-side courtesy.
   *
   *   HONEST SCOPE (flash F-06): the channel is the client's word. A hostile
   *   client can claim 'tap'. This closes the ACCIDENTAL path — ambient audio,
   *   a misheard yes, a surface that forgot the rule — not a deliberate forgery,
   *   which needs a second factor the audio channel cannot produce. Do not
   *   describe it as more than that.
   */
  const confirm = useCallback(async (channel: 'tap' | 'keyboard' | 'voice' = 'tap') => {
    if (!canConfirm(state)) return;
    if (!channelPermitted(stableInput, channel)) {
      setError('This action needs a tap to confirm — say-so is not enough when it crosses clients.');
      return;
    }
    send({ type: 'confirm' });
    try {
      const res = await apiService.post('/api/ai-command/confirm', {
        operationId,
        renderedDigest: digest,
        confirmChannel: channel,
      });
      const body = res?.data;
      if (body?.success === false) {
        setError(body?.error || 'That confirmation could not be completed.');
        send({ type: 'server_refused', code: body?.code || 'downstream_failed' });
        return;
      }
      send({ type: 'confirmed' });
      onDone?.(body);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message || 'That confirmation could not be completed.');
      send({ type: 'server_refused', code: code || 'downstream_failed' });
    }
  }, [state, send, operationId, digest, onDone, stableInput]);

  const cancel = useCallback(async () => {
    // F-14 (GLM 5.3) / F-23 (flash): the state machine refuses `cancel` while
    // submitting, but the hook cancelled anyway — POSTing /cancel for an
    // operation mid-consume. The server's atomic delete bounds the damage (one
    // side wins), yet the client could still land in `burned` guidance for an
    // operation that executed. Cancel only from states where nothing is in
    // flight.
    if (!['loading', 'arming', 'ready'].includes(state)) return;
    try { await apiService.post('/api/ai-command/cancel', { operationId }); } catch { /* best effort */ }
    send({ type: 'cancel' });
    onCancel?.();
  }, [state, operationId, send, onCancel]);

  /**
   * flash F-16: this rule was hand-rolled here while ALSO living in the server
   * tier and in intentBarState — the four-registry drift re-created at the
   * interaction layer, in a file whose header mocks exactly that. The comment
   * claimed the surfaces "cannot disagree"; nothing enforced it. Now the one
   * shared module decides, and the SERVER's verdict wins when it has spoken.
   */
  const targetClientId = (operation?.params?.clientId as number | undefined)
    ?? operation?.clientId ?? null;
  const barState = resolveIntentBarState({ lockedClientId, targetClientId });
  const chipAlarm = input.physical || barState.identityCrossing;

  return {
    state,
    operation,
    error,
    confirm,
    cancel,
    canConfirm: canConfirm(state),
    armDelayMs: armDelayMs(input),
    chipAlarm,
    targetClientId,
    /**
     * flash F-21: a client-side string set duplicating a fact the server
     * registry owns drifts, and the drift shows up as an irreversible action
     * with NO badge before the confirm. The stored operation is now the source;
     * the local set remains only as a fallback for operations minted before the
     * server carried the flag, and is named so it cannot be mistaken for truth.
     */
    irreversible: Boolean(
      operation?.irreversible
      ?? (input.irreversible || IRREVERSIBLE_FALLBACK.has(operation?.commandType ?? '')),
    ),
    /** Terminal guidance — never invites repeating an action that may have run. */
    guidance: TERMINAL_GUIDANCE[state] ?? null,
  };
}
