/**
 * ============================================================================
 * COMPONENT: CoachSelectionDecision
 * PURPOSE: Plan 55 §3 C3 — the dirty cross-target decision surface.
 * ============================================================================
 * BLUEPRINT
 *  Owns: the accessible dialog shell for ONE pending plan 51 target change.
 *  Does NOT own: the decision itself (the plan 51 owner), admission (C2), or the
 *  route/pin effects (the C3 commit consumer). It receives two callbacks and
 *  reports nothing else.
 *  Privacy: the label shown for the CURRENT scope is passed in by the caller and
 *  may be a client name or thread title, because the person reading it is the
 *  already-admitted staff actor looking at their own current scope. That is not
 *  an LLM-PII path (rule 8 governs what reaches a model, not what a staff actor
 *  sees about their own selection), but the original claim here — "A client NAME
 *  is never introduced here" — was false, and a false invariant is worse than a
 *  qualified one because it stops the next reviewer looking. Corrected after
 *  external hostile review (GLM 5.3, Finding 9). The REQUESTED scope is
 *  deliberately ID-only (`Client #<id>`), and no message body, profile or thread
 *  content is rendered while deciding.
 *  A11y: role=dialog + aria-modal + labelled title/description, Escape = Return
 *  (never Discard), initial focus on Return, >=44px targets, reduced motion.
 */
import { useEffect, useId, useRef } from 'react';
import styled from 'styled-components';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(2px);
`;

const Panel = styled.div`
  width: min(420px, 100%);
  border-radius: 16px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.28));
  background: var(--surface-elevated, #141419);
  box-shadow: 0 24px 60px rgba(3, 7, 18, 0.65);
  padding: 20px;
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-ui, 'Sora', system-ui, sans-serif);
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 1.0625rem;
  line-height: 1.35;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.p`
  margin: 0 0 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary, #A9C3D8);
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
`;

const Action = styled.button<{ $primary?: boolean }>`
  flex: 1 1 160px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: ${(props) => (props.$primary ? 'var(--accent-primary, #002060)' : 'transparent')};
  border: 1px solid ${(props) => (props.$primary ? 'var(--accent-primary, #002060)' : 'var(--border-subtle, rgba(96, 192, 240, 0.28))')};
  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8B5CF6);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export type CoachSelectionDecisionProps = {
  open: boolean;
  currentLabel: string;
  requestedLabel: string;
  busy?: boolean;
  onReturn: () => void;
  onDiscard: () => void;
};

export function CoachSelectionDecision({
  open,
  currentLabel,
  requestedLabel,
  busy = false,
  onReturn,
  onDiscard,
}: CoachSelectionDecisionProps) {
  const titleId = useId();
  const descriptionId = useId();
  const returnRef = useRef<HTMLButtonElement>(null);
  // `onReturn` is an inline arrow at the Gate, so it gets a new identity on every
  // render. Depending on it re-ran this effect on each re-render and re-executed
  // the focus() below, yanking focus back to "Return" while the operator was
  // tabbing toward "Discard draft" — keyboard and AT users bounced mid-decision.
  // Holding it in a ref keeps the Escape handler current without re-subscribing.
  // (External hostile review, GLM 5.3, Finding 6.)
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  useEffect(() => {
    if (!open) return undefined;
    returnRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onReturnRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <Backdrop data-testid="coach-selection-decision">
      <Panel role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <Title id={titleId}>Switch coaching target?</Title>
        <Body id={descriptionId}>
          A draft for {currentLabel} is still open. Return keeps that draft. Discard closes it and opens {requestedLabel}.
        </Body>
        <Body>No saved work is changed by either choice.</Body>
        <Actions>
          <Action ref={returnRef} type="button" $primary disabled={busy} onClick={onReturn}>
            Return to original
          </Action>
          <Action type="button" disabled={busy} onClick={onDiscard}>
            Discard draft
          </Action>
        </Actions>
      </Panel>
    </Backdrop>
  );
}

/**
 * The page-level mount point. Keeps the controller's selection port wiring in
 * one place so the mounted page shell stays inside the Rule 4 cap, and so no
 * label, ticket field or decision callback is reconstructed at the page level.
 */
export function CoachSelectionDecisionGate({ selection, currentLabel }: {
  selection: {
    phase: string;
    pending: Readonly<{ requestId: string; scopeToken: string; targetUserId: number | null }> | null;
    decide: (scopeToken: string, requestId: string, decision: 'return' | 'discard') => Promise<unknown>;
  };
  currentLabel: string | null;
}) {
  const ticket = selection.pending;
  return (
    <CoachSelectionDecision
      open={Boolean(ticket)}
      currentLabel={currentLabel || 'the current client'}
      requestedLabel={ticket?.targetUserId ? `Client #${ticket.targetUserId}` : 'no client'}
      // BUSY IS NARROWED TO THE TWO IN-FLIGHT PHASES, deliberately.
      //
      // This was `phase !== 'decision'`, which dead-locked the surface: the five
      // failure paths in decide() (blocked-return, invalid/STALE, retired) patch
      // only `phase`/`reason` and leave `pending` set, so the dialog stayed OPEN
      // with busy === true — both actions disabled, the Backdrop has no click
      // handler and there is no close button, so a pointer/touch operator had no
      // exit at all, and Escape merely retried the same failing decide(). One
      // failed GET bricked the staff console until reload. Found by external
      // hostile review (GLM 5.3), not by the author's pass.
      //
      // With the narrow predicate a failure re-enables both actions, which
      // matches the Escape semantics: "Discard draft" is a real exit exactly
      // where a blocked Return is not.
      busy={selection.phase === 'checking' || selection.phase === 'committing'}
      onReturn={() => { if (ticket) void selection.decide(ticket.scopeToken, ticket.requestId, 'return'); }}
      onDiscard={() => { if (ticket) void selection.decide(ticket.scopeToken, ticket.requestId, 'discard'); }}
    />
  );
}

export default CoachSelectionDecisionGate;
