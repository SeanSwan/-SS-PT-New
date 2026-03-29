/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: VaultDecryptionAnimation                         ║
 * ║  PURPOSE: Full-screen loot drop reveal with cryptographic    ║
 * ║           decryption animation and rarity-tiered visual      ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │                    (dark overlay)                           │
 * │                                                            │
 * │              ┌─────────────────┐                           │
 * │              │   🔓 (spinning) │  ← Phase 1: Decrypting   │
 * │              │  hex code stream│                           │
 * │              └─────────────────┘                           │
 * │                                                            │
 * │           [DECRYPTING... 67%]                              │
 * │           ████████████░░░░░░░░                             │
 * │                                                            │
 * │              ┌─────────────────┐                           │
 * │              │    ★ EPIC ★     │  ← Phase 2: Revealed     │
 * │              │  Purple Aurora  │                           │
 * │              │    Frame        │                           │
 * │              │  +75 XP Bonus   │                           │
 * │              └─────────────────┘                           │
 * │                                                            │
 * │              [ Collect ]                                   │
 * └────────────────────────────────────────────────────────────┘
 *
 * GAMIFICATION HOOKS:
 * - Triggers after action-based loot roll succeeds
 * - XP bonus awarded server-side before animation starts
 * - Variable rarity = variable reward psychology (Skinner box)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Lock, Unlock, Gift, Sparkles, Zap } from 'lucide-react';
import type { VaultDecryptionAnimationProps } from './VaultDecryptionTypes';
import {
  VaultOverlay,
  VaultContainer,
  VaultLock,
  LockIcon,
  HexStream,
  DecryptProgress,
  ProgressLabel,
  DecryptBar,
  DecryptFill,
  RewardCard,
  RarityBadge,
  RewardName,
  RewardDescription,
  XpBonusTag,
  Particle,
  CloseBtn,
} from './VaultDecryptionStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Hex Data Generator
// ─────────────────────────────────────────────────────────────

function generateHexData(): string {
  const chars = '0123456789ABCDEF';
  let hex = '';
  for (let i = 0; i < 400; i++) {
    hex += chars[Math.floor(Math.random() * 16)];
    if (i % 2 === 1) hex += ' ';
    if (i % 32 === 31) hex += '\n';
  }
  return hex + hex; // Double for seamless scroll
}

// ─────────────────────────────────────────────────────────────
// SECTION: Particle Generator
// ─────────────────────────────────────────────────────────────

function generateParticles(count: number): Array<{ x: number; y: number; delay: number }> {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300,
    delay: Math.random() * 0.3,
  }));
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const VaultDecryptionAnimation: React.FC<VaultDecryptionAnimationProps> = ({
  drop,
  isVisible,
  onComplete,
  onClose,
}) => {
  const [phase, setPhase] = useState<'decrypting' | 'revealed'>('decrypting');
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hexData = useMemo(() => generateHexData(), []);
  const particles = useMemo(() => generateParticles(16), []);

  // Decryption progress animation
  useEffect(() => {
    if (!isVisible) {
      setPhase('decrypting');
      setProgress(0);
      return;
    }

    const duration = drop.decryptionTime * 1000;
    const step = 50; // Update every 50ms
    const increment = (step / duration) * 100;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase('revealed');
          onComplete();
          return 100;
        }
        return next;
      });
    }, step);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, drop.decryptionTime, onComplete]);

  // Close on Escape
  useEffect(() => {
    if (!isVisible || phase !== 'revealed') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible, phase, onClose]);

  const handleCollect = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <VaultOverlay $visible={isVisible} role="dialog" aria-modal="true" aria-label="Vault Decryption">
      <VaultContainer>
        {/* Vault Lock / Item Icon */}
        <VaultLock $phase={phase} $color={drop.rarityColor}>
          {phase === 'decrypting' && (
            <HexStream $color={drop.rarityColor} data-hex={hexData} />
          )}

          <LockIcon $decrypting={phase === 'decrypting'} $color={drop.rarityColor}>
            {phase === 'decrypting' ? <Lock /> : <Gift />}
          </LockIcon>

          {/* Burst particles on reveal */}
          {phase === 'revealed' && particles.map((p, i) => (
            <Particle
              key={i}
              $color={drop.glowColor}
              $x={p.x}
              $y={p.y}
              $delay={p.delay}
            />
          ))}
        </VaultLock>

        {/* Decryption Progress */}
        {phase === 'decrypting' && (
          <DecryptProgress>
            <ProgressLabel $color={drop.rarityColor}>
              DECRYPTING... {Math.floor(progress)}%
            </ProgressLabel>
            <DecryptBar>
              <DecryptFill $progress={progress} $color={drop.rarityColor} />
            </DecryptBar>
          </DecryptProgress>
        )}

        {/* Reward Reveal */}
        {phase === 'revealed' && (
          <>
            <RewardCard $rarity={drop.rarity} $color={drop.rarityColor}>
              <RarityBadge $color={drop.rarityColor}>
                {drop.rarityLabel}
              </RarityBadge>

              <RewardName>{drop.item.name}</RewardName>
              <RewardDescription>{drop.item.description}</RewardDescription>

              {drop.xpBonus > 0 && (
                <XpBonusTag $color={drop.rarityColor}>
                  <Zap size={16} />
                  +{drop.xpBonus} XP Bonus
                </XpBonusTag>
              )}
            </RewardCard>

            <CloseBtn onClick={handleCollect}>
              <Sparkles size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Collect
            </CloseBtn>
          </>
        )}
      </VaultContainer>
    </VaultOverlay>
  );
};

VaultDecryptionAnimation.displayName = 'VaultDecryptionAnimation';

export default VaultDecryptionAnimation;
