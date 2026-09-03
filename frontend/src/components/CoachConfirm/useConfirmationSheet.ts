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
  /** Signed at mint: this act crosses client identity, so a spoken yes will not do. */
  requiresPhysicalConfirm?: boolean;
  /**
   * Forward slot: nothing server-side sets this yet (verified 2026-09-03 —
   * neither mint nor the command registry has an irreversibility concept). When
   * one does, it wins over the client-side list without a change here.
   */
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

/**
 * Commands with no undo. This is a judgement about REVERSIBILITY, not about the
 * `destructive` flag — `cancel_session` is destructive but you can re-book, and
 * `notify_client` is non-destructive but you cannot unsend.
 *
 * F2-06 (GLM 5.3-flash round 2) checked it against the real registry instead of
 * taking "at risk of drift" on trust, and the drift had already happened:
 * `delete_workout_plan` is destructive AND has no inverse, and it was rendering
 * with NO "cannot be undone" badge. Added.
 *
 * Assessed and deliberately EXCLUDED, so the next reader does not re-litigate:
 * cancel_session (re-book), promote_to_trainer (demote), block_user_posting
 * (unblock), revoke_trainer_permission (re-grant), deactivate_client and
 * lock_client (both reversible). Included non-destructive: notify_client and
 * export_client_list — you cannot unsend a message or un-export a file.
 *
 * This list living on the client is the actual defect and it is still open: the
 * registry owns reversibility, nothing server-side declares it, and the next
 * command added here will be missed the same way this one was. Card 4.2.
 */
const IRREVERSIBLE_FALLBACK = new Set([
  'notify_client', 'delete_post', 'export_client_list', 'delete_workout_plan',
]);

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

  /**
   * F2-04 (GLM 5.3-flash round 2): `input.physical` arrives from the REQUEST-time
   * envelope via the parent, while card 1.1's law is that the sheet renders the
   * STORED record. Both derive from the same verdict today so they agree, but
   * the sheet can be opened on a path that never saw the envelope (a re-issue,
   * a restored surface), and then it would render a ceremony weaker than the one
   * the server will actually enforce. The signed copy on the operation wins when
   * it is present. Declared here, above `confirm`, because `confirm` reads it.
   */
  const physicalRequired = operation?.requiresPhysicalConfirm ?? input.physical;

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
    if (!channelPermitted({ ...stableInput, physical: physicalRequired }, channel)) {
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
  }, [state, send, operationId, digest, onDone, stableInput, physicalRequired]);

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
  /**
   * F2-04 (GLM 5.3-flash round 2): `input.physical` arrives from the REQUEST-time
   * envelope via the parent, while card 1.1's law is that the sheet renders the
   * STORED record. Both derive from the same verdict today so they agree, but
   * the sheet can be opened on a path that never saw the envelope (a re-issue,
   * a restored surface), and then it would render a ceremony weaker than the one
   * the server will actually enforce. The signed copy on the operation wins when
   * it is present.
   */
  const chipAlarm = physicalRequired || barState.identityCrossing;

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
     * flash F-21, corrected after checking instead of assuming.
     *
     * My first pass here wrote that "the server's `irreversible` is the truth"
     * and demoted the local set to a fallback. That description was false the
     * moment it was written: there is NO irreversibility concept anywhere in the
     * backend — not on the command registry, not on either mint. The `??` chain
     * means the local set is not a fallback at all, it is the ONLY live path,
     * and a comment claiming otherwise sends the next reader looking for a
     * server field that has never existed.
     *
     * So, truthfully: this list is the source today. Reading
     * `operation.irreversible` first is a forward slot, deliberately kept so the
     * server can take ownership later without touching this file — and it stays
     * a slot, not a claim, until something server-side actually sets it.
     *
     * The real risk the finding named is unchanged and still open: a
     * client-side list of command types drifts from the registry, and the drift
     * shows up as an irreversible action rendering with NO warning before the
     * confirm. Closing that needs a registry flag stamped at mint (card 4.2),
     * not a better comment here.
     */
    irreversible: Boolean(
      operation?.irreversible
      ?? (input.irreversible || IRREVERSIBLE_FALLBACK.has(operation?.commandType ?? '')),
    ),
    /** Terminal guidance — never invites repeating an action that may have run. */
    guidance: TERMINAL_GUIDANCE[state] ?? null,
  };
}
