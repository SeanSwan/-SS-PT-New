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
import { type SheetInput } from './confirmationSheetState';
import { useConfirmationSheet } from './useConfirmationSheet';

export interface ConfirmationSheetProps {
  operationId: string;
  input: SheetInput;
  lockedClientId?: number | null;
  /** 'dialog' in the Command Center; 'region' inline in a surface dock. */
  presentation?: 'dialog' | 'region';
  onDone?: (result: unknown) => void;
  onCancel?: () => void;
  /** A terminal read-back refusal is acknowledged, not cancelled. */
  onAcknowledge?: () => void;
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
  onDone, onCancel, onAcknowledge, onReissue,
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
    // Focus whatever terminal control actually rendered — re-issue when the
    // state permits one, the acknowledgement otherwise. Keying this on a second
    // hardcoded state list was how the two lists drifted apart in the first place.
    if (sheet.guidance) recoverRef.current?.focus();
  }, [sheet.state, sheet.guidance]);

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
  /**
   * F-04 (GLM 5.3 round 1) — THE LIVE DEFECT THIS FILE HAD.
   *
   * `terminalRecoverable` was a hardcoded list that INCLUDED `burned`, so the
   * sheet offered "Re-issue this request" on the one state that means "your
   * approval was consumed but the result never came back — it may have gone
   * through." Inviting a repeat there is how a cancelled session gets cancelled
   * twice, or a notification sent twice, from a UI that looked helpful.
   * `TERMINAL_GUIDANCE` was written to encode exactly that distinction and had
   * no consumer; a policy nothing reads is not a policy. It decides now, and
   * `confirmed_elsewhere` — which the hardcoded list never knew about — is
   * handled by construction rather than by remembering to add it.
   */
  const guidance = sheet.guidance;
  const terminalRecoverable = guidance?.allowReissue === true;
  const terminalBlocked = Boolean(guidance) && guidance?.allowReissue === false && sheet.state !== 'done';

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

      {/*
        * R2-3 (GLM 5.3 round 2) — this used to read
        *   Say “confirm {spokenNonce(operationId)}” or tap below.
        * and it was a promise the app cannot keep. `nonceSatisfied` — the only
        * function that could check what the operator said — has NO consumer
        * anywhere, and nothing calls confirm('voice'): the sheet has no voice
        * path at all. So the operator could say the phrase indefinitely while
        * nothing listened, and the copy taught them that saying a number is a
        * security step. Instructions in the UI are documentation too, and this
        * one described a capability the code does not have.
        *
        * The verifier stays built and tested, ready for the voice path (card
        * 2.x). When that lands, restore the spoken half of this sentence AND
        * wire nonceSatisfied in the same change — the two are one feature, and
        * shipping the sentence without the check is what happened here.
        */}
      {!input.physical && input.tier === 'deliberate' && (
        <Warning data-testid="deliberate-confirm">
          This one is deliberate — tap Confirm to run it.
        </Warning>
      )}

      {sheet.state === 'arming' && (
        <ArmingTrack aria-hidden="true"><ArmingFill $ms={sheet.armDelayMs} /></ArmingTrack>
      )}

      {/* One live region for the whole sheet: state changes and errors are
          announced once, in the order they happen. */}
      <StatusLine role="status" aria-live="polite" data-testid="sheet-status">
        {/*
          * Terminal guidance outranks BOTH the generic state label and the raw
          * server error. "Done." tells an operator nothing about whether they
          * may safely try again, and a server string like "refused" tells them
          * even less — while the guidance is the one sentence that says whether
          * the action may already have run. On a terminal state that sentence is
          * the whole message; elsewhere the error still speaks.
          */}
        {guidance?.text || sheet.error || STATE_TEXT[sheet.state]}
      </StatusLine>

      <Actions>
        {!terminalRecoverable && sheet.state !== 'done' && (
          <>
            <ConfirmButton
              ref={confirmRef}
              type="button"
              // F-03: the confirm declares HOW it happened. A pointer or a
              // keyboard activation of a real control is physical; a voice
              // surface calls sheet.confirm('voice') and is refused on an
              // identity-crossing act, client-side and again at the server.
              onClick={() => void sheet.confirm('tap')}
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

        {terminalBlocked && (
          <SecondaryButton
            ref={recoverRef}
            type="button"
            onClick={() => onAcknowledge?.()}
            data-testid="acknowledge-button"
          >
            Close — check history first
          </SecondaryButton>
        )}
      </Actions>
    </Sheet>
  );
};

export default ConfirmationSheet;
