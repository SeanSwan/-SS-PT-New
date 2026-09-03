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
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import { renderDigestOf } from '../../utils/renderDigest';
import {
  armDelayMs, canConfirm, initialStateAfterRead, nextState,
  type SheetEvent, type SheetInput, type SheetState,
} from './confirmationSheetState';

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
}

export interface ConfirmationSheetOptions {
  operationId: string;
  input: SheetInput;
  /** The client the operator has locked, for the chip's alarm comparison. */
  lockedClientId?: number | null;
  onDone?: (result: unknown) => void;
  onCancel?: () => void;
}

const IRREVERSIBLE_UNTIL_CARD_4_2 = new Set(['notify_client', 'delete_post', 'export_client_list']);

export function useConfirmationSheet({
  operationId, input, lockedClientId = null, onDone, onCancel,
}: ConfirmationSheetOptions) {
  const [state, setState] = useState<SheetState>('loading');
  const [operation, setOperation] = useState<StoredOperation | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback((event: SheetEvent) => {
    setState((current) => nextState(current, event, input));
  }, [input]);

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
        if (!cancelled) send({ type: 'read_ok', input });
      } catch {
        if (!cancelled) {
          setError('This approval is no longer available. Re-issue the request.');
          send({ type: 'read_failed' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [operationId, input, send]);

  // ── arming ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'arming') return undefined;
    const ms = armDelayMs(input);
    armTimer.current = setTimeout(() => send({ type: 'armed' }), ms);
    return () => { if (armTimer.current) clearTimeout(armTimer.current); };
  }, [state, input, send]);

  // ── confirm ──────────────────────────────────────────────────────────────
  const confirm = useCallback(async () => {
    if (!canConfirm(state)) return;
    send({ type: 'confirm' });
    try {
      const res = await apiService.post('/api/ai-command/confirm', {
        operationId,
        renderedDigest: digest,
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
  }, [state, send, operationId, digest, onDone]);

  const cancel = useCallback(async () => {
    try { await apiService.post('/api/ai-command/cancel', { operationId }); } catch { /* best effort */ }
    send({ type: 'cancel' });
    onCancel?.();
  }, [operationId, send, onCancel]);

  /**
   * The chip alarms when the operation acts on someone other than the locked
   * client, OR when a target is named with nothing locked (the F16g case the
   * server also escalates). Mirrors intentBarState's rule so the two surfaces
   * cannot disagree about what "cross-client" means.
   */
  const targetClientId = (operation?.params?.clientId as number | undefined)
    ?? operation?.clientId ?? null;
  const chipAlarm = targetClientId !== null
    && (lockedClientId === null || Number(lockedClientId) !== Number(targetClientId));

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
    irreversible: input.irreversible
      || IRREVERSIBLE_UNTIL_CARD_4_2.has(operation?.commandType ?? ''),
  };
}
