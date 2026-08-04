/**
 * STYLES: VoiceModeOverlay (S9). The Crystalline Swan orb per ruling A1:
 * clip-path facets, transform/opacity only (composites, never paints),
 * amplitude rides the --orb-amp custom property. Reduced-motion = static
 * crystal. z-90 (ruling A4). World tokens with Crystalline fallbacks.
 */
import styled, { css, keyframes } from 'styled-components';
import type { JarvisVoiceState } from '../../../hooks/voice/useJarvisVoiceLoop';

const shimmer = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.9; }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(var(--orb-amp, 1)); }
  50% { transform: scale(calc(var(--orb-amp, 1) * 1.03)); }
`;

const speakTilt = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
`;

export const OverlayBackdrop = styled.div`
  position: fixed; inset: 0; z-index: 90;
  background: color-mix(in srgb, var(--deep-dark, #0A0A0F) 82%, transparent);
  display: flex; align-items: center; justify-content: center;
`;

export const OverlayPanel = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  width: min(92vw, 460px); padding: 28px 20px calc(28px + env(safe-area-inset-bottom, 0px));
  outline: none;
`;

export const Orb = styled.div<{ $state: JarvisVoiceState }>`
  position: relative; width: 120px; height: 120px;
  ${({ $state }) => $state === 'idle' && css`animation: ${shimmer} 3.2s ease-in-out infinite;`}
  ${({ $state }) => $state === 'listening' && css`animation: ${breathe} 1s ease-in-out infinite; transition: transform 150ms;`}
  ${({ $state }) => $state === 'speaking' && css`animation: ${speakTilt} 1.6s ease-in-out infinite;`}
  ${({ $state }) => $state === 'transcribing' && css`transform: scaleY(0.12); transition: transform 220ms ease;`}
  @media (prefers-reduced-motion: reduce) { animation: none; transform: none; transition: none; }
`;

/** Five stacked crystal facets — ONE object, state changes its motion only. */
export const OrbFacet = styled.div<{ $index: number }>`
  position: absolute; inset: 0;
  background: linear-gradient(
    ${({ $index }) => 40 + $index * 28}deg,
    color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 55%, transparent),
    color-mix(in srgb, var(--accent-glow, #8B5CF6) 35%, transparent)
  );
  clip-path: ${({ $index }) => [
    'polygon(50% 0%, 90% 35%, 72% 95%, 28% 95%, 10% 35%)',
    'polygon(50% 6%, 82% 38%, 66% 88%, 34% 88%, 18% 38%)',
    'polygon(50% 14%, 74% 42%, 61% 80%, 39% 80%, 26% 42%)',
    'polygon(50% 24%, 66% 46%, 57% 72%, 43% 72%, 34% 46%)',
    'polygon(50% 34%, 58% 50%, 53% 64%, 47% 64%, 42% 50%)',
  ][$index]};
  opacity: ${({ $index }) => 0.9 - $index * 0.12};
`;

export const StateText = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.95rem; font-weight: 800;
  color: var(--world-text, var(--text-primary, #E0ECF4));
`;

export const TranscriptText = styled.p`
  margin: 0; max-height: 20dvh; overflow-y: auto; padding: 10px 12px; border-radius: 10px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Fira Code', monospace; font-size: 0.78rem; white-space: pre-wrap;
`;

export const ClarifyText = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.84rem; font-weight: 700;
  color: var(--caution-ember, #d97706);
`;

export const ButtonRow = styled.div` display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; `;

export const HoldButton = styled.button`
  min-height: 56px; padding: 0 26px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: var(--btn-primary-bg, #002060);
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.9rem; font-weight: 800;
  touch-action: none;
  &[aria-pressed='true'] { box-shadow: 0 0 18px color-mix(in srgb, var(--accent-glow, #8B5CF6) 55%, transparent); }
  &:disabled { cursor: not-allowed; opacity: 0.5; box-shadow: none; }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
`;

export const TypeInsteadButton = styled.button`
  min-height: 44px; padding: 0 16px; border-radius: 10px; cursor: pointer;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 700;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

export const CloseButton = styled(TypeInsteadButton)``;
