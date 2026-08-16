/**
 * FILE: CoachFreestyleOverlay.styles.ts
 * PURPOSE: Styling for the freestyle dictation listening surface.
 *
 * DESIGN INTENT
 * -------------
 * This screen is looked at for ten minutes while Sean talks on a gym floor with
 * his hands busy. It is therefore a CALM surface, not a showpiece: one slow
 * breathing signal, generous type, controls in the thumb arc, and nothing that
 * moves for decoration. Coach Command is a calm zone — response motion only, no
 * ambient loop, no signature flourish (Swan V3 UX contract).
 *
 * Palette is Crystalline Swan via tokens with fallbacks. Gold is not used here at
 * all: the gold law reserves it for a PR numeral, a 1px filigree, a focus ring, or
 * one badge per scene, and a listening screen earns none of those.
 */
import styled, { keyframes, css } from 'styled-components';

/** One slow breath. Deliberately not a pulse — this runs for minutes. */
const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.06); opacity: 0.9; }
`;

const motionSafe = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

export const FreestyleOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent);
  backdrop-filter: blur(14px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.25s ease;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  ${motionSafe}
`;

/** Counters live at the top, out of the thumb arc — read, never pressed. */
export const SignalStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  width: 100%;
  max-width: 560px;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
`;

export const SignalItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
`;

export const SignalValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  font-variant-numeric: tabular-nums;
`;

export const SignalLabel = styled.span`
  font-family: 'Sora', sans-serif;
  /* 12px floor for micro-type, matching the messaging surface. */
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
`;

export const Stage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  width: 100%;
`;

export const BreathOrb = styled.div<{ $listening: boolean }>`
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 45%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent) 70%,
    transparent 72%
  );
  ${({ $listening }) => $listening && css`
    animation: ${breathe} 4s ease-in-out infinite;
  `}
  ${motionSafe}
`;

/**
 * The live phrase. Bounded height so a long session cannot push the controls
 * off-screen — the transcript is reviewable later; what matters here is
 * confirmation that Coach is still hearing you.
 */
export const LivePhrase = styled.p`
  margin: 0;
  max-width: 560px;
  max-height: 6.5rem;
  overflow: hidden;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

export const StatusLine = styled.p<{ $muted?: boolean }>`
  margin: 0;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: ${({ $muted }) =>
    $muted
      ? 'var(--text-muted, rgba(224, 236, 244, 0.7))'
      : 'var(--text-primary, #E0ECF4)'};
`;

/** Controls sit at the bottom: one-handed reach on a phone held mid-session. */
export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  max-width: 560px;
`;

export const ControlButton = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 52px;
  min-width: 52px;
  padding: 0 1.25rem;
  border-radius: 14px;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  ${({ $variant = 'ghost' }) => {
    if ($variant === 'primary') {
      return css`
        /* Blue background throws a purple glow — Dual-Button Glow law. */
        background: var(--bg-primary, #002060);
        border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
        color: var(--text-primary, #E0ECF4);
        &:hover {
          box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
        }
      `;
    }
    if ($variant === 'danger') {
      return css`
        background: color-mix(in srgb, var(--danger-text, #C92A54) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 38%, transparent);
        /* Soft danger value for TEXT: the saturated one fails 4.5:1 on dark. */
        color: var(--danger-soft-text, #FF8FA3);
        &:hover {
          background: color-mix(in srgb, var(--danger-text, #C92A54) 22%, transparent);
        }
      `;
    }
    return css`
      background: transparent;
      border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
      color: var(--text-primary, #E0ECF4);
      &:hover {
        background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
      }
    `;
  }}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  ${motionSafe}
`;

/** Discard confirmation. Deliberately interrupts — it destroys real work. */
export const DiscardConfirm = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 560px;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 34%, transparent);
  background: color-mix(in srgb, var(--danger-text, #C92A54) 10%, var(--bg-surface, #1A1A24));
`;

export const DiscardCopy = styled.p`
  margin: 0;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: var(--text-primary, #E0ECF4);
`;
