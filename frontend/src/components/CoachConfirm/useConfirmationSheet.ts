/**
 * Read, validate and digest one stored operation before admitting its ceremony.
 * G02: each committed ID owns its read/digest/timer/action continuations. A local
 * lifetime token fences UI effects; it cannot undo a POST already sent.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import { renderDigestOf } from '../../utils/renderDigest';
import {
  armDelayMs, canConfirm, channelPermitted, initialStateAfterRead, nextState,
  TERMINAL_GUIDANCE,
  type SheetInput, type SheetState,
} from './confirmationSheetState';
import {
  decodeConfirmationProjection, LEGACY_IRREVERSIBLE,
  type DecodedSheetInput,
} from './confirmationProjection';
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
  requiresPhysicalConfirm?: boolean;
  irreversible?: boolean;
  /** Untrusted transport value until the projection decoder admits it. */
  projection?: unknown;
}

export interface ConfirmationSheetOptions {
  operationId: string;
  input: SheetInput;
  lockedClientId?: number | null;
  onDone?: (result: unknown) => void;
  onCancel?: () => void;
}

/** Compatibility export; v2 irreversibility comes from the stored projection. */
export const IRREVERSIBLE_FALLBACK = new Set(LEGACY_IRREVERSIBLE);

interface Lifetime {
  id: string;
  active: boolean;
  action: 'confirm' | 'cancel' | null;
  timer: ReturnType<typeof setTimeout> | null;
}

interface SheetSnapshot {
  owner: Lifetime | null;
  state: SheetState;
  operation: StoredOperation | null;
  digest: string | null;
  input: DecodedSheetInput | null;
  error: string | null;
}

const EMPTY_INPUT: SheetInput = {
  tier: 'read_back', isDestructive: false, affectedCount: 0,
  physical: false, irreversible: false,
};
const emptySnapshot = (owner: Lifetime | null = null): SheetSnapshot => ({
  owner, state: 'loading', operation: null, digest: null, input: null, error: null,
});
const READ_ERROR = TERMINAL_GUIDANCE.unavailable.text;

function clearArmTimer(owner: Lifetime) {
  if (owner.timer !== null) clearTimeout(owner.timer);
  owner.timer = null;
}

