/**
 * FocusFlowSkin.styles — chrome for the Focus Flow Runner Style.
 * Crystalline Swan, dark-first, token-with-fallback only. Every surface and
 * text color rides the Lens world seam (--world-*) so Appearance Studio
 * palettes actually land here (Sean, 2026-07-31: the NOW hero wore a
 * palette-dead --surface-raised and stayed blue under every theme).
 * Gold = earned and purple = Coach stay brand-fixed semantics.
 * Rail/nav chrome lives in FocusFlowRail.styles.ts.
 * Mobile-375-first; 44px floors; reduced-motion safe (no loops).
 */
import styled, { css, keyframes } from 'styled-components';
import { TRAIN } from '../../../styles/train-tokens';

/* Pulse rides the Lens seam — the world's accent, never a hardcoded cyan. */
const focusPulse = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--world-accent, #60C0F0) 35%, transparent); }
  100% { box-shadow: 0 0 0 12px transparent; }
`;

export const FocusShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* ── NOW hero ─────────────────────────────────────────────────── */
export const NowPanel = styled.div<{ $resting: boolean }>`
  border-radius: 16px;
  padding: 16px 18px;
  /* Flat fallback FIRST — iOS < 16.2 has no color-mix (Kimi c.5). */
  background: var(--world-panel, #141419);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--world-accent, #60C0F0) 22%, var(--world-bg, #0A0A0F)) 0%,
    var(--world-bg, #0A0A0F) 90%
  );
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 35%, transparent);
  position: relative;

  ${({ $resting }) => !$resting && css`
    @media (prefers-reduced-motion: no-preference) {
      animation: ${focusPulse} 2.6s ease-out 1;
    }
  `}
`;

export const NowKicker = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${TRAIN.active};

  strong {
    font-size: 1.05rem;
    letter-spacing: 0.08em;
  }
`;

export const NowExerciseName = styled.h3`
  margin: 6px 0 2px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.3rem, 5.5vw, 1.8rem);
  font-weight: 700;
  line-height: 1.15;
  color: var(--world-text, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const NextUpChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--world-text, #E0ECF4) 20%, transparent);
  background: transparent;
  color: var(--world-muted, #9FB0C8);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;

  em {
    font-style: normal;
    color: var(--world-text, #E0ECF4);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const CardStage = styled.div`
  /* The proven exercise card renders here — behavior untouched. */
`;

/** Batch 4: glanceable top-set trend across recent sessions. */
export const TrendChip = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60c0f0) 35%, transparent);
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
  color: ${TRAIN.pending};
`;

/** Batch 4: one-tap 40/60/80% warm-up ramp. */
export const RampButton = styled.button`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--world-accent, #60c0f0) 45%, transparent);
  background: transparent;
  color: ${TRAIN.active};
  font: 600 0.78rem 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;
