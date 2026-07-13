/**
 * COMPONENT: SafetyGateModal
 * PARENT: WorkoutPlannerPage (admin/trainer generation surfaces)
 * PURPOSE: The Cortex deterministic safety gate's acknowledged-review contract
 * (409 SWAN_COACH_REVIEW_REQUIRED). Calm and authoritative — impossible to
 * ignore, never alarming. Override requires a written reason (audited
 * server-side). Directive §5.3 + §13.5.9; a11y: alertdialog, focus trap,
 * Escape = hold, reduced-motion honored.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import {
  GateActions,
  GateCard,
  GateIconRing,
  GateLede,
  GateOverlay,
  GateTitle,
  HoldButton,
  OverrideButton,
  ReasonLabel,
  ReasonTextArea,
  SignalItem,
  SignalList,
} from './SafetyGateModal.styles';

const SIGNAL_LABELS: Record<string, string> = {
  pain_exclusions_active: 'Active pain is severe enough to auto-exclude muscle groups',
  active_pain_review_required: 'Active pain reported — review load and range before assigning',
  pain_or_injury_context_present: 'Pain or injury context is present for this client',
  pain_data_unavailable: 'Pain data could not be loaded — safety cannot be confirmed',
  source_data_unavailable: 'A safety-critical data source failed to load',
  medical_clearance_required: 'Medical clearance is required before training',
  special_population_review_required: 'Special-population considerations need review',
  referral_review_recommended: 'A referral recommendation is on file',
  pain_intake_not_collected: 'Pain intake has never been collected for this client',
  minor_active_pain_noted: 'Minor active pain is noted for this client',
  stale_active_pain_reassessment_due: 'The active pain report is stale — reassessment due',
};

const humanizeSignal = (signal: string): string =>
  SIGNAL_LABELS[signal] ?? signal.replace(/_/g, ' ');

export interface SafetyGateModalProps {
  open: boolean;
  signals: string[];
  missingData?: string[];
  confirming?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const SafetyGateModal: React.FC<SafetyGateModalProps> = ({
  open,
  signals,
  missingData = [],
  confirming = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  const items = useMemo(() => {
    const labeled = signals.map(humanizeSignal);
    const missing = missingData
      // Exact-equality dedupe only — substring matching let a broad item
      // like 'pain' be swallowed by any label containing the word.
      .filter(item => !labeled.some(label => label.toLowerCase() === item.toLowerCase()))
      .map(item => `Missing: ${item}`);
    return [...labeled, ...missing];
  }, [signals, missingData]);

  useEffect(() => {
    if (open) {
      // Remember the trigger (usually the Generate button) so keyboard/SR
      // users return there on close instead of dropping to <body> (WCAG 2.4.3).
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setReason('');
      // Focus lands on the reason field — the required next step.
      const id = window.setTimeout(() => reasonRef.current?.focus(), 50);
      return () => {
        window.clearTimeout(id);
        returnFocusRef.current?.focus();
        returnFocusRef.current = null;
      };
    }
    return undefined;
  }, [open]);

  // Re-block focus retention: while confirming, every control is disabled and
  // focus drops to <body>. If the retry is RE-BLOCKED the dialog stays open
  // (open never toggles), so the open-effect can't restore focus — do it here
  // when confirming ends with the dialog still up (WCAG 2.4.3 companion).
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (open && wasConfirming.current && !confirming) {
      reasonRef.current?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming, open]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      // While the acknowledged retry is in flight, dismissal would hide a
      // running generation with no in-flight indicator — hold the dialog.
      if (!confirming) onCancel();
      return;
    }
    if (event.key !== 'Tab' || !cardRef.current) return;
    // Minimal focus trap: keep Tab cycling inside the dialog.
    const focusables = cardRef.current.querySelectorAll<HTMLElement>(
      'textarea:not([disabled]), button:not([disabled])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [confirming, onCancel]);

  const trimmedReason = reason.trim();

  return (
    <AnimatePresence>
      {open && (
        <GateOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          onClick={confirming ? undefined : onCancel}
          data-testid="safety-gate-overlay"
        >
          <GateCard
            ref={cardRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="safety-gate-title"
            aria-describedby="safety-gate-lede"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={event => event.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <GateIconRing aria-hidden="true">
              <ShieldCheck size={30} />
            </GateIconRing>
            <GateTitle id="safety-gate-title">Review Required</GateTitle>
            <GateLede id="safety-gate-lede">
              Swan Coach held this generation so you can look first. Acknowledge
              the items below to proceed — your reason is recorded with the plan.
            </GateLede>

            <SignalList aria-label="Safety review items">
              {items.map((item, index) => (
                <SignalItem key={`${index}-${item}`}>{item}</SignalItem>
              ))}
            </SignalList>

            <ReasonLabel htmlFor="safety-gate-reason">
              Why is it safe to proceed?
            </ReasonLabel>
            <ReasonTextArea
              id="safety-gate-reason"
              ref={reasonRef}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="e.g. Shoulder flare reviewed with client today — pressing removed, lower-body focus."
              disabled={confirming}
            />

            <GateActions>
              <HoldButton type="button" onClick={onCancel} disabled={confirming}>
                Hold &amp; Review
              </HoldButton>
              <OverrideButton
                type="button"
                onClick={() => onConfirm(trimmedReason)}
                disabled={!trimmedReason || confirming}
              >
                {confirming ? 'Generating…' : 'Acknowledge & Generate'}
              </OverrideButton>
            </GateActions>
          </GateCard>
        </GateOverlay>
      )}
    </AnimatePresence>
  );
};

export default SafetyGateModal;