function safeResponseString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function useConfirmationSheet({
  operationId, input, lockedClientId = null, onDone, onCancel,
}: ConfirmationSheetOptions) {
  const [snapshot, setSnapshot] = useState<SheetSnapshot>(() => emptySnapshot());
  const lifetimeRef = useRef<Lifetime | null>(null);
  const inputRef = useRef(input);

  useLayoutEffect(() => { inputRef.current = input; }, [input]);

  // Retire at the committed identity boundary, before passive effects or paint.
  // A-B-A creates distinct tokens even though its first and last IDs match.
  useLayoutEffect(() => {
    const owner: Lifetime = { id: operationId, active: true, action: null, timer: null };
    lifetimeRef.current = owner;
    setSnapshot(emptySnapshot(owner));
    return () => {
      owner.active = false;
      clearArmTimer(owner);
      if (lifetimeRef.current === owner) lifetimeRef.current = null;
    };
  }, [operationId]);

  const isCurrent = useCallback((owner: Lifetime) => (
    owner.active && lifetimeRef.current === owner
  ), []);

  // Also mask during the render preceding layout cleanup. Effect-only resets
  // expose the previous approval to children for a committed replacement frame.
  const visible = snapshot.owner?.id === operationId
    && snapshot.owner.active
    && snapshot.owner === lifetimeRef.current
    ? snapshot
    : emptySnapshot();

  useEffect(() => {
    const owner = lifetimeRef.current;
    if (!owner || owner.id !== operationId) return;
    const canPublishRead = () => isCurrent(owner) && owner.action === null;
    void (async () => {
      try {
        const response = await apiService.get('/api/ai-command/pending/' + owner.id);
        if (!canPublishRead()) return;
        const raw: unknown = response?.data?.operation;
        if (response?.data?.success === false || !raw || typeof raw !== 'object'
          || Array.isArray(raw)) throw new Error('Invalid pending operation');
        const stored = raw as StoredOperation;
        if (typeof stored.id !== 'string' || stored.id !== owner.id) {
          throw new Error('Pending operation ID mismatch');
        }
        const decoded = decodeConfirmationProjection(
          stored as unknown as Record<string, unknown>, inputRef.current, armDelayMs,
        );
        if (decoded.source === 'invalid' || decoded.tier === 'refusal') {
          throw new Error('Invalid confirmation policy');
        }
        // Keep the existing server-matching digest subject unchanged. Publish
        // only after this exact operation and its digest have both been admitted.
        const digest = await renderDigestOf(stored);
        if (!canPublishRead()) return;
        if (typeof digest !== 'string' || !digest) throw new Error('Missing render digest');
        setSnapshot((current) => canPublishRead() && current.owner === owner ? {
          owner, operation: stored, digest, input: decoded,
          state: initialStateAfterRead(decoded), error: null,
        } : current);
      } catch {
        if (!canPublishRead()) return;
        setSnapshot((current) => canPublishRead() && current.owner === owner ? {
          ...emptySnapshot(owner), state: 'unavailable', error: READ_ERROR,
        } : current);
      }
    })();
  }, [operationId, isCurrent]);

  useEffect(() => {
    const { owner, input: admittedInput } = snapshot;
    if (!owner || !admittedInput || snapshot.state !== 'arming'
      || !isCurrent(owner) || owner.action !== null) return;
    owner.timer = setTimeout(() => {
      owner.timer = null;
      if (!isCurrent(owner) || owner.action !== null) return;
      setSnapshot((current) => current.owner === owner && isCurrent(owner)
        && owner.action === null
        ? { ...current, state: nextState(current.state, { type: 'armed' }) }
        : current);
    }, armDelayMs(admittedInput));
    return () => clearArmTimer(owner);
  }, [snapshot.owner, snapshot.state, snapshot.input, isCurrent]);

  const confirm = useCallback(async (channel: 'tap' | 'keyboard' | 'voice' = 'tap') => {
    const { owner, operation, digest, input: admittedInput, state } = visible;
    if (!owner || !isCurrent(owner) || owner.action !== null || !canConfirm(state)
      || !operation || operation.id !== owner.id || !digest || !admittedInput) return;
    // This channel declaration prevents accidental voice approval, not a
    // deliberate forged client's claim to have tapped.
    if (!channelPermitted(admittedInput, channel)) {
      setSnapshot((current) => current.owner === owner && isCurrent(owner) ? {
        ...current,
        error: 'This action needs a tap to confirm — say-so is not enough when it crosses clients.',
      } : current);
      return;
    }
    owner.action = 'confirm'; // Synchronous: two calls from one ready closure cannot POST twice.
    setSnapshot((current) => current.owner === owner && isCurrent(owner)
      ? { ...current, state: nextState(current.state, { type: 'confirm' }), error: null }
      : current);

    const refuse = (code: string, message: string) => {
      if (!isCurrent(owner)) return;
      const next = nextState('submitting', { type: 'server_refused', code });
      // Release only after a proven pre-consumption refusal, for explicit retry.
      if (next === 'ready') owner.action = null;
      setSnapshot((current) => current.owner === owner && isCurrent(owner)
        ? { ...current, state: next, error: message }
        : current);
    };

    let body: unknown;
    try {
      const response = await apiService.post('/api/ai-command/confirm', {
        operationId: owner.id,
        renderedDigest: digest,
        confirmChannel: channel,
      });
      if (!isCurrent(owner)) return;
      const responseBody = response?.data;
      const isResultObject = responseBody !== null && typeof responseBody === 'object'
        && !Array.isArray(responseBody);
      if (isResultObject && responseBody.success === false) {
        refuse(
          safeResponseString(responseBody.code, 'downstream_failed'),
          safeResponseString(responseBody.error, 'That confirmation could not be completed.'),
        );
        return;
      }
      if (!isResultObject || responseBody.success !== true
        || !['executed', 'frontend_dispatch', 'debate_started'].includes(responseBody.type)) {
        // A fulfilled transport is not execution proof. Keep the action latch.
        refuse('downstream_failed', TERMINAL_GUIDANCE.burned.text);
        return;
      }
      body = responseBody;
    } catch (error: unknown) {
      if (!isCurrent(owner)) return;
      const failure = (error as { response?: { data?: unknown } })?.response?.data;
      const failureRecord = failure !== null && typeof failure === 'object' && !Array.isArray(failure)
        ? failure as Record<string, unknown>
        : {};
      refuse(
        safeResponseString(failureRecord.code, 'downstream_failed'),
        safeResponseString(failureRecord.error, 'That confirmation could not be completed.'),
      );
      return;
    }
    if (!isCurrent(owner)) return;
    setSnapshot((current) => current.owner === owner && isCurrent(owner)
      ? { ...current, state: nextState(current.state, { type: 'confirmed' }) }
      : current);
    onDone?.(body);
  }, [visible, isCurrent, onDone]);

  const cancel = useCallback(async () => {
    const { owner, state } = visible;
    if (!owner || !isCurrent(owner) || owner.action !== null
      || !['loading', 'arming', 'ready'].includes(state)) return;
    owner.action = 'cancel';
    clearArmTimer(owner);
    // Claim cancellation before awaiting transport. Late read/digest/timer work
    // is now ineligible, even when best-effort cancellation never returns.
    setSnapshot((current) => current.owner === owner && isCurrent(owner)
      ? { ...current, operation: null, digest: null, input: null }
      : current);
    try { await apiService.post('/api/ai-command/cancel', { operationId: owner.id }); } catch { /* best effort */ }
    if (!isCurrent(owner)) return;
    setSnapshot((current) => current.owner === owner && isCurrent(owner)
      ? { ...current, state: nextState(current.state, { type: 'cancel' }) }
      : current);
    onCancel?.();
  }, [visible, isCurrent, onCancel]);

  const renderInput = visible.input ?? EMPTY_INPUT;
  const targetClientId = visible.input?.targetUserId ?? null;
  const barState = resolveIntentBarState({ lockedClientId, targetClientId });
  const storedDisplay = visible.input?.source === 'stored' ? visible.input.displayFields : undefined;

  return {
    state: visible.state,
    operation: visible.operation,
    error: visible.error,
    confirm,
    cancel,
    canConfirm: Boolean(visible.operation && visible.digest && visible.input
      && visible.owner?.action === null && canConfirm(visible.state)),
    armDelayMs: armDelayMs(renderInput),
    renderInput,
    chipAlarm: renderInput.physical || barState.identityCrossing,
    targetClientId,
    irreversible: renderInput.irreversible,
    displayDescription: storedDisplay ? storedDisplay.description : visible.operation?.description,
    displayCommandType: storedDisplay ? storedDisplay.commandType : visible.operation?.commandType,
    displayAffectedCount: storedDisplay ? storedDisplay.affectedCount : visible.operation?.affectedCount ?? 0,
    guidance: TERMINAL_GUIDANCE[visible.state] ?? null,
  };
}
