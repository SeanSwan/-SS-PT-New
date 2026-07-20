/**
 * ============================================================================
 * WORKOUT DESIGN LAB — CONFIRMATION CHIP (Apply moment, A-PACK §3.4)
 * ============================================================================
 * BLUEPRINT: bottom-CENTER fixed lane — the bottom-right lane is reserved for
 * receipt toasts (LiveReceipt) and the in-card stage hint stays clear. Fired
 * ONLY by WorkoutDesignLabPage's applyLens success path; a failed apply never
 * fires it (nothing lies). 300ms slide-up, killed under reduced motion; the
 * lane stays mounted so aria-live="assertive" announces reliably.
 * ============================================================================
 */
import React from "react";
import styled, { keyframes } from "styled-components";

const chipSlideUp = keyframes`
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

/* Z-LANE CONTRACT: chip z 95 · LiveReceipt z 90 (bottom-right) · Wave-1's
 * CrystallizeOverlay sheen is fixed z 300 — if a future slice wires the
 * sheen to lens commits on the Lab route it will sweep OVER this chip for
 * ~480ms; that wiring must decide the layering deliberately, not inherit it. */
const ChipLane = styled.div`
  position: fixed;
  left: 50%;
  /* Clears the bottom-right LiveReceipt toast lane (fixed, bottom 18px),
     which fires on the same Apply — the lanes must never overlap (§4.1).
     114px clears a THREE-line receipt (long chrome-less honesty copy at
     ~500-640px viewports), not just the common one-liner. */
  bottom: 114px;
  transform: translate(-50%, 0);
  z-index: 95;
  max-width: min(440px, calc(100vw - 32px));
  pointer-events: none;
  @media (max-width: 480px) {
    /* LiveReceipt is in-flow below 480px, so the fixed lane is clear. */
    bottom: 18px;
  }
`;

const Chip = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 11px 18px;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #e0ecf4);
  box-shadow: 0 12px 36px
    color-mix(in srgb, var(--bg-base, #030712) 65%, transparent);
  font:
    650 13px/1.4 "Sora",
    sans-serif;
  animation: ${chipSlideUp} 300ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export interface LabConfirmationChipProps {
  /** null = idle lane; token re-keys the chip so repeat applies re-announce. */
  confirmation: { message: string; token: number } | null;
}

const LabConfirmationChip: React.FC<LabConfirmationChipProps> = ({
  confirmation,
}) => (
  <ChipLane aria-live="assertive" data-testid="lab-confirmation-chip-lane">
    {confirmation ? (
      <Chip key={confirmation.token}>{confirmation.message}</Chip>
    ) : null}
  </ChipLane>
);

export default LabConfirmationChip;
