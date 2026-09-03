/**
 * ConfirmationSheet — the ONE gate every Swan Coach action passes through.
 * ========================================================================
 * Blueprint v2 card 1.3. Before this, confirmation was three different things:
 * a transcript card in the Command Center, plain dead-end TEXT in the four
 * surface docks (so a trainer had to LEAVE the planner to approve a planner
 * action — the ≤2s gym-floor loop died there), and nothing at all on voice.
 *
 * What this renders is the STORED operation, read back from the server, with a
 * digest proving the client held that exact object (card 1.1). What it collects
 * is the ceremony the SERVER resolved (card 1.2) — never a tier the client
 * decided for itself.
 *
 * A refusal never reaches this component: a refused command mints no operation,
 * so the caller renders <RefusalCard> instead. Confirmation is not authorization.
 */
import React, { useEffect, useRef } from 'react';
import {
  Sheet, Header, TierBadge, ClientChip, Title, Detail, Warning,
  ArmingTrack, ArmingFill, Actions, ConfirmButton, SecondaryButton, StatusLine,
} from './ConfirmationSheet.styles';
import { spokenNonce, type SheetInput } from './confirmationSheetState';
import { useConfirmationSheet } from './useConfirmationSheet';

export interface ConfirmationSheetProps {
  operationId: string;
  input: SheetInput;
  lockedClientId?: number | null;
  /** 'dialog' in the Command Center; 'region' inline in a surface dock. */
  presentation?: 'dialog' | 'region';
  onDone?: (result: unknown) => void;
  onCancel?: () => void;
  onReissue?: (operationId: string) => void;
}

const STATE_TEXT: Record<string, string> = {
  loading: 'Loading the pending action…',
  arming: 'Checking what this will affect…',
  ready: 'Ready for your decision.',
  submitting: 'Applying…',
  done: 'Done.',
  burned: 'This approval was used but the action did not finish.',
  expired: 'This approval expired.',
  mismatch: 'What you approved no longer matches the pending action.',
  unavailable: 'This approval is no longer available.',
};

export const ConfirmationSheet: React.FC<ConfirmationSheetProps> = ({
  operationId, input, lockedClientId = null, presentation = 'region',
  onDone, onCancel, onReissue,
}) => {
  const sheet = useConfirmationSheet({ operationId, input, lockedClientId, onDone, onCancel });
  const confirmRef = useRef<HTMLButtonElement>(null);
  const recoverRef = useRef<HTMLButtonElement>(null);

  // Focus follows the decision: to Confirm when it becomes live, to the recovery
  // control when the operation ends in a state the operator must act on. A
  // screen-reader user previously got silence on an expired card.
  useEffect(() => {
    if (sheet.canConfirm) confirmRef.current?.focus();
  }, [sheet.canConfirm]);
  useEffect(() => {
    if (['burned', 'expired', 'mismatch'].includes(sheet.state)) recoverRef.current?.focus();
  }, [sheet.state]);

  // Escape cancels. It must NEVER confirm — the cheapest key on the keyboard
  // cannot be the one that executes something destructive.
  useEffect(() => {
    // Escape cancels a LIVE sheet only. On a terminal one (done/expired/burned)
    // it used to POST /cancel for an operation that no longer exists — a wasted
    // round trip that also emitted a `cancelled` event for something that was
    // never cancelled, quietly corrupting the funnel card 1.0 added.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (['done', 'burned', 'expired', 'mismatch', 'unavailable'].includes(sheet.state)) return;
      void sheet.cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const op = sheet.operation;
  const terminalRecoverable = ['burned', 'expired', 'mismatch', 'unavailable'].includes(sheet.state);

  return (
    <Sheet
      $destructive={input.isDestructive}
      role={presentation === 'dialog' ? 'dialog' : 'region'}
      aria-modal={presentation === 'dialog' ? true : undefined}
      aria-label="Confirm Swan Coach action"
      data-testid="confirmation-sheet"
      data-state={sheet.state}
    >
      <Header>
        <Title>{op?.description || 'Pending action'}</Title>
        <TierBadge $tier={input.tier} data-testid="tier-badge">
          {input.tier.replace(/_/g, ' ')}
        </TierBadge>
      </Header>

      {sheet.targetClientId !== null && (
        <ClientChip $alarm={sheet.chipAlarm} data-testid="client-chip" data-alarm={sheet.chipAlarm}>
          {sheet.chipAlarm ? '⚠ ' : ''}
          Client-{sheet.targetClientId}
        </ClientChip>
      )}

      {op && (
        <Detail>
          <dt>Action</dt><dd>{op.commandType || op.type || 'unknown'}</dd>
          <dt>Affects</dt><dd>{op.affectedCount ?? 0} record{(op.affectedCount ?? 0) === 1 ? '' : 's'}</dd>
        </Detail>
      )}

      {sheet.irreversible && (
        <Warning $tone="stop" data-testid="no-undo">⛔ This cannot be undone.</Warning>
      )}

      {input.physical && (
        <Warning data-testid="physical-required">
          Voice request across clients — tap to confirm.
        </Warning>
      )}

      {!input.physical && input.tier === 'deliberate' && (
        <Warning data-testid="spoken-nonce">
          Say “confirm {spokenNonce(operationId)}” or tap below.
        </Warning>
      )}

      {sheet.state === 'arming' && (
        <ArmingTrack aria-hidden="true"><ArmingFill $ms={sheet.armDelayMs} /></ArmingTrack>
      )}

      {/* One live region for the whole sheet: state changes and errors are
          announced once, in the order they happen. */}
      <StatusLine role="status" aria-live="polite" data-testid="sheet-status">
        {sheet.error || STATE_TEXT[sheet.state]}
      </StatusLine>

      <Actions>
        {!terminalRecoverable && sheet.state !== 'done' && (
          <>
            <ConfirmButton
              ref={confirmRef}
              type="button"
              onClick={() => void sheet.confirm()}
              disabled={!sheet.canConfirm}
              data-testid="confirm-button"
            >
              {sheet.state === 'arming' ? 'Arming…' : 'Confirm'}
            </ConfirmButton>
            <SecondaryButton type="button" onClick={() => void sheet.cancel()} data-testid="cancel-button">
              Cancel
            </SecondaryButton>
          </>
        )}

        {terminalRecoverable && (
          <SecondaryButton
            ref={recoverRef}
            type="button"
            onClick={() => onReissue?.(operationId)}
            data-testid="reissue-button"
          >
            Re-issue this request
          </SecondaryButton>
        )}
      </Actions>
    </Sheet>
  );
};

export default ConfirmationSheet;
