/**
 * ============================================================================
 * FILE: VaultDecryptionStyles.ts
 * PURPOSE: Styled components for Vault Decryption loot animation
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes, css } from 'styled-components';
import type { LootRarity } from './VaultDecryptionTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// ─────────────────────────────────────────────────────────────

const vaultSpin = keyframes`
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
`;

const decryptGlitch = keyframes`
  0%, 100% { clip-path: inset(0 0 0 0); }
  10% { clip-path: inset(10% 0 80% 0); }
  20% { clip-path: inset(60% 0 10% 0); }
  30% { clip-path: inset(30% 0 40% 0); }
  40% { clip-path: inset(80% 0 5% 0); }
  50% { clip-path: inset(0 0 0 0); }
`;

const hexScroll = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
`;

const rarityReveal = keyframes`
  0% { transform: scale(0) rotate(-180deg); opacity: 0; filter: blur(20px); }
  60% { transform: scale(1.15) rotate(10deg); opacity: 1; filter: blur(0); }
  80% { transform: scale(0.95) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const shieldPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.3); opacity: 0.8; }
`;

const particleBurst = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
`;

const pearlShimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Overlay
// ─────────────────────────────────────────────────────────────

export const VaultOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 15, 0.92);
  backdrop-filter: blur(8px);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Vault Container (the decrypting lock)
// ─────────────────────────────────────────────────────────────

export const VaultContainer = styled.div`
  width: 340px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`;

export const VaultLock = styled.div<{ $phase: 'decrypting' | 'revealed'; $color: string }>`
  width: 120px;
  height: 120px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  perspective: 600px;

  ${({ $phase, $color }) => $phase === 'decrypting' ? css`
    background: var(--bg-surface, #1A1A24);
    border: 2px solid color-mix(in srgb, ${$color} 30%, transparent);
    box-shadow: 0 0 40px color-mix(in srgb, ${$color} 20%, transparent);
  ` : css`
    background: color-mix(in srgb, ${$color} 15%, var(--bg-surface, #1A1A24));
    border: 2px solid ${$color};
    box-shadow: 0 0 60px color-mix(in srgb, ${$color} 40%, transparent),
                0 0 120px color-mix(in srgb, ${$color} 15%, transparent);
    animation: ${rarityReveal} 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  `}
`;

export const LockIcon = styled.div<{ $decrypting: boolean; $color: string }>`
  font-size: 48px;
  color: ${({ $color }) => $color};

  ${({ $decrypting }) => $decrypting && css`
    animation: ${vaultSpin} 1.5s linear infinite;
  `}

  svg { width: 48px; height: 48px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Hex Code Stream (decryption visual)
// ─────────────────────────────────────────────────────────────

export const HexStream = styled.div<{ $color: string }>`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 22px;
  opacity: 0.3;
  pointer-events: none;

  &::before {
    content: attr(data-hex);
    position: absolute;
    top: 0;
    left: 8px;
    right: 8px;
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    line-height: 1.4;
    color: ${({ $color }) => $color};
    white-space: pre-wrap;
    word-break: break-all;
    animation: ${hexScroll} 2s linear infinite;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Progress Bar (decryption progress)
// ─────────────────────────────────────────────────────────────

export const DecryptProgress = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const ProgressLabel = styled.span<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: ${({ $color }) => $color};
  letter-spacing: 1px;
  animation: ${decryptGlitch} 0.5s steps(1) infinite;
`;

export const DecryptBar = styled.div`
  width: 100%;
  height: 4px;
  background: var(--bg-base, #0A0A0F);
  border-radius: 2px;
  overflow: hidden;
`;

export const DecryptFill = styled.div<{ $progress: number; $color: string }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px ${({ $color }) => $color};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Reward Reveal
// ─────────────────────────────────────────────────────────────

export const RewardCard = styled.div<{ $rarity: LootRarity; $color: string }>`
  width: 100%;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $color }) => $color};
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  animation: ${rarityReveal} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;

  ${({ $rarity }) => $rarity === 'pearlescent' && css`
    background: linear-gradient(135deg,
      rgba(96, 192, 240, 0.1),
      rgba(139, 92, 246, 0.1),
      rgba(198, 168, 75, 0.1),
      rgba(96, 192, 240, 0.1)
    );
    background-size: 300% 300%;
    animation: ${rarityReveal} 0.6s cubic-bezier(0.16, 1, 0.3, 1),
               ${pearlShimmer} 4s ease-in-out infinite;
  `}
`;

export const RarityBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  background: color-mix(in srgb, ${({ $color }) => $color} 15%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 30%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  margin-bottom: 12px;
`;

export const RewardName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

export const RewardDescription = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, #94a3b8);
  margin: 0 0 16px;
  line-height: 1.5;
`;

export const XpBonusTag = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, ${({ $color }) => $color} 12%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Particles
// ─────────────────────────────────────────────────────────────

export const Particle = styled.div<{ $color: string; $delay: number; $x: number; $y: number }>`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => $color};
  --px: ${({ $x }) => $x}px;
  --py: ${({ $y }) => $y}px;
  animation: ${particleBurst} 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${({ $delay }) => $delay}s forwards;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Close Button
// ─────────────────────────────────────────────────────────────

export const CloseBtn = styled.button`
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  color: var(--text-primary, #E0ECF4);
  border-radius: 10px;
  padding: 10px 24px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }
`;
