/**
 * FILE: CelebrationToast.tsx
 * PURPOSE: Phase 4C — top slide-in celebration toast (Gilded Fern left
 *          accent, 4s auto-dismiss) for streak milestones.
 * HOW IT FITS: NutritionWorkspace fires it when a log action pushes
 *          summary.currentLogStreak across a milestone (3/7/30).
 * KEY DECISIONS: Prop-driven API (message + onDismiss) so any success path
 *          can reuse it. prefers-reduced-motion (and the reduceMotion prop)
 *          drop the transform animation — opacity only. role="status" keeps
 *          it polite for screen readers; a 44px close button allows manual
 *          dismissal before the timer.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import { X } from 'lucide-react';

const AUTO_DISMISS_MS = 4000;

const slideIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const ToastShell = styled.div<{ $reduceMotion: boolean }>`
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 10px 12px 16px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 40%, transparent);
  border-left: 4px solid var(--accent-luxury, #C6A84B);
  border-radius: 8px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent)),
    var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 14px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 66%, transparent);
  font: 600 0.9rem/1.4 var(--font-ui, 'Sora', sans-serif);

  ${({ $reduceMotion }) => css`animation: ${$reduceMotion ? fadeIn : slideIn} 0.24s ease-out;`}
  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeIn} 0.24s ease-out;
  }
`;

const DismissButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

interface CelebrationToastProps {
  /** Toast copy; null renders nothing. */
  message: string | null;
  onDismiss: () => void;
  reduceMotion?: boolean;
}

const CelebrationToast: React.FC<CelebrationToastProps> = ({
  message,
  onDismiss,
  reduceMotion = false,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  // Portal to <body> — the workspace card is a containing block for fixed
  // descendants (container-type/backdrop-filter), see NutritionReviewDrawer.
  return createPortal(
    <ToastShell role="status" aria-live="polite" $reduceMotion={reduceMotion}>
      <span>{message}</span>
      <DismissButton type="button" aria-label="Dismiss celebration" onClick={onDismiss}>
        <X size={18} aria-hidden="true" />
      </DismissButton>
    </ToastShell>,
    document.body,
  );
};

export default CelebrationToast;
