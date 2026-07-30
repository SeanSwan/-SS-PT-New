/**
 * FocusFlowSkin.styles — chrome for the Focus Flow Runner Style.
 * Crystalline Swan, dark-first, token-with-fallback only (no raw state
 * colors — Train semantics ride train-tokens + --world-accent seam).
 * Mobile-375-first; 44px floors; reduced-motion safe (no loops).
 */
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { TRAIN } from '../../../styles/train-tokens';

const focusPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(96, 192, 240, 0.35); }
  100% { box-shadow: 0 0 0 12px rgba(96, 192, 240, 0); }
`;

export const FocusShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* ── Progress rail: one chip per exercise ─────────────────────── */
export const ProgressRail = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

export const RailChip = styled.button<{ $state: 'pending' | 'active' | 'done' }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  background: var(--surface-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.14));
  color: ${TRAIN.pending};

  ${({ $state }) => $state === 'active' && css`
    border-color: ${TRAIN.active};
    color: ${TRAIN.active};
    background: color-mix(in srgb, var(--world-accent, #60C0F0) 12%, var(--surface-elevated, #141419));
  `}
  ${({ $state }) => $state === 'done' && css`
    border-color: ${TRAIN.done};
    color: ${TRAIN.done};
  `}

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

/* Non-color state indicator (WCAG 1.4.1 — never color-only). */
export const RailDot = styled.span<{ $state: 'pending' | 'active' | 'done' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: ${({ $state }) => ($state === 'done' ? 'currentColor' : 'transparent')};
  font-size: 9px;
  line-height: 1;
`;

/* ── NOW hero ─────────────────────────────────────────────────── */
export const NowPanel = styled.div<{ $resting: boolean }>`
  border-radius: 16px;
  padding: 16px 18px;
  background: linear-gradient(
    165deg,
    var(--surface-raised, #003080) 0%,
    var(--bg-deep, #0A0A0F) 90%
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
  color: var(--text-primary, #E0ECF4);
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
  border: 1px dashed var(--border-subtle, rgba(224, 236, 244, 0.2));
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;

  em {
    font-style: normal;
    color: var(--text-primary, #E0ECF4);
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

/* ── Thumb bar ────────────────────────────────────────────────── */
export const ThumbBar = styled.div`
  position: sticky;
  /* Clears the fixed StickyLogActionBar (bottom 1rem + ~4.75rem tall). */
  bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(44px, auto) 1fr minmax(44px, auto);
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-deep, #0A0A0F) 88%, transparent);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.14));
  backdrop-filter: blur(10px);
`;

export const NavButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.18));
  background: var(--surface-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const BarCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #E0ECF4);
`;

export const SessionMeter = styled.span`
  font-size: 0.95rem;
  letter-spacing: 0.04em;

  b { color: ${TRAIN.done}; font-weight: 700; }
  span { color: var(--text-secondary, rgba(224, 236, 244, 0.6)); }
`;

export const RestReadout = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${TRAIN.active};
`;

export const RestAction = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 45%, transparent);
  background: transparent;
  color: ${TRAIN.active};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;
